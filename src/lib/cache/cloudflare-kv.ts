/**
 * Cloudflare KV 客户端包装器
 *
 * 提供类型安全的 KV 操作，包含错误处理、TTL 管理和日志记录
 *
 * 使用方式：
 * ```typescript
 * const kv = new KvCache();
 * if (kv.isAvailable()) {
 *   const data = await kv.get('my-key');
 * }
 * ```
 */

/**
 * KV 缓存配置
 */
export interface KvCacheOptions {
  /** 默认 TTL（秒），默认 60 秒 */
  defaultTtl?: number;
  /** 是否启用调试日志，默认 false */
  debug?: boolean;
  /** 键前缀，用于命名空间隔离，默认 'cache:' */
  keyPrefix?: string;
  /** deleteByPrefix 最大删除数量限制，默认 100 */
  maxDeletePerBatch?: number;
  /** 是否启用 API 调用计数器，默认 true */
  enableMetrics?: boolean;
}

/**
 * KV 操作结果
 */
export interface KvResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 数据（成功时） */
  data?: T;
  /** 错误信息（失败时） */
  error?: string;
  /** 缓存命中/失败来源 */
  source: 'kv-hit' | 'kv-miss' | 'kv-error';
  /** 操作耗时（毫秒） */
  duration?: number;
}

/**
 * KV 缓存元数据
 */
export interface KvMetadata {
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 过期时间（Unix 时间戳） */
  expiresAt: number;
  /** 数据类型标识 */
  type?: string;
  /** 版本号 */
  version?: number;
}

/**
 * KV API 调用指标
 */
export interface KvMetrics {
  reads: number;
  writes: number;
  deletes: number;
  lists: number;
  errors: number;
  lastReset: Date;
}

/**
 * Cloudflare KV 客户端
 *
 * 封装 KV API，提供：
 * - 自动 TTL 管理
 * - 类型安全的 get/set
 * - 错误处理和降级
 * - 命中/失败日志
 * - API 调用计数和限制
 */
export class KvCache {
  private readonly options: Required<KvCacheOptions>;
  private kv: KVNamespace | null = null;
  private metrics: KvMetrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    lists: 0,
    errors: 0,
    lastReset: new Date(),
  };

  constructor(options: KvCacheOptions = {}) {
    this.options = {
      defaultTtl: options.defaultTtl ?? 60,
      debug: options.debug ?? false,
      keyPrefix: options.keyPrefix ?? 'cache:',
      maxDeletePerBatch: options.maxDeletePerBatch ?? 100,
      enableMetrics: options.enableMetrics ?? true,
    };

    // 尝试获取 KV 绑定
    this.kv = this.getKvBinding();
  }

  /**
   * 检查 KV 是否可用
   *
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return this.kv !== null;
  }

  /**
   * 获取缓存数据
   *
   * @param key - 缓存键
   * @returns KV 操作结果
   *
   * @example
   * const result = await kv.get<MyData>('user-123');
   * if (result.success) {
   *   console.log(result.data);
   * }
   */
  async get<T = any>(key: string): Promise<KvResult<T>> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);

    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'KV binding not available',
        source: 'kv-error',
        duration: Date.now() - startTime,
      };
    }

    try {
      this.trackMetric('reads');
      const result = await this.kv!.getWithMetadata<KvMetadata>(fullKey, {
        type: 'json',
      });

      if (result.value === null) {
        this.log(`KV miss: ${key}`);
        return {
          success: false,
          source: 'kv-miss',
          duration: Date.now() - startTime,
        };
      }

      // 检查是否过期（客户端验证）
      if (
        result.metadata?.expiresAt &&
        result.metadata.expiresAt < Date.now() / 1000
      ) {
        this.log(`KV expired: ${key}`);
        // 异步删除过期键
        this.kv!.delete(fullKey).catch((err: Error) =>
          console.error('[KvCache] Failed to delete expired key:', err),
        );
        return {
          success: false,
          source: 'kv-miss',
          duration: Date.now() - startTime,
        };
      }

      this.log(`KV hit: ${key}`, result.metadata);
      return {
        success: true,
        data: result.value as T,
        source: 'kv-hit',
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.trackMetric('errors');
      console.error('[KvCache] Get error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'kv-error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 设置缓存数据
   *
   * @param key - 缓存键
   * @param value - 缓存值（会被 JSON 序列化）
   * @param ttl - TTL（秒），可选，默认使用 defaultTtl
   * @returns 是否成功
   *
   * @example
   * await kv.set('user-123', userData, 120);
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (!this.isAvailable()) {
      this.log(`KV set skipped (unavailable): ${key}`);
      return false;
    }

    try {
      const expirationTtl = ttl ?? this.options.defaultTtl;
      const metadata: KvMetadata = {
        createdAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + expirationTtl,
        type: typeof value,
        version: 1,
      };

      this.trackMetric('writes');
      await this.kv!.put(fullKey, JSON.stringify(value), {
        expirationTtl,
        metadata,
      });

      this.log(`KV set: ${key} (TTL: ${expirationTtl}s)`);
      return true;
    } catch (error) {
      this.trackMetric('errors');
      console.error('[KvCache] Set error:', error);
      return false;
    }
  }

  /**
   * 删除缓存数据
   *
   * @param key - 缓存键
   * @returns 是否成功
   *
   * @example
   * await kv.delete('user-123');
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (!this.isAvailable()) {
      return false;
    }

    try {
      this.trackMetric('deletes');
      await this.kv!.delete(fullKey);
      this.log(`KV deleted: ${key}`);
      return true;
    } catch (error) {
      this.trackMetric('errors');
      console.error('[KvCache] Delete error:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存（按前缀）
   *
   * ⚠️ 警告：此操作会产生大量 KV API 调用
   * - 每次 list() 调用消耗 1 次 List 配额
   * - 每个键的 delete() 消耗 1 次 Delete 配额
   * - 建议优先使用 TTL 自动过期
   *
   * @param prefix - 键前缀
   * @param options - 可选配置
   * @returns 删除的键数量
   *
   * @example
   * // 删除最多 100 个键
   * await kv.deleteByPrefix('user-', { limit: 100 });
   */
  async deleteByPrefix(
    prefix: string,
    options?: {
      /** 最大删除数量，默认使用 maxDeletePerBatch */
      limit?: number;
      /** 是否强制执行（忽略限制），默认 false */
      force?: boolean;
    },
  ): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    const maxDelete = options?.limit ?? this.options.maxDeletePerBatch;
    const force = options?.force ?? false;

    try {
      const fullPrefix = this.buildKey(prefix);
      let count = 0;
      let cursor: string | undefined;

      do {
        this.trackMetric('lists');
        const result = await this.kv!.list({
          prefix: fullPrefix,
          cursor,
          limit: 100,
        });

        // 检查是否超过限制
        if (!force && count + result.keys.length > maxDelete) {
          const remaining = maxDelete - count;
          if (remaining > 0) {
            // 只删除剩余允许的数量
            const keysToDelete = result.keys.slice(0, remaining);
            const deletePromises = keysToDelete.map((key: { name: string }) => {
              this.trackMetric('deletes');
              return this.kv!.delete(key.name);
            });
            await Promise.all(deletePromises);
            count += keysToDelete.length;
          }

          console.warn(
            `[KvCache] deleteByPrefix reached limit: ${maxDelete} keys. ` +
              'Set force:true or increase maxDeletePerBatch to delete more. ' +
              `Prefix: ${prefix}`,
          );
          break;
        }

        // 批量删除
        const deletePromises = result.keys.map((key: { name: string }) => {
          this.trackMetric('deletes');
          return this.kv!.delete(key.name);
        });
        await Promise.all(deletePromises);
        count += result.keys.length;
        cursor = result.cursor;

        // 如果不是强制模式且接近限制，发出警告
        if (!force && count >= maxDelete * 0.8) {
          console.warn(
            `[KvCache] deleteByPrefix approaching limit: ${count}/${maxDelete}. ` +
              `Prefix: ${prefix}`,
          );
        }
      } while (cursor && (force || count < maxDelete));

      this.log(`KV deleted by prefix: ${prefix} (${count} keys)`);

      // 记录指标告警
      if (this.options.enableMetrics) {
        this.logMetricsWarning();
      }

      return count;
    } catch (error) {
      this.trackMetric('errors');
      console.error('[KvCache] Delete by prefix error:', error);
      return 0;
    }
  }

  /**
   * 获取 KV 绑定
   *
   * @returns KV 命名空间或 null
   */
  private getKvBinding(): KVNamespace | null {
    // 尝试从 globalThis 获取（Cloudflare Pages Functions）
    if (typeof globalThis !== 'undefined' && 'CACHE_KV' in globalThis) {
      return (globalThis as any).CACHE_KV as KVNamespace;
    }

    // 开发环境或不支持 KV
    if (this.options.debug) {
      console.warn(
        '[KvCache] KV binding not available (development mode or not deployed to Cloudflare)',
      );
    }

    return null;
  }

  /**
   * 构建完整的缓存键
   *
   * @param key - 原始键
   * @returns 完整键
   */
  private buildKey(key: string): string {
    return `${this.options.keyPrefix}${key}`;
  }

  /**
   * 记录调试日志
   *
   * @param message - 日志消息
   * @param metadata - 可选元数据
   */
  private log(message: string, metadata?: any): void {
    if (this.options.debug) {
      console.log(`[KvCache] ${message}`, metadata || '');
    }
  }

  /**
   * 追踪 API 调用指标
   *
   * @param type - 操作类型
   */
  private trackMetric(type: keyof Omit<KvMetrics, 'lastReset'>): void {
    if (this.options.enableMetrics) {
      this.metrics[type]++;
    }
  }

  /**
   * 获取 API 调用指标
   *
   * @returns 当前指标
   */
  public getMetrics(): KvMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标计数器
   */
  public resetMetrics(): void {
    this.metrics = {
      reads: 0,
      writes: 0,
      deletes: 0,
      lists: 0,
      errors: 0,
      lastReset: new Date(),
    };
  }

  /**
   * 记录指标警告（如果接近限额）
   */
  private logMetricsWarning(): void {
    const metrics = this.metrics;
    const timeSinceReset = Date.now() - metrics.lastReset.getTime();
    const hoursElapsed = timeSinceReset / (1000 * 60 * 60);

    // Cloudflare 免费额度（每日）
    const dailyLimits = {
      reads: 100000,
      writes: 1000,
      deletes: 1000,
      lists: 1000,
    };

    // 计算预估每日用量
    const estimatedDaily = {
      reads:
        hoursElapsed > 0 ? Math.round((metrics.reads / hoursElapsed) * 24) : 0,
      writes:
        hoursElapsed > 0 ? Math.round((metrics.writes / hoursElapsed) * 24) : 0,
      deletes:
        hoursElapsed > 0
          ? Math.round((metrics.deletes / hoursElapsed) * 24)
          : 0,
      lists:
        hoursElapsed > 0 ? Math.round((metrics.lists / hoursElapsed) * 24) : 0,
    };

    // 检查是否超过 50% 限额
    const warnings: string[] = [];
    (Object.keys(dailyLimits) as Array<keyof typeof dailyLimits>).forEach(
      (key) => {
        const usage = estimatedDaily[key];
        const limit = dailyLimits[key];
        const percentage = (usage / limit) * 100;

        if (percentage >= 50) {
          warnings.push(
            `${key}: ${usage.toLocaleString()}/${limit.toLocaleString()} (${percentage.toFixed(1)}%)`,
          );
        }
      },
    );

    if (warnings.length > 0) {
      console.warn(
        `[KvCache] ⚠️ API 用量警告 - 预估每日用量接近或超过限额:\n${warnings
          .map((w) => `  - ${w}`)
          .join('\n')}\n已运行 ${hoursElapsed.toFixed(1)} 小时，当前累计: ` +
          `reads=${metrics.reads}, writes=${metrics.writes}, deletes=${metrics.deletes}, lists=${metrics.lists}`,
      );
    }
  }
}

/**
 * 获取全局 KV 缓存实例
 *
 * 单例模式，避免重复创建
 */
let kvCacheInstance: KvCache | null = null;

export function getKvCache(options?: KvCacheOptions): KvCache {
  if (!kvCacheInstance) {
    kvCacheInstance = new KvCache(options);
  }
  return kvCacheInstance;
}

/**
 * 检查 KV 是否可用（快捷函数）
 *
 * @returns 是否可用
 */
export function kvAvailable(): boolean {
  return getKvCache().isAvailable();
}
