/**
 * AI响应缓存服务
 *
 * 缓存AI API响应，避免重复调用相同的问题
 */

import { createHash } from 'crypto';

interface AIResponseCacheConfig {
  defaultTTL: number; // 默认缓存时间（秒）
  maxCacheSize: number; // 最大缓存条目数
  enableHashing: boolean; // 是否启用哈希键
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  totalSize: number;
  hitRate: number;
}

/**
 * AI响应缓存键生成器
 */
export class AICacheKeys {
  static healthAnalysis(memberId: string, dataHash: string): string {
    return `ai:health-analysis:${memberId}:${dataHash}`;
  }

  static recipeOptimization(
    recipeId: string,
    memberId: string,
    preferences: string,
  ): string {
    return `ai:recipe-optimization:${recipeId}:${memberId}:${preferences}`;
  }

  static chatResponse(sessionId: string, messageHash: string): string {
    return `ai:chat:${sessionId}:${messageHash}`;
  }

  static healthReport(
    memberId: string,
    reportType: string,
    startDate: string,
    endDate: string,
  ): string {
    return `ai:health-report:${memberId}:${reportType}:${startDate}:${endDate}`;
  }

  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }
}

/**
 * AI响应缓存服务
 */
export class AIResponseCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private config: AIResponseCacheConfig;
  private stats: CacheStats;

  constructor(config?: Partial<AIResponseCacheConfig>) {
    this.cache = new Map();
    this.config = {
      defaultTTL: 3600, // 1小时
      maxCacheSize: 1000,
      enableHashing: true,
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
    };

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 生成缓存键的哈希值
   */
  private hashKey(key: string): string {
    if (!this.config.enableHashing) return key;
    return createHash('md5').update(key).digest('hex');
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    const hashedKey = this.hashKey(key);
    const entry = this.cache.get(hashedKey);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hashedKey);
      this.stats.misses++;
      this.stats.totalSize--;
      this.updateHitRate();
      return null;
    }

    // 更新命中次数
    entry.hitCount++;
    this.stats.hits++;
    this.updateHitRate();

    console.log(`AI缓存命中: ${key} (命中次数: ${entry.hitCount})`);
    return entry.data as T;
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const hashedKey = this.hashKey(key);
    const now = Date.now();
    const ttlSeconds = ttl ?? this.config.defaultTTL;
    const hadKey = this.cache.has(hashedKey);

    // 检查是否需要驱逐
    if (
      this.cache.size >= this.config.maxCacheSize &&
      !this.cache.has(hashedKey)
    ) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data: value,
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000,
      hitCount: 0,
    };

    this.cache.set(hashedKey, entry);
    this.stats.sets++;
    if (!hadKey) {
      this.stats.totalSize++;
    }

    console.log(`AI缓存设置: ${key} (TTL: ${ttlSeconds}秒)`);
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    const hashedKey = this.hashKey(key);
    const deleted = this.cache.delete(hashedKey);
    if (deleted) {
      this.stats.totalSize--;
      console.log(`AI缓存删除: ${key}`);
    }
    return deleted;
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.totalSize = 0;
    console.log(`AI缓存清空: 删除了 ${size} 个条目`);
  }

  /**
   * 驱逐最少使用的缓存项
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestHitCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // 优先驱逐命中次数少的，如果命中次数相同则驱逐最老的
      if (
        entry.hitCount < lowestHitCount ||
        (entry.hitCount === lowestHitCount && entry.cachedAt < oldestTime)
      ) {
        oldestKey = key;
        oldestTime = entry.cachedAt;
        lowestHitCount = entry.hitCount;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.stats.totalSize--;
      console.log(`AI缓存驱逐: ${oldestKey} (命中次数: ${lowestHitCount})`);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
        this.stats.totalSize--;
      }
    }

    if (cleaned > 0) {
      console.log(`AI缓存清理: 删除了 ${cleaned} 个过期条目`);
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate =
      total > 0 ? Math.round((this.stats.hits / total) * 10000) / 100 : 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    this.stats.totalSize = this.cache.size;
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      totalSize: this.cache.size,
      hitRate: 0,
    };
  }

  /**
   * 获取详细的缓存信息（用于调试）
   */
  getCacheInfo(): Array<{
    key: string;
    cachedAt: number;
    expiresAt: number;
    hitCount: number;
    size: number;
  }> {
    const info = [];
    for (const [key, entry] of this.cache.entries()) {
      info.push({
        key,
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
        hitCount: entry.hitCount,
        size: JSON.stringify(entry.data).length,
      });
    }
    return info.sort((a, b) => b.hitCount - a.hitCount); // 按命中次数排序
  }

  /**
   * 预热缓存（可选）
   */
  async warmup(
    items: Array<{ key: string; value: any; ttl?: number }>,
  ): Promise<void> {
    console.log(`开始AI缓存预热: ${items.length} 个条目`);

    for (const item of items) {
      await this.set(item.key, item.value, item.ttl);
    }

    console.log('AI缓存预热完成');
  }
}

// 导出单例实例
export const aiResponseCache = new AIResponseCacheService({
  defaultTTL: 3600, // 1小时
  maxCacheSize: 500,
  enableHashing: true,
});

// 导出类型
export type { AIResponseCacheConfig, CacheStats, CacheEntry };
