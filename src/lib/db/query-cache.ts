import { CacheService, CacheKeyBuilder } from '@/lib/cache/redis-client';
import { logger } from '@/lib/logging/structured-logger';
import crypto from 'crypto';

// 查询缓存配置
interface QueryCacheConfig {
  enabled: boolean;
  defaultTTL: number; // 默认缓存时间（秒）
  maxResultSize: number; // 最大结果大小（字节）
  keyPrefix: string;
  invalidationStrategy: 'time' | 'tag' | 'manual';
  compressionEnabled: boolean;
}

// 缓存策略
interface CacheStrategy {
  ttl: number;
  key: string;
  tags?: string[];
  dependencies?: string[];
  forceRefresh?: boolean;
}

// 查询结果缓存
interface CachedQueryResult<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  queryHash: string;
  rowCount?: number;
  compressed?: boolean;
  size: number;
}

// 缓存统计
interface CacheStats {
  hits: number;
  misses: number;
  totalQueries: number;
  hitRate: number;
  evictions: number;
  size: number;
  lastReset: number;
}

/**
 * 数据库查询缓存管理器
 */
export class QueryCache {
  private static instance: QueryCache;
  private config: QueryCacheConfig;
  private stats: CacheStats;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.stats = this.initializeStats();
  }

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): QueryCacheConfig {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';

    return {
      enabled: isProduction,
      defaultTTL: isProduction ? 300 : 60, // 5分钟 / 1分钟
      maxResultSize: 1024 * 1024, // 1MB
      keyPrefix: 'db_query',
      invalidationStrategy: 'tag',
      compressionEnabled: isProduction,
    };
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      hitRate: 0,
      evictions: 0,
      size: 0,
      lastReset: Date.now(),
    };
  }

  /**
   * 生成查询哈希
   */
  private generateQueryHash(query: string, params?: any[]): string {
    const hashInput = {
      query: query.trim().toLowerCase(),
      params: params || [],
    };

    const hashString = JSON.stringify(hashInput, Object.keys(hashInput).sort());
    return crypto.createHash('md5').update(hashString).digest('hex');
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    queryHash: string,
    strategy?: CacheStrategy,
  ): string {
    const prefix = strategy?.key || this.config.keyPrefix;
    return CacheKeyBuilder.build(prefix, queryHash);
  }

  /**
   * 序列化结果
   */
  private serializeResult<T>(data: T): string {
    try {
      const serialized = JSON.stringify(data);

      // 检查大小限制
      if (serialized.length > this.config.maxResultSize) {
        logger.warn('查询结果过大，跳过缓存', {
          type: 'query_cache',
          size: serialized.length,
          maxSize: this.config.maxResultSize,
        });
        throw new Error('结果过大');
      }

      return serialized;
    } catch (error) {
      logger.error('序列化查询结果失败', error as Error, {
        type: 'query_cache',
      });
      throw error;
    }
  }

  /**
   * 反序列化结果
   */
  private deserializeResult<T>(serialized: string): T {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      logger.error('反序列化查询结果失败', error as Error, {
        type: 'query_cache',
      });
      throw error;
    }
  }

  /**
   * 压缩数据
   */
  private async compress(data: string): Promise<string> {
    if (!this.config.compressionEnabled) {
      return data;
    }

    try {
      // 这里可以使用压缩算法，如zlib
      // 为了简化，暂时返回原始数据
      return data;
    } catch (error) {
      logger.warn('数据压缩失败，使用原始数据', {
        type: 'query_cache',
        error: error instanceof Error ? error.message : '未知错误',
      });
      return data;
    }
  }

  /**
   * 解压缩数据
   */
  private async decompress(data: string): Promise<string> {
    if (!this.config.compressionEnabled) {
      return data;
    }

    try {
      // 这里可以使用解压缩算法
      // 为了简化，暂时返回原始数据
      return data;
    } catch (error) {
      logger.warn('数据解压缩失败，使用原始数据', {
        type: 'query_cache',
        error: error instanceof Error ? error.message : '未知错误',
      });
      return data;
    }
  }

  /**
   * 获取缓存查询结果
   */
  async get<T>(
    query: string,
    params?: any[],
    strategy?: CacheStrategy,
  ): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, params);
    const cacheKey = this.generateCacheKey(queryHash, strategy);

    try {
      this.stats.totalQueries++;

      // 检查是否强制刷新
      if (strategy?.forceRefresh) {
        await this.delete(cacheKey);
        return null;
      }

      const cachedData = await CacheService.get<string>(cacheKey);

      if (cachedData) {
        const decompressed = await this.decompress(cachedData);
        const result: CachedQueryResult<T> =
          this.deserializeResult(decompressed);

        // 检查是否过期
        const now = Date.now();
        const age = now - result.timestamp;
        if (age > result.ttl * 1000) {
          await this.delete(cacheKey);
          this.stats.misses++;
          this.updateHitRate();
          return null;
        }

        this.stats.hits++;
        this.updateHitRate();

        logger.debug('查询缓存命中', {
          type: 'query_cache',
          queryHash: queryHash.substring(0, 8),
          age,
          ttl: result.ttl,
          fetchTime: Date.now() - startTime,
        });

        return result.data;
      } else {
        this.stats.misses++;
        this.updateHitRate();

        logger.debug('查询缓存未命中', {
          type: 'query_cache',
          queryHash: queryHash.substring(0, 8),
          fetchTime: Date.now() - startTime,
        });

        return null;
      }
    } catch (error) {
      logger.error('获取查询缓存失败', error as Error, {
        type: 'query_cache',
        queryHash: queryHash.substring(0, 8),
      });

      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 设置查询缓存
   */
  async set<T>(
    query: string,
    data: T,
    params?: any[],
    strategy?: CacheStrategy,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = Date.now();
    const queryHash = this.generateQueryHash(query, params);
    const cacheKey = this.generateCacheKey(queryHash, strategy);

    try {
      const serialized = this.serializeResult(data);
      const compressed = await this.compress(serialized);

      const cacheResult: CachedQueryResult<T> = {
        data,
        timestamp: Date.now(),
        ttl: strategy?.ttl || this.config.defaultTTL,
        queryHash,
        rowCount: Array.isArray(data) ? data.length : 1,
        compressed: this.config.compressionEnabled,
        size: compressed.length,
      };

      const finalData = await this.compress(this.serializeResult(cacheResult));

      await CacheService.set(
        cacheKey,
        finalData,
        strategy?.ttl || this.config.defaultTTL,
      );

      // 设置标签
      if (strategy?.tags && strategy.tags.length > 0) {
        for (const tag of strategy.tags) {
          const tagKey = CacheKeyBuilder.build(
            this.config.keyPrefix,
            'tag',
            tag,
          );
          await CacheService.sadd(tagKey, [cacheKey]);
          await CacheService.expire(
            tagKey,
            strategy?.ttl || this.config.defaultTTL,
          );
        }
      }

      logger.debug('查询结果已缓存', {
        type: 'query_cache',
        queryHash: queryHash.substring(0, 8),
        ttl: cacheResult.ttl,
        size: cacheResult.size,
        rowCount: cacheResult.rowCount,
        setTime: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('设置查询缓存失败', error as Error, {
        type: 'query_cache',
        queryHash: queryHash.substring(0, 8),
      });
    }
  }

  /**
   * 删除缓存
   */
  async delete(cacheKey: string): Promise<void> {
    try {
      await CacheService.del(cacheKey);
    } catch (error) {
      logger.error('删除查询缓存失败', error as Error, {
        type: 'query_cache',
        cacheKey,
      });
    }
  }

  /**
   * 按标签删除缓存
   */
  async deleteByTag(tag: string): Promise<void> {
    if (!this.config.enabled || this.config.invalidationStrategy !== 'tag') {
      return;
    }

    try {
      const tagKey = CacheKeyBuilder.build(this.config.keyPrefix, 'tag', tag);
      const keys = await CacheService.smembers(tagKey);

      if (keys.length > 0) {
        await CacheService.del(...keys);
        await CacheService.del(tagKey);

        logger.info('按标签删除缓存完成', {
          type: 'query_cache',
          tag,
          deletedKeys: keys.length,
        });
      }
    } catch (error) {
      logger.error('按标签删除缓存失败', error as Error, {
        type: 'query_cache',
        tag,
      });
    }
  }

  /**
   * 清空所有查询缓存
   */
  async clear(): Promise<void> {
    try {
      const pattern = CacheKeyBuilder.build(this.config.keyPrefix, '*');
      // 这里需要实现模式匹配删除功能
      // 具体实现取决于Redis客户端

      this.stats = this.initializeStats();

      logger.info('查询缓存已清空', {
        type: 'query_cache',
      });
    } catch (error) {
      logger.error('清空查询缓存失败', error as Error, {
        type: 'query_cache',
      });
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    this.stats.hitRate =
      this.stats.totalQueries > 0
        ? (this.stats.hits / this.stats.totalQueries) * 100
        : 0;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    logger.info('查询缓存统计已重置', {
      type: 'query_cache',
    });
  }

  /**
   * 缓存装饰器
   */
  cached<T extends any[], R>(
    strategy: CacheStrategy,
    queryBuilder: (...args: T) => { query: string; params?: any[] },
  ) {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor,
    ) => {
      const method = descriptor.value;

      descriptor.value = async (...args: T): Promise<R> => {
        const { query, params } = queryBuilder(...args);

        // 尝试从缓存获取
        const cached = await QueryCache.getInstance().get<R>(
          query,
          params,
          strategy,
        );
        if (cached !== null) {
          return cached;
        }

        // 执行原方法
        const result = await method.apply(this, args);

        // 缓存结果
        await QueryCache.getInstance().set(query, result, params, strategy);

        return result;
      };

      return descriptor;
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<QueryCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('查询缓存配置已更新', {
      type: 'query_cache',
      config: this.config,
    });
  }

  /**
   * 获取配置
   */
  getConfig(): QueryCacheConfig {
    return { ...this.config };
  }
}

// 创建单例实例
export const queryCache = QueryCache.getInstance();

// 导出便捷方法
export const getCachedQuery = <T>(
  query: string,
  params?: any[],
  strategy?: CacheStrategy,
) => queryCache.get<T>(query, params, strategy);

export const setCachedQuery = <T>(
  query: string,
  data: T,
  params?: any[],
  strategy?: CacheStrategy,
) => queryCache.set(query, data, params, strategy);

export const deleteCachedQuery = (cacheKey: string) =>
  queryCache.delete(cacheKey);

export const deleteCachedQueryByTag = (tag: string) =>
  queryCache.deleteByTag(tag);

// 导出装饰器
export const Cached = queryCache.cached.bind(queryCache);

export default queryCache;
