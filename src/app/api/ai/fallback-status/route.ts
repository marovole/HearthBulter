import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiFallbackService } from '@/lib/services/ai/fallback-service';
import { aiResponseCache } from '@/lib/services/ai/response-cache';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';

// 管理员权限检查

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function checkAdminPermission(userId: string): Promise<boolean> {
  return true; // 临时允许所有用户访问
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const isAdmin = await checkAdminPermission(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      'ai_general'
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // 获取各服务状态
    const fallbackStats = aiFallbackService.getFallbackStats();
    const cacheStats = aiResponseCache.getStats();
    const rateLimitStats = await rateLimiter.getStats();

    // 系统健康度评估
    const healthScore = calculateSystemHealthScore(fallbackStats, cacheStats, rateLimitStats);

    // 生成系统状态报告
    const statusReport = {
      timestamp: new Date().toISOString(),
      overall_health: healthScore,
      services: {
        fallback: {
          status: fallbackStats.totalFailures === 0 ? 'healthy' : 'degraded',
          totalFailures: fallbackStats.totalFailures,
          servicesWithFailures: fallbackStats.servicesWithFailures,
          circuitBreakerStatus: fallbackStats.circuitBreakerStatus,
        },
        cache: {
          status: cacheStats.hitRate > 50 ? 'healthy' : 'degraded',
          hitRate: cacheStats.hitRate,
          totalEntries: cacheStats.totalSize,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
        },
        rateLimit: {
          status: rateLimitStats.activeRecords < rateLimitStats.totalRecords * 0.8 ? 'healthy' : 'high_load',
          activeRecords: rateLimitStats.activeRecords,
          totalRecords: rateLimitStats.totalRecords,
        },
      },
      recommendations: generateHealthRecommendations(fallbackStats, cacheStats, rateLimitStats),
      alerts: generateAlerts(fallbackStats, cacheStats, rateLimitStats),
    };

    return NextResponse.json(statusReport);

  } catch (error) {
    console.error('Fallback status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const isAdmin = await checkAdminPermission(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, service } = body;

    if (action === 'reset-failures') {
      // 重置失败计数
      aiFallbackService.resetFailures(service);

      return NextResponse.json({
        message: service
          ? `Reset failures for service: ${service}`
          : 'Reset all failure counts',
      });
    } else if (action === 'reset-cache-stats') {
      // 重置缓存统计
      aiResponseCache.resetStats();

      return NextResponse.json({ message: 'Cache stats reset successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Fallback management API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 计算系统健康度评分
 */
function calculateSystemHealthScore(
  fallbackStats: any,
  cacheStats: any,
  rateLimitStats: any
): number {
  let score = 100;

  // 降级服务影响 (-30分如果有失败)
  if (fallbackStats.totalFailures > 0) {
    score -= Math.min(30, fallbackStats.totalFailures * 5);
  }

  // 熔断器影响 (-40分如果有熔断器开启)
  const openCircuitBreakers = Object.values(fallbackStats.circuitBreakerStatus).filter(
    (status: any) => status === true
  ).length;
  if (openCircuitBreakers > 0) {
    score -= openCircuitBreakers * 40;
  }

  // 缓存命中率影响 (+10分高命中率，-10分低命中率)
  if (cacheStats.hitRate > 70) {
    score += 10;
  } else if (cacheStats.hitRate < 30) {
    score -= 10;
  }

  // 速率限制影响 (-20分高负载)
  const activeRate = rateLimitStats.activeRecords / rateLimitStats.totalRecords;
  if (activeRate > 0.8) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 生成健康建议
 */
function generateHealthRecommendations(
  fallbackStats: any,
  cacheStats: any,
  rateLimitStats: any
): string[] {
  const recommendations: string[] = [];

  // 降级服务建议
  if (fallbackStats.totalFailures > 0) {
    recommendations.push('检测到AI服务失败，建议检查API配置和连接状态');
  }

  if (Object.values(fallbackStats.circuitBreakerStatus).some((status: any) => status)) {
    recommendations.push('熔断器已激活，建议检查服务状态并等待恢复');
  }

  // 缓存建议
  if (cacheStats.hitRate < 30) {
    recommendations.push('缓存命中率较低，建议优化缓存策略或增加缓存时间');
  } else if (cacheStats.hitRate > 80) {
    recommendations.push('缓存命中率良好，系统性能表现优秀');
  }

  // 负载建议
  const activeRate = rateLimitStats.activeRecords / rateLimitStats.totalRecords;
  if (activeRate > 0.8) {
    recommendations.push('系统负载较高，建议监控性能指标');
  }

  return recommendations;
}

/**
 * 生成警报
 */
function generateAlerts(
  fallbackStats: any,
  cacheStats: any,
  rateLimitStats: any
): Array<{
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  service: string;
}> {
  const alerts: any[] = [];

  // 降级服务警报
  if (fallbackStats.totalFailures > 5) {
    alerts.push({
      level: 'error',
      message: `检测到${fallbackStats.totalFailures}次AI服务失败`,
      service: 'fallback',
    });
  }

  // 熔断器警报
  const openCircuitBreakers = Object.entries(fallbackStats.circuitBreakerStatus)
    .filter(([_, status]) => status === true)
    .map(([service]) => service);

  if (openCircuitBreakers.length > 0) {
    alerts.push({
      level: 'critical',
      message: `以下服务熔断器已激活: ${openCircuitBreakers.join(', ')}`,
      service: 'circuit_breaker',
    });
  }

  // 缓存警报
  if (cacheStats.hitRate < 20) {
    alerts.push({
      level: 'warning',
      message: `缓存命中率过低: ${cacheStats.hitRate}%`,
      service: 'cache',
    });
  }

  // 负载警报
  const activeRate = rateLimitStats.activeRecords / rateLimitStats.totalRecords;
  if (activeRate > 0.9) {
    alerts.push({
      level: 'warning',
      message: `系统负载过高: ${Math.round(activeRate * 100)}%`,
      service: 'rate_limit',
    });
  }

  return alerts;
}
