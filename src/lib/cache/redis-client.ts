import { Redis } from '@upstash/redis';

// Redis 客户端配置
// 自动清理环境变量中的空白字符（防止Vercel配置问题）
const redisUrl = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
const redisToken = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

// 检查Redis配置是否完整
const isRedisConfigured =
  redisUrl && redisToken && redisUrl !== '' && redisToken !== '';

const redis = isRedisConfigured
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

export { redis, isRedisConfigured };

// 缓存配置
export const CACHE_CONFIG = {
  // 默认过期时间（秒）
  DEFAULT_TTL: 300, // 5分钟

  // 不同类型数据的过期时间
  TTL: {
    USER_SESSION: 3600, // 1小时
    NUTRITION_DATA: 1800, // 30分钟
    RECIPE_DATA: 3600, // 1小时
    STATIC_CONFIG: 86400, // 24小时
    API_RESPONSE: 300, // 5分钟
    QUERY_RESULT: 600, // 10分钟
    FOOD_SEARCH: 1800, // 30分钟 - 食品搜索结果
    USDA_DATA: 86400, // 24小时 - USDA API 数据
    FOOD_SEARCH_EMPTY: 300, // 5分钟 - 空结果缓存（防止缓存穿透）
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

// 缓存统计接口
interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  lastUpdated: Date;
}

// 性能日志接口
interface PerformanceLog {
  operation: string;
  duration: number;
  cacheHit: boolean;
  timestamp: Date;
  key?: string;
}

// 缓存服务类
export class CacheService {
  // 连接状态跟踪
  private static connectionHealthy = isRedisConfigured;
  private static lastConnectionCheck = new Date();
  private static readonly CONNECTION_CHECK_INTERVAL = 60000; // 1分钟检查一次

  // 内存中的缓存统计（用于实时监控）
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    lastUpdated: new Date(),
  };

  // 性能日志队列（最多保留最近100条）
  private static performanceLogs: PerformanceLog[] = [];
  private static readonly MAX_LOGS = 100;

  /**
   * 记录性能日志
   */
  private static logPerformance(log: PerformanceLog): void {
    this.performanceLogs.push(log);
    if (this.performanceLogs.length > this.MAX_LOGS) {
      this.performanceLogs.shift();
    }

    // 如果响应时间超过3秒，输出告警日志
    if (log.duration > 3000) {
      console.warn('⚠️ 性能告警:', {
        operation: log.operation,
        duration: `${log.duration}ms`,
        cacheHit: log.cacheHit,
        key: log.key,
        timestamp: log.timestamp.toISOString(),
      });
    }
  }

  /**
   * 更新缓存统计
   */
  private static updateStats(hit: boolean): void {
    this.stats.totalRequests++;
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    this.stats.hitRate =
      this.stats.totalRequests > 0
        ? (this.stats.hits / this.stats.totalRequests) * 100
        : 0;
    this.stats.lastUpdated = new Date();
  }

  /**
   * 获取缓存统计信息
   */
  static getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取性能日志
   */
  static getPerformanceLogs(limit?: number): PerformanceLog[] {
    const logs = [...this.performanceLogs].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * 测试Redis连接
   */
  static async testConnection(): Promise<boolean> {
    if (!isRedisConfigured || !redis) {
      this.connectionHealthy = false;
      return false;
    }

    try {
      await redis.ping();
      this.connectionHealthy = true;
      this.lastConnectionCheck = new Date();
      return true;
    } catch (error) {
      this.connectionHealthy = false;
      this.lastConnectionCheck = new Date();
      console.error('Redis连接测试失败:', error);
      return false;
    }
  }

  /**
   * 检查是否需要测试连接
   */
  private static shouldTestConnection(): boolean {
    const now = new Date();
    const timeSinceLastCheck =
      now.getTime() - this.lastConnectionCheck.getTime();
    return timeSinceLastCheck > this.CONNECTION_CHECK_INTERVAL;
  }

  /**
   * 确保连接可用（如果需要会测试连接）
   */
  private static async ensureConnection(): Promise<boolean> {
    if (!isRedisConfigured) {
      return false;
    }

    if (!this.connectionHealthy || this.shouldTestConnection()) {
      await this.testConnection();
    }

    return this.connectionHealthy;
  }

  /**
   * 获取连接状态
   */
  static getConnectionStatus(): {
    healthy: boolean;
    configured: boolean;
    lastCheck: Date;
  } {
    return {
      healthy: this.connectionHealthy,
      configured: isRedisConfigured,
      lastCheck: this.lastConnectionCheck,
    };
  }

  /**
   * 重置统计信息
   */
  static resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      lastUpdated: new Date(),
    };
    this.performanceLogs = [];
  }

  /**
   * 设置缓存
   */
  static async set<T>(
    key: string,
    value: T,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      // 检查Redis连接
      const isConnectionHealthy = await this.ensureConnection();
      if (!isConnectionHealthy || !redis) {
        console.warn('Redis连接不可用，跳过缓存设置操作');
        return;
      }

      const serializedValue = JSON.stringify(value);
      await redis.set(key, serializedValue, { ex: ttl });

      const duration = Date.now() - startTime;
      this.logPerformance({
        operation: 'cache:set',
        duration,
        cacheHit: false,
        timestamp: new Date(),
        key: key.split(':')[0], // 只记录前缀，避免泄露敏感信息
      });
    } catch (error) {
      console.error('Cache set error:', error);
      this.connectionHealthy = false; // 标记连接不健康
      // 缓存失败不应该影响主要功能
    }
  }

  /**
   * 获取缓存
   */
  static async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      // 检查Redis连接
      const isConnectionHealthy = await this.ensureConnection();
      if (!isConnectionHealthy || !redis) {
        console.warn('Redis连接不可用，跳过缓存获取操作');
        this.updateStats(false); // 记录为未命中
        return null;
      }

      const value = await redis.get(key);
      const duration = Date.now() - startTime;
      const hit = value !== null;

      // 更新统计
      this.updateStats(hit);

      // 记录性能日志
      this.logPerformance({
        operation: 'cache:get',
        duration,
        cacheHit: hit,
        timestamp: new Date(),
        key: key.split(':')[0],
      });

      if (!value) return null;

      // 尝试解析 JSON，如果失败则返回原始值
      try {
        return JSON.parse(value as string) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.connectionHealthy = false; // 标记连接不健康
      this.updateStats(false); // 记录为未命中
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
    ttl: number = CACHE_CONFIG.DEFAULT_TTL,
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
