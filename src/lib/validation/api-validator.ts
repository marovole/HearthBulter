/**
 * 统一 API 验证中间件
 *
 * 提供 Zod schema 验证的便捷包装函数
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '@/lib/logger';

// 验证错误响应类型
export interface ValidationErrorResponse {
  error: string;
  code: 'VALIDATION_ERROR';
  details: {
    field: string;
    message: string;
  }[];
}

/**
 * 格式化 Zod 验证错误
 */
function formatZodError(error: ZodError): ValidationErrorResponse {
  const details = error.errors.map((err) => ({
    field: err.path.join('.') || 'root',
    message: err.message,
  }));

  return {
    error: '请求参数验证失败',
    code: 'VALIDATION_ERROR',
    details,
  };
}

/**
 * 验证请求体
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<
  | { success: true; data: T }
  | { success: false; error: ValidationErrorResponse }
> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('API 请求体验证失败', {
        path: request.nextUrl.pathname,
        errors: error.errors,
      });
      return { success: false, error: formatZodError(error) };
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          error: '无效的 JSON 格式',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'body', message: '请求体必须是有效的 JSON' }],
        },
      };
    }

    throw error;
  }
}

/**
 * 验证查询参数
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
):
  | { success: true; data: T }
  | { success: false; error: ValidationErrorResponse } {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryObject: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      queryObject[key] = value;
    });

    const data = schema.parse(queryObject);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('API 查询参数验证失败', {
        path: request.nextUrl.pathname,
        errors: error.errors,
      });
      return { success: false, error: formatZodError(error) };
    }
    throw error;
  }
}

/**
 * 验证路径参数
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>,
):
  | { success: true; data: T }
  | { success: false; error: ValidationErrorResponse } {
  try {
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('API 路径参数验证失败', { errors: error.errors });
      return { success: false, error: formatZodError(error) };
    }
    throw error;
  }
}

/**
 * 创建验证错误响应
 */
export function validationErrorResponse(
  error: ValidationErrorResponse,
): NextResponse {
  return NextResponse.json(error, { status: 400 });
}

/**
 * 高阶函数：包装 API handler 添加请求体验证
 */
export function withBodyValidation<T>(
  schema: ZodSchema<T>,
  handler: (request: NextRequest, data: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await validateBody(request, schema);

    if (!result.success) {
      return validationErrorResponse(result.error);
    }

    return handler(request, result.data);
  };
}

/**
 * 高阶函数：包装 API handler 添加查询参数验证
 */
export function withQueryValidation<T>(
  schema: ZodSchema<T>,
  handler: (request: NextRequest, query: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = validateQuery(request, schema);

    if (!result.success) {
      return validationErrorResponse(result.error);
    }

    return handler(request, result.data);
  };
}

// 重新导出 schemas
export * from './schemas/inventory';
export * from './schemas/analytics';
