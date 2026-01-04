/**
 * Edge Cache 辅助函数
 *
 * 为 Cloudflare Pages 环境提供轻量级的缓存解决方案。
 *
 * 注意：
 * - Cloudflare Pages + Next.js 不支持 `caches.default` API
 * - 使用 Next.js 的响应头缓存策略（`Cache-Control`）
 * - 依赖 Cloudflare CDN 的边缘缓存
 *
 * 缓存策略：
 * - `s-maxage`: CDN 缓存时间（秒）
 * - `stale-while-revalidate`: 允许提供过期内容的时间
 * - `private`: 仅客户端缓存，不被 CDN 缓存
 * - `public`: 允许 CDN 和客户端缓存
 */

/**
 * 缓存配置选项
 */
export interface EdgeCacheOptions {
  /**
   * CDN 缓存时间（秒）
   * 默认：60 秒
   */
  maxAge?: number;

  /**
   * 允许提供过期内容的时间（秒）
   * 默认：30 秒
   */
  staleWhileRevalidate?: number;

  /**
   * 是否为私有缓存（仅客户端）
   * 默认：false（公共缓存）
   */
  private?: boolean;

  /**
   * 缓存变体标识符（用于生成 Vary 头）
   * 例如：['Authorization', 'X-Member-Id']
   */
  varyBy?: string[];
}

/**
 * 生成 Cache-Control 头
 *
 * @param options - 缓存配置选项
 * @returns Cache-Control 头值
 *
 * @example
 * const cacheControl = buildCacheControlHeader({ maxAge: 60, staleWhileRevalidate: 30 });
 * // "public, s-maxage=60, stale-while-revalidate=30"
 */
export function buildCacheControlHeader(
  options: EdgeCacheOptions = {},
): string {
  const {
    maxAge = 60,
    staleWhileRevalidate = 30,
    private: isPrivate = false,
  } = options;

  const directives = [isPrivate ? "private" : "public", `s-maxage=${maxAge}`];

  if (staleWhileRevalidate > 0) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  return directives.join(", ");
}

/**
 * 生成 Vary 头（用于缓存变体）
 *
 * @param varyBy - 变体标识符数组
 * @returns Vary 头值
 *
 * @example
 * const vary = buildVaryHeader(['Authorization', 'X-Member-Id']);
 * // "Authorization, X-Member-Id"
 */
export function buildVaryHeader(varyBy: string[] = []): string {
  return varyBy.join(", ");
}

/**
 * 生成缓存 key
 *
 * 用于标识唯一的缓存条目，包含：
 * - 路径
 * - 用户标识符
 * - 查询参数
 *
 * @param path - API 路径（如 '/api/ai/advice-history'）
 * @param userId - 用户 ID
 * @param params - 查询参数对象
 * @returns 缓存 key 字符串
 *
 * @example
 * const key = buildCacheKey('/api/ai/advice-history', 'user-123', { memberId: 'member-456', limit: '10' });
 * // "edge-cache:api/ai/advice-history:user-123:memberId=member-456&limit=10"
 */
export function buildCacheKey(
  path: string,
  userId: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const cleanPath = path.replace(/^\//, "");

  const sortedParams = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const parts = ["edge-cache", cleanPath, userId];
  if (sortedParams) {
    parts.push(sortedParams);
  }

  return parts.join(":");
}

/**
 * Edge Cache 预设配置
 */
export const EDGE_CACHE_PRESETS = {
  /**
   * AI 端点缓存（60 秒）
   * 注意：使用 private 缓存因为依赖 Cookie 认证
   * 仅在客户端缓存，CDN 不缓存，避免数据泄露
   */
  AI_ENDPOINT: {
    maxAge: 60,
    staleWhileRevalidate: 30,
    private: true, // P0 修复：避免 CDN 缓存用户数据
    varyBy: ["Cookie"], // 基于 Cookie 变化
  } as EdgeCacheOptions,

  /**
   * Analytics 端点缓存（120 秒）
   */
  ANALYTICS_ENDPOINT: {
    maxAge: 120,
    staleWhileRevalidate: 60,
    private: false,
    varyBy: ["Authorization"],
  } as EdgeCacheOptions,

  /**
   * 用户数据缓存（30 秒，私有）
   */
  USER_DATA: {
    maxAge: 30,
    staleWhileRevalidate: 15,
    private: true,
    varyBy: ["Authorization"],
  } as EdgeCacheOptions,

  /**
   * 静态数据缓存（300 秒）
   */
  STATIC_DATA: {
    maxAge: 300,
    staleWhileRevalidate: 150,
    private: false,
  } as EdgeCacheOptions,
} as const;

/**
 * 为响应添加缓存头
 *
 * 这是一个便捷函数，直接为响应对象添加缓存相关的头。
 *
 * @param headers - Headers 对象
 * @param options - 缓存配置选项
 *
 * @example
 * const headers = new Headers();
 * addCacheHeaders(headers, EDGE_CACHE_PRESETS.AI_ENDPOINT);
 * const response = new Response(JSON.stringify(data), { headers });
 */
export function addCacheHeaders(
  headers: Headers,
  options: EdgeCacheOptions = {},
): void {
  headers.set("Cache-Control", buildCacheControlHeader(options));

  if (options.varyBy && options.varyBy.length > 0) {
    headers.set("Vary", buildVaryHeader(options.varyBy));
  }
}

/**
 * 检查请求是否可以使用缓存
 *
 * 检查条件：
 * - 必须是 GET 请求
 * - 不包含 `Cache-Control: no-cache` 头
 * - 不包含 `Pragma: no-cache` 头
 *
 * @param request - NextRequest 对象
 * @returns 是否可以使用缓存
 *
 * @example
 * if (canUseCache(request)) {
 *   // 尝试从缓存获取
 * }
 */
export function canUseCache(request: Request): boolean {
  // 只有 GET 请求可以缓存
  if (request.method !== "GET") {
    return false;
  }

  const cacheControl = request.headers.get("Cache-Control");
  const pragma = request.headers.get("Pragma");

  // 检查客户端是否禁用缓存
  if (cacheControl?.includes("no-cache") || pragma?.includes("no-cache")) {
    return false;
  }

  return true;
}
