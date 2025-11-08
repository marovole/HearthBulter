import { createSupabaseClient } from '../../utils/supabase.js'
import { withAuth } from '../../middleware/auth.js'
import { withErrorHandler } from '../../utils/error-handler.js'
import { createSuccessResponse } from '../../utils/response.js'
import { parseRequestBody, validateQueryParams, validateRequiredFields, validateHealthDataType, validateNumericRange } from '../../utils/validation.js'

// GET /api/v1/health - 获取健康数据
export const onRequestGet = withErrorHandler(withAuth(async (context) => {
  const { request, env, user } = context

  // 1. 创建Supabase客户端
  const supabase = createSupabaseClient(env)

  // 2. 验证查询参数
  const validParams = [
    { name: 'limit', type: 'number', validation: { type: 'range', min: 1, max: 100 } },
    { name: 'offset', type: 'number', validation: { type: 'range', min: 0, max: 10000 } },
    { name: 'type', type: 'string', validation: { type: 'oneOf', values: ['weight', 'blood_pressure', 'blood_sugar', 'heart_rate', 'temperature', 'steps', 'sleep', 'calories', 'water'] } }
  ]
  
  const params = validateQueryParams(request.url, validParams)
  const { limit = 20, offset = 0, type } = params

  // 3. 数据库查询
  let query = supabase
    .from('health_data')
    .select(`
      *,
      user:users!user_id(id, name, email)
    `)
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) {
    query = query.eq('data_type', type)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Database query failed: ${error.message}`)
  }

  // 4. 返回响应
  return createSuccessResponse({
    data: data,
    pagination: {
      limit,
      offset,
      total: data?.length || 0
    },
    timestamp: new Date().toISOString()
  })
}))

// POST /api/v1/health - 创建健康数据
export const onRequestPost = withErrorHandler(withAuth(async (context) => {
  const { request, env, user } = context

  // 1. 解析请求体
  const body = await parseRequestBody(request)

  // 2. 数据验证
  validateRequiredFields(body, ['data_type', 'value'])
  validateHealthDataType(body.data_type)
  validateNumericRange(body.value, 0, 10000, 'Value')

  if (body.unit) {
    validateRequiredFields(body, ['unit'])
  }

  // 3. 创建Supabase客户端
  const supabase = createSupabaseClient(env)

  // 4. 数据插入
  const { data, error } = await supabase
    .from('health_data')
    .insert({
      user_id: user.id,
      data_type: body.data_type,
      value: body.value,
      unit: body.unit || null,
      recorded_at: body.recorded_at || new Date().toISOString(),
      metadata: body.metadata || {}
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`)
  }

  // 5. 返回响应
  return createSuccessResponse({
    data: data,
    message: 'Health data created successfully',
    timestamp: new Date().toISOString()
  }, 201)
}))

// OPTIONS handler for CORS
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
