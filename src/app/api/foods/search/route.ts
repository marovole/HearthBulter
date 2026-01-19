import { NextRequest, NextResponse } from "next/server";
import { testDatabaseConnection } from "@/lib/db";
import { foodRepository } from "@/lib/repositories/food-repository-singleton";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { usdaService } from "@/lib/services/usda-service";
import {
  CacheService,
  CacheKeyBuilder,
  CACHE_CONFIG,
} from "@/lib/cache/redis-client";
import { FoodCategory } from "@/lib/types/meal";

/**
 * GET /api/foods/search?q=鸡胸肉
 * 搜索食物（支持中英文）
 *
 * 使用双写框架迁移
 * 保留缓存、USDA fallback 和降级逻辑
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const apiStartTime = Date.now(); // 记录 API 开始时间

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const category = searchParams.get("category") as FoodCategory | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "请提供搜索关键词" }, { status: 400 });
    }

    // 生成缓存键（标准化查询关键词）
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = CacheKeyBuilder.build(
      "foods-search",
      normalizedQuery,
      `${category || "all"}-${limit}-${page}`,
    );

    // 尝试从缓存获取结果
    const cachedResult = await CacheService.get(cacheKey);
    if (cachedResult) {
      const apiDuration = Date.now() - apiStartTime;
      console.log(
        `🚀 食品搜索 [缓存命中] - ${apiDuration}ms - 查询: "${query}"`,
      );

      return NextResponse.json(cachedResult, {
        headers: {
          "X-Cache": "HIT",
          "X-Response-Time": `${apiDuration}ms`,
        },
      });
    }

    // 1. 使用 Repository 在本地数据库搜索
    const dbStartTime = Date.now();
    let localFoods: any[] = [];
    let totalCount = 0;
    let dbError = null;
    let dbDuration = 0;

    try {
      // 测试数据库连接
      const dbConnected = await testDatabaseConnection();
      if (!dbConnected) {
        throw new Error("数据库连接失败");
      }

      // 使用 Repository 执行搜索
      const searchResult = await foodRepository.searchFoods({
        query,
        category: category || undefined,
        page,
        limit,
      });

      localFoods = searchResult.foods;
      totalCount = searchResult.total;

      dbDuration = Date.now() - dbStartTime;
      console.log(
        `📊 数据库查询 - ${dbDuration}ms - 找到 ${localFoods.length} 条本地结果`,
      );
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error);
      dbDuration = Date.now() - dbStartTime;
      console.error(`❌ 数据库查询失败 - ${dbDuration}ms:`, dbError);

      // 数据库连接失败时，尝试提供静态的降级结果
      const fallbackFoods = getFallbackFoodResults(query, category, limit);
      localFoods = fallbackFoods;
      totalCount = fallbackFoods.length;
    }

    // 如果本地有足够的结果，直接返回
    if (localFoods.length >= limit) {
      const result = {
        foods: localFoods.map(parseFoodResponse),
        total: totalCount,
        page,
        limit,
        type: dbError ? "fallback" : "local",
        warnings: dbError ? [`数据库不可用: ${dbError}`] : [],
      };

      // 缓存结果（使用专用的 FOOD_SEARCH TTL）
      await CacheService.set(cacheKey, result, CACHE_CONFIG.TTL.FOOD_SEARCH);

      const apiDuration = Date.now() - apiStartTime;
      console.log(
        `🚀 食品搜索 [${dbError ? "降级" : "本地"}结果] - 总计 ${apiDuration}ms - 查询: "${query}"`,
      );

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "X-Cache": "MISS",
          "X-Response-Time": `${apiDuration}ms`,
          "X-DB-Time": `${Date.now() - dbStartTime}ms`,
          "X-DB-Error": dbError ? "true" : "false",
        },
      });
    }

    // 2. 如果本地结果不足，尝试从USDA API搜索
    const usdaStartTime = Date.now();
    try {
      const usdaResults = await usdaService.searchAndMapFoods(
        query,
        limit - localFoods.length,
      );

      const usdaDuration = Date.now() - usdaStartTime;
      console.log(
        `🌐 USDA API 查询 - ${usdaDuration}ms - 找到 ${usdaResults.length} 条结果`,
      );

      // 将USDA结果保存到数据库（异步，不阻塞响应）
      setImmediate(() => {
        Promise.all(
          usdaResults.map(async (foodData) => {
            if (!foodData.usdaId) {
              return;
            }

            try {
              const backgroundSupabase = SupabaseClientManager.getInstance();

              // 检查是否已存在
              const { data: existing, error: existingError } =
                await backgroundSupabase
                  .from("foods")
                  .select("id")
                  .eq("usdaId", foodData.usdaId)
                  .maybeSingle();

              if (existingError) {
                console.error("检查USDA数据存在性失败:", existingError);
                return;
              }

              if (existing) {
                return; // 已存在，跳过
              }

              // 插入新数据
              const { error: insertError } = await backgroundSupabase
                .from("foods")
                .insert({
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
                  cachedAt: new Date().toISOString(),
                });

              if (insertError) {
                console.error("保存USDA数据失败:", insertError);
              }
            } catch (error) {
              console.error("保存USDA数据失败:", error);
            }
          }),
        ).catch((error) => {
          console.error("批量保存USDA数据失败:", error);
        });
      });

      // 合并结果
      const allFoods = [
        ...localFoods.map(parseFoodResponse),
        ...usdaResults.map((f) => ({
          id: undefined,
          ...f,
          aliases: f.aliases,
          tags: f.tags,
        })),
      ];

      const result = {
        foods: allFoods.slice(0, limit),
        total: totalCount + usdaResults.length,
        page,
        limit,
        type: "mixed",
      };

      // 缓存混合结果（使用 USDA_DATA TTL，因为数据来自 USDA）
      await CacheService.set(cacheKey, result, CACHE_CONFIG.TTL.USDA_DATA);

      const apiDuration = Date.now() - apiStartTime;
      console.log(
        `🚀 食品搜索 [混合结果] - 总计 ${apiDuration}ms - 查询: "${query}"`,
      );

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "X-Cache": "MISS",
          "X-Response-Time": `${apiDuration}ms`,
          "X-DB-Time": `${dbDuration}ms`,
          "X-USDA-Time": `${usdaDuration}ms`,
        },
      });
    } catch (usdaError) {
      const usdaDuration = Date.now() - usdaStartTime;
      // USDA API失败，只返回本地结果
      console.error(`❌ USDA API搜索失败 - ${usdaDuration}ms:`, usdaError);

      const result = {
        foods: localFoods.map(parseFoodResponse),
        total: totalCount,
        page,
        limit,
        type: "local",
        warning: "USDA API暂时不可用，仅显示本地结果",
      };

      // 缓存失败回退结果（使用较短的 TTL）
      await CacheService.set(
        cacheKey,
        result,
        CACHE_CONFIG.TTL.FOOD_SEARCH_EMPTY,
      );

      const apiDuration = Date.now() - apiStartTime;
      console.log(
        `🚀 食品搜索 [降级] - 总计 ${apiDuration}ms - 查询: "${query}"`,
      );

      return NextResponse.json(result, {
        status: 200,
        headers: {
          "X-Cache": "MISS",
          "X-Response-Time": `${apiDuration}ms`,
          "X-DB-Time": `${Date.now() - dbStartTime}ms`,
        },
      });
    }
  } catch (error) {
    console.error("搜索食物失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 获取降级食品搜索结果
 * 当数据库不可用时提供基本的静态结果
 */
function getFallbackFoodResults(
  query: string,
  category: FoodCategory | null,
  limit: number,
) {
  const fallbackData = [
    {
      id: "fallback-1",
      name: "苹果",
      nameEn: "Apple",
      aliases: ["红富士苹果", "青苹果"],
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
      category: "FRUITS",
      tags: ["水果", "低卡"],
      source: "fallback",
      usdaId: null,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "fallback-2",
      name: "鸡胸肉",
      nameEn: "Chicken Breast",
      aliases: ["鸡胸", "白肉鸡"],
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
      category: "PROTEINS",
      tags: ["蛋白质", "低脂"],
      source: "fallback",
      usdaId: null,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "fallback-3",
      name: "米饭",
      nameEn: "Rice",
      aliases: ["白米饭", "蒸米饭"],
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
      category: "GRAINS",
      tags: ["主食", "碳水"],
      source: "fallback",
      usdaId: null,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // 简单的搜索过滤
  const filtered = fallbackData.filter(
    (food) =>
      (!category || food.category === category) &&
      (food.name.includes(query) ||
        food.nameEn.toLowerCase().includes(query.toLowerCase()) ||
        food.aliases.some((alias: string) => alias.includes(query))),
  );

  return filtered.slice(0, limit);
}

/**
 * 解析Food对象为响应格式
 */
function parseFoodResponse(food: any) {
  return {
    id: food.id,
    name: food.name,
    nameEn: food.nameEn,
    aliases: Array.isArray(food.aliases)
      ? food.aliases
      : JSON.parse(food.aliases || "[]"),
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
