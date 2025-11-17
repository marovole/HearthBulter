import { NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/monitoring - 系统监控端点
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = SupabaseClientManager.getInstance();

    // 获取基本统计信息（使用Supabase）
    const { count: totalUsers, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('查询用户统计失败:', countError);
      return NextResponse.json(
        {
          system: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Failed to fetch user statistics',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      system: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        total_users: totalUsers || 0,
        server_time: new Date().toISOString(),
      },
      endpoints: {
        health: '/api/health',
        monitoring: '/api/monitoring',
      },
      uptime: process.uptime(),
      version: '1.0.0',
    });
  } catch (error) {
    return NextResponse.json(
      {
        system: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
