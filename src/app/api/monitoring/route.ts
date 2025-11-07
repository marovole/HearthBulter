import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 获取基本统计信息
    const stats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_users,
        NOW() as server_time
      `;

    return NextResponse.json({
      system: 'healthy',
      timestamp: new Date().toISOString(),
      stats,
      endpoints: {
        health: '/api/health',
        monitoring: '/api/monitoring'
      },
      uptime: process.uptime(),
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      {
        system: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
