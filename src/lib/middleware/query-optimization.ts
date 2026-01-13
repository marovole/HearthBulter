// @ts-nocheck
// @ts-nocheck
/**
 * 数据库查询优化中间件
 * 提供查询性能监控、分页优化和缓存机制
 */

import { prisma } from "@/lib/db";

interface QueryOptions {
  take?: number;
  skip?: number;
  include?: any;
  select?: any;
  where?: any;
  orderBy?: any;
  timeout?: number;
}

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  resultCount: number;
  params?: any;
}

class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 100; // 100ms阈值
  private cache = new Map<string, { data: any; timestamp: Date }>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(query: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : "";
    return `${query}_${paramsStr}`;
  }

  /**
   * 检查缓存
   */
  private checkCache<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const now = new Date();
      if (now.getTime() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }
    return null;
  }

  /**
   * 设置缓存
   */
  private setCache<T>(cacheKey: string, data: T): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: new Date(),
    });

    // 清理过期缓存
    this.cleanExpiredCache();
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      if (now.getTime() - value.timestamp.getTime() > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 记录查询指标
   */
  private recordQueryMetrics(
    query: string,
    duration: number,
    resultCount: number,
    params?: any,
  ): void {
    const metric: QueryMetrics = {
      query,
      duration,
      timestamp: new Date(),
      resultCount,
      params,
    };

    this.queryMetrics.push(metric);

    // 只保留最近1000条查询记录
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // 如果是慢查询，记录警告
    if (duration > this.slowQueryThreshold) {
      console.warn(`🐌 慢查询检测: ${query} - 耗时: ${duration}ms`, {
        duration,
        resultCount,
        params,
      });
    }
  }

  /**
   * 优化findMany查询
   */
  async optimizedFindMany<T>(
    model: string,
    options: QueryOptions & { useCache?: boolean; cacheKey?: string } = {},
  ): Promise<T[]> {
    const startTime = Date.now();

    // 设置默认值
    const {
      take = 50, // 默认限制50条
      timeout = 30000, // 30秒超时
      useCache = false,
      cacheKey,
      ...queryOptions
    } = options;

    // 强制添加take限制
    const optimizedOptions = {
      ...queryOptions,
      take: Math.min(take, 100), // 最大100条
    };

    try {
      // 检查缓存
      if (useCache && cacheKey) {
        const cached = this.checkCache<T[]>(cacheKey);
        if (cached) {
          this.recordQueryMetrics(
            model,
            Date.now() - startTime,
            cached.length,
            { cached: true },
          );
          return cached;
        }
      }

      // 执行查询（带超时）
      const result = await this.executeWithTimeout<T[]>(
        () => (prisma as any)[model].findMany(optimizedOptions),
        timeout,
      );

      const duration = Date.now() - startTime;
      this.recordQueryMetrics(model, duration, result.length, optimizedOptions);

      // 设置缓存
      if (useCache && cacheKey && result.length > 0) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(model, duration, 0, { error: error.message });

      if (error.name === "QueryTimeoutError") {
        throw new Error(`查询超时: ${model} - 超时时间: ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * 优化count查询
   */
  async optimizedCount(
    model: string,
    where: any,
    options: { useCache?: boolean; cacheKey?: string } = {},
  ): Promise<number> {
    const startTime = Date.now();
    const { useCache = false, cacheKey } = options;

    // 检查缓存
    if (useCache && cacheKey) {
      const cached = this.checkCache<number>(cacheKey);
      if (cached !== null) {
        this.recordQueryMetrics(`${model}.count`, Date.now() - startTime, 1, {
          cached: true,
        });
        return cached;
      }
    }

    try {
      const result = await this.executeWithTimeout<number>(
        () => (prisma as any)[model].count({ where }),
        10000, // count查询10秒超时
      );

      const duration = Date.now() - startTime;
      this.recordQueryMetrics(`${model}.count`, duration, 1, { count: true });

      // 设置缓存
      if (useCache && cacheKey) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(`${model}.count`, duration, 0, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 带超时的查询执行
   */
  private async executeWithTimeout<T>(
    queryFn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`QueryTimeoutError: 查询超时 ${timeoutMs}ms`));
      }, timeoutMs);

      queryFn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 获取查询性能统计
   */
  getQueryStats() {
    if (this.queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        slowQueries: 0,
        slowQueryRatio: 0,
      };
    }

    const totalQueries = this.queryMetrics.length;
    const totalDuration = this.queryMetrics.reduce(
      (sum, m) => sum + m.duration,
      0,
    );
    const avgDuration = Math.round(totalDuration / totalQueries);
    const slowQueries = this.queryMetrics.filter(
      (m) => m.duration > this.slowQueryThreshold,
    ).length;
    const slowQueryRatio = Math.round((slowQueries / totalQueries) * 100);

    return {
      totalQueries,
      avgDuration,
      slowQueries,
      slowQueryRatio,
      slowQueryThreshold: this.slowQueryThreshold,
    };
  }

  /**
   * 获取最近的慢查询
   */
  getSlowQueries(limit: number = 10) {
    return this.queryMetrics
      .filter((m) => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map((m) => ({
        ...m,
        severity:
          m.duration > 500 ? "critical" : m.duration > 200 ? "high" : "medium",
      }));
  }

  /**
   * 清空查询指标
   */
  resetMetrics() {
    this.queryMetrics = [];
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 导出单例实例
export const queryOptimizer = QueryOptimizer.getInstance();

// 导出便捷方法
export const optimizedQuery = {
  findMany: <T>(model: string, options?: QueryOptions) =>
    queryOptimizer.optimizedFindMany<T>(model, options),

  count: (
    model: string,
    where: any,
    options?: { useCache?: boolean; cacheKey?: string },
  ) => queryOptimizer.optimizedCount(model, where, options),

  getStats: () => queryOptimizer.getQueryStats(),

  getSlowQueries: (limit?: number) => queryOptimizer.getSlowQueries(limit),

  resetMetrics: () => queryOptimizer.resetMetrics(),

  clearCache: () => queryOptimizer.clearCache(),
};

// 类型声明
declare global {
  interface Prisma {
    $queryRawUnsafe<T = any>(
      query: TemplateStringsArray | string,
      ...values: any[]
    ): Promise<T>;
    $executeRawUnsafe<T = any>(
      query: TemplateStringsArray | string,
      ...values: any[]
    ): Promise<T>;
  }
}
