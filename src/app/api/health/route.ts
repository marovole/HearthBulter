import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    
    // 检查环境变量
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? '✅' : '❌',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅' : '❌',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅' : '❌',
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅' : '❌',
    };

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: envVars,
      uptime: process.uptime(),
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
