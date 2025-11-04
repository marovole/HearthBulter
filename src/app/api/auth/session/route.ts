import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Session 验证 API 端点
 * 替代 middleware 中的数据库查询，提供轻量级的 session 验证
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          session: null,
          error: '未认证'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: session.user?.role,
        },
        expires: session.expires,
      }
    });

  } catch (error) {
    console.error('Session verification error:', error);

    return NextResponse.json(
      {
        authenticated: false,
        session: null,
        error: '服务器内部错误'
      },
      { status: 500 }
    );
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