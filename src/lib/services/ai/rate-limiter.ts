/**
 * AI 调用限流器
 *
 * 实现基于用户的调用频率限制，防止滥用和成本失控
 */

import { logger } from "@/lib/logger";

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
export type AICallType = "chat" | "analysis" | "report" | "recommendation" | "image";

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

const DEFAULT_ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  ai_chat: DEFAULT_CONFIGS.chat,
  ai_analyze_health: DEFAULT_CONFIGS.analysis,
  ai_generate_report: DEFAULT_CONFIGS.report,
  ai_optimize_recipe: DEFAULT_CONFIGS.recommendation,
  ai_general: DEFAULT_CONFIGS.chat,
};

export function getDefaultRateLimitConfig(endpoint: string): RateLimitConfig {
  return DEFAULT_ENDPOINT_CONFIGS[endpoint] ?? DEFAULT_CONFIGS.chat;
}

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
function cleanupExpiredRequests(rateLimit: UserRateLimit, windowMs: number): void {
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
  config?: Partial<RateLimitConfig>
): RateLimitResult {
  const finalConfig = { ...DEFAULT_CONFIGS[callType], ...config };
  const rateLimit = getUserRateLimit(userId, callType);
  const now = Date.now();

  // 检查是否被阻止
  if (rateLimit.blockedUntil && rateLimit.blockedUntil > now) {
    const retryAfter = Math.ceil((rateLimit.blockedUntil - now) / 1000);
    logger.warn("AI 调用被限流", {
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
    const blockDurationMs = finalConfig.blockDurationMs ?? finalConfig.windowMs;
    rateLimit.blockedUntil = now + blockDurationMs;
    const retryAfter = Math.ceil(blockDurationMs / 1000);

    logger.warn("AI 调用触发限流阻止", {
      userId,
      callType,
      requestCount: rateLimit.requests.length,
      blockDuration: blockDurationMs,
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
  callType: AICallType
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
    isBlocked: rateLimit.blockedUntil ? rateLimit.blockedUntil > Date.now() : false,
    blockedUntil: rateLimit.blockedUntil ? new Date(rateLimit.blockedUntil) : null,
  };
}

/**
 * 重置用户限流状态（管理员功能）
 */
export function resetUserRateLimit(userId: string, callType?: AICallType): void {
  if (callType) {
    const userMap = userLimits.get(userId);
    if (userMap) {
      userMap.delete(callType);
    }
  } else {
    userLimits.delete(userId);
  }

  logger.info("重置用户限流状态", { userId, callType });
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
    logger.debug("清理限流记录", { cleanedUsers, cleanedRecords });
  }
}

/**
 * 限流中间件包装器
 */
export async function withRateLimit<T>(
  userId: string,
  callType: AICallType,
  fn: () => Promise<T>
): Promise<T> {
  const result = checkRateLimit(userId, callType);

  if (!result.allowed) {
    throw new RateLimitError(
      `AI 调用频率超限，请 ${result.retryAfter} 秒后重试`,
      result.retryAfter || 60
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
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * 类风格的限流器（兼容旧 API）
 */
type RateLimiterStats = {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  timestamps: number[];
  lastRequestAt: number | null;
};

type RateLimiterMemoryUsage = {
  activeUsers: number;
  totalEntries: number;
  totalRequests: number;
};

type RateLimiterStatsResult = {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockRate: number;
  currentUsage: number;
  remainingRequests: number;
  lastRequestAt: Date | null;
};

type RateLimiterSummary = {
  activeRecords: number;
  totalRecords: number;
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockRate: number;
};

type RateLimiterGlobalStats = {
  totalUsers: number;
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  averageRequestsPerUser: number;
};

export class RateLimiter {
  private limits = new Map<string, { requests: number[]; blockedUntil: number | null }>();
  private stats = new Map<string, RateLimiterStats>();
  private lastConfigs = new Map<string, RateLimitConfig>();
  private lastAccess = new Map<string, number>();

  private getKey(userId: string, endpoint: string): string {
    return `${userId}:${endpoint}`;
  }

  private getStatsEntry(key: string): RateLimiterStats {
    if (!this.stats.has(key)) {
      this.stats.set(key, {
        totalRequests: 0,
        allowedRequests: 0,
        blockedRequests: 0,
        timestamps: [],
        lastRequestAt: null,
      });
    }

    return this.stats.get(key)!;
  }

  private recordStats(key: string, allowed: boolean, now: number): void {
    const stats = this.getStatsEntry(key);
    stats.totalRequests += 1;
    stats.lastRequestAt = now;
    stats.timestamps.push(now);

    if (allowed) {
      stats.allowedRequests += 1;
    } else {
      stats.blockedRequests += 1;
    }
  }

  async checkLimit(
    userId: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    if (config.windowMs <= 0 || config.maxRequests < 0) {
      throw new Error("Invalid rate limit config");
    }

    const key = this.getKey(userId, endpoint);
    const now = Date.now();
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;
    const blockDurationMs = config.blockDurationMs ?? windowMs;

    this.lastConfigs.set(key, config);
    this.lastAccess.set(key, now);

    if (!this.limits.has(key)) {
      this.limits.set(key, { requests: [], blockedUntil: null });
    }

    const limit = this.limits.get(key)!;

    // 清理过期请求
    const windowStart = now - windowMs;
    limit.requests = limit.requests.filter((ts) => ts > windowStart);

    if (config.maxRequests === 0) {
      this.recordStats(key, false, now);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + windowMs),
        retryAfter: Math.ceil(blockDurationMs / 1000),
      };
    }

    // 检查是否被阻止
    if (limit.blockedUntil && limit.blockedUntil > now) {
      const retryAfter = Math.ceil((limit.blockedUntil - now) / 1000);
      this.recordStats(key, false, now);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(limit.blockedUntil),
        retryAfter,
      };
    }

    limit.blockedUntil = null;

    // 检查是否超过限制
    if (limit.requests.length >= maxRequests) {
      limit.blockedUntil = now + blockDurationMs;
      this.recordStats(key, false, now);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(limit.blockedUntil),
        retryAfter: Math.ceil(blockDurationMs / 1000),
      };
    }

    // 记录请求
    limit.requests.push(now);
    this.recordStats(key, true, now);

    const oldestRequest = limit.requests[0] || now;
    const resetTime = new Date(oldestRequest + windowMs);

    return {
      allowed: true,
      remaining: maxRequests - limit.requests.length,
      resetTime,
    };
  }

  getStats(): RateLimiterSummary;
  getStats(userId: string, endpoint: string): RateLimiterStatsResult;
  getStats(userId?: string, endpoint?: string): RateLimiterSummary | RateLimiterStatsResult {
    if (!userId || !endpoint) {
      const globalStats = this.getGlobalStats();
      const totalRecords = this.stats.size;
      const activeRecords = this.limits.size;
      const blockRate =
        globalStats.totalRequests > 0
          ? Math.round((globalStats.blockedRequests / globalStats.totalRequests) * 100)
          : 0;
      return {
        activeRecords,
        totalRecords,
        totalRequests: globalStats.totalRequests,
        allowedRequests: globalStats.allowedRequests,
        blockedRequests: globalStats.blockedRequests,
        blockRate,
      };
    }

    const key = this.getKey(userId, endpoint);
    const stats = this.getStatsEntry(key);
    const limit = this.limits.get(key);
    const lastConfig = this.lastConfigs.get(key);
    const currentUsage = limit ? limit.requests.length : 0;
    const remainingRequests = lastConfig ? Math.max(0, lastConfig.maxRequests - currentUsage) : 0;

    return {
      totalRequests: stats.totalRequests,
      allowedRequests: stats.allowedRequests,
      blockedRequests: stats.blockedRequests,
      blockRate:
        stats.totalRequests > 0
          ? Math.round((stats.blockedRequests / stats.totalRequests) * 100)
          : 0,
      currentUsage,
      remainingRequests,
      lastRequestAt: stats.lastRequestAt ? new Date(stats.lastRequestAt) : null,
    };
  }

  getGlobalStats(endpoint?: string): RateLimiterGlobalStats {
    let totalRequests = 0;
    let allowedRequests = 0;
    let blockedRequests = 0;
    const userIds = new Set<string>();

    for (const [key, stats] of this.stats.entries()) {
      const [, entryEndpoint] = key.split(":");
      if (endpoint && entryEndpoint !== endpoint) {
        continue;
      }
      const [userId] = key.split(":");
      if (userId) {
        userIds.add(userId);
      }
      totalRequests += stats.totalRequests;
      allowedRequests += stats.allowedRequests;
      blockedRequests += stats.blockedRequests;
    }

    return {
      totalUsers: userIds.size,
      totalRequests,
      allowedRequests,
      blockedRequests,
      averageRequestsPerUser: userIds.size > 0 ? totalRequests / userIds.size : 0,
    };
  }

  getStatsByTimeRange(userId: string, endpoint: string, rangeMs: number): RateLimiterStatsResult {
    const key = this.getKey(userId, endpoint);
    const stats = this.getStatsEntry(key);
    const now = Date.now();
    const startTime = rangeMs === Infinity ? 0 : now - rangeMs;
    const rangeRequests = stats.timestamps.filter((ts) => ts >= startTime);
    const lastConfig = this.lastConfigs.get(key);
    const limit = this.limits.get(key);
    const currentUsage = limit ? limit.requests.length : 0;
    const remainingRequests = lastConfig ? Math.max(0, lastConfig.maxRequests - currentUsage) : 0;

    return {
      totalRequests: rangeRequests.length,
      allowedRequests: Math.min(rangeRequests.length, stats.allowedRequests),
      blockedRequests: Math.max(0, rangeRequests.length - stats.allowedRequests),
      blockRate:
        rangeRequests.length > 0
          ? Math.round(
              ((rangeRequests.length - stats.allowedRequests) / rangeRequests.length) * 100
            )
          : 0,
      currentUsage,
      remainingRequests,
      lastRequestAt: stats.lastRequestAt ? new Date(stats.lastRequestAt) : null,
    };
  }

  hasUserData(userId: string, endpoint: string): boolean {
    const key = this.getKey(userId, endpoint);
    return this.limits.has(key) || this.stats.has(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, lastAccess] of this.lastAccess.entries()) {
      const config = this.lastConfigs.get(key);
      if (!config) {
        continue;
      }
      if (now - lastAccess > config.windowMs) {
        this.limits.delete(key);
        this.stats.delete(key);
        this.lastConfigs.delete(key);
        this.lastAccess.delete(key);
      }
    }
  }

  getMemoryUsage(): RateLimiterMemoryUsage {
    let totalRequests = 0;
    for (const stats of this.stats.values()) {
      totalRequests += stats.totalRequests;
    }

    return {
      activeUsers: this.limits.size,
      totalEntries: this.stats.size,
      totalRequests,
    };
  }

  getCircuitBreakerStatus(endpoint: string): {
    enabled: boolean;
    totalUsers: number;
    totalRequests: number;
  } {
    const stats = this.getGlobalStats(endpoint);
    const enabled = stats.totalRequests > 1000;
    return {
      enabled,
      totalUsers: stats.totalUsers,
      totalRequests: stats.totalRequests,
    };
  }

  clearAll(): void {
    this.limits.clear();
    this.stats.clear();
    this.lastConfigs.clear();
    this.lastAccess.clear();
  }

  clearUser(userId: string): void {
    for (const key of this.limits.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.limits.delete(key);
        this.stats.delete(key);
        this.lastConfigs.delete(key);
        this.lastAccess.delete(key);
      }
    }
  }
}

// 默认单例实例
export const rateLimiter = new RateLimiter();
