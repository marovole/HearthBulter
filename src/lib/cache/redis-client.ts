import { Redis } from '@upstash/redis';

// Redis 客户端配置
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export { redis };

// 缓存配置
export const CACHE_CONFIG = {
  // 默认过期时间（秒）
  DEFAULT_TTL: 300, // 5分钟

  // 不同类型数据的过期时间
  TTL: {
    USER_SESSION: 3600,        // 1小时
    NUTRITION_DATA: 1800,      // 30分钟
    RECIPE_DATA: 3600,         // 1小时
    STATIC_CONFIG: 86400,      // 24小时
    API_RESPONSE: 300,         // 5分钟
    QUERY_RESULT: 600,         // 10分钟
  },

  // 缓存键前缀
  PREFIXES: {
    USER: 'user',
    NUTRITION: 'nutrition',
    RECIPE: 'recipe',
    CONFIG: 'config',
    API: 'api',
    QUERY: 'query',
  },
};

// 缓存键生成工具
export class CacheKeyBuilder {
  static build(prefix: string, identifier: string, suffix?: string): string {
    const parts = [prefix, identifier];
    if (suffix) {
      parts.push(suffix);
    }
    return parts.join(':');
  }

  static user(userId: string, suffix?: string): string {
    return this.build(CACHE_CONFIG.PREFIXES.USER, userId, suffix);
  }

  static nutrition(identifier: string, suffix?: string): string {
    return this.build(CACHE_CONFIG.PREFIXES.NUTRITION, identifier, suffix);
  }

  static recipe(identifier: string, suffix?: string): string {
    return this.build(CACHE_CONFIG.PREFIXES.RECIPE, identifier, suffix);
  }

  static config(identifier: string, suffix?: string): string {
    return this.build(CACHE_CONFIG.PREFIXES.CONFIG, identifier, suffix);
  }

  static api(endpoint: string, params?: string): string {
    const key = this.build(CACHE_CONFIG.PREFIXES.API, endpoint);
    return params ? `${key}:${params}` : key;
  }

  static query(queryHash: string): string {
    return this.build(CACHE_CONFIG.PREFIXES.QUERY, queryHash);
  }
}

// 缓存服务类
export class CacheService {
  /**
   * 设置缓存
   */
  static async set<T>(
    key: string,
    value: T,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.set(key, serializedValue, { ex: ttl });
    } catch (error) {
      console.error('Cache set error:', error);
      // 缓存失败不应该影响主要功能
    }
  }

  /**
   * 获取缓存
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) return null;

      // 尝试解析 JSON，如果失败则返回原始值
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * 批量删除缓存（支持模式匹配）
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  /**
   * 检查缓存是否存在
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): Promise<T> {
    try {
      // 尝试从缓存获取
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // 缓存未命中，获取数据
      const data = await fetcher();

      // 设置缓存（即使数据为 null 也缓存，防止缓存穿透）
      await this.set(key, data, ttl);

      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      // 如果缓存失败，直接返回 fetcher 结果
      return fetcher();
    }
  }

  /**
   * 增加缓存过期时间
   */
  static async expire(key: string, ttl: number): Promise<void> {
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
    }
  }

  /**
   * 获取缓存剩余过期时间
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  }
}

export default CacheService;