/**
 * API 速率限制中间件
 * 提供 AI 服务的速率限制检查
 */

import { NextResponse } from 'next/server';
import { rateLimiter, RateLimitConfig } from '@/lib/services/ai/rate-limiter';

export type RateLimitType =
  | 'ai_chat'
  | 'ai_analyze_health'
  | 'ai_generate_report'
  | 'ai_optimize_recipe';

const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  ai_chat: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  ai_analyze_health: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 10 * 60 * 1000,
  },
  ai_generate_report: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  },
  ai_optimize_recipe: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
};

export interface RateLimitContext {
  remaining: number;
  resetTime: number;
}

export type RateLimitResult =
  | { success: true; context: RateLimitContext }
  | { success: false; response: NextResponse };

/**
 * 检查 AI 服务的速率限制
 * @param userId 用户 ID
 * @param type 速率限制类型
 */
export async function checkAIRateLimit(
  userId: string,
  type: RateLimitType,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[type];
  const rateLimitResult = await rateLimiter.checkLimit(userId, type, config);

  if (!rateLimitResult.allowed) {
    const resetTimestamp = rateLimitResult.resetTime.getTime();
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: resetTimestamp,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': resetTimestamp.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        },
      ),
    };
  }

  return {
    success: true,
    context: {
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime.getTime(),
    },
  };
}
