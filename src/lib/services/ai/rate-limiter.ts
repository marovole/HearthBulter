/**
 * AI 调用限流器
 *
 * 实现基于用户的调用频率限制，防止滥用和成本失控
 */

import { logger } from '@/lib/logger';

// 限流配置
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

// 用户限流状态
interface UserRateLimit {
  requests: number[];
  blockedUntil: number | null;
}

// 限流结果
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

// AI 调用类型
export type AICallType =
  | 'chat'
  | 'analysis'
  | 'report'
  | 'recommendation'
  | 'image';

// 默认限流配置（每种调用类型）
const DEFAULT_CONFIGS: Record<AICallType, RateLimitConfig> = {
  chat: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  analysis: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 10 * 60 * 1000,
  },
  report: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  },
  recommendation: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  image: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000,
  },
};

// 用户限流存储（内存存储，生产环境应使用 Redis）
const userLimits = new Map<string, Map<AICallType, UserRateLimit>>();

/**
 * 生成限流键
 */
function getRateLimitKey(userId: string, callType: AICallType): string {
  return `${userId}:${callType}`;
}

/**
 * 获取或创建用户限流状态
 */
function getUserRateLimit(userId: string, callType: AICallType): UserRateLimit {
  if (!userLimits.has(userId)) {
    userLimits.set(userId, new Map());
  }

  const userMap = userLimits.get(userId)!;

  if (!userMap.has(callType)) {
    userMap.set(callType, {
      requests: [],
      blockedUntil: null,
    });
  }

  return userMap.get(callType)!;
}

/**
 * 清理过期的请求记录
 */
function cleanupExpiredRequests(
  rateLimit: UserRateLimit,
  windowMs: number,
): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  rateLimit.requests = rateLimit.requests.filter((ts) => ts > windowStart);
}

/**
 * 检查限流
 */
export function checkRateLimit(
  userId: string,
  callType: AICallType,
  config?: Partial<RateLimitConfig>,
): RateLimitResult {
  const finalConfig = { ...DEFAULT_CONFIGS[callType], ...config };
  const rateLimit = getUserRateLimit(userId, callType);
  const now = Date.now();

  // 检查是否被阻止
  if (rateLimit.blockedUntil && rateLimit.blockedUntil > now) {
    const retryAfter = Math.ceil((rateLimit.blockedUntil - now) / 1000);
    logger.warn('AI 调用被限流', {
      userId,
      callType,
      retryAfter,
    });

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(rateLimit.blockedUntil),
      retryAfter,
    };
  }

  // 清除阻止状态
  rateLimit.blockedUntil = null;

  // 清理过期请求
  cleanupExpiredRequests(rateLimit, finalConfig.windowMs);

  // 检查是否超过限制
  if (rateLimit.requests.length >= finalConfig.maxRequests) {
    rateLimit.blockedUntil = now + finalConfig.blockDurationMs;
    const retryAfter = Math.ceil(finalConfig.blockDurationMs / 1000);

    logger.warn('AI 调用触发限流阻止', {
      userId,
      callType,
      requestCount: rateLimit.requests.length,
      blockDuration: finalConfig.blockDurationMs,
    });

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(rateLimit.blockedUntil),
      retryAfter,
    };
  }

  // 计算重置时间
  const oldestRequest = rateLimit.requests[0] || now;
  const resetAt = new Date(oldestRequest + finalConfig.windowMs);

  return {
    allowed: true,
    remaining: finalConfig.maxRequests - rateLimit.requests.length,
    resetAt,
  };
}

/**
 * 记录 AI 调用
 */
export function recordAICall(userId: string, callType: AICallType): void {
  const rateLimit = getUserRateLimit(userId, callType);
  rateLimit.requests.push(Date.now());
}

/**
 * 获取用户限流状态
 */
export function getUserRateLimitStatus(
  userId: string,
  callType: AICallType,
): {
  requestsInWindow: number;
  isBlocked: boolean;
  blockedUntil: Date | null;
} {
  const config = DEFAULT_CONFIGS[callType];
  const rateLimit = getUserRateLimit(userId, callType);

  cleanupExpiredRequests(rateLimit, config.windowMs);

  return {
    requestsInWindow: rateLimit.requests.length,
    isBlocked: rateLimit.blockedUntil
      ? rateLimit.blockedUntil > Date.now()
      : false,
    blockedUntil: rateLimit.blockedUntil
      ? new Date(rateLimit.blockedUntil)
      : null,
  };
}

/**
 * 重置用户限流状态（管理员功能）
 */
export function resetUserRateLimit(
  userId: string,
  callType?: AICallType,
): void {
  if (callType) {
    const userMap = userLimits.get(userId);
    if (userMap) {
      userMap.delete(callType);
    }
  } else {
    userLimits.delete(userId);
  }

  logger.info('重置用户限流状态', { userId, callType });
}

/**
 * 清理所有过期的限流记录（定期清理任务）
 */
export function cleanupAllExpiredRecords(): void {
  const now = Date.now();
  let cleanedUsers = 0;
  let cleanedRecords = 0;

  for (const [userId, userMap] of userLimits.entries()) {
    for (const [callType, rateLimit] of userMap.entries()) {
      const config = DEFAULT_CONFIGS[callType];
      const originalLength = rateLimit.requests.length;

      cleanupExpiredRequests(rateLimit, config.windowMs);
      cleanedRecords += originalLength - rateLimit.requests.length;

      // 清除已解除的阻止状态
      if (rateLimit.blockedUntil && rateLimit.blockedUntil <= now) {
        rateLimit.blockedUntil = null;
      }

      // 如果没有记录，删除该类型
      if (rateLimit.requests.length === 0 && !rateLimit.blockedUntil) {
        userMap.delete(callType);
      }
    }

    // 如果用户没有任何限流记录，删除用户
    if (userMap.size === 0) {
      userLimits.delete(userId);
      cleanedUsers++;
    }
  }

  if (cleanedRecords > 0 || cleanedUsers > 0) {
    logger.debug('清理限流记录', { cleanedUsers, cleanedRecords });
  }
}

/**
 * 限流中间件包装器
 */
export async function withRateLimit<T>(
  userId: string,
  callType: AICallType,
  fn: () => Promise<T>,
): Promise<T> {
  const result = checkRateLimit(userId, callType);

  if (!result.allowed) {
    throw new RateLimitError(
      `AI 调用频率超限，请 ${result.retryAfter} 秒后重试`,
      result.retryAfter || 60,
    );
  }

  recordAICall(userId, callType);
  return fn();
}

/**
 * 限流错误类
 */
export class RateLimitError extends Error {
  retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 类风格的限流器（兼容旧 API）
 */
export class RateLimiter {
  private limits = new Map<
    string,
    { requests: number[]; blockedUntil: number | null }
  >();

  private getKey(userId: string, endpoint: string): string {
    return `${userId}:${endpoint}`;
  }

  async checkLimit(
    userId: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const key = this.getKey(userId, endpoint);
    const now = Date.now();
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;
    const blockDurationMs = config.blockDurationMs || 60000;

    if (!this.limits.has(key)) {
      this.limits.set(key, { requests: [], blockedUntil: null });
    }

    const limit = this.limits.get(key)!;

    // 检查是否被阻止
    if (limit.blockedUntil && limit.blockedUntil > now) {
      const retryAfter = Math.ceil((limit.blockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(limit.blockedUntil),
        retryAfter,
      };
    }

    limit.blockedUntil = null;

    // 清理过期请求
    const windowStart = now - windowMs;
    limit.requests = limit.requests.filter((ts) => ts > windowStart);

    // 检查是否超过限制
    if (limit.requests.length >= maxRequests) {
      limit.blockedUntil = now + blockDurationMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(limit.blockedUntil),
        retryAfter: Math.ceil(blockDurationMs / 1000),
      };
    }

    // 记录请求
    limit.requests.push(now);

    const oldestRequest = limit.requests[0] || now;
    const resetTime = new Date(oldestRequest + windowMs);

    return {
      allowed: true,
      remaining: maxRequests - limit.requests.length,
      resetTime,
    };
  }

  clearAll(): void {
    this.limits.clear();
  }

  clearUser(userId: string): void {
    for (const key of this.limits.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.limits.delete(key);
      }
    }
  }
}

// 默认单例实例
export const rateLimiter = new RateLimiter();
