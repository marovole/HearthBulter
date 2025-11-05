import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Session 验证 API 端点
 * 提供轻量级的 session 验证
 */
export async function GET(request: NextRequest) {
  try {
    // 简化的 session 检查
    const session = await auth();

    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        user: {
          id: session.user?.id || '1',
          email: session.user?.email || 'test@example.com',
          name: session.user?.name || '测试用户',
          role: session.user?.role || 'USER',
        },
        expires: session.expires,
      } : null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Session verification error:', error);

    // 返回一个未认证的默认响应，而不是500错误
    return NextResponse.json({
      authenticated: false,
      session: null,
      error: 'Session verification failed',
      timestamp: new Date().toISOString(),
    }, { status: 200 }); // 改为200避免客户端错误
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