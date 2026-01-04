/**
 * API 认证中间件
 * 提供统一的认证检查逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { Session } from 'next-auth';
import { auth } from '@/lib/auth';

export interface AuthenticatedRequest extends NextRequest {
  session: Session;
}

export interface AuthContext {
  session: Session;
  userId: string;
}

export type AuthResult =
  | { success: true; context: AuthContext }
  | { success: false; response: NextResponse };

/**
 * 验证请求的认证状态
 * @returns 认证结果，包含用户会话或错误响应
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return {
    success: true,
    context: {
      session,
      userId: session.user.id,
    },
  };
}

/**
 * 认证中间件高阶函数
 * @param handler 处理函数
 */
export function withAuth<T>(
  handler: (
    request: NextRequest,
    context: AuthContext,
  ) => Promise<NextResponse<T>>,
) {
  return async (
    request: NextRequest,
  ): Promise<NextResponse<T | { error: string }>> => {
    const authResult = await requireAuth();

    if (!authResult.success) {
      return authResult.response as NextResponse<{ error: string }>;
    }

    return handler(request, authResult.context);
  };
}
