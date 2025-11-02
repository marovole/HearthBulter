/**
 * 缓存统计服务
 * 提供详细的缓存命中率统计和性能监控
 */

import { cacheService } from './cache-service';

export interface CacheMetrics {
  // 基础统计
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;

  // 计算指标
  hitRate: number; // 命中率百分比
  missRate: number; // 未命中率百分比
  totalRequests: number; // 总请求数

  // 性能指标
  averageResponseTime: number; // 平均响应时间(ms)
  p95ResponseTime: number; // 95%响应时间
  p99ResponseTime: number; // 99%响应时间

  // 存储指标
  memoryUsage: number; // 内存使用量(bytes)
  itemCount: number; // 缓存项数量
  hitToMissRatio: number; // 命中/未命中比率

  // 时间指标
  uptime: number; // 服务运行时间(秒)
  lastReset: Date; // 最后重置时间
}

export interface CacheOperation {
  operation: 'get' | 'set' | 'delete' | 'evict';
  key: string;
  success: boolean;
  responseTime: number; // 毫秒
  timestamp: Date;
  cacheType: 'redis' | 'memory' | 'none';
  size?: number; // 数据大小(bytes)
  ttl?: number; // TTL(秒)
}

export interface TimeWindowStats {
  window: '1m' | '5m' | '15m' | '1h' | '6h' | '24h';
  startTime: Date;
  endTime: Date;
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  averageResponseTime: number;
  hitRate: number;
}

export interface CacheTypeStats {
  cacheType: 'redis' | 'memory' | 'miss';
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  averageResponseTime: number;
  hitRate: number;
  usage: number; // 使用百分比
}

export interface CacheKeyStats {
  key: string;
  hits: number;
  misses: number;
  sets: number;
  lastAccess: Date;
  createdAt: Date;
  ttl: number;
  size: number;
  accessFrequency: number; // 每分钟访问次数
}

class CacheStatsService {
  private operations: CacheOperation[] = [];
  private maxOperationsHistory = 10000; // 最多保存10000条操作记录
  private startTime = new Date();
  private keyStats = new Map<string, CacheKeyStats>();
  private responseTimes: number[] = [];
  private timeWindows = new Map<string, TimeWindowStats>();

  constructor() {
    this.initializeTimeWindows();
    this.startPeriodicCleanup();
  }

  /**
   * 记录缓存操作
   */
  recordOperation(operation: Omit<CacheOperation, 'timestamp'>): void {
    const fullOperation: CacheOperation = {
      ...operation,
      timestamp: new Date(),
    };

    this.operations.push(fullOperation);

    // 限制历史记录数量
    if (this.operations.length > this.maxOperationsHistory) {
      this.operations = this.operations.slice(-this.maxOperationsHistory);
    }

    // 记录响应时间
    this.responseTimes.push(operation.responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // 更新按键统计
    this.updateKeyStats(fullOperation);

    // 更新时间窗口统计
    this.updateTimeWindows(fullOperation);
  }

  /**
   * 获取当前缓存指标
   */
  getMetrics(): CacheMetrics {
    const basicStats = cacheService.getStats();
    const sortedResponseTimes = [...this.responseTimes].sort((a, b) => a - b);

    // 计算百分位数
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p99Index = Math.floor(sortedResponseTimes.length * 0.99);

    const p95ResponseTime = sortedResponseTimes[p95Index] || 0;
    const p99ResponseTime = sortedResponseTimes[p99Index] || 0;

    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      hits: basicStats.hits,
      misses: basicStats.misses,
      sets: basicStats.sets,
      deletes: basicStats.deletes,
      evictions: 0, // 内存缓存没有主动驱逐
      hitRate: basicStats.hitRate,
      missRate: 100 - basicStats.hitRate,
      totalRequests: basicStats.hits + basicStats.misses,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
      p99ResponseTime: Math.round(p99ResponseTime * 100) / 100,
      memoryUsage: this.calculateMemoryUsage(),
      itemCount: this.keyStats.size,
      hitToMissRatio: basicStats.misses > 0 ? basicStats.hits / basicStats.misses : basicStats.hits,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      lastReset: this.startTime,
    };
  }

  /**
   * 获取时间窗口统计
   */
  getTimeWindowStats(window: TimeWindowStats['window'] = '15m'): TimeWindowStats | null {
    return this.timeWindows.get(window) || null;
  }

  /**
   * 获取所有时间窗口统计
   */
  getAllTimeWindows(): TimeWindowStats[] {
    return Array.from(this.timeWindows.values());
  }

  /**
   * 获取按缓存类型统计
   */
  getCacheTypeStats(): CacheTypeStats[] {
    const stats = new Map<string, CacheTypeStats>();

    // 初始化统计
    ['redis', 'memory', 'miss'].forEach(type => {
      stats.set(type, {
        cacheType: type as CacheTypeStats['cacheType'],
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        averageResponseTime: 0,
        hitRate: 0,
        usage: 0,
      });
    });

    // 聚合数据
    const typeData = new Map<string, { times: number[]; operations: CacheOperation[] }>();

    for (const op of this.operations) {
      const key = op.cacheType;
      if (!typeData.has(key)) {
        typeData.set(key, { times: [], operations: [] });
      }
      const data = typeData.get(key)!;
      data.times.push(op.responseTime);
      data.operations.push(op);
    }

    // 计算统计
    for (const [type, data] of typeData) {
      const stat = stats.get(type)!;
      const ops = data.operations;

      stat.hits = ops.filter(op => op.operation === 'get' && op.success).length;
      stat.misses = ops.filter(op => op.operation === 'get' && !op.success).length;
      stat.sets = ops.filter(op => op.operation === 'set').length;
      stat.deletes = ops.filter(op => op.operation === 'delete').length;

      const avgTime = data.times.length > 0
        ? data.times.reduce((sum, time) => sum + time, 0) / data.times.length
        : 0;
      stat.averageResponseTime = Math.round(avgTime * 100) / 100;

      const totalGets = stat.hits + stat.misses;
      stat.hitRate = totalGets > 0 ? Math.round((stat.hits / totalGets) * 10000) / 100 : 0;
    }

    // 计算使用百分比
    const totalOps = Array.from(stats.values()).reduce((sum, stat) =>
      sum + stat.hits + stat.misses + stat.sets + stat.deletes, 0);

    if (totalOps > 0) {
      for (const stat of stats.values()) {
        const statTotal = stat.hits + stat.misses + stat.sets + stat.deletes;
        stat.usage = Math.round((statTotal / totalOps) * 10000) / 100;
      }
    }

    return Array.from(stats.values());
  }

  /**
   * 获取热点缓存键
   */
  getHotKeys(limit: number = 10): CacheKeyStats[] {
    return Array.from(this.keyStats.values())
      .sort((a, b) => b.accessFrequency - a.accessFrequency)
      .slice(0, limit);
  }

  /**
   * 获取低效缓存键（命中率低但访问频繁）
   */
  getInefficientKeys(limit: number = 10): CacheKeyStats[] {
    return Array.from(this.keyStats.values())
      .filter(key => key.hits + key.misses > 10) // 只考虑有足够样本的键
      .map(key => ({
        ...key,
        efficiency: key.hits / (key.hits + key.misses), // 命中率
      }))
      .sort((a, b) => a.efficiency - b.efficiency) // 按效率升序排列
      .slice(0, limit);
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.operations = [];
    this.keyStats.clear();
    this.responseTimes = [];
    this.startTime = new Date();

    // 重置基础缓存服务的统计
    if (cacheService && typeof cacheService.resetStats === 'function') {
      cacheService.resetStats();
    }

    this.initializeTimeWindows();
  }

  /**
   * 导出统计数据（用于持久化）
   */
  exportStats(): {
    operations: CacheOperation[];
    keyStats: CacheKeyStats[];
    startTime: Date;
    } {
    return {
      operations: [...this.operations],
      keyStats: Array.from(this.keyStats.values()),
      startTime: this.startTime,
    };
  }

  /**
   * 导入统计数据
   */
  importStats(data: ReturnType<typeof this.exportStats>): void {
    this.operations = data.operations;
    this.keyStats = new Map(data.keyStats.map(stat => [stat.key, stat]));
    this.startTime = data.startTime;
  }

  /**
   * 初始化时间窗口
   */
  private initializeTimeWindows(): void {
    const now = new Date();
    const windows: TimeWindowStats['window'][] = ['1m', '5m', '15m', '1h', '6h', '24h'];

    for (const window of windows) {
      const minutes = this.getWindowMinutes(window);
      const startTime = new Date(now.getTime() - minutes * 60 * 1000);

      this.timeWindows.set(window, {
        window,
        startTime,
        endTime: now,
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        averageResponseTime: 0,
        hitRate: 0,
      });
    }
  }

  /**
   * 更新时间窗口统计
   */
  private updateTimeWindows(operation: CacheOperation): void {
    const now = new Date();

    for (const [windowKey, windowStat] of this.timeWindows) {
      const minutes = this.getWindowMinutes(windowKey);
      const windowStart = new Date(now.getTime() - minutes * 60 * 1000);

      // 如果操作在这个时间窗口内
      if (operation.timestamp >= windowStart) {
        switch (operation.operation) {
        case 'get':
          if (operation.success) {
            windowStat.hits++;
          } else {
            windowStat.misses++;
          }
          break;
        case 'set':
          windowStat.sets++;
          break;
        case 'delete':
          windowStat.deletes++;
          break;
        }

        // 更新平均响应时间
        const totalRequests = windowStat.hits + windowStat.misses + windowStat.sets + windowStat.deletes;
        if (totalRequests === 1) {
          windowStat.averageResponseTime = operation.responseTime;
        } else {
          windowStat.averageResponseTime =
            (windowStat.averageResponseTime * (totalRequests - 1) + operation.responseTime) / totalRequests;
        }

        // 更新命中率
        const totalGets = windowStat.hits + windowStat.misses;
        windowStat.hitRate = totalGets > 0 ? (windowStat.hits / totalGets) * 100 : 0;

        windowStat.endTime = now;
      }
    }
  }

  /**
   * 更新按键统计
   */
  private updateKeyStats(operation: CacheOperation): void {
    const { key, operation: opType, success, responseTime } = operation;

    if (!this.keyStats.has(key)) {
      this.keyStats.set(key, {
        key,
        hits: 0,
        misses: 0,
        sets: 0,
        lastAccess: operation.timestamp,
        createdAt: operation.timestamp,
        ttl: operation.ttl || 0,
        size: operation.size || 0,
        accessFrequency: 0,
      });
    }

    const keyStat = this.keyStats.get(key)!;

    switch (opType) {
    case 'get':
      if (success) {
        keyStat.hits++;
      } else {
        keyStat.misses++;
      }
      keyStat.lastAccess = operation.timestamp;
      break;
    case 'set':
      keyStat.sets++;
      if (operation.ttl) keyStat.ttl = operation.ttl;
      if (operation.size) keyStat.size = operation.size;
      break;
    case 'delete':
      // 可以选择删除统计或标记为已删除
      break;
    }

    // 更新访问频率（每分钟）
    const ageMinutes = (operation.timestamp.getTime() - keyStat.createdAt.getTime()) / (1000 * 60);
    const totalAccesses = keyStat.hits + keyStat.misses;
    keyStat.accessFrequency = ageMinutes > 0 ? totalAccesses / ageMinutes : totalAccesses;
  }

  /**
   * 计算内存使用量
   */
  private calculateMemoryUsage(): number {
    // 估算内存使用量
    let totalSize = 0;

    for (const keyStat of this.keyStats.values()) {
      // 估算每个键的内存开销：键名 + 数据大小 + 元数据
      totalSize += keyStat.key.length * 2; // UTF-16字符
      totalSize += keyStat.size;
      totalSize += 100; // 元数据开销
    }

    return totalSize;
  }

  /**
   * 获取时间窗口的分钟数
   */
  private getWindowMinutes(window: TimeWindowStats['window']): number {
    switch (window) {
    case '1m': return 1;
    case '5m': return 5;
    case '15m': return 15;
    case '1h': return 60;
    case '6h': return 360;
    case '24h': return 1440;
    default: return 15;
    }
  }

  /**
   * 定期清理旧数据
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 清理旧数据
   */
  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前

    // 清理旧操作记录
    this.operations = this.operations.filter(op => op.timestamp > cutoffTime);

    // 清理不活跃的键统计
    for (const [key, stat] of this.keyStats) {
      if (stat.lastAccess < cutoffTime && (stat.hits + stat.misses) < 5) {
        this.keyStats.delete(key);
      }
    }
  }
}

// 导出单例实例
export const cacheStatsService = new CacheStatsService();

// 导出工具函数
export function recordCacheOperation(operation: Omit<CacheOperation, 'timestamp'>): void {
  cacheStatsService.recordOperation(operation);
}

export function getCacheMetrics(): CacheMetrics {
  return cacheStatsService.getMetrics();
}

export function getCacheHitRate(): number {
  return cacheStatsService.getMetrics().hitRate;
}

export function getCachePerformance(): Pick<CacheMetrics, 'averageResponseTime' | 'p95ResponseTime' | 'p99ResponseTime'> {
  const metrics = cacheStatsService.getMetrics();
  return {
    averageResponseTime: metrics.averageResponseTime,
    p95ResponseTime: metrics.p95ResponseTime,
    p99ResponseTime: metrics.p99ResponseTime,
  };
}
