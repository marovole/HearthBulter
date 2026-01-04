/**
 * AI 服务错误处理器
 *
 * 规范化错误响应，不泄露 AI 提供商详情
 */

import { logger } from '@/lib/logger';
import { RateLimitError } from './rate-limiter';

// AI 错误类型
export enum AIErrorType {
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT',
  MODEL_ERROR = 'MODEL_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN = 'UNKNOWN',
}

// AI 错误响应
export interface AIErrorResponse {
  type: AIErrorType;
  message: string;
  retryable: boolean;
  retryAfter?: number;
}

// 已知的 AI 提供商错误模式
const ERROR_PATTERNS = {
  openai: {
    rateLimit: /rate_limit|too many requests|429/i,
    timeout: /timeout|timed out/i,
    invalidRequest: /invalid_request|400/i,
    quotaExceeded: /quota|billing|insufficient_quota/i,
    serverError: /500|502|503|internal/i,
  },
  anthropic: {
    rateLimit: /rate_limit|overloaded/i,
    timeout: /timeout/i,
    invalidRequest: /invalid_request/i,
    quotaExceeded: /credit|billing/i,
    serverError: /overloaded|unavailable/i,
  },
};

/**
 * 分析错误类型
 */
function analyzeErrorType(error: unknown): AIErrorType {
  if (error instanceof RateLimitError) {
    return AIErrorType.RATE_LIMITED;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : '';

  // 检查超时
  if (
    errorName === 'TimeoutError' ||
    errorMessage.match(/timeout|timed out|ETIMEDOUT/i)
  ) {
    return AIErrorType.TIMEOUT;
  }

  // 检查所有提供商的错误模式
  for (const patterns of Object.values(ERROR_PATTERNS)) {
    if (patterns.rateLimit.test(errorMessage)) {
      return AIErrorType.RATE_LIMITED;
    }
    if (patterns.quotaExceeded.test(errorMessage)) {
      return AIErrorType.QUOTA_EXCEEDED;
    }
    if (patterns.invalidRequest.test(errorMessage)) {
      return AIErrorType.INVALID_INPUT;
    }
    if (patterns.serverError.test(errorMessage)) {
      return AIErrorType.SERVICE_UNAVAILABLE;
    }
  }

  return AIErrorType.UNKNOWN;
}

/**
 * 获取用户友好的错误消息
 */
function getUserFriendlyMessage(errorType: AIErrorType): string {
  const messages: Record<AIErrorType, string> = {
    [AIErrorType.RATE_LIMITED]: '请求频率过高，请稍后再试',
    [AIErrorType.TIMEOUT]: '请求超时，请稍后再试',
    [AIErrorType.INVALID_INPUT]: '输入内容无效，请检查后重试',
    [AIErrorType.MODEL_ERROR]: 'AI 处理失败，请稍后再试',
    [AIErrorType.QUOTA_EXCEEDED]: 'AI 服务暂时不可用，请联系管理员',
    [AIErrorType.SERVICE_UNAVAILABLE]: 'AI 服务暂时不可用，请稍后再试',
    [AIErrorType.UNKNOWN]: '处理请求时发生错误，请稍后再试',
  };

  return messages[errorType];
}

/**
 * 判断错误是否可重试
 */
function isRetryable(errorType: AIErrorType): boolean {
  const retryableTypes = [
    AIErrorType.RATE_LIMITED,
    AIErrorType.TIMEOUT,
    AIErrorType.SERVICE_UNAVAILABLE,
  ];

  return retryableTypes.includes(errorType);
}

/**
 * 获取重试等待时间
 */
function getRetryAfter(
  error: unknown,
  errorType: AIErrorType,
): number | undefined {
  if (error instanceof RateLimitError) {
    return error.retryAfter;
  }

  // 根据错误类型设置默认重试时间
  const defaultRetryTimes: Partial<Record<AIErrorType, number>> = {
    [AIErrorType.RATE_LIMITED]: 60,
    [AIErrorType.TIMEOUT]: 10,
    [AIErrorType.SERVICE_UNAVAILABLE]: 30,
  };

  return defaultRetryTimes[errorType];
}

/**
 * 处理 AI 调用错误
 */
export function handleAIError(
  error: unknown,
  context?: {
    userId?: string;
    operation?: string;
    provider?: string;
  },
): AIErrorResponse {
  const errorType = analyzeErrorType(error);
  const message = getUserFriendlyMessage(errorType);
  const retryable = isRetryable(errorType);
  const retryAfter = getRetryAfter(error, errorType);

  // 记录详细错误日志（不暴露给用户）
  logger.error('AI 调用错误', {
    errorType,
    originalError: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });

  return {
    type: errorType,
    message,
    retryable,
    retryAfter,
  };
}

/**
 * AI 错误类
 */
export class AIServiceError extends Error {
  type: AIErrorType;
  retryable: boolean;
  retryAfter?: number;

  constructor(response: AIErrorResponse) {
    super(response.message);
    this.name = 'AIServiceError';
    this.type = response.type;
    this.retryable = response.retryable;
    this.retryAfter = response.retryAfter;
  }
}

/**
 * 带重试的 AI 调用包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorType = analyzeErrorType(error);

      // 如果不可重试或已达最大重试次数，抛出错误
      if (!isRetryable(errorType) || attempt === maxRetries) {
        throw error;
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay,
      );

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      logger.info('AI 调用重试', {
        attempt: attempt + 1,
        maxRetries,
        delay,
        errorType,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 带超时的 AI 调用包装器
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`AI 调用超时 (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * 超时错误类
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
