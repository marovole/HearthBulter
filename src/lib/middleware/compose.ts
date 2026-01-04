/**
 * 中间件组合工具
 * 支持链式调用多个中间件
 */

import { NextRequest, NextResponse } from 'next/server';

export type MiddlewareResult<T> =
  | { success: true; context: T }
  | { success: false; response: NextResponse };

export type Middleware<TInput, TOutput> = (
  request: NextRequest,
  context: TInput,
) => Promise<MiddlewareResult<TOutput>>;

export type InitialMiddleware<TOutput> = (
  request: NextRequest,
) => Promise<MiddlewareResult<TOutput>>;

/**
 * 组合多个中间件
 * 按顺序执行，任一失败则立即返回错误响应
 */
export function composeMiddleware<T1, T2>(
  m1: InitialMiddleware<T1>,
  m2: Middleware<T1, T2>,
): InitialMiddleware<T1 & T2>;

export function composeMiddleware<T1, T2, T3>(
  m1: InitialMiddleware<T1>,
  m2: Middleware<T1, T2>,
  m3: Middleware<T1 & T2, T3>,
): InitialMiddleware<T1 & T2 & T3>;

export function composeMiddleware<T1, T2, T3, T4>(
  m1: InitialMiddleware<T1>,
  m2: Middleware<T1, T2>,
  m3: Middleware<T1 & T2, T3>,
  m4: Middleware<T1 & T2 & T3, T4>,
): InitialMiddleware<T1 & T2 & T3 & T4>;

export function composeMiddleware(
  ...middlewares: (
    | InitialMiddleware<Record<string, unknown>>
    | Middleware<Record<string, unknown>, Record<string, unknown>>
  )[]
): InitialMiddleware<Record<string, unknown>> {
  return async (request: NextRequest) => {
    let context: Record<string, unknown> = {};

    for (let i = 0; i < middlewares.length; i++) {
      const middleware = middlewares[i];
      const result =
        i === 0
          ? await (middleware as InitialMiddleware<Record<string, unknown>>)(
              request,
            )
          : await (
              middleware as Middleware<
                Record<string, unknown>,
                Record<string, unknown>
              >
            )(request, context);

      if (!result.success) {
        return result;
      }

      context = { ...context, ...result.context };
    }

    return { success: true, context };
  };
}

/**
 * 创建带中间件的路由处理函数
 * @param middleware 中间件组合
 * @param handler 处理函数
 */
export function withMiddleware<TContext, TResponse>(
  middleware: InitialMiddleware<TContext>,
  handler: (
    request: NextRequest,
    context: TContext,
  ) => Promise<NextResponse<TResponse>>,
) {
  return async (
    request: NextRequest,
  ): Promise<NextResponse<TResponse | { error: string }>> => {
    const result = await middleware(request);

    if (!result.success) {
      return result.response as NextResponse<{ error: string }>;
    }

    return handler(request, result.context as TContext);
  };
}
