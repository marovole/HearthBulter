/**
 * Supabase Trend Cache (L2 缓存层)
 *
 * 使用 `trend_data` 表作为中间层缓存，存储预计算的趋势分析结果
 *
 * Schema: prisma/schema.prisma:655-681
 * - memberId, dataType, startDate, endDate (唯一索引)
 * - aggregatedData (JSON 字符串)
 * - 统计字段: mean, median, min, max, stdDev, slope, rSquared
 * - 元数据: expiresAt, hitCount, createdAt, updatedAt
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import type { TrendDataType } from '@/lib/types/analytics';

/**
 * 辅助函数：将 camelCase 转换为 snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * 辅助函数：将对象键从 camelCase 转换为 snake_case
 */
function keysToSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase);
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = keysToSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

/**
 * 趋势缓存数据结构
 */
export interface TrendCacheData {
  /** 聚合数据（JSON 字符串） */
  aggregatedData: any;
  /** 平均值 */
  mean?: number | null;
  /** 中位数 */
  median?: number | null;
  /** 最小值 */
  min?: number | null;
  /** 最大值 */
  max?: number | null;
  /** 标准差 */
  stdDev?: number | null;
  /** 趋势方向 */
  trendDirection?: string | null;
  /** 斜率 */
  slope?: number | null;
  /** R² 值 */
  rSquared?: number | null;
  /** 预测数据（JSON 字符串） */
  predictions?: any | null;
}

/**
 * 趋势缓存查询参数
 */
export interface TrendCacheQuery {
  /** 成员 ID */
  memberId: string;
  /** 数据类型 */
  dataType: TrendDataType;
  /** 开始日期 */
  startDate: Date;
  /** 结束日期 */
  endDate: Date;
}

/**
 * 趋势缓存结果
 */
export interface TrendCacheResult extends TrendCacheData {
  /** 缓存 ID */
  id: string;
  /** 过期时间 */
  expiresAt: Date;
  /** 命中次数 */
  hitCount: number;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * Supabase Trend Cache 管理器
 *
 * 提供 L2 缓存的 CRUD 操作
 */
export class SupabaseTrendCache {
  private _supabase: SupabaseClient<Database> | null = null;

  /**
   * 获取 Supabase 客户端实例（延迟加载）
   */
  private get supabase(): SupabaseClient<Database> {
    if (!this._supabase) {
      // 动态导入以避免模块顶层执行
      const { SupabaseClientManager } = require('@/lib/db/supabase-adapter');
      this._supabase = SupabaseClientManager.getInstance();
    }
    return this._supabase;
  }

  /**
   * 获取趋势缓存
   *
   * @param query - 查询参数
   * @returns 缓存结果，如果不存在或已过期则返回 null
   *
   * @example
   * const cache = new SupabaseTrendCache();
   * const result = await cache.get({
   *   memberId: 'member-123',
   *   dataType: 'WEIGHT',
   *   startDate: new Date('2025-01-01'),
   *   endDate: new Date('2025-01-31'),
   * });
   */
  async get(query: TrendCacheQuery): Promise<TrendCacheResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('trend_data')
        .select('*')
        .eq('member_id', query.memberId)
        .eq('data_type', query.dataType)
        .eq('start_date', query.startDate.toISOString())
        .eq('end_date', query.endDate.toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      // 检查是否过期
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        console.log('[SupabaseTrendCache] Cache expired, deleting');
        // 异步删除过期缓存
        this.delete(query).catch((err) =>
          console.error('[SupabaseTrendCache] Failed to delete expired cache:', err)
        );
        return null;
      }

      // 增加命中次数（异步，不阻塞）
      this.incrementHitCount(data.id).catch((err) =>
        console.warn('[SupabaseTrendCache] Failed to increment hit count:', err)
      );

      return {
        id: data.id,
        aggregatedData: this.parseJson(data.aggregated_data),
        mean: data.mean,
        median: data.median,
        min: data.min,
        max: data.max,
        stdDev: data.std_dev,
        trendDirection: data.trend_direction,
        slope: data.slope,
        rSquared: data.r_squared,
        predictions: this.parseJson(data.predictions),
        expiresAt,
        hitCount: data.hit_count,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('[SupabaseTrendCache] Get error:', error);
      return null;
    }
  }

  /**
   * 设置趋势缓存
   *
   * @param query - 查询参数
   * @param data - 缓存数据
   * @param ttl - TTL（秒），默认 300 秒（5 分钟）
   * @returns 是否成功
   *
   * @example
   * await cache.set(query, {
   *   aggregatedData: trendData,
   *   mean: 70.5,
   *   median: 70.0,
   *   trendDirection: 'UP',
   * }, 600);
   */
  async set(query: TrendCacheQuery, data: TrendCacheData, ttl = 300): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      // 先获取现有记录的 hit_count（如果存在）
      const { data: existingData } = await this.supabase
        .from('trend_data')
        .select('hit_count')
        .eq('member_id', query.memberId)
        .eq('data_type', query.dataType)
        .eq('start_date', query.startDate.toISOString())
        .eq('end_date', query.endDate.toISOString())
        .maybeSingle();

      const currentHitCount = existingData?.hit_count ?? 0;

      const { error } = await this.supabase.from('trend_data').upsert(
        {
          member_id: query.memberId,
          data_type: query.dataType,
          start_date: query.startDate.toISOString(),
          end_date: query.endDate.toISOString(),
          aggregated_data: JSON.stringify(data.aggregatedData),
          mean: data.mean ?? null,
          median: data.median ?? null,
          min: data.min ?? null,
          max: data.max ?? null,
          std_dev: data.stdDev ?? null,
          trend_direction: data.trendDirection ?? null,
          slope: data.slope ?? null,
          r_squared: data.rSquared ?? null,
          predictions: data.predictions ? JSON.stringify(data.predictions) : null,
          expires_at: expiresAt.toISOString(),
          hit_count: currentHitCount, // 保留现有命中次数
          updated_at: now.toISOString(),
        },
        {
          onConflict: 'member_id,data_type,start_date,end_date',
        }
      );

      if (error) {
        console.error('[SupabaseTrendCache] Set error:', error);
        return false;
      }

      console.log(`[SupabaseTrendCache] Set cache (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('[SupabaseTrendCache] Set error:', error);
      return false;
    }
  }

  /**
   * 删除趋势缓存
   *
   * @param query - 查询参数
   * @returns 是否成功
   */
  async delete(query: TrendCacheQuery): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('trend_data')
        .delete()
        .eq('member_id', query.memberId)
        .eq('data_type', query.dataType)
        .eq('start_date', query.startDate.toISOString())
        .eq('end_date', query.endDate.toISOString());

      if (error) {
        console.error('[SupabaseTrendCache] Delete error:', error);
        return false;
      }

      console.log('[SupabaseTrendCache] Cache deleted');
      return true;
    } catch (error) {
      console.error('[SupabaseTrendCache] Delete error:', error);
      return false;
    }
  }

  /**
   * 删除成员的所有缓存
   *
   * @param memberId - 成员 ID
   * @param dataType - 可选的数据类型过滤
   * @returns 删除的行数
   */
  async deleteByMember(memberId: string, dataType?: TrendDataType): Promise<number> {
    try {
      let query = this.supabase.from('trend_data').delete().eq('member_id', memberId);

      if (dataType) {
        query = query.eq('data_type', dataType);
      }

      const { error, count } = await query.select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[SupabaseTrendCache] Delete by member error:', error);
        return 0;
      }

      console.log(`[SupabaseTrendCache] Deleted ${count ?? 0} cache entries for member`);
      return count ?? 0;
    } catch (error) {
      console.error('[SupabaseTrendCache] Delete by member error:', error);
      return 0;
    }
  }

  /**
   * 清理过期缓存
   *
   * @returns 清理的行数
   */
  async cleanupExpired(): Promise<number> {
    try {
      const { error, count } = await this.supabase
        .from('trend_data')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[SupabaseTrendCache] Cleanup expired error:', error);
        return 0;
      }

      console.log(`[SupabaseTrendCache] Cleaned up ${count ?? 0} expired cache entries`);
      return count ?? 0;
    } catch (error) {
      console.error('[SupabaseTrendCache] Cleanup expired error:', error);
      return 0;
    }
  }

  /**
   * 增加命中次数
   *
   * @param id - 缓存 ID
   * @returns 是否成功
   */
  private async incrementHitCount(id: string): Promise<boolean> {
    try {
      // 使用 RPC 原子递增（推荐方式）
      const { error } = await this.supabase.rpc('increment_trend_cache_hit', {
        cache_id: id,
      });

      // 如果 RPC 不存在，降级为读-修改-写操作
      if (error && error.message?.includes('function')) {
        console.warn('[SupabaseTrendCache] RPC increment_trend_cache_hit not found, using fallback');

        // 读取当前值
        const { data: current } = await this.supabase
          .from('trend_data')
          .select('hit_count')
          .eq('id', id)
          .single();

        if (!current) {
          return false;
        }

        // 更新为递增值
        const { error: updateError } = await this.supabase
          .from('trend_data')
          .update({ hit_count: (current.hit_count ?? 0) + 1 })
          .eq('id', id);

        if (updateError) {
          console.error('[SupabaseTrendCache] Increment hit count error:', updateError);
          return false;
        }
      } else if (error) {
        console.error('[SupabaseTrendCache] Increment hit count RPC error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SupabaseTrendCache] Increment hit count error:', error);
      return false;
    }
  }

  /**
   * 解析 JSON 字符串
   *
   * @param json - JSON 字符串或对象
   * @returns 解析后的对象
   */
  private parseJson(json: string | any | null): any {
    if (!json) {
      return null;
    }

    if (typeof json === 'string') {
      try {
        return JSON.parse(json);
      } catch {
        return json;
      }
    }

    return json;
  }
}

/**
 * 获取全局 Supabase Trend Cache 实例
 *
 * 单例模式
 */
let trendCacheInstance: SupabaseTrendCache | null = null;

export function getTrendCache(): SupabaseTrendCache {
  if (!trendCacheInstance) {
    trendCacheInstance = new SupabaseTrendCache();
  }
  return trendCacheInstance;
}
