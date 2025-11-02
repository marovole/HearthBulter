import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/middleware/security-middleware';
import { cacheMiddleware } from '@/lib/middleware/cache-middleware';
import { securityAudit } from '@/lib/security/security-audit';
import { logger } from '@/lib/logging/structured-logger';

// 中间件配置
interface MiddlewareConfig {
  security: boolean;
  cache: boolean;
  audit: boolean;
  paths: {
    exclude: string[];
    include: string[];
  };
}

const DEFAULT_CONFIG: MiddlewareConfig = {
  security: true,
  cache: true,
  audit: true,
  paths: {
    exclude: [
      '/_next',
      '/api/health',
      '/api/webhooks',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
    ],
    include: ['/*'],
  },
};

/**
 * 请求中间件
 */
export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  // 检查是否应该跳过中间件
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  try {
    let response = NextResponse.next();

    // 1. 安全审计（最先执行，记录所有请求）
    if (DEFAULT_CONFIG.audit) {
      auditRequest(request);
    }

    // 2. 安全中间件（验证请求、应用安全头）
    if (DEFAULT_CONFIG.security) {
      const validation = securityMiddleware.validateRequest(request);

      if (!validation.safe && validation.riskLevel === 'high') {
        // 记录高风险请求被阻止
        securityAudit.logSecurityViolation(
          '高风险请求被阻止',
          `请求 ${request.method} ${request.url} 因安全风险被阻止: ${validation.reasons.join(', ')}`,
          'high',
          {
            method: request.method,
            url: request.url,
            reasons: validation.reasons,
            userAgent: request.headers.get('user-agent') || 'unknown',
            ipAddress: getClientIP(request),
          },
          {
            ipAddress: getClientIP(request),
            userAgent: request.headers.get('user-agent') || 'unknown',
          }
        );

        return NextResponse.json(
          { error: '请求被安全策略拒绝' },
          { status: 403 }
        );
      }

      response = securityMiddleware.applySecurityHeaders(request, response);
    }

    // 3. 缓存中间件（GET请求的响应缓存）
    if (DEFAULT_CONFIG.cache && request.method === 'GET') {
      response = cacheMiddleware.handleRequest(request, response);
    }

    // 4. 添加性能头
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    response.headers.set('X-Middleware-Time', new Date().toISOString());

    // 5. 记录成功处理的请求
    if (DEFAULT_CONFIG.audit) {
      const success = response.status < 400;
      securityAudit.logApiAccess(
        pathname,
        request.method,
        success ? 'success' : 'failure',
        {
          statusCode: response.status,
          responseTime: Date.now() - startTime,
          cacheHit: response.headers.get('X-Cache') === 'HIT',
        },
        {
          userId: getUserIdFromRequest(request),
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );
    }

    return response;
  } catch (error) {
    // 记录中间件错误
    logger.error('中间件处理失败', error as Error, {
      type: 'middleware',
      pathname,
      method: request.method,
      processingTime: Date.now() - startTime,
    });

    securityAudit.logSecurityViolation(
      '中间件处理失败',
      `请求 ${request.method} ${pathname} 在中间件处理时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
      'medium',
      {
        pathname,
        method: request.method,
        error: error instanceof Error ? error.message : '未知错误',
        processingTime: Date.now() - startTime,
      },
      {
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    );

    // 返回通用错误响应
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 检查是否应该跳过中间件
 */
function shouldSkipMiddleware(pathname: string): boolean {
  return DEFAULT_CONFIG.paths.exclude.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern;
  });
}

/**
 * 审计请求
 */
function auditRequest(request: NextRequest): void {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ipAddress = getClientIP(request);

  // 记录可疑请求模式
  const suspiciousPatterns = [
    /\.\./,  // 路径遍历
    /<script/i,  // XSS尝试
    /union.*select/i,  // SQL注入尝试
    /javascript:/i,  // JavaScript协议
    /data:.*base64/i,  // Base64数据URI
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(pathname) || pattern.test(request.nextUrl.search)
  );

  if (isSuspicious) {
    securityAudit.logSuspiciousActivity(
      '可疑请求模式',
      `检测到可疑请求: ${method} ${pathname}${request.nextUrl.search}`,
      'medium',
      {
        method,
        pathname,
        search: request.nextUrl.search,
        userAgent,
      },
      {
        ipAddress,
        userAgent,
      }
    );
  }

  // 记录异常请求频率
  const clientKey = `${ipAddress}_${pathname}`;
  // 这里可以实现请求频率检查逻辑
}

/**
 * 获取客户端IP
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.ip ||
    'unknown'
  );
}

/**
 * 从请求中获取用户ID
 */
function getUserIdFromRequest(request: NextRequest): string | undefined {
  // 尝试从各种可能的来源获取用户ID
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');

  // 这里可以根据实际的认证机制来实现
  // 例如：解析JWT token、session cookie等

  return undefined; // 暂时返回undefined，需要根据实际认证方式实现
}

/**
 * 中间件匹配配置
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};