import { createSupabaseClient } from '../../utils/supabase.js'
import { withAuth } from '../../middleware/auth.js'
import { withErrorHandler } from '../../utils/error-handler.js'
import { createSuccessResponse, createValidationError } from '../../utils/response.js'
import { validateQueryParams } from '../../utils/validation.js'

/**
 * 验证用户是否有权限访问成员的健康数据
 */
async function verifyMemberAccess(supabase, memberId, userId) {
  const { data: member, error } = await supabase
    .from('family_members')
    .select(`
      *,
      family: families (
        creator_id,
        members: family_members!family_id (
          user_id,
          role
        )
      )
    `)
    .eq('id', memberId)
    .is('deleted_at', null)
    .single()

  if (error || !member) {
    return { hasAccess: false, member: null }
  }

  const isCreator = member.family.creator_id === userId
  const familyMember = member.family.members.find(m => m.user_id === userId)
  const isAdmin = familyMember && (familyMember.role === 'ADMIN' || isCreator)
  const isSelf = member.user_id === userId

  return {
    hasAccess: isAdmin || isSelf,
    member,
  }
}

/**
 * 获取仪表盘概览数据
 */
async function getDashboardOverview(supabase, memberId) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 并行获取各种数据
  const [
    healthDataCount,
    mealRecordsCount,
    latestHealthData,
    weeklyMeals,
    nutritionSummary,
    weightTrend
  ] = await Promise.all([
    // 健康数据总数
    supabase
      .from('health_data')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .then(({ count }) => count || 0),

    // 饮食记录总数
    supabase
      .from('meal_records')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .then(({ count }) => count || 0),

    // 最新健康数据
    supabase
      .from('health_data')
      .select('*')
      .eq('member_id', memberId)
      .order('recorded_at', { ascending: false })
      .limit(5)
      .then(({ data }) => data || []),

    // 本周饮食记录
    supabase
      .from('meal_records')
      .select(`
        *,
        foods: meal_record_foods (
          food_id,
          quantity,
          unit
        )
      `)
      .eq('member_id', memberId)
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .order('recorded_at', { ascending: false })
      .then(({ data }) => data || []),

    // 营养总结（最近30天）
    supabase
      .from('meal_records')
      .select(`
        total_calories,
        total_protein,
        total_carbs,
        total_fat,
        total_fiber
      `)
      .eq('member_id', memberId)
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .then(({ data }) => {
        if (!data || data.length === 0) {
          return {
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
            total_fiber: 0,
            avg_daily_calories: 0
          }
        }

        const totals = data.reduce((acc, record) => ({
          total_calories: acc.total_calories + (record.total_calories || 0),
          total_protein: acc.total_protein + (record.total_protein || 0),
          total_carbs: acc.total_carbs + (record.total_carbs || 0),
          total_fat: acc.total_fat + (record.total_fat || 0),
          total_fiber: acc.total_fiber + (record.total_fiber || 0)
        }), {
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          total_fiber: 0
        })

        return {
          ...totals,
          avg_daily_calories: Math.round(totals.total_calories / 30)
        }
      }),

    // 体重趋势（最近30天）
    supabase
      .from('health_data')
      .select('value, recorded_at')
      .eq('member_id', memberId)
      .eq('data_type', 'weight')
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: true })
      .then(({ data }) => data || [])
  ])

  return {
    summary: {
      total_health_records: healthDataCount,
      total_meal_records: mealRecordsCount,
      last_updated: new Date().toISOString()
    },
    recent_health_data: latestHealthData,
    weekly_meals: weeklyMeals.slice(0, 10), // 只返回最近10条
    nutrition_summary: nutritionSummary,
    weight_trend: weightTrend
  }
}

/**
 * 计算健康评分（简化版本）
 */
async function calculateHealthScore(supabase, memberId) {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 获取最近7天的数据
  const [
    healthData,
    mealRecords,
    userPreferences
  ] = await Promise.all([
    // 健康数据
    supabase
      .from('health_data')
      .select('*')
      .eq('member_id', memberId)
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .then(({ data }) => data || []),

    // 饮食记录
    supabase
      .from('meal_records')
      .select(`
        *,
        foods: meal_record_foods (
          food_id,
          quantity,
          unit
        )
      `)
      .eq('member_id', memberId)
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .then(({ data }) => data || []),

    // 用户偏好
    supabase
      .from('user_preferences')
      .select('*')
      .eq('member_id', memberId)
      .single()
      .then(({ data }) => data)
  ])

  // 计算各项评分（0-100分）
  let totalScore = 0
  let factors = []

  // 1. 数据完整性评分 (25分)
  const dataCompletenessScore = Math.min(25, (healthData.length / 7) * 25)
  totalScore += dataCompletenessScore
  factors.push({
    name: 'data_completeness',
    score: Math.round(dataCompletenessScore),
    description: '数据记录完整性',
    details: `过去7天记录了${healthData.length}条健康数据`
  })

  // 2. 饮食多样性评分 (25分)
  const uniqueFoods = new Set()
  mealRecords.forEach(record => {
    if (record.foods) {
      record.foods.forEach(food => uniqueFoods.add(food.food_id))
    }
  })
  
  const diversityScore = Math.min(25, (uniqueFoods.size / 10) * 25)
  totalScore += diversityScore
  factors.push({
    name: 'meal_diversity',
    score: Math.round(diversityScore),
    description: '饮食多样性',
    details: `过去7天摄入了${uniqueFoods.size}种不同的食物`
  })

  // 3. 营养均衡评分 (30分)
  const nutritionScore = calculateNutritionBalance(mealRecords, userPreferences)
  totalScore += nutritionScore
  factors.push({
    name: 'nutrition_balance',
    score: Math.round(nutritionScore),
    description: '营养均衡性',
    details: '基于营养素摄入平衡计算'
  })

  // 4. 健康指标评分 (20分)
  const healthMetricsScore = calculateHealthMetricsScore(healthData)
  totalScore += healthMetricsScore
  factors.push({
    name: 'health_metrics',
    score: Math.round(healthMetricsScore),
    description: '健康指标',
    details: '基于体重、血压等指标评估'
  })

  return {
    overall_score: Math.round(totalScore),
    grade: getHealthGrade(totalScore),
    factors: factors,
    recommendations: generateHealthRecommendations(totalScore, factors),
    last_calculated: new Date().toISOString()
  }
}

/**
 * 计算营养平衡评分
 */
function calculateNutritionBalance(mealRecords, userPreferences) {
  if (mealRecords.length === 0) return 0

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0

  mealRecords.forEach(record => {
    totalCalories += record.total_calories || 0
    totalProtein += record.total_protein || 0
    totalCarbs += record.total_carbs || 0
    totalFat += record.total_fat || 0
  })

  // 计算营养素比例
  const avgDailyCalories = totalCalories / 7
  const proteinRatio = (totalProtein * 4) / totalCalories // 蛋白质热量占比
  const carbRatio = (totalCarbs * 4) / totalCalories // 碳水热量占比
  const fatRatio = (totalFat * 9) / totalCalories // 脂肪热量占比

  // 理想比例：蛋白质 15-25%，碳水 45-65%，脂肪 20-35%
  let score = 30

  // 蛋白质评分 (7.5分)
  if (proteinRatio >= 0.15 && proteinRatio <= 0.25) {
    score += 7.5
  } else if (proteinRatio >= 0.10 && proteinRatio <= 0.30) {
    score += 5
  } else if (proteinRatio >= 0.05 && proteinRatio <= 0.35) {
    score += 2.5
  }

  // 碳水评分 (7.5分)
  if (carbRatio >= 0.45 && carbRatio <= 0.65) {
    score += 7.5
  } else if (carbRatio >= 0.40 && carbRatio <= 0.70) {
    score += 5
  } else if (carbRatio >= 0.35 && carbRatio <= 0.75) {
    score += 2.5
  }

  // 脂肪评分 (7.5分)
  if (fatRatio >= 0.20 && fatRatio <= 0.35) {
    score += 7.5
  } else if (fatRatio >= 0.15 && fatRatio <= 0.40) {
    score += 5
  } else if (fatRatio >= 0.10 && fatRatio <= 0.45) {
    score += 2.5
  }

  // 热量评分 (7.5分)
  if (avgDailyCalories >= 1200 && avgDailyCalories <= 2500) {
    score += 7.5
  } else if (avgDailyCalories >= 1000 && avgDailyCalories <= 3000) {
    score += 5
  } else if (avgDailyCalories >= 800 && avgDailyCalories <= 3500) {
    score += 2.5
  }

  return Math.min(30, score)
}

/**
 * 计算健康指标评分
 */
function calculateHealthMetricsScore(healthData) {
  if (healthData.length === 0) return 0

  let score = 0
  let metricsCount = 0

  // 体重趋势评分 (10分)
  const weightData = healthData.filter(d => d.data_type === 'weight')
  if (weightData.length >= 2) {
    const recentWeight = weightData[0].value
    const oldWeight = weightData[weightData.length - 1].value
    const weightChange = recentWeight - oldWeight

    // 体重变化在健康范围内（±2%）得满分
    const weightChangePercent = Math.abs(weightChange / oldWeight) * 100
    if (weightChangePercent <= 2) {
      score += 10
    } else if (weightChangePercent <= 5) {
      score += 7
    } else {
      score += 4
    }
    metricsCount++
  }

  // 血压评分 (5分)
  const bpData = healthData.filter(d => d.data_type === 'blood_pressure')
  if (bpData.length > 0) {
    const latestBP = bpData[0].value
    // 理想血压：收缩压 90-120，舒张压 60-80
    if (latestBP.systolic >= 90 && latestBP.systolic <= 120 &&
        latestBP.diastolic >= 60 && latestBP.diastolic <= 80) {
      score += 5
    } else if (latestBP.systolic >= 80 && latestBP.systolic <= 140 &&
               latestBP.diastolic >= 50 && latestBP.diastolic <= 90) {
      score += 3
    } else {
      score += 1
    }
    metricsCount++
  }

  // 血糖评分 (5分)
  const sugarData = healthData.filter(d => d.data_type === 'blood_sugar')
  if (sugarData.length > 0) {
    const latestSugar = sugarData[0].value
    // 正常空腹血糖：70-100 mg/dL
    if (latestSugar >= 70 && latestSugar <= 100) {
      score += 5
    } else if (latestSugar >= 60 && latestSugar <= 126) {
      score += 3
    } else {
      score += 1
    }
    metricsCount++
  }

  return metricsCount > 0 ? (score / metricsCount) * 2 : 0 // 标准化到20分制
}

/**
 * 获取健康等级
 */
function getHealthGrade(score) {
  if (score >= 90) return { grade: 'A', level: 'excellent', color: '#10b981' }
  if (score >= 80) return { grade: 'B', level: 'good', color: '#3b82f6' }
  if (score >= 70) return { grade: 'C', level: 'fair', color: '#f59e0b' }
  if (score >= 60) return { grade: 'D', level: 'poor', color: '#ef4444' }
  return { grade: 'F', level: 'very_poor', color: '#dc2626' }
}

/**
 * 生成健康建议
 */
function generateHealthRecommendations(totalScore, factors) {
  const recommendations = []

  // 基于总分生成建议
  if (totalScore < 60) {
    recommendations.push({
      type: 'urgent',
      title: '健康状况需要关注',
      description: '您的健康评分较低，建议尽快咨询医生并改善生活习惯。',
      priority: 'high'
    })
  } else if (totalScore < 70) {
    recommendations.push({
      type: 'warning',
      title: '有改善空间',
      description: '您的健康状况有改善空间，建议调整饮食和生活习惯。',
      priority: 'medium'
    })
  } else if (totalScore < 80) {
    recommendations.push({
      type: 'improvement',
      title: '继续保持',
      description: '您的健康状况良好，继续保持现有的健康习惯。',
      priority: 'low'
    })
  } else {
    recommendations.push({
      type: 'excellent',
      title: '健康状况优秀',
      description: '恭喜！您的健康状况非常优秀，请继续保持。',
      priority: 'low'
    })
  }

  // 基于具体因素生成个性化建议
  factors.forEach(factor => {
    if (factor.score < 50) {
      switch (factor.name) {
        case 'data_completeness':
          recommendations.push({
            type: 'data',
            title: '增加健康数据记录',
            description: '建议每天记录健康数据，如体重、血压等，以便更好地跟踪健康状况。',
            priority: 'medium'
          })
          break
        case 'meal_diversity':
          recommendations.push({
            type: 'nutrition',
            title: '增加食物多样性',
            description: '尝试摄入更多种类的食物，确保营养均衡。',
            priority: 'medium'
          })
          break
        case 'nutrition_balance':
          recommendations.push({
            type: 'nutrition',
            title: '改善营养平衡',
            description: '注意蛋白质、碳水化合物和脂肪的合理搭配。',
            priority: 'high'
          })
          break
        case 'health_metrics':
          recommendations.push({
            type: 'metrics',
            title: '关注健康指标',
            description: '定期监测体重、血压、血糖等健康指标。',
            priority: 'high'
          })
          break
      }
    }
  })

  return recommendations
}

// GET /api/v1/dashboard/overview - 获取仪表盘概览
export const onRequestGet = withErrorHandler(withAuth(async (context) => {
  const { request, env, user } = context

  try {
    // 1. 验证查询参数
    const validParams = [
      { name: 'memberId', type: 'string', required: true }
    ]
    
    const params = validateQueryParams(request.url, validParams)
    const { memberId } = params

    // 2. 创建 Supabase 客户端
    const supabase = createSupabaseClient(env)

    // 3. 验证权限
    const { hasAccess, member } = await verifyMemberAccess(supabase, memberId, user.id)

    if (!hasAccess || !member) {
      return createValidationError('无权限访问该成员的仪表盘数据', 403)
    }

    // 4. 获取概览数据
    const overview = await getDashboardOverview(supabase, memberId)
    const healthScore = await calculateHealthScore(supabase, memberId)

    // 5. 返回响应
    return createSuccessResponse({
      overview,
      healthScore,
      member: {
        id: member.id,
        name: member.name,
        role: member.role
      }
    })

  } catch (error) {
    console.error('获取仪表盘概览失败:', error)
    return createValidationError('服务器内部错误', 500)
  }
}))

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
