import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { usdaService } from '@/lib/services/usda-service';
import { CacheService, CacheKeyBuilder, CACHE_CONFIG } from '@/lib/cache/redis-client';
import type { FoodCategory } from '@prisma/client';

/**
 * GET /api/foods/search?q=鸡胸肉
 * 搜索食物（支持中英文）
 */
export async function GET(request: NextRequest) {
  const apiStartTime = Date.now(); // 记录 API 开始时间

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const category = searchParams.get('category') as FoodCategory | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: '请提供搜索关键词' },
        { status: 400 }
      );
    }

    // 生成缓存键（标准化查询关键词）
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = CacheKeyBuilder.build('foods-search', normalizedQuery, `${category || 'all'}-${limit}-${page}`);

    // 尝试从缓存获取结果
    const cachedResult = await CacheService.get(cacheKey);
    if (cachedResult) {
      const apiDuration = Date.now() - apiStartTime;
      console.log(`🚀 食品搜索 [缓存命中] - ${apiDuration}ms - 查询: "${query}"`);

      return NextResponse.json(cachedResult, {
        headers: {
          'X-Cache': 'HIT',
          'X-Response-Time': `${apiDuration}ms`,
        },
      });
    }

    // 1. 先在本地数据库搜索
    const dbStartTime = Date.now();
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { nameEn: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (category) {
      where.category = category;
    }

    const [localFoods, totalCount] = await Promise.all([
      prisma.food.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { name: 'asc' },
        // 只选择需要的字段，减少数据传输
        select: {
          id: true,
          name: true,
          nameEn: true,
          aliases: true,
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
          fiber: true,
          sugar: true,
          sodium: true,
          vitaminA: true,
          vitaminC: true,
          calcium: true,
          iron: true,
          category: true,
          tags: true,
          source: true,
          usdaId: true,
          verified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.food.count({ where }),
    ]);

    const dbDuration = Date.now() - dbStartTime;
    console.log(`📊 数据库查询 - ${dbDuration}ms - 找到 ${localFoods.length} 条本地结果`);

    // 如果本地有足够的结果，直接返回
    if (localFoods.length >= limit) {
      const result = {
        foods: localFoods.map(parseFoodResponse),
        total: totalCount,
        page,
        limit,
        type: 'local',
      };

      // 缓存结果（使用专用的 FOOD_SEARCH TTL）
      await CacheService.set(cacheKey, result, CACHE_CONFIG.TTL.FOOD_SEARCH);

      const apiDuration = Date.now() - apiStartTime;
      console.log(`🚀 食品搜索 [本地结果] - 总计 ${apiDuration}ms - 查询: "${query}"`);

      return NextResponse.json(result, {
        status: 200,
        headers: {
          'X-Cache': 'MISS',
          'X-Response-Time': `${apiDuration}ms`,
          'X-DB-Time': `${dbDuration}ms`,
        },
      });
    }

    // 2. 如果本地结果不足，尝试从USDA API搜索
    const usdaStartTime = Date.now();
    try {
      const usdaResults = await usdaService.searchAndMapFoods(
        query,
        limit - localFoods.length
      );

      const usdaDuration = Date.now() - usdaStartTime;
      console.log(`🌐 USDA API 查询 - ${usdaDuration}ms - 找到 ${usdaResults.length} 条结果`);

      // 将USDA结果保存到数据库（异步，不阻塞响应）
      setImmediate(() => {
        Promise.all(
          usdaResults.map(async (foodData) => {
            try {
              // 检查是否已存在（优化：只查询 usdaId 字段）
              const existing = await prisma.food.findFirst({
                where: { usdaId: foodData.usdaId },
                select: { id: true },
              });

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
                });
              }
            } catch (error) {
              // 忽略重复键错误等
              console.error('保存USDA数据失败:', error);
            }
          })
        ).catch((error) => {
          console.error('批量保存USDA数据失败:', error);
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
        type: 'mixed',
      };

      // 缓存混合结果（使用 USDA_DATA TTL，因为数据来自 USDA）
      await CacheService.set(cacheKey, result, CACHE_CONFIG.TTL.USDA_DATA);

      const apiDuration = Date.now() - apiStartTime;
      console.log(`🚀 食品搜索 [混合结果] - 总计 ${apiDuration}ms - 查询: "${query}"`);

      return NextResponse.json(result, {
        status: 200,
        headers: {
          'X-Cache': 'MISS',
          'X-Response-Time': `${apiDuration}ms`,
          'X-DB-Time': `${dbDuration}ms`,
          'X-USDA-Time': `${usdaDuration}ms`,
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
        type: 'local',
        warning: 'USDA API暂时不可用，仅显示本地结果',
      };

      // 缓存失败回退结果（使用较短的 TTL）
      await CacheService.set(cacheKey, result, CACHE_CONFIG.TTL.FOOD_SEARCH_EMPTY);

      const apiDuration = Date.now() - apiStartTime;
      console.log(`🚀 食品搜索 [降级] - 总计 ${apiDuration}ms - 查询: "${query}"`);

      return NextResponse.json(result, {
        status: 200,
        headers: {
          'X-Cache': 'MISS',
          'X-Response-Time': `${apiDuration}ms`,
          'X-DB-Time': `${dbDuration}ms`,
        },
      });
    }
  } catch (error) {
    console.error('搜索食物失败:', error);
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

