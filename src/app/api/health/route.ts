import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 动态导入避免在模块加载时初始化 Prisma
    const { testDatabaseConnection } = await import('@/lib/db');
    const isConnected = await testDatabaseConnection();
    
    // 检查环境变量
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? '✅' : '❌',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅' : '❌',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅' : '❌',
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅' : '❌',
    };

    return NextResponse.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
      environment: envVars,
      uptime: process.uptime(),
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected',
      },
      { status: 500 }
    );
  }
}
