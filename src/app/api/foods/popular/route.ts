import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/foods/popular
 * 获取热门食材（按创建时间排序，未来可以改为按使用频率）
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = SupabaseClientManager.getInstance();

    const { data: foods, error } = await supabase
      .from('foods')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取热门食材失败:', error);
      return NextResponse.json(
        { error: '查询食材数据失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        foods: (foods || []).map((food) => ({
          id: food.id,
          name: food.name,
          nameEn: food.nameEn,
          aliases: Array.isArray(food.aliases) ? food.aliases : (food.aliases ? JSON.parse(food.aliases as string) : []),
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
          tags: Array.isArray(food.tags) ? food.tags : (food.tags ? JSON.parse(food.tags as string) : []),
          source: food.source,
          usdaId: food.usdaId,
          verified: food.verified,
        })),
        total: foods?.length || 0,
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

