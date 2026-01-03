/**
 * API 路由处理包装器
 * 提供统一的认证、错误处理和日志记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { APIError, createErrorResponse } from '@/lib/errors/api-error';
import { logger } from '@/lib/logger';

export interface ApiHandlerOptions {
  /** 是否需要认证，默认为 true */
  requireAuth?: boolean;
  /** 日志级别 */
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  /** 是否记录请求详情 */
  logRequest?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
}

export interface ApiContext {
  params?: Record<string, string>;
}

export type ApiHandler<T = NextResponse> = (
  request: NextRequest,
  context?: ApiContext,
) => Promise<T>;

type LogContext = Record<string, unknown>;

async function handleApiRequest<T>(
  request: NextRequest,
  options: ApiHandlerOptions,
  handler: () => Promise<T>,
  logContext?: LogContext,
): Promise<T> {
  const startTime = Date.now();
  const url = request.url;
  const method = request.method;
  const {
    requireAuth = true,
    logLevel = 'error',
    logRequest = false,
    errorMessage = '服务器内部错误',
  } = options;

  try {
    if (logRequest) {
      logger.info('API请求', { method, url, ...logContext });
    }

    if (requireAuth) {
      const session = await auth();
      if (!session?.user?.id) {
        throw APIError.unauthorized('未授权访问');
      }
    }

    const response = await handler();

    const duration = Date.now() - startTime;
    if (logRequest) {
      logger.debug('API响应', {
        method,
        url,
        duration,
        status: 'success',
        ...logContext,
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof APIError) {
      if (logLevel === 'warn' || logLevel === 'info') {
        logger.warn('API业务错误', {
          method,
          url,
          duration,
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          ...logContext,
        });
      }
      return createErrorResponse(error) as T;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('API未处理错误', {
      method,
      url,
      duration,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      ...logContext,
    });

    return createErrorResponse(APIError.internal(errorMessage)) as T;
  }
}

/**
 * API 处理包装器
 * 自动处理认证、错误捕获和日志记录
 *
 * @example
 * ```typescript
 * export const GET = withApiHandler(async (request) => {
 *   const data = await fetchData();
 *   return NextResponse.json({ success: true, data });
 * });
 *
 * // 不需要认证的端点
 * export const GET = withApiHandler(async (request) => {
 *   return NextResponse.json({ status: 'ok' });
 * }, { requireAuth: false });
 * ```
 */
export function withApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {},
): ApiHandler {
  return (request: NextRequest, context?: ApiContext) => {
    const logContext = context?.params ? { params: context.params } : undefined;
    return handleApiRequest(
      request,
      options,
      () => handler(request, context),
      logContext,
    );
  };
}

/**
 * 带路由参数的API处理包装器
 * 用于动态路由 [id] 等场景
 */
export function withApiHandlerParams<P extends Record<string, string>>(
  handler: (request: NextRequest, params: P) => Promise<NextResponse>,
  options: ApiHandlerOptions = {},
): (
  request: NextRequest,
  context: { params: Promise<P> },
) => Promise<NextResponse> {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    const params = await context.params;
    return handleApiRequest(request, options, () => handler(request, params), {
      params,
    });
  };
}

/**
 * 验证请求体的辅助函数
 */
export async function parseRequestBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw APIError.badRequest('请求体格式错误');
  }
}

/**
 * 验证必填字段
 */
export function validateRequired(
  data: Record<string, unknown>,
  fields: string[],
): void {
  const missing = fields.filter(
    (field) =>
      data[field] === undefined || data[field] === null || data[field] === '',
  );
  if (missing.length > 0) {
    throw APIError.badRequest(`缺少必填字段: ${missing.join(', ')}`);
  }
}

/**
 * 从URL获取查询参数
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  return new URL(request.url).searchParams;
}

/**
 * 获取分页参数
 */
export function getPaginationParams(request: NextRequest): {
  page: number;
  limit: number;
  skip: number;
} {
  const params = getQueryParams(request);
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(params.get('limit') || '20', 10)),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
