import type { Food as PrismaFood, FoodCategory } from '@prisma/client';
import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils/json-helpers';
import type {
  FoodRecord,
  FoodRepository,
  FoodSearchQuery,
  FoodSearchResult
} from '@/lib/repositories/interfaces/food-repository';

/**
 * 将 Prisma Food 模型规范化为统一的 FoodRecord 格式
 *
 * 主要处理 JSON 字段的解析，确保与 Supabase 返回格式一致
 *
 * @param food - Prisma Food 记录
 * @returns 规范化后的 FoodRecord
 */
function normalizePrismaFood(food: PrismaFood): FoodRecord {
  return {
    ...food,
    aliases: safeParseArray(food.aliases),
    tags: safeParseArray(food.tags),
  } as FoodRecord;
}

/**
 * Prisma Food Repository 实现
 *
 * 使用 Prisma ORM 访问食材数据
 */
export class PrismaFoodRepository implements FoodRepository {
  async findById(id: string): Promise<FoodRecord | null> {
    const food = await prisma.food.findUnique({
      where: { id },
    });

    return food ? normalizePrismaFood(food) : null;
  }

  async searchFoods(params: FoodSearchQuery): Promise<FoodSearchResult> {
    const { query, category, page = 1, limit = 20 } = params;

    // 构建 where 条件：name 或 nameEn 包含查询关键词（不区分大小写）
    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { nameEn: { contains: query, mode: 'insensitive' as const } },
      ],
      ...(category && { category }),
    };

    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.food.count({ where }),
    ]);

    return {
      foods: foods.map(normalizePrismaFood),
      total,
      page,
      limit,
    };
  }

  async findPopular(limit: number): Promise<FoodRecord[]> {
    const foods = await prisma.food.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return foods.map(normalizePrismaFood);
  }

  async listByCategory(category: FoodCategory, from: number, to: number): Promise<FoodRecord[]> {
    const foods = await prisma.food.findMany({
      where: { category },
      orderBy: { name: 'asc' },
      skip: from,
      take: to - from + 1,
    });

    return foods.map(normalizePrismaFood);
  }

  async countByCategory(category: FoodCategory): Promise<number> {
    return prisma.food.count({
      where: { category },
    });
  }
}
