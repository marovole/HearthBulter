import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { usdaService } from '@/lib/services/usda-service';
import { foodCacheService } from '@/lib/services/cache-service';

/**
 * GET /api/foods/:id
 * 获取食物详情
 *
 * Migrated from Prisma to Supabase
 * Note: foodCacheService and usdaService still use external services
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. 尝试从缓存获取
    const cachedFood = await foodCacheService.getFood(id);
    if (cachedFood) {
      return NextResponse.json(parseFoodResponse(cachedFood), { status: 200 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 2. 从数据库查找
    const { data: food, error } = await supabase
      .from('foods')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('查询食物失败:', error);
      return NextResponse.json(
        { error: '查询食物失败' },
        { status: 500 }
      );
    }

    if (food) {
      // 缓存食物数据
      await foodCacheService.setFood(food);
      return NextResponse.json(parseFoodResponse(food), { status: 200 });
    }

    // 如果在数据库中找不到，尝试从USDA获取（如果是USDA ID）
    if (/^\d+$/.test(id)) {
      try {
        const usdaFood = await usdaService.getFoodByFdcIdAndMap(
          parseInt(id)
        );

        // 保存到数据库
        const { data: savedFood, error: insertError } = await supabase
          .from('foods')
          .insert({
            name: usdaFood.name,
            nameEn: usdaFood.nameEn,
            aliases: JSON.stringify(usdaFood.aliases),
            calories: usdaFood.calories,
            protein: usdaFood.protein,
            carbs: usdaFood.carbs,
            fat: usdaFood.fat,
            fiber: usdaFood.fiber,
            sugar: usdaFood.sugar,
            sodium: usdaFood.sodium,
            vitaminA: usdaFood.vitaminA,
            vitaminC: usdaFood.vitaminC,
            calcium: usdaFood.calcium,
            iron: usdaFood.iron,
            category: usdaFood.category as any,
            tags: JSON.stringify(usdaFood.tags),
            source: usdaFood.source,
            usdaId: usdaFood.usdaId,
            verified: usdaFood.verified,
            cachedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError || !savedFood) {
          console.error('保存USDA食物失败:', insertError);
          throw insertError ?? new Error('保存USDA食物失败');
        }

        // 缓存新保存的食物
        await foodCacheService.setFood(savedFood);

        return NextResponse.json(parseFoodResponse(savedFood), { status: 200 });
      } catch (usdaError) {
        console.error('从USDA获取食物失败:', usdaError);
      }
    }

    return NextResponse.json({ error: '食物不存在' }, { status: 404 });
  } catch (error) {
    console.error('获取食物详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
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
  };
}

