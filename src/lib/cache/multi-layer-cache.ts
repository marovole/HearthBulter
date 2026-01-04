/**
 * 多层缓存协调器
 *
 * 实现三层缓存架构：
 * - L1: Cloudflare KV (60s TTL) - 边缘缓存，最快
 * - L2: Supabase trend_data 表 (300s TTL) - 数据库缓存
 * - L3: Materialized View - 聚合视图（未来扩展）
 *
 * 降级策略：L1 miss → L2 → L3 → 实时查询
 *
 * 使用方式：
 * ```typescript
 * const cache = new MultiLayerCache();
 * const result = await cache.get(cacheKey, async () => {
 *   return await fetchDataFromDatabase();
 * });
 * ```
 */

import { KvCache, type KvResult } from "./cloudflare-kv";
import {
  SupabaseTrendCache,
  type TrendCacheQuery,
  type TrendCacheData,
} from "./supabase-trend-cache";
import { buildCacheKey } from "./edge-cache-helpers";

/**
 * 缓存层枚举
 */
export enum CacheLayer {
  L1_KV = "l1-kv",
  L2_TREND_DATA = "l2-trend-data",
  L3_MATERIALIZED_VIEW = "l3-materialized-view",
  DATABASE = "database",
}

/**
 * 多层缓存配置
 */
export interface MultiLayerCacheOptions {
  /** L1 (KV) TTL（秒），默认 60 */
  l1Ttl?: number;
  /** L2 (trend_data) TTL（秒），默认 300 */
  l2Ttl?: number;
  /** 是否启用调试日志，默认 false */
  debug?: boolean;
  /** 是否禁用 L1 (KV)，默认 false */
  disableL1?: boolean;
  /** 是否禁用 L2 (trend_data)，默认 false */
  disableL2?: boolean;
}

/**
 * 缓存结果
 */
export interface CacheResult<T> {
  /** 数据 */
  data: T;
  /** 来源层 */
  source: CacheLayer;
  /** 是否为缓存命中 */
  hit: boolean;
  /** 获取耗时（毫秒） */
  duration: number;
  /** 元数据 */
  metadata?: {
    /** L1 结果 */
    l1?: KvResult<T>;
    /** L2 命中次数 */
    l2HitCount?: number;
  };
}

/**
 * 趋势数据缓存键参数
 */
export interface TrendCacheKeyParams {
  /** 成员 ID */
  memberId: string;
  /** 数据类型 */
  dataType: string;
  /** 开始日期 (ISO 8601) */
  startDate: string;
  /** 结束日期 (ISO 8601) */
  endDate: string;
  /** 容器 ID（可选） */
  containerId?: string;
}

/**
 * 多层缓存管理器
 *
 * 协调 L1 (KV) 和 L2 (trend_data) 的读写操作
 */
export class MultiLayerCache {
  private readonly kvCache: KvCache;
  private readonly trendCache: SupabaseTrendCache;
  private readonly options: Required<MultiLayerCacheOptions>;

  constructor(options: MultiLayerCacheOptions = {}) {
    this.options = {
      l1Ttl: options.l1Ttl ?? 60,
      l2Ttl: options.l2Ttl ?? 300,
      debug: options.debug ?? false,
      disableL1: options.disableL1 ?? false,
      disableL2: options.disableL2 ?? false,
    };

    this.kvCache = new KvCache({
      defaultTtl: this.options.l1Ttl,
      debug: this.options.debug,
      keyPrefix: "cache:",
    });

    this.trendCache = new SupabaseTrendCache();
  }

  /**
   * 获取缓存数据（通用方法）
   *
   * 流程：
   * 1. 尝试从 L1 (KV) 获取
   * 2. L1 miss → 从 L2 (trend_data) 获取
   * 3. L2 miss → 执行 fallback 函数（实时查询）
   * 4. 将结果写回 L2 和 L1
   *
   * @param cacheKey - 缓存键
   * @param fallback - 降级函数（从数据库查询）
   * @param options - 可选配置
   * @returns 缓存结果
   *
   * @example
   * const result = await cache.get('user-123:trends', async () => {
   *   return await db.getTrends();
   * });
   */
  async get<T = any>(
    cacheKey: string,
    fallback: () => Promise<T>,
    options?: {
      /** 跳过 L1 */
      skipL1?: boolean;
      /** 跳过 L2 */
      skipL2?: boolean;
    },
  ): Promise<CacheResult<T>> {
    const startTime = Date.now();

    // L1: Cloudflare KV
    if (
      !this.options.disableL1 &&
      !options?.skipL1 &&
      this.kvCache.isAvailable()
    ) {
      const l1Result = await this.kvCache.get<T>(cacheKey);
      if (l1Result.success && l1Result.data !== undefined) {
        this.log(`Cache hit: L1 (KV), key=${cacheKey}`);
        return {
          data: l1Result.data,
          source: CacheLayer.L1_KV,
          hit: true,
          duration: Date.now() - startTime,
          metadata: { l1: l1Result },
        };
      }
      this.log(
        `Cache miss: L1 (KV), key=${cacheKey}, source=${l1Result.source}`,
      );
    }

    // L2: Supabase trend_data (需要解析缓存键)
    // 注意：L2 仅用于趋势数据，通用缓存只使用 L1
    this.log(`Skipping L2 for generic cache key: ${cacheKey}`);

    // Fallback: 实时查询
    this.log(`Cache miss: All layers, executing fallback, key=${cacheKey}`);
    const data = await fallback();

    // 写回 L1
    if (!this.options.disableL1 && this.kvCache.isAvailable()) {
      await this.kvCache.set(cacheKey, data, this.options.l1Ttl);
      this.log(
        `Cache set: L1 (KV), key=${cacheKey}, ttl=${this.options.l1Ttl}s`,
      );
    }

    return {
      data,
      source: CacheLayer.DATABASE,
      hit: false,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 获取趋势数据缓存（专用方法）
   *
   * 使用完整的 L1 → L2 → Fallback 流程
   *
   * @param query - 趋势查询参数
   * @param fallback - 降级函数
   * @returns 缓存结果
   *
   * @example
   * const result = await cache.getTrendData(
   *   { memberId: '123', dataType: 'WEIGHT', startDate: new Date(), endDate: new Date() },
   *   async () => await analyzer.analyzeTrends(...)
   * );
   */
  async getTrendData<T = any>(
    query: TrendCacheQuery,
    fallback: () => Promise<T>,
  ): Promise<CacheResult<T>> {
    const startTime = Date.now();

    // 构建缓存键
    const cacheKey = this.buildTrendCacheKey({
      memberId: query.memberId,
      dataType: query.dataType,
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
    });

    // L1: Cloudflare KV
    if (!this.options.disableL1 && this.kvCache.isAvailable()) {
      const l1Result = await this.kvCache.get<T>(cacheKey);
      if (l1Result.success && l1Result.data !== undefined) {
        this.log(`Trend cache hit: L1 (KV), key=${cacheKey}`);
        return {
          data: l1Result.data,
          source: CacheLayer.L1_KV,
          hit: true,
          duration: Date.now() - startTime,
          metadata: { l1: l1Result },
        };
      }
      this.log(`Trend cache miss: L1 (KV), key=${cacheKey}`);
    }

    // L2: Supabase trend_data
    if (!this.options.disableL2) {
      const l2Result = await this.trendCache.get(query);
      if (l2Result) {
        this.log(`Trend cache hit: L2 (trend_data), key=${cacheKey}`);

        // 写回 L1
        if (!this.options.disableL1 && this.kvCache.isAvailable()) {
          await this.kvCache.set(
            cacheKey,
            l2Result.aggregatedData,
            this.options.l1Ttl,
          );
          this.log(`Trend cache backfill: L1 (KV) ← L2, key=${cacheKey}`);
        }

        return {
          data: l2Result.aggregatedData as T,
          source: CacheLayer.L2_TREND_DATA,
          hit: true,
          duration: Date.now() - startTime,
          metadata: { l2HitCount: l2Result.hitCount },
        };
      }
      this.log(`Trend cache miss: L2 (trend_data), key=${cacheKey}`);
    }

    // Fallback: 实时查询
    this.log(
      `Trend cache miss: All layers, executing fallback, key=${cacheKey}`,
    );
    const data = await fallback();

    // 写回 L2 和 L1
    await this.setTrendData(query, data as any);

    return {
      data,
      source: CacheLayer.DATABASE,
      hit: false,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 设置趋势数据缓存
   *
   * 同时写入 L1 (KV) 和 L2 (trend_data)
   *
   * @param query - 趋势查询参数
   * @param data - 趋势数据
   * @param trendStats - 可选的统计数据
   */
  async setTrendData(
    query: TrendCacheQuery,
    data: any,
    trendStats?: Partial<TrendCacheData>,
  ): Promise<void> {
    const cacheKey = this.buildTrendCacheKey({
      memberId: query.memberId,
      dataType: query.dataType,
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
    });

    // 写入 L2
    if (!this.options.disableL2) {
      await this.trendCache.set(
        query,
        {
          aggregatedData: data,
          ...trendStats,
        },
        this.options.l2Ttl,
      );
      this.log(
        `Trend cache set: L2 (trend_data), key=${cacheKey}, ttl=${this.options.l2Ttl}s`,
      );
    }

    // 写入 L1
    if (!this.options.disableL1 && this.kvCache.isAvailable()) {
      await this.kvCache.set(cacheKey, data, this.options.l1Ttl);
      this.log(
        `Trend cache set: L1 (KV), key=${cacheKey}, ttl=${this.options.l1Ttl}s`,
      );
    }
  }

  /**
   * 删除缓存
   *
   * 同时删除 L1 和 L2
   *
   * @param cacheKey - 缓存键
   */
  async invalidate(cacheKey: string): Promise<void> {
    // 删除 L1
    if (!this.options.disableL1 && this.kvCache.isAvailable()) {
      await this.kvCache.delete(cacheKey);
      this.log(`Cache invalidated: L1 (KV), key=${cacheKey}`);
    }

    // L2 需要解析查询参数（通用键不支持）
    this.log(`Cache invalidated: L1 only, key=${cacheKey}`);
  }

  /**
   * 删除趋势数据缓存
   *
   * @param query - 趋势查询参数
   */
  async invalidateTrendData(query: TrendCacheQuery): Promise<void> {
    const cacheKey = this.buildTrendCacheKey({
      memberId: query.memberId,
      dataType: query.dataType,
      startDate: query.startDate.toISOString(),
      endDate: query.endDate.toISOString(),
    });

    // 删除 L1
    if (!this.options.disableL1 && this.kvCache.isAvailable()) {
      await this.kvCache.delete(cacheKey);
    }

    // 删除 L2
    if (!this.options.disableL2) {
      await this.trendCache.delete(query);
    }

    this.log(`Trend cache invalidated: L1 + L2, key=${cacheKey}`);
  }

  /**
   * 删除成员的所有缓存
   *
   * @param memberId - 成员 ID
   */
  async invalidateByMember(memberId: string): Promise<void> {
    // 删除 L1（按前缀）
    if (!this.options.disableL1 && this.kvCache.isAvailable()) {
      const prefix = `trends:${memberId}:`;
      await this.kvCache.deleteByPrefix(prefix);
      this.log(`Cache invalidated by member: L1 (KV), prefix=${prefix}`);
    }

    // 删除 L2
    if (!this.options.disableL2) {
      await this.trendCache.deleteByMember(memberId);
      this.log(
        `Cache invalidated by member: L2 (trend_data), memberId=${memberId}`,
      );
    }
  }

  /**
   * 构建趋势缓存键
   *
   * 格式：trends:{memberId}:{dataType}:{startDate}:{endDate}
   *
   * @param params - 缓存键参数
   * @returns 缓存键
   */
  private buildTrendCacheKey(params: TrendCacheKeyParams): string {
    const { memberId, dataType, startDate, endDate } = params;
    const key = `trends:${memberId}:${dataType}:${startDate}:${endDate}`;
    return key;
  }

  /**
   * 记录调试日志
   *
   * @param message - 日志消息
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(`[MultiLayerCache] ${message}`);
    }
  }
}

/**
 * 获取全局多层缓存实例
 *
 * 单例模式
 */
let multiLayerCacheInstance: MultiLayerCache | null = null;

export function getMultiLayerCache(
  options?: MultiLayerCacheOptions,
): MultiLayerCache {
  if (!multiLayerCacheInstance) {
    multiLayerCacheInstance = new MultiLayerCache(options);
  }
  return multiLayerCacheInstance;
}
