import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const session = await auth();
  const { pathname } = req.nextUrl;

  // 如果是API路由
  if (pathname.startsWith('/api/')) {
    // 排除认证相关的 API
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }

    if (!session) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 如果是受保护的页面路由
  if (!session) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/families/:path*',
    '/api/families/:path*',
    '/api/members/:path*',
  ],
};
