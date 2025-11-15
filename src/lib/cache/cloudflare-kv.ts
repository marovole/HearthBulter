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
 * Cloudflare KV 客户端
 *
 * 封装 KV API，提供：
 * - 自动 TTL 管理
 * - 类型安全的 get/set
 * - 错误处理和降级
 * - 命中/失败日志
 */
export class KvCache {
  private readonly options: Required<KvCacheOptions>;
  private kv: KVNamespace | null = null;

  constructor(options: KvCacheOptions = {}) {
    this.options = {
      defaultTtl: options.defaultTtl ?? 60,
      debug: options.debug ?? false,
      keyPrefix: options.keyPrefix ?? 'cache:',
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
      const result = await this.kv!.getWithMetadata<KvMetadata>(fullKey, { type: 'json' });

      if (result.value === null) {
        this.log(`KV miss: ${key}`);
        return {
          success: false,
          source: 'kv-miss',
          duration: Date.now() - startTime,
        };
      }

      // 检查是否过期（客户端验证）
      if (result.metadata?.expiresAt && result.metadata.expiresAt < Date.now() / 1000) {
        this.log(`KV expired: ${key}`);
        // 异步删除过期键
        this.kv!.delete(fullKey).catch((err) =>
          console.error('[KvCache] Failed to delete expired key:', err)
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

      await this.kv!.put(fullKey, JSON.stringify(value), {
        expirationTtl,
        metadata,
      });

      this.log(`KV set: ${key} (TTL: ${expirationTtl}s)`);
      return true;
    } catch (error) {
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
      await this.kv!.delete(fullKey);
      this.log(`KV deleted: ${key}`);
      return true;
    } catch (error) {
      console.error('[KvCache] Delete error:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存（按前缀）
   *
   * @param prefix - 键前缀
   * @returns 删除的键数量
   *
   * @example
   * await kv.deleteByPrefix('user-');
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const fullPrefix = this.buildKey(prefix);
      let count = 0;
      let cursor: string | undefined;

      do {
        const result = await this.kv!.list({ prefix: fullPrefix, cursor });
        const deletePromises = result.keys.map((key) => this.kv!.delete(key.name));
        await Promise.all(deletePromises);
        count += result.keys.length;
        cursor = result.cursor;
      } while (cursor);

      this.log(`KV deleted by prefix: ${prefix} (${count} keys)`);
      return count;
    } catch (error) {
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
      console.warn('[KvCache] KV binding not available (development mode or not deployed to Cloudflare)');
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
