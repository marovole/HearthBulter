import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { FoodCategory } from '@prisma/client'

/**
 * GET /api/foods/categories/:category
 * 按类别查询食物
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // 验证category是否有效
    const validCategories: FoodCategory[] = [
      'VEGETABLES',
      'FRUITS',
      'GRAINS',
      'PROTEIN',
      'SEAFOOD',
      'DAIRY',
      'OILS',
      'SNACKS',
      'BEVERAGES',
      'OTHER',
    ]

    if (!validCategories.includes(category as FoodCategory)) {
      return NextResponse.json(
        { error: '无效的食物分类' },
        { status: 400 }
      )
    }

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where: {
          category: category as FoodCategory,
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { name: 'asc' },
      }),
      prisma.food.count({
        where: {
          category: category as FoodCategory,
        },
      }),
    ])

    return NextResponse.json(
      {
        foods: foods.map((food) => ({
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
        })),
        total,
        page,
        limit,
        category,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('按类别查询食物失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

