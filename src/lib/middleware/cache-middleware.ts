import { NextRequest, NextResponse } from 'next/server';
import { CacheService, CacheKeyBuilder, CACHE_CONFIG } from '@/lib/cache/redis-client';

// 缓存中间件配置
interface CacheMiddlewareOptions {
  ttl?: number;
  varyHeaders?: string[];
  skipCache?: (request: NextRequest) => boolean;
  cacheKeyGenerator?: (request: NextRequest) => string;
}

/**
 * 创建缓存中间件
 */
export function createCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = CACHE_CONFIG.TTL.API_RESPONSE,
    varyHeaders = ['authorization', 'cookie'],
    skipCache = () => false,
    cacheKeyGenerator
  } = options;

  return async (request: NextRequest): Promise<NextResponse | null> => {
    // 跳过缓存的条件
    if (
      request.method !== 'GET' ||
      skipCache(request)
    ) {
      return null;
    }

    // 生成缓存键
    let cacheKey: string;
    if (cacheKeyGenerator) {
      cacheKey = cacheKeyGenerator(request);
    } else {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const search = url.search;
      cacheKey = CacheKeyBuilder.api(`${pathname}${search}`);
    }

    try {
      // 尝试从缓存获取响应
      const cachedResponse = await CacheService.get<{
        status: number;
        headers: Record<string, string>;
        body: string;
      }>(cacheKey);

      if (cachedResponse) {
        // 检查 Vary 头部
        const cachedVary = cachedResponse.headers['vary'];
        const shouldVary = cachedVary && varyHeaders.some(header =>
          request.headers.get(header) !== cachedResponse.headers[`x-${header}`]
        );

        if (!shouldVary) {
          // 返回缓存响应
          const response = new NextResponse(cachedResponse.body, {
            status: cachedResponse.status,
            headers: cachedResponse.headers,
          });

          // 添加缓存标识
          response.headers.set('X-Cache', 'HIT');
          response.headers.set('Age', String(Math.floor(Date.now() / 1000) - parseInt(cachedResponse.headers['x-cached-at'] || '0')));

          return response;
        }
      }
    } catch (error) {
      console.error('Cache middleware error:', error);
    }

    return null;
  };
}

/**
 * 缓存响应包装器
 */
export function wrapResponseWithCache(
  response: NextResponse,
  request: NextRequest,
  options: CacheMiddlewareOptions = {}
): NextResponse {
  const {
    ttl = CACHE_CONFIG.TTL.API_RESPONSE,
    varyHeaders = ['authorization', 'cookie'],
    cacheKeyGenerator
  } = options;

  // 只缓存成功的 GET 请求
  if (request.method !== 'GET' || !response.ok) {
    return response;
  }

  // 异步缓存响应（不阻塞响应）
  setImmediate(async () => {
    try {
      // 生成缓存键
      let cacheKey: string;
      if (cacheKeyGenerator) {
        cacheKey = cacheKeyGenerator(request);
      } else {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const search = url.search;
        cacheKey = CacheKeyBuilder.api(`${pathname}${search}`);
      }

      // 准备缓存数据
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // 添加 Vary 相关信息
      if (varyHeaders.length > 0) {
        headers['vary'] = varyHeaders.join(', ');
        varyHeaders.forEach(header => {
          const value = request.headers.get(header);
          if (value) {
            headers[`x-${header}`] = value;
          }
        });
      }

      // 添加缓存时间戳
      headers['x-cached-at'] = String(Math.floor(Date.now() / 1000));

      // 获取响应体
      const body = await response.text();

      // 缓存响应数据
      await CacheService.set(cacheKey, {
        status: response.status,
        headers,
        body,
      }, ttl);
    } catch (error) {
      console.error('Response caching error:', error);
    }
  });

  // 添加缓存标识
  response.headers.set('X-Cache', 'MISS');
  return response;
}

/**
 * 默认的缓存中间件选项
 */
export const defaultCacheMiddlewareOptions: CacheMiddlewareOptions = {
  ttl: CACHE_CONFIG.TTL.API_RESPONSE,
  varyHeaders: ['authorization', 'cookie'],
  skipCache: (request) => {
    // 跳过缓存的请求
    const url = new URL(request.url);

    // 跳过动态路由
    if (url.pathname.includes('/api/')) {
      const pathname = url.pathname;

      // 跳过需要实时数据的 API
      const skipPatterns = [
        '/api/notifications',
        '/api/analytics',
        '/api/reports',
        '/api/realtime',
      ];

      return skipPatterns.some(pattern => pathname.includes(pattern));
    }

    return false;
  },
};

/**
 * 预定义的缓存中间件
 */
export const cacheMiddleware = createCacheMiddleware(defaultCacheMiddlewareOptions);

/**
 * 静态资源缓存中间件
 */
export const staticCacheMiddleware = createCacheMiddleware({
  ttl: CACHE_CONFIG.TTL.STATIC_CONFIG,
  varyHeaders: [],
  skipCache: () => false,
});

/**
 * 用户数据缓存中间件
 */
export const userDataCacheMiddleware = createCacheMiddleware({
  ttl: CACHE_CONFIG.TTL.USER_SESSION,
  varyHeaders: ['authorization', 'cookie'],
  skipCache: (request) => {
    // 跳过敏感用户数据的缓存
    const url = new URL(request.url);
    const pathname = url.pathname;

    const sensitivePatterns = [
      '/api/auth',
      '/api/users/profile',
      '/api/families/members',
    ];

    return sensitivePatterns.some(pattern => pathname.includes(pattern));
  },
});