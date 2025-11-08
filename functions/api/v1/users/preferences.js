import { createSupabaseClient } from '../../utils/supabase.js'
import { withAuth } from '../../middleware/auth.js'
import { withErrorHandler } from '../../utils/error-handler.js'
import { createSuccessResponse, createValidationError } from '../../utils/response.js'
import { parseRequestBody, validateRequiredFields } from '../../utils/validation.js'

// GET /api/v1/users/preferences - 获取用户偏好
export const onRequestGet = withErrorHandler(withAuth(async (context) => {
  const { request, env, user } = context

  // 1. 获取查询参数
  const url = new URL(request.url)
  const memberId = url.searchParams.get('memberId')

  if (!memberId) {
    return createValidationError('memberId is required')
  }

  // 2. 创建 Supabase 客户端
  const supabase = createSupabaseClient(env)

  // 3. 查询用户偏好
  const { data: preferences, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('member_id', memberId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw new Error(`Database query failed: ${error.message}`)
  }

  // 4. 如果没有偏好设置，返回默认值
  if (!preferences) {
    const defaultPreferences = {
      member_id: memberId,
      spice_level: 'MEDIUM',
      sweetness: 'MEDIUM',
      saltiness: 'MEDIUM',
      preferred_cuisines: [],
      avoided_ingredients: [],
      preferred_ingredients: [],
      max_cook_time: null,
      min_servings: 1,
      max_servings: 10,
      cost_level: 'MEDIUM',
      max_estimated_cost: null,
      diet_type: 'OMNIVORE',
      is_low_carb: false,
      is_low_fat: false,
      is_high_protein: false,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      is_dairy_free: false,
      enable_recommendations: true,
      learned_preferences: {},
      preference_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return createSuccessResponse({
      success: true,
      preferences: defaultPreferences
    })
  }

  // 5. 解析 JSON 字段
  const parsedPreferences = {
    ...preferences,
    preferred_cuisines: preferences.preferred_cuisines ? JSON.parse(preferences.preferred_cuisines) : [],
    avoided_ingredients: preferences.avoided_ingredients ? JSON.parse(preferences.avoided_ingredients) : [],
    preferred_ingredients: preferences.preferred_ingredients ? JSON.parse(preferences.preferred_ingredients) : [],
    learned_preferences: preferences.learned_preferences ? JSON.parse(preferences.learned_preferences) : {}
  }

  return createSuccessResponse({
    success: true,
    preferences: parsedPreferences
  })
}))

// POST /api/v1/users/preferences - 创建或更新用户偏好
export const onRequestPost = withErrorHandler(withAuth(async (context) => {
  const { request, env, user } = context

  // 1. 解析请求体
  const preferences = await parseRequestBody(request)

  // 2. 验证必需字段
  validateRequiredFields(preferences, ['memberId'])

  const { memberId } = preferences

  // 3. 创建 Supabase 客户端
  const supabase = createSupabaseClient(env)

  // 4. 准备数据
  const data = {
    member_id: memberId,
    spice_level: preferences.spiceLevel || 'MEDIUM',
    sweetness: preferences.sweetness || 'MEDIUM',
    saltiness: preferences.saltiness || 'MEDIUM',
    preferred_cuisines: JSON.stringify(preferences.preferredCuisines || []),
    avoided_ingredients: JSON.stringify(preferences.avoidedIngredients || []),
    preferred_ingredients: JSON.stringify(preferences.preferredIngredients || []),
    max_cook_time: preferences.maxCookTime || null,
    min_servings: preferences.minServings || 1,
    max_servings: preferences.maxServings || 10,
    cost_level: preferences.costLevel || 'MEDIUM',
    max_estimated_cost: preferences.maxEstimatedCost || null,
    diet_type: preferences.dietType || 'OMNIVORE',
    is_low_carb: preferences.isLowCarb || false,
    is_low_fat: preferences.isLowFat || false,
    is_high_protein: preferences.isHighProtein || false,
    is_vegetarian: preferences.isVegetarian || false,
    is_vegan: preferences.isVegan || false,
    is_gluten_free: preferences.isGlutenFree || false,
    is_dairy_free: preferences.isDairyFree || false,
    enable_recommendations: preferences.enableRecommendations !== false,
    learned_preferences: preferences.learnedPreferences ? JSON.stringify(preferences.learnedPreferences) : null,
    preference_score: preferences.preferenceScore || 0,
    updated_at: new Date().toISOString()
  }

  // 5. 创建或更新偏好设置
  const { data: userPreference, error } = await supabase
    .from('user_preferences')
    .upsert(data, {
      onConflict: 'member_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Database upsert failed: ${error.message}`)
  }

  // 6. 解析 JSON 字段返回
  const parsedPreference = {
    ...userPreference,
    preferred_cuisines: userPreference.preferred_cuisines ? JSON.parse(userPreference.preferred_cuisines) : [],
    avoided_ingredients: userPreference.avoided_ingredients ? JSON.parse(userPreference.avoided_ingredients) : [],
    preferred_ingredients: userPreference.preferred_ingredients ? JSON.parse(userPreference.preferred_ingredients) : [],
    learned_preferences: userPreference.learned_preferences ? JSON.parse(userPreference.learned_preferences) : {}
  }

  return createSuccessResponse({
    success: true,
    preferences: parsedPreference
  })
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
