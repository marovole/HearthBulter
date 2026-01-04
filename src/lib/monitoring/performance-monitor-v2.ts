import { performance } from "perf_hooks";

// 性能指标接口
interface PerformanceMetrics {
  timestamp: number;
  duration: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage?: NodeJS.CpuUsage;
  requestInfo: {
    method: string;
    url: string;
    userAgent?: string;
    ip?: string;
  };
  responseInfo: {
    statusCode: number;
    responseSize?: number;
  };
  databaseMetrics?: {
    queryCount: number;
    queryDuration: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      timestamp: number;
    }>;
  };
  cacheMetrics?: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

// 告警级别
export enum AlertLevel {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

// 告警接口
interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  source: string;
  context: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: number;
}

// 性能监控增强版
export class EnhancedPerformanceMonitor {
  private static instance: EnhancedPerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private alerts: Alert[] = [];
  private thresholds = {
    responseTime: {
      warning: 500, // ms
      error: 1000, // ms
      critical: 2000, // ms
    },
    memoryUsage: {
      warning: 0.7, // 70%
      error: 0.85, // 85%
      critical: 0.95, // 95%
    },
    errorRate: {
      warning: 0.05, // 5%
      error: 0.1, // 10%
      critical: 0.2, // 20%
    },
    databaseQueries: {
      slow: 100, // ms
      critical: 500, // ms
    },
    cacheHitRate: {
      warning: 0.7, // 70%
      error: 0.5, // 50%
    },
  };

  private constructor() {
    this.startPeriodicCleanup();
  }

  static getInstance(): EnhancedPerformanceMonitor {
    if (!EnhancedPerformanceMonitor.instance) {
      EnhancedPerformanceMonitor.instance = new EnhancedPerformanceMonitor();
    }
    return EnhancedPerformanceMonitor.instance;
  }

  /**
   * 开始性能监控
   */
  startMonitoring(requestInfo: PerformanceMetrics["requestInfo"]): string {
    const requestId = this.generateRequestId();

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      duration: 0,
      requestInfo,
      responseInfo: { statusCode: 0 },
      memoryUsage: this.getMemoryUsage(),
    };

    this.metrics.set(requestId, [metrics]);
    return requestId;
  }

  /**
   * 结束性能监控
   */
  endMonitoring(
    requestId: string,
    statusCode: number,
    responseSize?: number,
    databaseMetrics?: PerformanceMetrics["databaseMetrics"],
    cacheMetrics?: PerformanceMetrics["cacheMetrics"],
  ): PerformanceMetrics | null {
    const metricList = this.metrics.get(requestId);
    if (!metricList || metricList.length === 0) return null;

    const metrics = metricList[0];
    metrics.duration = Date.now() - metrics.timestamp;
    metrics.responseInfo = { statusCode, responseSize };
    metrics.memoryUsage = this.getMemoryUsage();

    if (databaseMetrics) {
      metrics.databaseMetrics = databaseMetrics;
    }

    if (cacheMetrics) {
      metrics.cacheMetrics = cacheMetrics;
    }

    // 分析性能并生成告警
    this.analyzePerformance(metrics);

    // 保存指标
    this.saveMetrics(metrics);

    return metrics;
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(requestId: string, query: string, duration: number): void {
    const metricList = this.metrics.get(requestId);
    if (!metricList || metricList.length === 0) return;

    const metrics = metricList[0];
    if (!metrics.databaseMetrics) {
      metrics.databaseMetrics = {
        queryCount: 0,
        queryDuration: 0,
        slowQueries: [],
      };
    }

    metrics.databaseMetrics.slowQueries.push({
      query,
      duration,
      timestamp: Date.now(),
    });

    metrics.databaseMetrics.queryCount++;
    metrics.databaseMetrics.queryDuration += duration;

    // 检查是否需要告警
    if (duration > this.thresholds.databaseQueries.critical) {
      this.createAlert(
        AlertLevel.CRITICAL,
        "数据库查询超时",
        `查询耗时 ${duration}ms，超过临界值 ${this.thresholds.databaseQueries.critical}ms`,
        "database",
        {
          query,
          duration,
          requestId,
        },
      );
    }
  }

  /**
   * 分析性能指标
   */
  private analyzePerformance(metrics: PerformanceMetrics): void {
    // 响应时间告警
    this.checkResponseTime(metrics);

    // 内存使用告警
    this.checkMemoryUsage(metrics);

    // 数据库性能告警
    this.checkDatabasePerformance(metrics);

    // 缓存性能告警
    this.checkCachePerformance(metrics);
  }

  private checkResponseTime(metrics: PerformanceMetrics): void {
    const { duration } = metrics;
    const { responseTime } = this.thresholds;

    if (duration > responseTime.critical) {
      this.createAlert(
        AlertLevel.CRITICAL,
        "响应时间过长",
        `请求处理耗时 ${duration}ms，远超临界值 ${responseTime.critical}ms`,
        "performance",
        {
          url: metrics.requestInfo.url,
          method: metrics.requestInfo.method,
          duration,
        },
      );
    } else if (duration > responseTime.error) {
      this.createAlert(
        AlertLevel.ERROR,
        "响应时间过长",
        `请求处理耗时 ${duration}ms，超过错误阈值 ${responseTime.error}ms`,
        "performance",
        {
          url: metrics.requestInfo.url,
          method: metrics.requestInfo.method,
          duration,
        },
      );
    } else if (duration > responseTime.warning) {
      this.createAlert(
        AlertLevel.WARNING,
        "响应时间偏长",
        `请求处理耗时 ${duration}ms，超过警告阈值 ${responseTime.warning}ms`,
        "performance",
        {
          url: metrics.requestInfo.url,
          method: metrics.requestInfo.method,
          duration,
        },
      );
    }
  }

  private checkMemoryUsage(metrics: PerformanceMetrics): void {
    if (!metrics.memoryUsage) return;

    const totalMemory = metrics.memoryUsage.heapTotal;
    const usedMemory = metrics.memoryUsage.heapUsed;
    const usageRatio = usedMemory / totalMemory;

    const { memoryUsage: thresholds } = this.thresholds;

    if (usageRatio > thresholds.critical) {
      this.createAlert(
        AlertLevel.CRITICAL,
        "内存使用率过高",
        `内存使用率达到 ${(usageRatio * 100).toFixed(1)}%，超过临界值 ${(thresholds.critical * 100).toFixed(1)}%`,
        "memory",
        {
          usedMemory,
          totalMemory,
          usageRatio,
        },
      );
    } else if (usageRatio > thresholds.error) {
      this.createAlert(
        AlertLevel.ERROR,
        "内存使用率偏高",
        `内存使用率达到 ${(usageRatio * 100).toFixed(1)}%，超过错误阈值 ${(thresholds.error * 100).toFixed(1)}%`,
        "memory",
        {
          usedMemory,
          totalMemory,
          usageRatio,
        },
      );
    }
  }

  private checkDatabasePerformance(metrics: PerformanceMetrics): void {
    if (!metrics.databaseMetrics) return;

    const { slowQueries } = metrics.databaseMetrics;
    const { databaseQueries } = this.thresholds;

    if (slowQueries.length > 0) {
      const slowestQuery = slowQueries.reduce((prev, curr) =>
        curr.duration > prev.duration ? curr : prev,
      );

      this.createAlert(
        AlertLevel.WARNING,
        "检测到慢查询",
        `发现 ${slowQueries.length} 个慢查询，最慢的耗时 ${slowestQuery.duration}ms`,
        "database",
        {
          queryCount: slowQueries.length,
          slowestQuery,
          averageDuration:
            metrics.databaseMetrics.queryDuration /
            metrics.databaseMetrics.queryCount,
        },
      );
    }
  }

  private checkCachePerformance(metrics: PerformanceMetrics): void {
    if (!metrics.cacheMetrics) return;

    const { hitRate } = metrics.cacheMetrics;
    const { cacheHitRate } = this.thresholds;

    if (hitRate < cacheHitRate.error) {
      this.createAlert(
        AlertLevel.ERROR,
        "缓存命中率过低",
        `缓存命中率仅为 ${(hitRate * 100).toFixed(1)}%，低于错误阈值 ${(cacheHitRate.error * 100).toFixed(1)}%`,
        "cache",
        {
          hitRate,
          hits: metrics.cacheMetrics.hits,
          misses: metrics.cacheMetrics.misses,
        },
      );
    } else if (hitRate < cacheHitRate.warning) {
      this.createAlert(
        AlertLevel.WARNING,
        "缓存命中率偏低",
        `缓存命中率为 ${(hitRate * 100).toFixed(1)}%，低于警告阈值 ${(cacheHitRate.warning * 100).toFixed(1)}%`,
        "cache",
        {
          hitRate,
          hits: metrics.cacheMetrics.hits,
          misses: metrics.cacheMetrics.misses,
        },
      );
    }
  }

  /**
   * 创建告警
   */
  private createAlert(
    level: AlertLevel,
    title: string,
    message: string,
    source: string,
    context: Record<string, any>,
  ): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      level,
      title,
      message,
      timestamp: Date.now(),
      source,
      context,
      resolved: false,
    };

    this.alerts.push(alert);

    // 异步处理告警通知
    setImmediate(() => {
      this.notifyAlert(alert);
    });

    // 限制告警数量
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500); // 保留最近500个告警
    }
  }

  /**
   * 通知告警
   */
  private async notifyAlert(alert: Alert): Promise<void> {
    try {
      // 这里可以集成各种通知渠道
      // 例如：邮件、短信、Slack、钉钉等

      if (alert.level === AlertLevel.CRITICAL) {
        // 发送紧急通知
        await this.sendCriticalNotification(alert);
      } else if (alert.level === AlertLevel.ERROR) {
        // 发送错误通知
        await this.sendErrorNotification(alert);
      }
      // WARNING 和 INFO 级别的告警可以批量处理
    } catch (error) {
      console.error("发送告警通知失败:", error);
    }
  }

  private async sendCriticalNotification(alert: Alert): Promise<void> {
    // 实现紧急通知逻辑（短信、电话等）
    console.log("🚨 CRITICAL ALERT:", alert);
  }

  private async sendErrorNotification(alert: Alert): Promise<void> {
    // 实现错误通知逻辑（邮件、Slack等）
    console.log("❌ ERROR ALERT:", alert);
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): PerformanceMetrics["memoryUsage"] {
    try {
      const usage = process.memoryUsage();
      return {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 保存性能指标
   */
  private saveMetrics(metrics: PerformanceMetrics): void {
    // 这里可以将指标保存到数据库、文件或监控系统
    // 为了演示，我们只是记录到控制台
    const logLevel =
      metrics.duration > this.thresholds.responseTime.error ? "error" : "info";
    console.log(`[${logLevel.toUpperCase()}] Performance:`, {
      url: metrics.requestInfo.url,
      method: metrics.requestInfo.method,
      duration: `${metrics.duration}ms`,
      statusCode: metrics.responseInfo.statusCode,
      memory: metrics.memoryUsage
        ? `${Math.round((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100)}%`
        : "N/A",
    });
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(timeRange: { start: number; end: number }): {
    totalMetrics: number;
    averageResponseTime: number;
    errorRate: number;
    alerts: Alert[];
  } {
    // 实现性能报告生成逻辑
    return {
      totalMetrics: 0,
      averageResponseTime: 0,
      errorRate: 0,
      alerts: this.alerts.filter(
        (alert) =>
          alert.timestamp >= timeRange.start &&
          alert.timestamp <= timeRange.end,
      ),
    };
  }

  /**
   * 清理过期数据
   */
  private startPeriodicCleanup(): void {
    setInterval(
      () => {
        // 清理过期的性能指标（保留最近1小时）
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        for (const [key, metricList] of this.metrics.entries()) {
          const filteredMetrics = metricList.filter(
            (m) => m.timestamp > oneHourAgo,
          );
          if (filteredMetrics.length === 0) {
            this.metrics.delete(key);
          } else {
            this.metrics.set(key, filteredMetrics);
          }
        }

        // 清理过期的告警（保留最近24小时）
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.alerts = this.alerts.filter(
          (alert) => alert.timestamp > oneDayAgo,
        );
      },
      5 * 60 * 1000,
    ); // 每5分钟清理一次
  }

  /**
   * 获取实时性能统计
   */
  getRealTimeStats(): {
    totalRequests: number;
    averageResponseTime: number;
    currentMemoryUsage: number;
    activeAlerts: number;
    alertsByLevel: Record<AlertLevel, number>;
    } {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const totalRequests = allMetrics.length;
    const averageResponseTime =
      totalRequests > 0
        ? allMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
        : 0;

    const currentMemoryUsage = this.getMemoryUsage();
    const memoryUsagePercent = currentMemoryUsage
      ? (currentMemoryUsage.heapUsed / currentMemoryUsage.heapTotal) * 100
      : 0;

    const activeAlerts = this.alerts.filter((alert) => !alert.resolved).length;
    const alertsByLevel = {
      [AlertLevel.INFO]: 0,
      [AlertLevel.WARNING]: 0,
      [AlertLevel.ERROR]: 0,
      [AlertLevel.CRITICAL]: 0,
    };

    for (const alert of this.alerts) {
      if (!alert.resolved) {
        alertsByLevel[alert.level]++;
      }
    }

    return {
      totalRequests,
      averageResponseTime,
      currentMemoryUsage: memoryUsagePercent,
      activeAlerts,
      alertsByLevel,
    };
  }
}

export default EnhancedPerformanceMonitor.getInstance();
