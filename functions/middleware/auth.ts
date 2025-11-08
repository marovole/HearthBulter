/**
 * Cloudflare Functions 认证中间件
 * 
 * 验证 Supabase JWT Token 并提取用户信息
 */

import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface CloudflareContext {
  request: Request;
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_KEY: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    [key: string]: any;
  };
  waitUntil: (promise: Promise<any>) => void;
}

/**
 * 从请求头中提取 Bearer Token
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * 验证 JWT Token 并获取用户信息
 */
async function verifyToken(token: string, env: CloudflareContext['env']) {
  try {
    const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 验证 token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * 认证中间件 - 要求用户必须登录
 */
export async function requireAuth(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  const token = extractBearerToken(context.request);

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing authentication token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const user = await verifyToken(token, context.env);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 将用户信息附加到请求上下文
  (context.request as AuthenticatedRequest).user = user;

  return next();
}

/**
 * 可选认证中间件 - 用户可以登录也可以不登录
 */
export async function optionalAuth(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  const token = extractBearerToken(context.request);

  if (token) {
    const user = await verifyToken(token, context.env);
    if (user) {
      (context.request as AuthenticatedRequest).user = user;
    }
  }

  return next();
}

/**
 * 角色验证中间件 - 要求特定角色
 */
export function requireRole(allowedRoles: string[]) {
  return async (
    context: CloudflareContext,
    next: () => Promise<Response>
  ): Promise<Response> => {
    const user = (context.request as AuthenticatedRequest).user;

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return next();
  };
}

/**
 * CORS 中间件
 */
export async function cors(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  // 处理 OPTIONS 预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 执行实际请求
  const response = await next();

  // 添加 CORS 头
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * 错误处理中间件
 */
export async function errorHandler(
  context: CloudflareContext,
  next: () => Promise<Response>
): Promise<Response> {
  try {
    return await next();
  } catch (error) {
    console.error('Unhandled error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 中间件组合器
 */
export function composeMiddlewares(...middlewares: Array<
  (context: CloudflareContext, next: () => Promise<Response>) => Promise<Response>
>) {
  return async (
    context: CloudflareContext,
    handler: () => Promise<Response>
  ): Promise<Response> => {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index >= middlewares.length) {
        return handler();
      }

      const middleware = middlewares[index++];
      return middleware(context, next);
    };

    return next();
  };
}
