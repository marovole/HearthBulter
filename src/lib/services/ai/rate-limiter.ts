/**
 * API频率限制服务
 * 防止滥用AI API调用
 */

interface RateLimit {
  identifier: string; // 用户ID或IP地址
  endpoint: string;   // API端点
  windowMs: number;   // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// 内存存储的频率限制记录（生产环境建议使用Redis）
const rateLimitStore = new Map<string, RateLimitRecord>();

// 默认频率限制配置
const DEFAULT_RATE_LIMITS: Record<string, RateLimit> = {
  // AI分析相关
  'ai_analyze_health': {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 5, // 每小时最多5次健康分析
  },
  'ai_optimize_recipe': {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 10, // 每小时最多10次食谱优化
  },
  'ai_chat': {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 20, // 每分钟最多20次对话
  },
  'ai_generate_report': {
    windowMs: 24 * 60 * 60 * 1000, // 24小时
    maxRequests: 3, // 每天最多3次报告生成
  },

  // 通用限制
  'ai_general': {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 30, // 每分钟最多30次AI调用
  },
};

export class RateLimiter {
  private static instance: RateLimiter;

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * 检查请求是否在频率限制内
   */
  async checkLimit(
    identifier: string,
    endpoint: string,
    customLimit?: Partial<RateLimit>
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const limit = customLimit || DEFAULT_RATE_LIMITS[endpoint] || DEFAULT_RATE_LIMITS.ai_general;
    const key = `${identifier}:${endpoint}`;

    const now = Date.now();
    const record = rateLimitStore.get(key);

    // 如果记录不存在或已过期，重置计数
    if (!record || now > record.resetTime) {
      const newRecord: RateLimitRecord = {
        count: 0,
        resetTime: now + limit.windowMs,
        lastRequest: now,
      };
      rateLimitStore.set(key, newRecord);

      return {
        allowed: true,
        remaining: limit.maxRequests - 1,
        resetTime: newRecord.resetTime,
      };
    }

    // 检查是否超过限制
    if (record.count >= limit.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000), // 秒
      };
    }

    // 增加计数
    record.count++;
    record.lastRequest = now;

    return {
      allowed: true,
      remaining: limit.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * 记录请求（用于中间件）
   */
  async recordRequest(identifier: string, endpoint: string): Promise<void> {
    const key = `${identifier}:${endpoint}`;
    const record = rateLimitStore.get(key);

    if (record) {
      record.count++;
      record.lastRequest = Date.now();
    }
  }

  /**
   * 获取用户当前的频率限制状态
   */
  async getUserLimitStatus(
    identifier: string
  ): Promise<Record<string, {
    current: number;
    limit: number;
    resetTime: number;
    remaining: number;
  }>> {
    const status: Record<string, any> = {};

    for (const [endpoint, limit] of Object.entries(DEFAULT_RATE_LIMITS)) {
      const key = `${identifier}:${endpoint}`;
      const record = rateLimitStore.get(key);

      if (record && Date.now() <= record.resetTime) {
        status[endpoint] = {
          current: record.count,
          limit: limit.maxRequests,
          resetTime: record.resetTime,
          remaining: Math.max(0, limit.maxRequests - record.count),
        };
      } else {
        status[endpoint] = {
          current: 0,
          limit: limit.maxRequests,
          resetTime: Date.now() + limit.windowMs,
          remaining: limit.maxRequests,
        };
      }
    }

    return status;
  }

  /**
   * 重置特定用户的频率限制
   */
  async resetUserLimits(identifier: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${identifier}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => rateLimitStore.delete(key));
  }

  /**
   * 清理过期的记录
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取频率限制统计信息
   */
  async getStats(): Promise<{
    totalRecords: number;
    activeRecords: number;
    cleanedRecords: number;
    limits: Record<string, RateLimit>;
  }> {
    const now = Date.now();
    let activeRecords = 0;

    for (const record of rateLimitStore.values()) {
      if (now <= record.resetTime) {
        activeRecords++;
      }
    }

    return {
      totalRecords: rateLimitStore.size,
      activeRecords,
      cleanedRecords: rateLimitStore.size - activeRecords,
      limits: DEFAULT_RATE_LIMITS,
    };
  }
}

// 导出单例实例
export const rateLimiter = RateLimiter.getInstance();

// 定期清理过期记录（每小时执行一次）
if (typeof globalThis !== 'undefined') {
  setInterval(async () => {
    try {
      const cleaned = await rateLimiter.cleanup();
      if (cleaned > 0) {
        console.log(`清理了 ${cleaned} 条过期的频率限制记录`);
      }
    } catch (error) {
      console.error('频率限制记录清理失败:', error);
    }
  }, 60 * 60 * 1000); // 每小时清理一次
}
