/**
 * 性能监控系统
 * 提供API响应时间、内存使用、数据库查询性能监控
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { queryOptimizer } from '@/lib/middleware/query-optimization';

export interface PerformanceMetrics {
  // API响应时间
  responseTime: {
    avg: number
    min: number
    max: number
    p95: number
    p99: number
    total: number
  }
  
  // 数据库性能
  database: {
    avgQueryTime: number
    slowQueries: number
    totalQueries: number
    cacheHitRate: number
  }
  
  // 内存使用
  memory: {
    used: number
    total: number
    percentage: number
    heapUsed: number
    heapTotal: number
  }
  
  // 系统负载
  system: {
    cpu: number
    diskUsage: number
    uptime: number
  }
  
  // 错误率
  errors: {
    total: number
    rate: number
    statusCodes: Record<number, number>
  }
}

export interface PerformanceAlert {
  id: string
  timestamp: Date
  type: 'response_time' | 'memory' | 'cpu' | 'database' | 'error_rate'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metrics: any
  threshold: any
  resolved: boolean
}

export interface PerformanceSnapshot {
  timestamp: Date
  requestId?: string
  url?: string
  method?: string
  statusCode?: number
  responseTime?: number
  memoryUsage?: NodeJS.MemoryUsage
  queryStats?: any
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxSnapshots = 1000;
  private maxAlerts = 100;
  private alertingEnabled = true;

  // 告警阈值
  private thresholds = {
    responseTime: {
      medium: 1000,  // 1秒
      high: 2000,    // 2秒
      critical: 5000,  // 5秒
    },
    memory: {
      medium: 80,   // 80%
      high: 90,     // 90%
      critical: 95,   // 95%
    },
    errorRate: {
      medium: 5,    // 5%
      high: 10,     // 10%
      critical: 20,   // 20%
    },
    database: {
      slowQueryTime: 500,  // 500ms
      slowQueryCount: 10,  // 10个慢查询
      cacheHitRate: 50,     // 50%缓存命中率
    },
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始监控请求
   */
  startMonitoring(request: NextRequest): string {
    const requestId = this.generateRequestId();
    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      requestId,
      url: request.url,
      method: request.method,
      memoryUsage: process.memoryUsage(),
    };

    this.snapshots.push(snapshot);
    this.cleanupOldSnapshots();

    return requestId;
  }

  /**
   * 结束监控请求
   */
  endMonitoring(
    requestId: string,
    statusCode: number,
    response: NextResponse
  ): void {
    const snapshot = this.snapshots.find(s => s.requestId === requestId);
    if (!snapshot) return;

    snapshot.statusCode = statusCode;
    snapshot.responseTime = Date.now() - snapshot.timestamp.getTime();

    // 检查性能告警
    this.checkPerformanceAlerts(snapshot);

    // 记录性能数据
    this.logPerformanceData(snapshot);
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const recentSnapshots = this.snapshots.filter(
      s => now - s.timestamp.getTime() < 5 * 60 * 1000 // 最近5分钟
    );

    // 计算响应时间指标
    const responseTimes = recentSnapshots
      .filter(s => s.responseTime !== undefined)
      .map(s => s.responseTime!);

    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const responseTime = {
      avg: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      p95: this.getPercentile(sortedTimes, 95),
      p99: this.getPercentile(sortedTimes, 99),
      total: responseTimes.length,
    };

    // 获取数据库性能统计
    const dbStats = queryOptimizer.getStats();
    const slowQueries = queryOptimizer.getSlowQueries();

    // 获取内存使用情况
    const memUsage = process.memoryUsage();
    const memory = {
      used: memUsage.rss,
      total: memUsage.rss, // 简化，实际应该是系统总内存
      percentage: (memUsage.rss / memUsage.rss) * 100, // 简化计算
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };

    // 计算错误率
    const statusCodes = recentSnapshots.reduce((acc, s) => {
      if (s.statusCode) {
        acc[s.statusCode] = (acc[s.statusCode] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    const totalRequests = Object.values(statusCodes).reduce((a, b) => a + b, 0);
    const errorRequests = Object.entries(statusCodes)
      .filter(([code]) => parseInt(code) >= 400)
      .reduce((a, [, count]) => a + count, 0);

    const errors = {
      total: errorRequests,
      rate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      statusCodes,
    };

    // 系统负载（简化）
    const system = {
      cpu: 0, // 需要额外的库来获取CPU使用率
      diskUsage: 0, // 需要额外的库来获取磁盘使用率
      uptime: process.uptime(),
    };

    return {
      responseTime,
      database: {
        avgQueryTime: dbStats.avgDuration,
        slowQueries: slowQueries.length,
        totalQueries: dbStats.totalQueries,
        cacheHitRate: 0, // 需要实现缓存统计
      },
      memory,
      system,
      errors,
    };
  }

  /**
   * 检查性能告警
   */
  private checkPerformanceAlerts(snapshot: PerformanceSnapshot): void {
    if (!this.alertingEnabled) return;

    // 检查响应时间告警
    if (snapshot.responseTime) {
      const threshold = this.thresholds.responseTime;
      let severity: PerformanceAlert['severity'] | null = null;
      let message = '';

      if (snapshot.responseTime >= threshold.critical) {
        severity = 'critical';
        message = `响应时间严重异常: ${snapshot.responseTime}ms`;
      } else if (snapshot.responseTime >= threshold.high) {
        severity = 'high';
        message = `响应时间异常: ${snapshot.responseTime}ms`;
      } else if (snapshot.responseTime >= threshold.medium) {
        severity = 'medium';
        message = `响应时间偏慢: ${snapshot.responseTime}ms`;
      }

      if (severity) {
        this.createAlert({
          type: 'response_time',
          severity,
          message,
          metrics: { responseTime: snapshot.responseTime },
          threshold: { threshold: threshold[severity] },
        });
      }
    }

    // 检查内存使用告警
    if (snapshot.memoryUsage) {
      const memoryUsage = (snapshot.memoryUsage.heapUsed / snapshot.memoryUsage.heapTotal) * 100;
      const threshold = this.thresholds.memory;
      let severity: PerformanceAlert['severity'] | null = null;
      let message = '';

      if (memoryUsage >= threshold.critical) {
        severity = 'critical';
        message = `内存使用严重过高: ${memoryUsage.toFixed(1)}%`;
      } else if (memoryUsage >= threshold.high) {
        severity = 'high';
        message = `内存使用过高: ${memoryUsage.toFixed(1)}%`;
      } else if (memoryUsage >= threshold.medium) {
        severity = 'medium';
        message = `内存使用偏高: ${memoryUsage.toFixed(1)}%`;
      }

      if (severity) {
        this.createAlert({
          type: 'memory',
          severity,
          message,
          metrics: { memoryUsage },
          threshold: { threshold: threshold[severity] },
        });
      }
    }

    // 检查错误率告警
    if (snapshot.statusCode && snapshot.statusCode >= 400) {
      const errorRate = this.calculateErrorRate();
      const threshold = this.thresholds.errorRate;
      let severity: PerformanceAlert['severity'] | null = null;
      let message = '';

      if (errorRate >= threshold.critical) {
        severity = 'critical';
        message = `错误率严重过高: ${errorRate.toFixed(1)}%`;
      } else if (errorRate >= threshold.high) {
        severity = 'high';
        message = `错误率过高: ${errorRate.toFixed(1)}%`;
      } else if (errorRate >= threshold.medium) {
        severity = 'medium';
        message = `错误率偏高: ${errorRate.toFixed(1)}%`;
      }

      if (severity) {
        this.createAlert({
          type: 'error_rate',
          severity,
          message,
          metrics: { errorRate, statusCode: snapshot.statusCode },
          threshold: { threshold: threshold[severity] },
        });
      }
    }
  }

  /**
   * 创建告警
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.alerts.push(alert);
    this.cleanupOldAlerts();

    // 记录告警日志
    logger.error('性能告警触发', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      metrics: alert.metrics,
      threshold: alert.threshold,
    });

    // 发送告警通知（这里可以集成通知系统）
    this.sendAlertNotification(alert);
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(): number {
    const now = Date.now();
    const recentSnapshots = this.snapshots.filter(
      s => now - s.timestamp.getTime() < 5 * 60 * 1000 // 最近5分钟
    );

    const totalRequests = recentSnapshots.filter(s => s.statusCode !== undefined).length;
    const errorRequests = recentSnapshots.filter(s => s.statusCode && s.statusCode >= 400).length;

    return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
  }

  /**
   * 发送告警通知
   */
  private sendAlertNotification(alert: PerformanceAlert): void {
    // 这里可以实现邮件、短信、Slack等通知方式
    // 目前只记录日志
    
    const notification = {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      actions: ['查看详情', '确认告警'],
    };

    // 发送到通知服务
    console.log('🚨 性能告警通知:', JSON.stringify(notification, null, 2));
  }

  /**
   * 获取百分位数
   */
  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * 记录性能数据
   */
  private logPerformanceData(snapshot: PerformanceSnapshot): void {
    const logLevel = this.getLogLevel(snapshot);
    
    logger[logLevel]('性能数据记录', {
      requestId: snapshot.requestId,
      url: snapshot.url,
      method: snapshot.method,
      statusCode: snapshot.statusCode,
      responseTime: snapshot.responseTime,
      memoryUsage: snapshot.memoryUsage ? {
        rss: snapshot.memoryUsage.rss,
        heapUsed: snapshot.memoryUsage.heapUsed,
        heapTotal: snapshot.memoryUsage.heapTotal,
        external: snapshot.memoryUsage.external,
      } : undefined,
    });
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(snapshot: PerformanceSnapshot): 'info' | 'warn' | 'error' {
    if (!snapshot.responseTime) return 'info';
    
    const threshold = this.thresholds.responseTime;
    
    if (snapshot.responseTime >= threshold.critical) return 'error';
    if (snapshot.responseTime >= threshold.high) return 'warn';
    
    if (snapshot.statusCode && snapshot.statusCode >= 500) return 'error';
    if (snapshot.statusCode && snapshot.statusCode >= 400) return 'warn';
    
    return 'info';
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now().toString(36)}_${Math.random().toString(36).substr(2)}`;
  }

  /**
   * 清理旧的快照
   */
  private cleanupOldSnapshots(): void {
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  /**
   * 清理旧的告警
   */
  private cleanupOldAlerts(): void {
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }
  }

  /**
   * 获取告警列表
   */
  getAlerts(options?: {
    type?: string
    severity?: string
    resolved?: boolean
    limit?: number
  }): PerformanceAlert[] {
    let alerts = [...this.alerts];

    // 过滤条件
    if (options?.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options?.resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === options.resolved);
    }

    // 按时间倒序
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 限制数量
    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      
      logger.info('性能告警已解决', {
        alertId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
      });
    }
  }

  /**
   * 清空所有数据
   */
  clearAll(): void {
    this.snapshots = [];
    this.alerts = [];
    queryOptimizer.resetMetrics();
  }

  /**
   * 启用/禁用告警
   */
  setAlertingEnabled(enabled: boolean): void {
    this.alertingEnabled = enabled;
    logger.info(`性能告警${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 获取配置
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * 更新阈值
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds,
    };
    
    logger.info('性能阈值已更新', { thresholds: this.thresholds });
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 导出便捷方法
export const startPerformanceMonitoring = (request: NextRequest) =>
  performanceMonitor.startMonitoring(request);

export const endPerformanceMonitoring = (
  requestId: string,
  statusCode: number,
  response: NextResponse
) => performanceMonitor.endMonitoring(requestId, statusCode, response);

// 创建性能监控高阶函数
export function withPerformanceMonitoring(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any) => {
    const requestId = startPerformanceMonitoring(request);
    
    try {
      const response = await handler(request, context);
      
      // 确保statusCode可用
      let statusCode = 200;
      if (response.status) {
        statusCode = response.status;
      }
      
      endPerformanceMonitoring(requestId, statusCode, response);
      return response;
    } catch (error) {
      endPerformanceMonitoring(requestId, 500, new NextResponse('Internal Server Error'));
      throw error;
    }
  };
}
