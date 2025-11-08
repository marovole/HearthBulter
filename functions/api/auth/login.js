import { createSupabaseClient } from '../../utils/supabase.js'
import { withErrorHandler } from '../../utils/error-handler.js'
import { createSuccessResponse, createValidationError } from '../../utils/response.js'
import { parseRequestBody, validateRequiredFields, validateEmail } from '../../utils/validation.js'

// POST /api/auth/login - 用户登录
export const onRequestPost = withErrorHandler(async (context) => {
  const { request, env } = context

  try {
    // 1. 解析请求体
    const body = await parseRequestBody(request)

    // 2. 验证必需字段
    validateRequiredFields(body, ['email', 'password'])
    validateEmail(body.email)

    const { email, password } = body

    // 3. 创建 Supabase 客户端
    const supabase = createSupabaseClient(env)

    // 4. 尝试登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // 处理各种认证错误
      let errorMessage = '登录失败'
      let statusCode = 401

      switch (authError.message) {
        case 'Invalid login credentials':
          errorMessage = '邮箱或密码错误'
          break
        case 'Email not confirmed':
          errorMessage = '邮箱未验证，请先验证您的邮箱'
          statusCode = 403
          break
        case 'User not found':
          errorMessage = '用户不存在'
          break
        default:
          errorMessage = authError.message || '登录失败，请重试'
      }

      return createValidationError(errorMessage, statusCode)
    }

    if (!authData.user || !authData.session) {
      return createValidationError('登录失败，无法获取用户信息')
    }

    // 5. 获取用户详细信息
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (userError) {
      console.error('获取用户信息失败:', userError)
      // 继续返回认证信息，即使没有详细的用户数据
    }

    // 6. 准备响应数据
    const responseData = {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || null,
        avatar_url: authData.user.user_metadata?.avatar_url || null,
        created_at: authData.user.created_at,
        updated_at: authData.user.updated_at,
        // 包含详细的用户数据（如果可用）
        ...(userData && { profile: userData })
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
      },
      message: '登录成功'
    }

    // 7. 返回成功响应
    return createSuccessResponse(responseData, 200, {
      'Set-Cookie': [
        `sb-access-token=${authData.session.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${authData.session.expires_in}`,
        `sb-refresh-token=${authData.session.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` // 30天
      ].join(', ')
    })

  } catch (error) {
    console.error('登录处理失败:', error)
    return createValidationError('服务器内部错误', 500)
  }
})

// OPTIONS handler for CORS
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
