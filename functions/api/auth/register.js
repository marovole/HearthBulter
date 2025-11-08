import { createSupabaseClient } from '../../utils/supabase.js'
import { withErrorHandler } from '../../utils/error-handler.js'
import { createSuccessResponse, createValidationError } from '../../utils/response.js'
import { parseRequestBody, validateRequiredFields, validateEmail, validateStringLength } from '../../utils/validation.js'

// POST /api/auth/register - 用户注册
export const onRequestPost = withErrorHandler(async (context) => {
  const { request, env } = context

  try {
    // 1. 解析请求体
    const body = await parseRequestBody(request)

    // 2. 验证必需字段
    validateRequiredFields(body, ['email', 'password', 'name'])
    validateEmail(body.email)
    validateStringLength(body.password, 6, 128, 'Password')
    validateStringLength(body.name, 1, 100, 'Name')

    const { email, password, name } = body

    // 3. 创建 Supabase 客户端
    const supabase = createSupabaseClient(env)

    // 4. 检查用户是否已存在
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return createValidationError('该邮箱已被注册', 409)
    }

    // 5. 创建新用户
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          // 可以添加其他用户元数据
        },
        // 发送验证邮件
        emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (signUpError) {
      let errorMessage = '注册失败'
      
      switch (signUpError.message) {
        case 'User already registered':
          errorMessage = '该邮箱已被注册'
          break
        case 'Unable to validate email address: invalid format':
          errorMessage = '邮箱格式不正确'
          break
        case 'Password should be at least 6 characters':
          errorMessage = '密码至少需要6个字符'
          break
        default:
          errorMessage = signUpError.message || '注册失败，请重试'
      }

      return createValidationError(errorMessage)
    }

    if (!authData.user) {
      return createValidationError('注册失败，无法创建用户')
    }

    // 6. 创建用户详细信息记录
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        avatar_url: authData.user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('创建用户资料失败:', profileError)
      // 不阻断注册流程，用户仍然可以登录
    }

    // 7. 创建默认用户偏好设置
    const { error: prefsError } = await supabase
      .from('user_preferences')
      .insert({
        member_id: authData.user.id,
        spice_level: 'MEDIUM',
        sweetness: 'MEDIUM',
        saltiness: 'MEDIUM',
        preferred_cuisines: JSON.stringify([]),
        avoided_ingredients: JSON.stringify([]),
        preferred_ingredients: JSON.stringify([]),
        diet_type: 'OMNIVORE',
        enable_recommendations: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (prefsError) {
      console.error('创建用户偏好失败:', prefsError)
      // 不阻断注册流程
    }

    // 8. 准备响应数据
    const responseData = {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        created_at: authData.user.created_at,
        confirmed_at: authData.user.confirmed_at,
        // 如果邮箱需要验证，会包含确认信息
        email_confirmed: authData.user.confirmed_at !== null
      },
      session: authData.session ? {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        expires_at: authData.session.expires_at,
        token_type: authData.session.token_type,
      } : null,
      message: authData.session 
        ? '注册成功，欢迎加入 Health Butler！'
        : '注册成功，请检查您的邮箱完成验证',
      requires_email_confirmation: !authData.session
    }

    // 9. 返回成功响应
    if (authData.session) {
      // 如果邮箱已验证，设置认证 cookie
      return createSuccessResponse(responseData, 201, {
        'Set-Cookie': [
          `sb-access-token=${authData.session.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${authData.session.expires_in}`,
          `sb-refresh-token=${authData.session.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
        ].join(', ')
      })
    } else {
      // 需要邮箱验证
      return createSuccessResponse(responseData, 201)
    }

  } catch (error) {
    console.error('注册处理失败:', error)
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
