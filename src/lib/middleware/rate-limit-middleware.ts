/**
 * 通用请求频率限制中间件
 * 为所有API端点提供可配置的频率限制
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIError, createErrorResponse } from '@/lib/errors/api-error';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  windowMs: number        // 时间窗口（毫秒）
  maxRequests: number     // 最大请求数
  identifier: 'ip' | 'userId' | 'session'  // 限制标识符
  skipSuccessfulRequests?: boolean   // 是否跳过成功请求
  skipFailedRequests?: boolean       // 是否跳过失败请求
  customKeyGenerator?: (request: NextRequest) => string  // 自定义键生成器
  message?: string                   // 自定义错误消息
  enableRedis?: boolean             // 是否使用Redis存储
  redis?: {                        // Redis配置
    host: string
    port: number
    password?: string
    keyPrefix?: string
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetTime: number
  retryAfter?: number
}

interface RateLimitRecord {
  count: number
  resetTime: number
  lastRequest: number
}

/**
 * 频率限制器类
 */
export class RateLimiter {
  private static instance: RateLimiter;
  private memoryStore = new Map<string, RateLimitRecord>();
  private redis?: any; // Redis客户端（可选）

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * 检查请求限制
   */
  async checkLimit(
    request: NextRequest,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = this.generateKey(request, config);
    const now = Date.now();

    // 使用Redis或内存存储
    const record = config.enableRedis && this.redis 
      ? await this.getRedisRecord(key)
      : this.memoryStore.get(key);

    // 计算重置时间
    const resetTime = record ? record.resetTime : now + config.windowMs;

    // 检查记录是否存在或已过期
    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = {
        count: 0,
        resetTime,
        lastRequest: now,
      };

      if (config.enableRedis && this.redis) {
        await this.setRedisRecord(key, newRecord, Math.ceil(config.windowMs / 1000));
      } else {
        this.memoryStore.set(key, newRecord);
      }

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    // 检查是否超过限制
    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      // 记录频率限制事件
      logger.warn('请求频率限制触发', {
        key,
        count: record.count,
        limit: config.maxRequests,
        resetTime,
        retryAfter,
        url: request.url,
        method: request.method,
        ip: this.getClientIP(request),
      });

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    // 增加计数
    record.count++;
    record.lastRequest = now;

    if (config.enableRedis && this.redis) {
      await this.incrementRedisCount(key, Math.ceil((resetTime - now) / 1000));
    } else {
      this.memoryStore.set(key, record);
    }

    // 清理过期内存记录
    this.cleanExpiredMemoryRecords();

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - record.count,
      resetTime,
    };
  }

  /**
   * 生成限制键
   */
  private generateKey(request: NextRequest, config: RateLimitConfig): string {
    if (config.customKeyGenerator) {
      return config.customKeyGenerator(request);
    }

    let identifier: string;

    switch (config.identifier) {
    case 'userId':
      identifier = request.headers.get('x-user-id') || 'anonymous';
      break;
    case 'session':
      identifier = request.headers.get('x-session-id') || 'anonymous';
      break;
    case 'ip':
    default:
      identifier = this.getClientIP(request);
      break;
    }

    // 添加路径前缀以区分不同端点
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+/g, '_').replace(/^_/, '') || 'root';
    
    return `rate_limit:${path}:${identifier}`;
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') || // Cloudflare
      '127.0.0.1'
    )?.split(',')[0]?.trim() || '127.0.0.1';
  }

  /**
   * 获取Redis记录
   */
  private async getRedisRecord(key: string): Promise<RateLimitRecord | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.hgetall(key);
      if (Object.keys(data).length === 0) return null;

      return {
        count: parseInt(data.count || '0'),
        resetTime: parseInt(data.resetTime || '0'),
        lastRequest: parseInt(data.lastRequest || '0'),
      };
    } catch (error) {
      logger.error('获取Redis记录失败', { key, error });
      return null;
    }
  }

  /**
   * 设置Redis记录
   */
  private async setRedisRecord(
    key: string,
    record: RateLimitRecord,
    ttlSeconds: number
  ): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.hmset(key, {
        count: record.count,
        resetTime: record.resetTime,
        lastRequest: record.lastRequest,
      });
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      logger.error('设置Redis记录失败', { key, error });
    }
  }

  /**
   * 增加Redis计数
   */
  private async incrementRedisCount(
    key: string,
    ttlSeconds: number
  ): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.hincrby(key, 'count', 1);
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      logger.error('增加Redis计数失败', { key, error });
    }
  }

  /**
   * 清理过期内存记录
   */
  private cleanExpiredMemoryRecords(): void {
    const now = Date.now();
    for (const [key, record] of this.memoryStore.entries()) {
      if (now > record.resetTime) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * 获取内存存储统计
   */
  getMemoryStats() {
    return {
      size: this.memoryStore.size,
      keys: Array.from(this.memoryStore.keys()),
    };
  }

  /**
   * 清空所有记录
   */
  clearAll(): void {
    this.memoryStore.clear();
  }

  /**
   * 清空特定键
   */
  clearKey(key: string): void {
    this.memoryStore.delete(key);
  }

  /**
   * 清空特定IP的所有记录
   */
  clearIP(ip: string): void {
    for (const [key] of this.memoryStore.entries()) {
      if (key.includes(ip)) {
        this.memoryStore.delete(key);
      }
    }
  }
}

// 导出单例实例
export const rateLimiter = RateLimiter.getInstance();

// 预定义的频率限制配置
export const commonRateLimits = {
  // 通用API限制
  general: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 100,           // 100次请求
    identifier: 'ip' as const,
  },

  // 严格限制（敏感操作）
  strict: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 10,            // 10次请求
    identifier: 'userId' as const,
  },

  // 登录限制
  auth: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 5,             // 5次登录尝试
    identifier: 'ip' as const,
    message: '登录尝试过于频繁，请15分钟后再试',
  },

  // AI API限制
  ai: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 20,            // 20次AI调用
    identifier: 'userId' as const,
  },

  // 文件上传限制
  upload: {
    windowMs: 60 * 1000,      // 1分钟
    maxRequests: 10,            // 10次上传
    identifier: 'userId' as const,
  },

  // 数据导出限制
  export: {
    windowMs: 24 * 60 * 60 * 1000, // 24小时
    maxRequests: 3,                  // 3次导出
    identifier: 'userId' as const,
    message: '数据导出次数已达每日限制',
  },
} as const;

// 创建频率限制高阶函数
export function withRateLimit(
  config: RateLimitConfig,
  handler: (
    request: NextRequest,
    context: { rateLimit?: RateLimitResult }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const rateLimitResult = await rateLimiter.checkLimit(request, config);

    // 设置响应头
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
    };

    if (rateLimitResult.retryAfter) {
      headers['Retry-After'] = rateLimitResult.retryAfter.toString();
    }

    // 检查是否超过限制
    if (!rateLimitResult.allowed) {
      const error = APIError.tooManyRequests(
        config.message || '请求过于频繁，请稍后再试'
      );
      
      return createErrorResponse(error, { headers });
    }

    // 执行处理器
    const response = await handler(request, { rateLimit: rateLimitResult });

    // 添加限制头到响应
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

// 快捷装饰器
export const withGeneralRateLimit = (handler: Function) =>
  withRateLimit(commonRateLimits.general, handler);

export const withStrictRateLimit = (handler: Function) =>
  withRateLimit(commonRateLimits.strict, handler);

export const withAuthRateLimit = (handler: Function) =>
  withRateLimit(commonRateLimits.auth, handler);

export const withAIRateLimit = (handler: Function) =>
  withRateLimit(commonRateLimits.ai, handler);

export const withUploadRateLimit = (handler: Function) =>
  withRateLimit(commonRateLimits.upload, handler);

export const withExportRateLimit = (handler: Function) =>
  withRateLimit(commonRateLimits.export, handler);
