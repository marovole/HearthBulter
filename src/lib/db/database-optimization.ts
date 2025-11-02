import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logging/structured-logger';
import { securityAudit } from '@/lib/security/security-audit';

// 数据库连接池配置
interface DatabasePoolConfig {
  // 连接池大小
  connectionLimit: number;
  // 闲置连接超时时间（毫秒）
  idleTimeout: number;
  // 连接超时时间（毫秒）
  connectTimeout: number;
  // 查询超时时间（毫秒）
  queryTimeout: number;
  // 重试次数
  retryAttempts: number;
  // 重试延迟（毫秒）
  retryDelay: number;
  // 是否启用连接池监控
  enableMonitoring: boolean;
  // 慢查询阈值（毫秒）
  slowQueryThreshold: number;
}

// 查询性能统计
interface QueryStats {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  rowCount?: number;
  cacheHit?: boolean;
}

// 数据库性能监控
interface DatabaseMetrics {
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  connectionsInUse: number;
  connectionsIdle: number;
  cacheHitRate: number;
  topSlowQueries: QueryStats[];
}

/**
 * 数据库优化管理器
 */
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private prisma: PrismaClient;
  private config: DatabasePoolConfig;
  private queryStats: QueryStats[] = [];
  private maxStatsSize = 1000;
  private lastMetricsReset = Date.now();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.prisma = this.createOptimizedClient();
    this.startPeriodicTasks();
  }

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): DatabasePoolConfig {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';

    return {
      connectionLimit: isProduction ? 20 : 10,
      idleTimeout: isProduction ? 30000 : 60000, // 30s / 60s
      connectTimeout: 10000, // 10s
      queryTimeout: isProduction ? 30000 : 60000, // 30s / 60s
      retryAttempts: 3,
      retryDelay: 1000, // 1s
      enableMonitoring: true,
      slowQueryThreshold: isProduction ? 1000 : 2000, // 1s / 2s
    };
  }

  /**
   * 创建优化的Prisma客户端
   */
  private createOptimizedClient(): PrismaClient {
    const datasourceUrl = process.env.DATABASE_URL;
    if (!datasourceUrl) {
      throw new Error('DATABASE_URL环境变量未设置');
    }

    // 解析数据库URL并添加连接池参数
    const url = new URL(datasourceUrl);
    const searchParams = new URLSearchParams(url.search);

    // 添加连接池参数
    searchParams.set('connection_limit', this.config.connectionLimit.toString());
    searchParams.set('pool_timeout', this.config.idleTimeout.toString());
    searchParams.set('connect_timeout', this.config.connectTimeout.toString());

    url.search = searchParams.toString();

    const optimizedUrl = url.toString();

    return new PrismaClient({
      datasources: {
        db: {
          url: optimizedUrl,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
  }

  /**
   * 启动定期任务
   */
  private startPeriodicTasks(): void {
    if (!this.config.enableMonitoring) {
      return;
    }

    // 设置事件监听器
    this.setupEventListeners();

    // 定期清理统计数据
    setInterval(() => {
      this.cleanupStats();
    }, 60 * 60 * 1000); // 每小时清理一次

    // 定期报告性能指标
    setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000); // 每5分钟报告一次

    // 定期检查连接健康状态
    setInterval(() => {
      this.checkConnectionHealth();
    }, 30 * 1000); // 每30秒检查一次
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 查询事件
    this.prisma.$on('query', (event) => {
      this.recordQuery({
        query: event.query,
        duration: event.duration,
        timestamp: new Date(),
        success: true,
        rowCount: this.extractRowCount(event.query),
        cacheHit: false, // Prisma查询缓存需要额外实现
      });

      // 慢查询告警
      if (event.duration > this.config.slowQueryThreshold) {
        this.handleSlowQuery(event);
      }
    });

    // 错误事件
    this.prisma.$on('error', (event) => {
      this.recordQuery({
        query: event.target || 'unknown',
        duration: 0,
        timestamp: new Date(),
        success: false,
        error: event.message,
      });

      logger.error('数据库查询错误', new Error(event.message), {
        type: 'database',
        query: event.target,
        timestamp: event.timestamp,
      });
    });

    // 信息事件
    this.prisma.$on('info', (event) => {
      logger.debug('数据库信息', {
        type: 'database',
        message: event.message,
        target: event.target,
        timestamp: event.timestamp,
      });
    });

    // 警告事件
    this.prisma.$on('warn', (event) => {
      logger.warn('数据库警告', {
        type: 'database',
        message: event.message,
        target: event.target,
        timestamp: event.timestamp,
      });
    });
  }

  /**
   * 记录查询统计
   */
  private recordQuery(stats: QueryStats): void {
    this.queryStats.push(stats);

    // 限制统计数组大小
    if (this.queryStats.length > this.maxStatsSize) {
      this.queryStats = this.queryStats.slice(-this.maxStatsSize * 0.8);
    }
  }

  /**
   * 提取行数（简单实现）
   */
  private extractRowCount(query: string): number {
    // 这里可以实现更精确的行数提取逻辑
    // 目前返回估算值
    if (query.toLowerCase().includes('select')) {
      return 1; // 简化处理
    }
    return 0;
  }

  /**
   * 处理慢查询
   */
  private handleSlowQuery(event: any): void {
    logger.warn('检测到慢查询', {
      type: 'database',
      query: event.query,
      duration: event.duration,
      threshold: this.config.slowQueryThreshold,
      timestamp: event.timestamp,
    });

    // 记录到安全审计
    securityAudit.logSuspiciousActivity(
      '数据库慢查询',
      `查询耗时 ${event.duration}ms，超过阈值 ${this.config.slowQueryThreshold}ms: ${event.query.substring(0, 100)}...`,
      'medium',
      {
        query: event.query,
        duration: event.duration,
        threshold: this.config.slowQueryThreshold,
        timestamp: event.timestamp,
      }
    );

    // 这里可以添加慢查询优化建议
    this.analyzeSlowQuery(event.query);
  }

  /**
   * 分析慢查询
   */
  private analyzeSlowQuery(query: string): void {
    const lowerQuery = query.toLowerCase();

    // 检查常见的性能问题
    const issues = [];

    if (lowerQuery.includes('select *')) {
      issues.push('使用了SELECT *，建议指定具体字段');
    }

    if (lowerQuery.includes('order by') && !lowerQuery.includes('index')) {
      issues.push('ORDER BY可能需要索引支持');
    }

    if (lowerQuery.includes('like') && !lowerQuery.startsWith('select')) {
      issues.push('LIKE查询可能影响性能，考虑使用全文索引');
    }

    if (issues.length > 0) {
      logger.info('慢查询优化建议', {
        type: 'database',
        query: query.substring(0, 100),
        suggestions: issues,
      });
    }
  }

  /**
   * 清理统计数据
   */
  private cleanupStats(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.queryStats = this.queryStats.filter(stats => stats.timestamp.getTime() > oneHourAgo);

    logger.debug('数据库统计数据已清理', {
      type: 'database',
      remainingStats: this.queryStats.length,
    });
  }

  /**
   * 报告性能指标
   */
  private reportMetrics(): void {
    const metrics = this.getMetrics();

    logger.info('数据库性能指标', {
      type: 'database',
      ...metrics,
    });

    // 检查是否需要告警
    if (metrics.slowQueries > 10) { // 最近5分钟内超过10个慢查询
      securityAudit.logSuspiciousActivity(
        '数据库性能异常',
        `最近5分钟内检测到 ${metrics.slowQueries} 个慢查询`,
        'medium',
        {
          slowQueries: metrics.slowQueries,
          averageQueryTime: metrics.averageQueryTime,
          totalQueries: metrics.totalQueries,
        }
      );
    }
  }

  /**
   * 检查连接健康状态
   */
  private async checkConnectionHealth(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      logger.debug('数据库连接健康检查通过', {
        type: 'database',
        check: 'health',
        status: 'healthy',
      });
    } catch (error) {
      logger.error('数据库连接健康检查失败', error as Error, {
        type: 'database',
        check: 'health',
        status: 'unhealthy',
      });

      securityAudit.logSecurityViolation(
        '数据库连接异常',
        `数据库健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        'high',
        {
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): DatabaseMetrics {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const recentStats = this.queryStats.filter(stats => stats.timestamp.getTime() > fiveMinutesAgo);

    const totalQueries = recentStats.length;
    const slowQueries = recentStats.filter(stats => stats.duration > this.config.slowQueryThreshold).length;
    const failedQueries = recentStats.filter(stats => !stats.success).length;

    const averageQueryTime = totalQueries > 0
      ? recentStats.reduce((sum, stats) => sum + stats.duration, 0) / totalQueries
      : 0;

    const cacheHits = recentStats.filter(stats => stats.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    const topSlowQueries = recentStats
      .filter(stats => stats.duration > this.config.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalQueries,
      slowQueries,
      failedQueries,
      averageQueryTime: Math.round(averageQueryTime),
      connectionsInUse: 0, // Prisma不直接暴露这些信息
      connectionsIdle: 0,
      cacheHitRate: Math.round(cacheHitRate),
      topSlowQueries,
    };
  }

  /**
   * 执行带重试的查询
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'database_operation'
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.config.retryAttempts) {
          logger.error('数据库操作重试失败', lastError, {
            type: 'database',
            operation: operationName,
            attempt,
            maxAttempts: this.config.retryAttempts,
          });

          securityAudit.logSuspiciousActivity(
            '数据库操作失败',
            `操作 ${operationName} 在 ${attempt} 次重试后仍然失败: ${lastError.message}`,
            'medium',
            {
              operation: operationName,
              attempts: attempt,
              error: lastError.message,
            }
          );

          throw lastError;
        }

        logger.warn(`数据库操作失败，准备第 ${attempt + 1} 次重试`, {
          type: 'database',
          operation: operationName,
          attempt,
          error: lastError.message,
        });

        // 指数退避延迟
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('未知错误');
  }

  /**
   * 批量操作优化
   */
  async batchOperation<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    batchSize: number = 100,
    operationName: string = 'batch_operation'
  ): Promise<R[]> {
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    logger.info('开始批量操作', {
      type: 'database',
      operation: operationName,
      totalItems: items.length,
      batchSize,
      totalBatches,
    });

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const batchResults = await Promise.all(
          batch.map(item =>
            this.executeWithRetry(() => operation(item), `${operationName}_batch_${batchNumber}`)
          )
        );

        results.push(...batchResults);

        logger.debug(`批量操作批次 ${batchNumber}/${totalBatches} 完成`, {
          type: 'database',
          operation: operationName,
          batchNumber,
          batchSize: batch.length,
        });
      } catch (error) {
        logger.error(`批量操作批次 ${batchNumber} 失败`, error as Error, {
          type: 'database',
          operation: operationName,
          batchNumber,
          batchSize: batch.length,
        });

        throw error;
      }
    }

    logger.info('批量操作完成', {
      type: 'database',
      operation: operationName,
      totalItems: items.length,
      totalResults: results.length,
    });

    return results;
  }

  /**
   * 获取Prisma客户端
   */
  getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DatabasePoolConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('数据库配置已更新', {
      type: 'database',
      newConfig,
    });
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('数据库连接已关闭', {
        type: 'database',
      });
    } catch (error) {
      logger.error('关闭数据库连接失败', error as Error, {
        type: 'database',
      });
    }
  }
}

// 创建单例实例
export const dbOptimizer = DatabaseOptimizer.getInstance();

// 导出Prisma客户端（推荐使用优化后的客户端）
export const prisma = dbOptimizer.getClient();

export default dbOptimizer;