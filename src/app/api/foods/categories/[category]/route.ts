import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

type FoodCategory =
  | 'VEGETABLES'
  | 'FRUITS'
  | 'GRAINS'
  | 'PROTEIN'
  | 'SEAFOOD'
  | 'DAIRY'
  | 'OILS'
  | 'SNACKS'
  | 'BEVERAGES'
  | 'OTHER';

/**
 * GET /api/foods/categories/:category
 * 按类别查询食物
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

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
    ];

    if (!validCategories.includes(category as FoodCategory)) {
      return NextResponse.json(
        { error: '无效的食物分类' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 使用 Supabase 的 count 选项和 range 分页
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: foods, error, count } = await supabase
      .from('foods')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('按类别查询食物失败:', error);
      return NextResponse.json(
        { error: '查询食物数据失败' },
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
        total: count || 0,
        page,
        limit,
        category,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('按类别查询食物失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

