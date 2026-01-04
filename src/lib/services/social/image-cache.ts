/**
 * 图片缓存服务
 * 用于缓存生成的分享图片，提高性能和减少重复生成
 */

import { createHash } from "crypto";

interface CacheEntry {
  url: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

class ImageCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 生成缓存键
   */
  private generateCacheKey(template: string, data: any): string {
    const dataStr = JSON.stringify(data, Object.keys(data).sort());
    return createHash("md5").update(`${template}:${dataStr}`).digest("hex");
  }

  /**
   * 获取缓存的图片
   */
  get(template: string, data: any): string | null {
    const key = this.generateCacheKey(template, data);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry.url;
  }

  /**
   * 设置图片缓存
   */
  set(template: string, data: any, url: string, ttl?: number): void {
    const key = this.generateCacheKey(template, data);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.defaultTTL));

    this.cache.set(key, {
      url,
      createdAt: now,
      expiresAt,
      metadata: { template, data },
    });
  }

  /**
   * 删除缓存
   */
  delete(template: string, data: any): boolean {
    const key = this.generateCacheKey(template, data);
    return this.cache.delete(key);
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    size: number;
  } {
    const now = new Date();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiresAt < now) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      size: this.cache.size,
    };
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 预热缓存（可选功能）
   */
  async warmup(): Promise<void> {
    // 这里可以实现预热逻辑，比如预先生成常用的分享图片
    console.log("图片缓存预热完成");
  }
}

// 导出单例实例
export const imageCache = new ImageCache();

// 定期清理过期缓存
setInterval(
  () => {
    const cleaned = imageCache.cleanup();
    if (cleaned > 0) {
      console.log(`清理了 ${cleaned} 个过期的图片缓存`);
    }
  },
  60 * 60 * 1000,
); // 每小时清理一次

export default imageCache;
