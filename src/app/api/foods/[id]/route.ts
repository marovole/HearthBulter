import { NextRequest, NextResponse } from "next/server";
import { foodRepository } from "@/lib/repositories/food-repository-singleton";
import { usdaService } from "@/lib/services/usda-service";
import { foodCacheService } from "@/lib/services/cache-service";
import type { FoodRecord } from "@/lib/repositories/interfaces/food-repository";

/**
 * GET /api/foods/:id
 * 获取食物详情
 *
 * Migrated from Supabase to Neon
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cachedFood = await foodCacheService.getFood(id);
    if (cachedFood) {
      return NextResponse.json(parseFoodResponse(cachedFood), { status: 200 });
    }

    const food = await foodRepository.findById(id);

    if (food) {
      await foodCacheService.setFood(food);
      return NextResponse.json(parseFoodResponse(food), { status: 200 });
    }

    if (/^\d+$/.test(id)) {
      try {
        const usdaFood = await usdaService.getFoodByFdcIdAndMap(parseInt(id));

        // TODO: 将USDA结果保存到Convex数据库（需要添加 createFood 函数到 convex/budget.ts）
        // 暂时跳过保存，直接返回USDA数据
        // const savedFood = await convexClient.mutation(api.budget.createFood, { ...usdaFood });
        // await foodCacheService.setFood(savedFood);
        // return NextResponse.json(parseFoodResponse(savedFood), { status: 200 });

        // 临时：直接返回USDA数据（不缓存到数据库）
        return NextResponse.json(parseFoodResponse(usdaFood), { status: 200 });
      } catch (usdaError) {
        console.error("从USDA获取食物失败:", usdaError);
      }
    }

    return NextResponse.json({ error: "食物不存在" }, { status: 404 });
  } catch (error) {
    console.error("获取食物详情失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 解析 FoodRecord 为响应格式
 */
function parseFoodResponse(food: FoodRecord | any) {
  return {
    id: food.id,
    name: food.name,
    nameEn: food.nameEn,
    aliases: Array.isArray(food.aliases) ? food.aliases : JSON.parse(food.aliases || "[]"),
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
    tags: Array.isArray(food.tags) ? food.tags : JSON.parse(food.tags || "[]"),
    source: food.source,
    usdaId: food.usdaId,
    verified: food.verified,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  };
}
