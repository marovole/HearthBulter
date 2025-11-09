import { NextResponse } from 'next/server';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

// 配置 WebSocket
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
}

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      return NextResponse.json({
        error: 'DATABASE_URL not configured',
        env: Object.keys(process.env).filter(k => !k.includes('SECRET'))
      }, { status: 500 });
    }

    // 直接创建连接，不使用全局实例
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    await prisma.$queryRaw`SELECT 1`;

    await prisma.$disconnect();

    return NextResponse.json({
      status: 'success',
      message: 'Neon Serverless Driver works!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
