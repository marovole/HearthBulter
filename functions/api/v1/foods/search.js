import { createSupabaseClient } from '../../utils/supabase.js'
import { withErrorHandler } from '../../utils/error-handler.js'
import { createSuccessResponse, createValidationError } from '../../utils/response.js'
import { validateQueryParams } from '../../utils/validation.js'
import { HEALTH_DATA_TYPES } from '../../config/constants.js'

/**
 * 获取降级食品搜索结果
 * 当数据库不可用时提供基本的静态结果
 */
function getFallbackFoodResults(query, category, limit) {
  const fallbackData = [
    {
      id: 'fallback-1',
      name: '苹果',
      nameEn: 'Apple',
      aliases: ['红富士苹果', '青苹果'],
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2,
      fiber: 2.4,
      sugar: 10,
      sodium: 1,
      vitaminA: 54,
      vitaminC: 4.6,
      calcium: 6,
      iron: 0.1,
      category: 'FRUITS',
      tags: ['水果', '低卡'],
      source: 'fallback',
      usdaId: null,
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'fallback-2',
      name: '鸡胸肉',
      nameEn: 'Chicken Breast',
      aliases: ['鸡胸', '白肉鸡'],
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0,
      sodium: 74,
      vitaminA: 21,
      vitaminC: 0,
      calcium: 15,
      iron: 1.0,
      category: 'PROTEINS',
      tags: ['蛋白质', '低脂'],
      source: 'fallback',
      usdaId: null,
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'fallback-3',
      name: '米饭',
      nameEn: 'Rice',
      aliases: ['白米饭', '蒸米饭'],
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      fiber: 0.4,
      sugar: 0.1,
      sodium: 1,
      vitaminA: 0,
      vitaminC: 0,
      calcium: 10,
      iron: 0.2,
      category: 'GRAINS',
      tags: ['主食', '碳水'],
      source: 'fallback',
      usdaId: null,
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  // 简单的搜索过滤
  const filtered = fallbackData.filter(food =>
    (!category || food.category === category) &&
    (food.name.includes(query) ||
     food.nameEn.toLowerCase().includes(query.toLowerCase()) ||
     food.aliases.some((alias) => alias.includes(query)))
  )

  return filtered.slice(0, limit)
}

/**
 * 解析Food对象为响应格式
 */
function parseFoodResponse(food) {
  return {
    id: food.id,
    name: food.name,
    nameEn: food.nameEn,
    aliases: Array.isArray(food.aliases) ? food.aliases : JSON.parse(food.aliases || '[]'),
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    fiber: food.fiber,
    sugar: food.sugar,
    sodium: food.sodium,
    vitaminA: food.vitaminA,
    vitaminC: food.vitaminC,
    calcium: food.calcium,
    iron: food.iron,
    category: food.category,
    tags: Array.isArray(food.tags) ? food.tags : JSON.parse(food.tags || '[]'),
    source: food.source,
    usdaId: food.usdaId,
    verified: food.verified,
    createdAt: food.created_at,
    updatedAt: food.updated_at,
  }
}

// GET /api/v1/foods/search?q=鸡胸肉 - 搜索食物
export const onRequestGet = withErrorHandler(async (context) => {
  const { request, env } = context
  const apiStartTime = Date.now() // 记录 API 开始时间

  try {
    // 1. 验证查询参数
    const validParams = [
      { name: 'q', type: 'string', required: true },
      { name: 'category', type: 'string', required: false },
      { name: 'limit', type: 'number', validation: { type: 'range', min: 1, max: 100 } },
      { name: 'page', type: 'number', validation: { type: 'range', min: 1, max: 1000 } }
    ]
    
    const params = validateQueryParams(request.url, validParams)
    const { q: query, category, limit = 20, page = 1 } = params

    if (!query || query.trim() === '') {
      return createValidationError('请提供搜索关键词')
    }

    // 2. 创建 Supabase 客户端
    const supabase = createSupabaseClient(env)

    // 3. 检查数据库连接
    const dbStartTime = Date.now()
    let localFoods = []
    let totalCount = 0
    let dbError = null

    try {
      // 测试数据库连接
      const { error: dbTestError } = await supabase.rpc('test_connection')
      if (dbTestError) {
        throw new Error('数据库连接失败')
      }

      // 构建查询条件
      let dbQuery = supabase
        .from('foods')
        .select('*', { count: 'exact' })
        .or(`name.ilike.%${query}%,nameEn.ilike.%${query}%`)
        .order('name', { ascending: true })
        .range((page - 1) * limit, page * limit - 1)

      if (category) {
        dbQuery = dbQuery.eq('category', category)
      }

      const { data: foods, error, count } = await dbQuery

      if (error) {
        throw new Error(`数据库查询失败: ${error.message}`)
      }

      localFoods = foods || []
      totalCount = count || 0

      const dbDuration = Date.now() - dbStartTime
      console.log(`📊 数据库查询 - ${dbDuration}ms - 找到 ${localFoods.length} 条本地结果`)
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error)
      const dbDuration = Date.now() - dbStartTime
      console.error(`❌ 数据库查询失败 - ${dbDuration}ms:`, dbError)

      // 数据库连接失败时，提供静态的降级结果
      const fallbackFoods = getFallbackFoodResults(query, category, limit)
      localFoods = fallbackFoods
      totalCount = fallbackFoods.length
    }

    // 4. 如果本地有足够的结果，直接返回
    if (localFoods.length >= limit) {
      const result = {
        foods: localFoods.map(parseFoodResponse),
        total: totalCount,
        page,
        limit,
        type: dbError ? 'fallback' : 'local',
        warnings: dbError ? [`数据库不可用: ${dbError}`] : [],
      }

      const apiDuration = Date.now() - apiStartTime
      console.log(`🚀 食品搜索 [${dbError ? '降级' : '本地'}结果] - 总计 ${apiDuration}ms - 查询: "${query}"`)

      return createSuccessResponse(result, 200, {
        'X-Response-Time': `${apiDuration}ms`,
        'X-DB-Time': `${Date.now() - dbStartTime}ms`,
        'X-DB-Error': dbError ? 'true' : 'false',
      })
    }

    // 5. 如果本地结果不足，可以尝试外部 API（这里简化处理）
    // 在实际应用中，可以集成 USDA API 或其他食物数据库
    console.log(`ℹ️ 本地结果不足，返回可用结果 - 找到 ${localFoods.length} 条结果`)

    const result = {
      foods: localFoods.map(parseFoodResponse),
      total: totalCount,
      page,
      limit,
      type: dbError ? 'fallback' : 'local',
      warning: dbError ? '数据库暂时不可用，显示降级结果' : '结果数量有限',
      warnings: dbError ? [`数据库不可用: ${dbError}`] : [],
    }

    const apiDuration = Date.now() - apiStartTime
    console.log(`🚀 食品搜索 [${dbError ? '降级' : '本地'}结果] - 总计 ${apiDuration}ms - 查询: "${query}"`)

    return createSuccessResponse(result, 200, {
      'X-Response-Time': `${apiDuration}ms`,
      'X-DB-Time': `${Date.now() - dbStartTime}ms`,
      'X-DB-Error': dbError ? 'true' : 'false',
    })

  } catch (error) {
    console.error('搜索食物失败:', error)
    return createValidationError('服务器内部错误')
  }
})

// OPTIONS handler for CORS
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}
