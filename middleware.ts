import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * 优化的轻量级中间件
 * 整合了认证和基本安全功能，避免了重量级依赖
 * 适配 Cloudflare Workers 运行时
 */

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  const { pathname } = req.nextUrl;
  const method = req.method;

  // 基本路径过滤 - 跳过静态资源
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  try {
    let response = NextResponse.next();

    // 1. 基本安全头设置 (轻量级)
    response = applyBasicSecurityHeaders(req, response);

    // 2. 认证检查 (使用 NextAuth，不直接依赖 Prisma)
    const authResult = await handleAuthentication(req, pathname);
    if (!authResult.success) {
      return authResult.response;
    }

    // 3. API 路由保护
    if (pathname.startsWith('/api/')) {
      const apiResult = await handleApiRoutes(req, pathname, authResult.session);
      if (!apiResult.success) {
        return apiResult.response;
      }
    }

    // 4. 性能监控头
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Middleware-Version', 'optimized-v2');

    return response;
  } catch (error) {
    // 简化的错误处理
    console.error('Middleware error:', error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 检查是否应该跳过中间件处理
 */
function shouldSkipMiddleware(pathname: string): boolean {
  const skipPatterns = [
    '/_next',
    '/api/health',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/api/auth', // NextAuth 路由
  ];

  return skipPatterns.some(pattern => pathname.startsWith(pattern));
}

/**
 * 应用基本安全头 (不依赖外部库)
 */
function applyBasicSecurityHeaders(req: NextRequest, response: NextResponse): NextResponse {
  // 基本安全头
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS 头设置
  const origin = req.headers.get('origin');
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || process.env.NEXTAUTH_URL || '';
    if (allowedOrigins && origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  } else {
    // 开发环境允许所有源
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

/**
 * 处理认证检查
 */
async function handleAuthentication(req: NextRequest, pathname: string): Promise<{
  success: boolean;
  session: any;
  response?: NextResponse;
}> {
  try {
    const session = await auth();

    // 受保护的页面路由
    const protectedRoutes = [
      '/dashboard',
      '/families',
      '/profile',
      '/settings',
    ];

    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !session) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return {
        success: false,
        session: null,
        response: NextResponse.redirect(signInUrl)
      };
    }

    return { success: true, session };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { success: true, session: null }; // 允许继续，但 session 为 null
  }
}

/**
 * 处理 API 路由保护
 */
async function handleApiRoutes(
  req: NextRequest,
  pathname: string,
  session: any
): Promise<{
  success: boolean;
  response?: NextResponse;
}> {
  // 公开的 API 路由
  const publicApiRoutes = [
    '/api/auth',
    '/api/health',
    '/api/webhooks',
  ];

  const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route));

  if (!isPublicApi && !session) {
    return {
      success: false,
      response: NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      )
    };
  }

  // 基本的速率限制检查 (简化版)
  const clientIP = getClientIP(req);
  if (await isRateLimited(clientIP, pathname)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429 }
      )
    };
  }

  return { success: true };
}

/**
 * 获取客户端 IP
 */
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.ip ||
    'unknown'
  );
}

/**
 * 简化的速率限制检查 (内存存储，适合 Cloudflare Workers)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

async function isRateLimited(clientIP: string, pathname: string): Promise<boolean> {
  const key = `${clientIP}:${pathname}`;
  const now = Date.now();
  const windowMs = 60000; // 1分钟
  const maxRequests = 100; // 每分钟最多100次请求

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // 重置或创建新的计数
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return false;
  }

  if (current.count >= maxRequests) {
    return true;
  }

  current.count++;
  return false;
}

// 清理过期的速率限制记录 (定期清理)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

/**
 * 中间件匹配配置
 */
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico
     * - public 文件夹
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};