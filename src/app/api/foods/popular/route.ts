import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/foods/popular
 * 获取热门食材（按创建时间排序，未来可以改为按使用频率）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const foods = await prisma.food.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

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
        total: foods.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取热门食材失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

