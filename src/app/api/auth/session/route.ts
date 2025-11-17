import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Session 验证 API 端点
 * 获取当前用户的会话信息
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role || 'USER',
        },
        expires: session.expires,
      } : null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Session verification error:', error);

    // 返回未认证状态而不是500错误
    return NextResponse.json({
      authenticated: false,
      session: null,
      error: 'Session verification failed',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
}

/**
 * OPTIONS 方法支持 CORS 预检请求
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
