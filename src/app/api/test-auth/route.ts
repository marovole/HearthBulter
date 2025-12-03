import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/middleware/authorization';

/**
 * 认证系统健康检查 API
 * 安全限制:
 * - 生产环境需要管理员权限
 * - 不暴露敏感环境变量值
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // 生产环境需要管理员权限
    if (isProduction) {
      const user = await getCurrentUser();

      if (!user?.id) {
        return NextResponse.json(
          { status: 'error', error: '未授权访问' },
          { status: 401 }
        );
      }

      const authResult = await requireAdmin(user.id);

      if (!authResult.authorized) {
        return NextResponse.json(
          { status: 'error', error: '需要管理员权限' },
          { status: 403 }
        );
      }
    }

    // 基础健康检查（不暴露敏感信息）
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    // 仅检查配置是否存在（不暴露实际值）
    const configStatus = {
      auth: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing',
      database: process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    };

    return NextResponse.json({
      ...healthCheck,
      config: configStatus,
      message: 'Health Butler API is running',
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
