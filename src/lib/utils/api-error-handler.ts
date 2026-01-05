/**
 * API Error Handler
 * API错误处理和重试机制
 */

import { useState, useCallback } from "react";

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: "linear" | "exponential";
  retryCondition?: (error: ApiError) => boolean;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: RetryOptions;
}

/**
 * 自定义API错误类
 */
export class CustomApiError extends Error implements ApiError {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = "CustomApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 带重试机制的fetch函数
 */
export async function fetchWithRetry(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const {
    timeout = 10000,
    retries = {
      maxAttempts: 3,
      delay: 1000,
      backoff: "exponential",
      retryCondition: (error) => {
        // 默认重试条件：网络错误、5xx错误、408请求超时
        return !error.status || error.status >= 500 || error.status === 408;
      },
    },
    ...fetchOptions
  } = options;

  let lastError: ApiError;

  for (let attempt = 1; attempt <= (retries.maxAttempts || 3); attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout,
      });

      // 如果响应不成功，创建错误对象
      if (!response.ok) {
        const errorData = await response
          .clone()
          .json()
          .catch(() => ({}));
        throw new CustomApiError(
          errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code,
          errorData,
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (attempt === (retries.maxAttempts || 3)) {
        break;
      }

      if (
        retries.retryCondition &&
        !retries.retryCondition(lastError as ApiError)
      ) {
        break;
      }

      // 计算延迟时间
      const delay = calculateDelay(
        attempt,
        retries.delay || 1000,
        retries.backoff || "exponential",
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 带超时的fetch函数
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CustomApiError("请求超时", 408, "TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 计算重试延迟时间
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  backoff: "linear" | "exponential",
): number {
  switch (backoff) {
  case "linear":
    return baseDelay * attempt;
  case "exponential":
    return baseDelay * Math.pow(2, attempt - 1);
  default:
    return baseDelay;
  }
}

/**
 * 处理API响应的通用函数
 */
export async function handleApiResponse<T>(
  response: Response,
  errorMessage: string = "API请求失败",
): Promise<T> {
  if (!response.ok) {
    let errorData: any = {};

    try {
      errorData = await response.json();
    } catch {
      // 如果无法解析JSON，使用默认错误信息
    }

    throw new CustomApiError(
      errorData.message || errorMessage,
      response.status,
      errorData.code,
      errorData,
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new CustomApiError("响应解析失败", 500, "PARSE_ERROR");
  }
}

/**
 * 仪表盘API客户端
 */
export class DashboardApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/dashboard") {
    this.baseUrl = baseUrl;
  }

  /**
   * 获取体重趋势数据
   */
  async getWeightTrend(memberId: string, days: number = 30) {
    const url = `${this.baseUrl}/weight-trend?memberId=${memberId}&days=${days}`;
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  }

  /**
   * 获取营养分析数据
   */
  async getNutritionAnalysis(
    memberId: string,
    period: "daily" | "weekly" | "monthly" = "daily",
  ) {
    const url = `${this.baseUrl}/nutrition-analysis?memberId=${memberId}&period=${period}`;
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  }

  /**
   * 获取健康评分数据
   */
  async getHealthScore(memberId: string) {
    const url = `${this.baseUrl}/health-score?memberId=${memberId}`;
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  }

  /**
   * 获取健康评分历史
   */
  async getHealthScoreHistory(memberId: string, days: number = 30) {
    const url = `${this.baseUrl}/health-score/history?memberId=${memberId}&days=${days}`;
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  }

  /**
   * 获取周报数据
   */
  async getWeeklyReport(
    memberId: string,
    type: "weekly" | "monthly" = "weekly",
  ) {
    const url = `${this.baseUrl}/weekly-report?memberId=${memberId}&type=${type}`;
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  }

  /**
   * 获取仪表盘聚合数据
   */
  async getDashboardData(memberId: string, useCache: boolean = true) {
    const url = `${this.baseUrl}/data?memberId=${memberId}&useCache=${useCache}`;
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  }

  /**
   * 导出数据
   */
  async exportData(memberId: string, format: "json" | "csv" = "json") {
    const url = `${this.baseUrl}/data?memberId=${memberId}&format=${format}`;
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {}

      throw new CustomApiError(
        errorData.message || "导出失败",
        response.status,
        errorData.code,
        errorData,
      );
    }

    return response;
  }

  /**
   * 清除缓存
   */
  async clearCache() {
    const url = `${this.baseUrl}/data`;
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "clear-cache" }),
    });
    return handleApiResponse(response);
  }

  /**
   * 预加载数据
   */
  async preloadData(memberIds: string[]) {
    const url = `${this.baseUrl}/data`;
    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "preload", memberIds }),
    });
    return handleApiResponse(response);
  }
}

// 导出默认客户端实例
export const dashboardApiClient = new DashboardApiClient();

/**
 * React Hook for API calls with error handling
 */
export function useApiCall<T, Args extends any[]>(
  apiFunction: (...args: Args) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
    retryAttempts?: number;
  } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = useCallback(
    async (...args: Args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        options.onError?.(apiError);
        throw apiError;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, options],
  );

  return {
    data,
    loading,
    error,
    execute,
  };
}
