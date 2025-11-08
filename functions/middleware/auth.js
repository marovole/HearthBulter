import { createSupabaseClient } from '../utils/supabase.js'

export async function validateAuth(request, env) {
  // 1. 获取认证令牌
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  // 2. 创建Supabase客户端
  const supabase = createSupabaseClient(env)

  // 3. 验证令牌
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  // 4. 返回用户信息
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {}
  }
}

export async function optionalAuth(request, env) {
  try {
    return await validateAuth(request, env)
  } catch (error) {
    return null
  }
}

export function createAuthMiddleware(required = true) {
  return async (request, env) => {
    try {
      const user = required ? await validateAuth(request, env) : await optionalAuth(request, env)
      return { user }
    } catch (error) {
      if (required) {
        throw error
      }
      return { user: null }
    }
  }
}

export function withAuth(handler, required = true) {
  return async (context) => {
    const { request, env } = context
    
    try {
      const authResult = await createAuthMiddleware(required)(request, env)
      
      // 将用户信息添加到上下文中
      context.user = authResult.user
      
      // 调用原始处理器
      return handler(context)
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: error.message,
        code: 'UNAUTHORIZED'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      })
    }
  }
}
