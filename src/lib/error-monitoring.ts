/**
 * API错误处理和监控中间件
 * 提供统一的错误处理、日志记录和性能监控
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, testDatabaseConnection } from '@/lib/db';
import { CacheService } from '@/lib/cache/redis-client';

// 错误级别定义
export enum ErrorLevel {
  LOW = 'low',       // 不影响核心功能的小错误
  MEDIUM = 'medium', // 影响部分功能的错误
  HIGH = 'high',     // 影响核心功能的错误
  CRITICAL = 'critical', // 系统级严重错误
}

// API错误类型
export interface ApiError {
  code: string;
  message: string;
  level: ErrorLevel;
  statusCode: number;
  details?: any;
  timestamp: string;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
}

// 性能指标
export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  requestId: string;
  userId?: string;
  userAgent?: string;
  cacheHit?: boolean;
  dbQueryTime?: number;
  externalApiTime?: number;
}

// 错误监控服务
export class ErrorMonitoringService {
  private static errors: ApiError[] = [];
  private static performance: PerformanceMetrics[] = [];
  private static readonly MAX_LOGS = 1000;

  /**
   * 记录API错误
   */
  static logError(error: ApiError): void {
    this.errors.push(error);

    // 保持日志数量在限制内
    if (this.errors.length > this.MAX_LOGS) {
      this.errors.shift();
    }

    // 控制台输出，带有颜色和格式
    const levelColors = {
      [ErrorLevel.LOW]: '\x1b[36m',    // 青色
      [ErrorLevel.MEDIUM]: '\x1b[33m',  // 黄色
      [ErrorLevel.HIGH]: '\x1b[31m',    // 红色
      [ErrorLevel.CRITICAL]: '\x1b[35m', // 紫色
    };

    const color = levelColors[error.level] || '\x1b[0m';
    const reset = '\x1b[0m';

    console.error(
      `${color}[${error.level.toUpperCase()}] API Error:${reset} ${error.code} - ${error.message}`,
      {
        endpoint: error.endpoint,
        method: error.method,
        statusCode: error.statusCode,
        requestId: error.requestId,
        userId: error.userId,
        timestamp: error.timestamp,
        details: error.details,
      }
    );

    // 高级别错误触发额外的告警机制
    if (error.level === ErrorLevel.HIGH || error.level === ErrorLevel.CRITICAL) {
      this.triggerAlert(error);
    }
  }

  /**
   * 记录性能指标
   */
  static logPerformance(metrics: PerformanceMetrics): void {
    this.performance.push(metrics);

    if (this.performance.length > this.MAX_LOGS) {
      this.performance.shift();
    }

    // 性能告警
    if (metrics.responseTime > 5000) {
      console.warn(`\x1b[33m[PERFORMANCE ALERT] Slow response: ${metrics.responseTime}ms - ${metrics.method} ${metrics.endpoint}\x1b[0m`);
    }

    if (metrics.statusCode >= 500) {
      console.warn(`\x1b[31m[ERROR RATE ALERT] Server error: ${metrics.statusCode} - ${metrics.method} ${metrics.endpoint}\x1b[0m`);
    }
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): {
    total: number;
    byLevel: Record<ErrorLevel, number>;
    recent: ApiError[];
    criticalIssues: ApiError[];
  } {
    const byLevel = {
      [ErrorLevel.LOW]: 0,
      [ErrorLevel.MEDIUM]: 0,
      [ErrorLevel.HIGH]: 0,
      [ErrorLevel.CRITICAL]: 0,
    };

    this.errors.forEach(error => {
      byLevel[error.level]++;
    });

    const recent = this.errors.slice(-10);
    const criticalIssues = this.errors.filter(
      error => error.level === ErrorLevel.HIGH || error.level === ErrorLevel.CRITICAL
    ).slice(-20);

    return {
      total: this.errors.length,
      byLevel,
      recent,
      criticalIssues,
    };
  }

  /**
   * 获取性能统计
   */
  static getPerformanceStats(): {
    total: number;
    averageResponseTime: number;
    slowestRequests: PerformanceMetrics[];
    errorRate: number;
    recent: PerformanceMetrics[];
  } {
    if (this.performance.length === 0) {
      return {
        total: 0,
        averageResponseTime: 0,
        slowestRequests: [],
        errorRate: 0,
        recent: [],
      };
    }

    const totalTime = this.performance.reduce((sum, p) => sum + p.responseTime, 0);
    const averageResponseTime = totalTime / this.performance.length;
    const errorCount = this.performance.filter(p => p.statusCode >= 400).length;
    const errorRate = (errorCount / this.performance.length) * 100;

    const slowestRequests = this.performance
      .slice()
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    const recent = this.performance.slice(-20);

    return {
      total: this.performance.length,
      averageResponseTime: Math.round(averageResponseTime),
      slowestRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      recent,
    };
  }

  /**
   * 触发告警
   */
  private static triggerAlert(error: ApiError): void {
    // 在生产环境中，这里可以集成外部告警系统
    // 例如: Slack, Discord, Email, Sentry等
    console.error(`\x1b[35m🚨 CRITICAL ALERT 🚨\x1b[0m`, {
      message: 'Critical system error detected',
      error: {
        code: error.code,
        message: error.message,
        endpoint: error.endpoint,
        method: error.method,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
      },
      systemStatus: this.getSystemHealthStatus(),
    });
  }

  /**
   * 获取系统健康状态
   */
  private static getSystemHealthStatus(): any {
    return {
      timestamp: new Date().toISOString(),
      errorCounts: this.getErrorStats().byLevel,
      performanceStats: {
        averageResponseTime: this.getPerformanceStats().averageResponseTime,
        errorRate: this.getPerformanceStats().errorRate,
      },
    };
  }

  /**
   * 清除日志
   */
  static clearLogs(): void {
    this.errors = [];
    this.performance = [];
  }
}

/**
 * API包装器，提供统一的错误处理和监控
 */
export function withApiHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    endpoint?: string;
    requireAuth?: boolean;
    timeout?: number;
  } = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const endpoint = options.endpoint || req.url || 'unknown';
    const method = req.method;

    try {
      // 设置超时
      const timeoutMs = options.timeout || 30000; // 默认30秒超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`API timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // 执行处理器
      const response = await Promise.race([
        handler(req, context),
        timeoutPromise,
      ]);

      // 记录性能指标
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;

      ErrorMonitoringService.logPerformance({
        endpoint,
        method,
        responseTime,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        userAgent: req.headers.get('user-agent') || undefined,
        cacheHit: response.headers?.get('x-cache') === 'HIT',
      });

      // 添加请求ID到响应头
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-response-time', `${responseTime}ms`);

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 确定错误级别和状态码
      let level: ErrorLevel;
      let statusCode: number;
      let code: string;

      if (errorMessage.includes('timeout')) {
        level = ErrorLevel.HIGH;
        statusCode = 504;
        code = 'API_TIMEOUT';
      } else if (errorMessage.includes('database') || errorMessage.includes('Database')) {
        level = ErrorLevel.HIGH;
        statusCode = 503;
        code = 'DATABASE_ERROR';
      } else if (errorMessage.includes('auth') || errorMessage.includes('Auth')) {
        level = ErrorLevel.MEDIUM;
        statusCode = 401;
        code = 'AUTHENTICATION_ERROR';
      } else if (errorMessage.includes('validation') || errorMessage.includes('Invalid')) {
        level = ErrorLevel.LOW;
        statusCode = 400;
        code = 'VALIDATION_ERROR';
      } else {
        level = ErrorLevel.MEDIUM;
        statusCode = 500;
        code = 'INTERNAL_SERVER_ERROR';
      }

      // 记录错误
      const apiError: ApiError = {
        code,
        message: errorMessage,
        level,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId,
        endpoint,
        method,
        details: error instanceof Error ? error.stack : undefined,
      };

      ErrorMonitoringService.logError(apiError);

      // 记录性能指标（错误情况）
      ErrorMonitoringService.logPerformance({
        endpoint,
        method,
        responseTime,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId,
      });

      // 返回格式化的错误响应
      const errorResponse = {
        error: {
          code,
          message: level === ErrorLevel.LOW ? errorMessage : '服务器内部错误',
          requestId,
          timestamp: new Date().toISOString(),
        },
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.stack : undefined,
        }),
      };

      return NextResponse.json(errorResponse, {
        status: statusCode,
        headers: {
          'x-request-id': requestId,
          'x-response-time': `${responseTime}ms`,
          'x-error-level': level,
        },
      });
    }
  };
}

/**
 * 预定义的API错误
 */
export const ApiErrors = {
  // 认证错误
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: '用户未认证',
    level: ErrorLevel.MEDIUM,
    statusCode: 401,
  },

  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: '权限不足',
    level: ErrorLevel.MEDIUM,
    statusCode: 403,
  },

  // 验证错误
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: '请求参数验证失败',
    level: ErrorLevel.LOW,
    statusCode: 400,
  },

  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: '请求的资源不存在',
    level: ErrorLevel.LOW,
    statusCode: 404,
  },

  // 服务器错误
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: '数据库连接错误',
    level: ErrorLevel.HIGH,
    statusCode: 503,
  },

  EXTERNAL_API_ERROR: {
    code: 'EXTERNAL_API_ERROR',
    message: '外部服务不可用',
    level: ErrorLevel.MEDIUM,
    statusCode: 502,
  },

  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: '服务器内部错误',
    level: ErrorLevel.MEDIUM,
    statusCode: 500,
  },

  TIMEOUT: {
    code: 'TIMEOUT',
    message: '请求超时',
    level: ErrorLevel.HIGH,
    statusCode: 504,
  },
} as const;

export default ErrorMonitoringService;