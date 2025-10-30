import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { usdaService } from '@/lib/services/usda-service'
import type { FoodCategory } from '@prisma/client'

/**
 * GET /api/foods/search?q=鸡胸肉
 * 搜索食物（支持中英文）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const category = searchParams.get('category') as FoodCategory | null
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: '请提供搜索关键词' },
        { status: 400 }
      )
    }

    // 1. 先在本地数据库搜索
    const where: any = {
      OR: [
        { name: { contains: query } },
        { nameEn: { contains: query } },
      ],
    }

    if (category) {
      where.category = category
    }

    const [localFoods, totalCount] = await Promise.all([
      prisma.food.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { name: 'asc' },
      }),
      prisma.food.count({ where }),
    ])

    // 如果本地有足够的结果，直接返回
    if (localFoods.length >= limit) {
      return NextResponse.json(
        {
          foods: localFoods.map(parseFoodResponse),
          total: totalCount,
          page,
          limit,
          type: 'local',
        },
        { status: 200 }
      )
    }

    // 2. 如果本地结果不足，尝试从USDA API搜索
    try {
      const usdaResults = await usdaService.searchAndMapFoods(
        query,
        limit - localFoods.length
      )

      // 将USDA结果保存到数据库（异步，不阻塞响应）
      Promise.all(
        usdaResults.map(async (foodData) => {
          try {
            // 检查是否已存在
            const existing = await prisma.food.findFirst({
              where: { usdaId: foodData.usdaId },
            })

            if (!existing && foodData.usdaId) {
              await prisma.food.create({
                data: {
                  name: foodData.name,
                  nameEn: foodData.nameEn,
                  aliases: JSON.stringify(foodData.aliases),
                  calories: foodData.calories,
                  protein: foodData.protein,
                  carbs: foodData.carbs,
                  fat: foodData.fat,
                  fiber: foodData.fiber,
                  sugar: foodData.sugar,
                  sodium: foodData.sodium,
                  vitaminA: foodData.vitaminA,
                  vitaminC: foodData.vitaminC,
                  calcium: foodData.calcium,
                  iron: foodData.iron,
                  category: foodData.category as FoodCategory,
                  tags: JSON.stringify(foodData.tags),
                  source: foodData.source,
                  usdaId: foodData.usdaId,
                  verified: foodData.verified,
                  cachedAt: new Date(),
                },
              })
            }
          } catch (error) {
            // 忽略重复键错误等
            console.error('保存USDA数据失败:', error)
          }
        })
      ).catch((error) => {
        console.error('批量保存USDA数据失败:', error)
      })

      // 合并结果
      const allFoods = [
        ...localFoods.map(parseFoodResponse),
        ...usdaResults.map((f) => ({
          id: undefined,
          ...f,
          aliases: f.aliases,
          tags: f.tags,
        })),
      ]

      return NextResponse.json(
        {
          foods: allFoods.slice(0, limit),
          total: totalCount + usdaResults.length,
          page,
          limit,
          type: 'mixed',
        },
        { status: 200 }
      )
    } catch (usdaError) {
      // USDA API失败，只返回本地结果
      console.error('USDA API搜索失败:', usdaError)
      return NextResponse.json(
        {
          foods: localFoods.map(parseFoodResponse),
          total: totalCount,
          page,
          limit,
          type: 'local',
          warning: 'USDA API暂时不可用，仅显示本地结果',
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('搜索食物失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * 解析Food对象为响应格式
 */
function parseFoodResponse(food: any) {
  return {
    id: food.id,
    name: food.name,
    nameEn: food.nameEn,
    aliases: JSON.parse(food.aliases || '[]'),
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
    tags: JSON.parse(food.tags || '[]'),
    source: food.source,
    usdaId: food.usdaId,
    verified: food.verified,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  }
}

