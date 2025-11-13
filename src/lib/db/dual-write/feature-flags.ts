/**
 * Feature Flag 管理
 *
 * 提供双写验证框架的运行时开关控制，支持：
 * - 双写模式开关
 * - 主库切换（Prisma/Supabase）
 * - 缓存优化
 *
 * @module feature-flags
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';

/**
 * Feature Flag 配置
 */
export interface FeatureFlags {
  /** 是否启用双写模式 */
  enableDualWrite: boolean;
  /** 是否使用 Supabase 作为主库（false = Prisma 为主） */
  enableSupabasePrimary: boolean;
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * Feature Flag 缓存键
 */
const CACHE_KEY = 'dual_write_feature_flags';
const CACHE_TTL_MS = 5000; // 5秒缓存

/**
 * Feature Flag 管理器
 *
 * 从 Supabase 配置表读取 Feature Flags，
 * 提供内存缓存减少数据库查询
 */
export class FeatureFlagManager {
  private cache: {
    data: FeatureFlags | null;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0,
  };

  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * 获取 Feature Flags
   *
   * 优先从缓存读取，缓存过期后从数据库刷新
   *
   * @returns Feature Flags 配置
   */
  async getFlags(): Promise<FeatureFlags> {
    const now = Date.now();

    // 检查缓存是否有效
    if (this.cache.data && now - this.cache.timestamp < CACHE_TTL_MS) {
      return this.cache.data;
    }

    // 缓存失效，从数据库读取
    try {
      const { data, error } = await this.supabase
        .from('dual_write_config')
        .select('*')
        .eq('key', CACHE_KEY)
        .maybeSingle();

      if (error) {
        console.error('[FeatureFlags] Failed to read from database:', error);
        return this.getFallbackFlags();
      }

      if (!data) {
        // 配置不存在，使用默认值
        return this.getFallbackFlags();
      }

      const flags: FeatureFlags = {
        enableDualWrite: data.value.enableDualWrite === true,
        enableSupabasePrimary: data.value.enableSupabasePrimary === true,
        updatedAt: new Date(data.updated_at),
      };

      // 更新缓存
      this.cache = {
        data: flags,
        timestamp: now,
      };

      return flags;
    } catch (err) {
      console.error('[FeatureFlags] Unexpected error:', err);
      return this.getFallbackFlags();
    }
  }

  /**
   * 更新 Feature Flags
   *
   * 写入数据库并清除缓存
   *
   * @param flags - 新的 Feature Flags 配置
   */
  async updateFlags(flags: Omit<FeatureFlags, 'updatedAt'>): Promise<void> {
    const { error } = await this.supabase.from('dual_write_config').upsert(
      {
        key: CACHE_KEY,
        value: {
          enableDualWrite: flags.enableDualWrite,
          enableSupabasePrimary: flags.enableSupabasePrimary,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'key',
      }
    );

    if (error) {
      throw new Error(`Failed to update feature flags: ${error.message}`);
    }

    // 清除缓存，强制下次读取时刷新
    this.cache = {
      data: null,
      timestamp: 0,
    };
  }

  /**
   * 清除缓存
   *
   * 用于测试或强制刷新
   */
  clearCache(): void {
    this.cache = {
      data: null,
      timestamp: 0,
    };
  }

  /**
   * 获取后备 Feature Flags
   *
   * 当数据库读取失败时使用
   * 默认：双写关闭，Prisma 为主
   */
  private getFallbackFlags(): FeatureFlags {
    // 尝试从环境变量读取
    const enableDualWrite = process.env.ENABLE_DUAL_WRITE === 'true';
    const enableSupabasePrimary = process.env.ENABLE_SUPABASE_PRIMARY === 'true';

    return {
      enableDualWrite,
      enableSupabasePrimary,
      updatedAt: new Date(),
    };
  }
}

/**
 * 便捷函数：创建 Feature Flag Manager
 *
 * @param supabase - Supabase 客户端
 * @returns Feature Flag Manager 实例
 */
export function createFeatureFlagManager(
  supabase: SupabaseClient<Database>
): FeatureFlagManager {
  return new FeatureFlagManager(supabase);
}
