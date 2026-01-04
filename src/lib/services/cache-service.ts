/**
 * 缓存服务
 *
 * 提供食物数据的缓存功能，支持Redis和内存缓存降级
 */

import { prisma } from "@/lib/db";
import type { Food } from "@prisma/client";

interface CacheConfig {
  useRedis: boolean;
  redisUrl?: string;
  defaultTTL: number; // 默认TTL（秒）
}

interface CacheStats {
  hits: number; // 缓存命中次数
  misses: number; // 缓存未命中次数
  sets: number; // 设置缓存次数
  deletes: number; // 删除缓存次数
}

// 内存缓存（当Redis不可用时使用）
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

/**
 * 缓存服务类
 */
export class CacheService {
  private config: CacheConfig;
  private redisClient: any = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      useRedis: config?.useRedis ?? false,
      redisUrl: config?.redisUrl ?? process.env.REDIS_URL,
      defaultTTL: config?.defaultTTL ?? 7776000, // 90天（秒）
    };

    // 如果配置了Redis URL，尝试初始化Redis客户端
    if (this.config.useRedis && this.config.redisUrl) {
      this.initRedis();
    }
  }

  /**
   * 初始化Redis客户端（可选）
   */
  private async initRedis() {
    try {
      // 动态导入redis（如果安装了）
      const redis = await import("ioredis").catch(() => null);
      if (redis) {
        this.redisClient = new redis.default(this.config.redisUrl, {
          retryStrategy: (times) => {
            // 重试策略：最多重试3次
            if (times > 3) {
              console.warn("Redis连接失败，切换到内存缓存");
              this.config.useRedis = false;
              return null;
            }
            return Math.min(times * 50, 2000);
          },
        });

        this.redisClient.on("error", (err: Error) => {
          console.error("Redis错误:", err);
          this.config.useRedis = false;
        });

        this.redisClient.on("connect", () => {
          console.log("Redis连接成功");
        });
      } else {
        console.warn("Redis未安装，使用内存缓存");
        this.config.useRedis = false;
      }
    } catch (error) {
      console.warn("Redis初始化失败，使用内存缓存:", error);
      this.config.useRedis = false;
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.config.useRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        }
        this.stats.misses++;
        return null;
      } catch (error) {
        console.error("Redis get错误:", error);
        // 降级到内存缓存
        return this.getFromMemory<T>(key);
      }
    }

    return this.getFromMemory<T>(key);
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.stats.sets++;
    const ttlSeconds = ttl ?? this.config.defaultTTL;

    if (this.config.useRedis && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (error) {
        console.error("Redis set错误:", error);
        // 降级到内存缓存
      }
    }

    this.setInMemory(key, value, ttlSeconds);
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    this.stats.deletes++;
    if (this.config.useRedis && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (error) {
        console.error("Redis delete错误:", error);
      }
    }

    memoryCache.delete(key);
  }

  /**
   * 从内存缓存获取
   */
  private getFromMemory<T>(key: string): T | null {
    const cached = memoryCache.get(key);
    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > cached.expiresAt) {
      memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.data as T;
  }

  /**
   * 设置内存缓存
   */
  private setInMemory(key: string, value: any, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    memoryCache.set(key, { data: value, expiresAt });

    // 定期清理过期项（简单实现）
    if (memoryCache.size > 1000) {
      this.cleanupMemoryCache();
    }
  }

  /**
   * 清理过期的内存缓存项
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now > value.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 10000) / 100, // 保留2位小数，转换为百分比
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

/**
 * 食物缓存键生成器
 */
export class FoodCacheKeys {
  static food(id: string): string {
    return `food:${id}`;
  }

  static foodSearch(query: string, category?: string): string {
    return `food:search:${query}:${category || "all"}`;
  }

  static foodCategory(category: string): string {
    return `food:category:${category}`;
  }

  static popularFoods(limit: number): string {
    return `food:popular:${limit}`;
  }
}

/**
 * 食物缓存服务（封装CacheService，提供食物特定的缓存方法）
 */
export class FoodCacheService {
  private cache: CacheService;

  constructor(cacheService?: CacheService) {
    this.cache =
      cacheService ??
      new CacheService({
        useRedis: !!process.env.REDIS_URL,
        defaultTTL: 7776000, // 90天
      });
  }

  /**
   * 获取食物缓存
   */
  async getFood(id: string): Promise<Food | null> {
    const cached = await this.cache.get<Food>(FoodCacheKeys.food(id));
    return cached;
  }

  /**
   * 设置食物缓存
   */
  async setFood(food: Food, ttl?: number): Promise<void> {
    await this.cache.set(FoodCacheKeys.food(food.id), food, ttl);
  }

  /**
   * 删除食物缓存
   */
  async deleteFood(id: string): Promise<void> {
    await this.cache.delete(FoodCacheKeys.food(id));
  }

  /**
   * 刷新USDA数据（当USDA数据超过90天时）
   */
  async refreshUSDAData(): Promise<void> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const staleFoods = await prisma.food.findMany({
      where: {
        source: "USDA",
        OR: [{ cachedAt: null }, { cachedAt: { lt: ninetyDaysAgo } }],
      },
      take: 100, // 每次处理100条
    });

    console.log(`发现${staleFoods.length}条需要刷新的USDA数据`);

    // 清除相关缓存
    for (const food of staleFoods) {
      await this.deleteFood(food.id);
    }

    // 注意：实际的USDA数据刷新应该在后台任务中完成
    // 这里只是清除缓存，让下次查询时重新获取
  }
}

// 导出单例实例
export const foodCacheService = new FoodCacheService();

// 导出类型
export type { CacheConfig, CacheStats };
