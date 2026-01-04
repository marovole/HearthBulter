import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/db/supabase-adapter';
import { getCurrentUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/middleware/authorization';

/**
 * 数据库连接测试 API
 * 安全限制:
 * - 生产环境需要管理员权限
 * - 不暴露敏感配置信息
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // 生产环境需要管理员权限
    if (isProduction) {
      const user = await getCurrentUser();

      if (!user?.id) {
        return NextResponse.json(
          { status: 'error', error: '未授权访问' },
          { status: 401 },
        );
      }

      const authResult = await requireAdmin(user.id);

      if (!authResult.authorized) {
        return NextResponse.json(
          { status: 'error', error: '需要管理员权限' },
          { status: 403 },
        );
      }
    }

    // 测试数据库连接
    const isConnected = await testDatabaseConnection();

    if (!isConnected) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Database connection test failed',
        },
        { status: 500 },
      );
    }

    // 返回简化的状态信息（不暴露敏感配置）
    return NextResponse.json({
      status: 'success',
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString(),
      connection: {
        adapter: 'Supabase',
        healthy: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
