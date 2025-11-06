import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/db';
import { testAuthSystem, checkAuthConfiguration } from '@/lib/auth';
import { CacheService } from '@/lib/cache/redis-client';

export async function GET() {
  const checks = {
    environment: false,
    database: false,
    redis: false,
    auth: false,
    authConfig: false,
  };

  const details: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.env.VERCEL_URL ? 'Vercel' : 'Local',
  };

  try {
    // 1. 环境变量检查
    try {
      const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

      checks.environment = missingVars.length === 0;
      details.environmentVars = {
        required: requiredEnvVars,
        configured: requiredEnvVars.filter(varName => !!process.env[varName]),
        missing: missingVars,
      };

      // 检查数据库URL是否为localhost（在生产环境中）
      if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('localhost')) {
        checks.environment = false;
        details.environmentVars.issues = ['生产环境使用了localhost数据库'];
      }
    } catch (error) {
      console.error('环境检查失败:', error);
      details.environmentError = error instanceof Error ? error.message : String(error);
    }

    // 2. 数据库连接检查
    try {
      const dbStartTime = Date.now();
      checks.database = await testDatabaseConnection();
      details.database = {
        healthy: checks.database,
        responseTime: `${Date.now() - dbStartTime}ms`,
      };
    } catch (error) {
      console.error('数据库检查失败:', error);
      details.databaseError = error instanceof Error ? error.message : String(error);
    }

    // 3. Redis连接检查
    try {
      const redisStartTime = Date.now();
      const redisStatus = CacheService.getConnectionStatus();

      if (redisStatus.configured) {
        checks.redis = await CacheService.testConnection();
        details.redis = {
          configured: true,
          healthy: checks.redis,
          responseTime: `${Date.now() - redisStartTime}ms`,
          lastCheck: redisStatus.lastCheck,
        };
      } else {
        checks.redis = false; // Redis未配置，标记为不健康（可选服务）
        details.redis = {
          configured: false,
          healthy: false,
          message: 'Redis未配置（可选服务）',
        };
      }
    } catch (error) {
      console.error('Redis检查失败:', error);
      details.redisError = error instanceof Error ? error.message : String(error);
    }

    // 4. 认证配置检查
    try {
      const authConfig = checkAuthConfiguration();
      checks.authConfig = authConfig.configured;
      details.authConfig = authConfig;
    } catch (error) {
      console.error('认证配置检查失败:', error);
      details.authConfigError = error instanceof Error ? error.message : String(error);
    }

    // 5. 认证系统检查
    try {
      const authStartTime = Date.now();
      const authTest = await testAuthSystem();
      checks.auth = authTest.healthy;
      details.auth = {
        healthy: authTest.healthy,
        responseTime: `${Date.now() - authStartTime}ms`,
        user: authTest.user ? 'Session exists' : 'No session',
        error: authTest.error,
      };
    } catch (error) {
      console.error('认证系统检查失败:', error);
      details.authError = error instanceof Error ? error.message : String(error);
    }

    // 计算整体健康状态
    const coreServicesHealthy = checks.environment && checks.authConfig;
    const allServicesHealthy = coreServicesHealthy && checks.database && checks.redis && checks.auth;

    const status = allServicesHealthy
      ? 'healthy'
      : coreServicesHealthy
        ? 'degraded'
        : 'unhealthy';

    const statusCode = allServicesHealthy ? 200 : coreServicesHealthy ? 206 : 503;

    return NextResponse.json({
      status,
      timestamp: details.timestamp,
      environment: details.environment,
      platform: details.platform,
      checks,
      details,
      message: allServicesHealthy
        ? 'All systems operational'
        : coreServicesHealthy
          ? 'Core systems operational, some optional services degraded'
          : 'Critical systems failing',
    }, { status: statusCode });

  } catch (error) {
    console.error('健康检查端点错误:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Health check endpoint failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
