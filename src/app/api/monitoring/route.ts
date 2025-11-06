import { NextResponse } from 'next/server';
import { ErrorMonitoringService } from '@/lib/error-monitoring';
import { testDatabaseConnection } from '@/lib/db';
import { CacheService } from '@/lib/cache/redis-client';
import { checkAuthConfiguration } from '@/lib/auth';

/**
 * GET /api/monitoring
 * 系统监控端点 - 查看错误统计、性能指标和系统状态
 */
export async function GET() {
  try {
    // 获取错误和性能统计
    const errorStats = ErrorMonitoringService.getErrorStats();
    const performanceStats = ErrorMonitoringService.getPerformanceStats();

    // 获取系统健康状态
    const systemHealth = await getSystemHealth();

    // 获取近期活动
    const recentActivity = {
      errors: errorStats.recent,
      performance: performanceStats.recent,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      systemHealth,
      errorStats: {
        total: errorStats.total,
        byLevel: errorStats.byLevel,
        criticalCount: errorStats.criticalIssues.length,
      },
      performanceStats: {
        total: performanceStats.total,
        averageResponseTime: performanceStats.averageResponseTime,
        errorRate: performanceStats.errorRate,
        slowestRequests: performanceStats.slowestRequests.slice(0, 5), // 只返回最慢的5个
      },
      alerts: generateAlerts(errorStats, performanceStats),
      recentActivity: {
        recentErrors: errorStats.recent.slice(0, 5),
        recentRequests: performanceStats.recent.slice(0, 5),
      },
    });

  } catch (error) {
    console.error('监控端点错误:', error);
    return NextResponse.json({
      error: '监控服务不可用',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * POST /api/monitoring
 * 清除监控日志
 */
export async function POST() {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clear') {
      ErrorMonitoringService.clearLogs();
      return NextResponse.json({
        message: '监控日志已清除',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      error: '无效的操作',
      validActions: ['clear'],
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      error: '处理请求失败',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 400 });
  }
}

/**
 * 获取系统健康状态
 */
async function getSystemHealth() {
  const checks = {
    database: false,
    redis: false,
    auth: false,
    memory: false,
  };

  const details: any = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
  };

  try {
    // 数据库健康检查
    checks.database = await testDatabaseConnection();
  } catch (error) {
    details.databaseError = error instanceof Error ? error.message : String(error);
  }

  try {
    // Redis健康检查
    const redisStatus = CacheService.getConnectionStatus();
    if (redisStatus.configured) {
      checks.redis = await CacheService.testConnection();
      details.redis = {
        configured: true,
        healthy: checks.redis,
        lastCheck: redisStatus.lastCheck,
      };
    } else {
      details.redis = {
        configured: false,
        message: 'Redis未配置',
      };
    }
  } catch (error) {
    details.redisError = error instanceof Error ? error.message : String(error);
  }

  try {
    // 认证配置检查
    const authConfig = checkAuthConfiguration();
    checks.auth = authConfig.configured;
    details.auth = authConfig;
  } catch (error) {
    details.authError = error instanceof Error ? error.message : String(error);
  }

  // 内存健康检查
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  const usedMemory = memoryUsage.heapUsed;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;
  checks.memory = memoryUsagePercent < 90; // 内存使用率低于90%认为健康

  details.memoryUsage = {
    heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
    usagePercent: `${Math.round(memoryUsagePercent)}%`,
  };

  // 计算整体健康状态
  const healthyChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const healthScore = (healthyChecks / totalChecks) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (healthScore >= 80) {
    status = 'healthy';
  } else if (healthScore >= 60) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    score: Math.round(healthScore),
    checks,
    details,
  };
}

/**
 * 生成系统告警
 */
function generateAlerts(errorStats: any, performanceStats: any) {
  const alerts: string[] = [];

  // 错误率告警
  if (performanceStats.errorRate > 10) {
    alerts.push(`🚨 错误率过高: ${performanceStats.errorRate}% (建议 < 5%)`);
  }

  // 响应时间告警
  if (performanceStats.averageResponseTime > 2000) {
    alerts.push(`⚠️ 平均响应时间过长: ${performanceStats.averageResponseTime}ms (建议 < 1000ms)`);
  }

  // 关键错误告警
  if (errorStats.byLevel.HIGH > 0 || errorStats.byLevel.CRITICAL > 0) {
    alerts.push(`🚨 发现 ${errorStats.byLevel.HIGH + errorStats.byLevel.CRITICAL} 个关键错误`);
  }

  // 系统负载告警
  if (performanceStats.total > 1000 && performanceStats.averageResponseTime > 1000) {
    alerts.push(`⚠️ 系统负载过高: ${performanceStats.total} 个请求，平均响应时间 ${performanceStats.averageResponseTime}ms`);
  }

  return alerts;
}