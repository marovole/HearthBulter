/**
 * Cloudflare Workers/Pages 环境类型定义
 *
 * 定义 Cloudflare 运行时可用的绑定和全局变量
 */

/**
 * KV 命名空间绑定
 *
 * Cloudflare KV 是一个全球分布式键值存储，提供最终一致性
 *
 * 限制：
 * - 键大小：最大 512 字节
 * - 值大小：最大 25 MB（推荐 < 1MB 以获得最佳性能）
 * - 最终一致性：写入后可能需要 60 秒全球传播
 */
interface KVNamespace {
  /**
   * 从 KV 获取值
   *
   * @param key - 键名
   * @param options - 可选配置
   * @returns Promise<string | null>
   */
  get(key: string, options?: { type: 'text' }): Promise<string | null>;
  get(key: string, options: { type: 'json' }): Promise<any>;
  get(
    key: string,
    options: { type: 'arrayBuffer' },
  ): Promise<ArrayBuffer | null>;
  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;

  /**
   * 向 KV 写入值
   *
   * @param key - 键名
   * @param value - 值（字符串、ArrayBuffer 或 ReadableStream）
   * @param options - 可选配置
   */
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      /** 过期时间（秒），相对于当前时间 */
      expirationTtl?: number;
      /** 过期时间戳（Unix 时间戳） */
      expiration?: number;
      /** 元数据（JSON 序列化，最大 1024 字节） */
      metadata?: any;
    },
  ): Promise<void>;

  /**
   * 从 KV 删除值
   *
   * @param key - 键名
   */
  delete(key: string): Promise<void>;

  /**
   * 列出 KV 中的键
   *
   * @param options - 可选配置
   */
  list(options?: {
    /** 键前缀过滤 */
    prefix?: string;
    /** 分页限制 */
    limit?: number;
    /** 分页游标 */
    cursor?: string;
  }): Promise<{
    keys: Array<{ name: string; expiration?: number; metadata?: any }>;
    list_complete: boolean;
    cursor?: string;
  }>;

  /**
   * 获取键及其元数据
   *
   * @param key - 键名
   * @param options - 可选配置
   */
  getWithMetadata<Metadata = unknown>(
    key: string,
    options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' },
  ): Promise<{
    value: string | any | ArrayBuffer | ReadableStream | null;
    metadata: Metadata | null;
  }>;
}

/**
 * Cloudflare Pages 函数环境
 *
 * 在 Cloudflare Pages Functions 中可用的全局变量
 */
declare global {
  /**
   * KV 缓存命名空间
   *
   * 绑定名称：CACHE_KV
   * 用途：边缘缓存（L1）
   */
  const CACHE_KV: KVNamespace | undefined;

  /**
   * Cloudflare Pages 环境接口
   *
   * 用于 Next.js API Routes 中访问 Cloudflare 绑定
   */
  interface CloudflarePagesEnv {
    /** KV 缓存绑定 */
    CACHE_KV?: KVNamespace;
  }

  /**
   * Next.js Request 扩展
   *
   * 在 Cloudflare Pages 环境中，request 对象会包含 env 属性
   */
  namespace NodeJS {
    interface ProcessEnv {
      /** Cloudflare 环境名称 */
      CF_PAGES_ENV?: 'production' | 'preview';
      /** Cloudflare Pages Commit SHA */
      CF_PAGES_COMMIT_SHA?: string;
      /** Cloudflare Pages Branch */
      CF_PAGES_BRANCH?: string;
    }
  }
}

export {};
