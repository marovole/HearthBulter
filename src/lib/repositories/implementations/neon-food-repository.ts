// @ts-nocheck - Legacy migration: pending full type safety review
/**
 * Neon Food Repository 实现
 *
 * 使用 Neon PostgreSQL 访问食材数据
 *
 * @module neon-food-repository
 */

import type { FoodCategory } from "@/lib/types/meal";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { NeonClientManager } from "@/lib/db/neon-client";
import { safeParseArray } from "@/lib/utils/json-helpers";
import type {
  FoodRecord,
  FoodRepository,
  FoodSearchQuery,
  FoodSearchResult,
} from "@/lib/repositories/interfaces/food-repository";

/**
 * Neon Food Repository 实现
 */
export class NeonFoodRepository implements FoodRepository {
  /**
   * 规范化 Food 对象
   */
  private normalizeFoodRecord(food: any): FoodRecord {
    return {
      ...food,
      aliases: safeParseArray(food.aliases),
      tags: safeParseArray(food.tags),
    } as FoodRecord;
  }

  async findById(id: string): Promise<FoodRecord | null> {
    const data = await neonAdapter.food.findUnique({
      where: { id },
    });

    return data ? this.normalizeFoodRecord(data) : null;
  }

  async searchFoods(params: FoodSearchQuery): Promise<FoodSearchResult> {
    const { query, category, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    // Use raw SQL for ILIKE search which neonAdapter may not fully support
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Search by name or nameEn
    whereConditions.push(`("name" ILIKE $${paramIndex} OR "nameEn" ILIKE $${paramIndex})`);
    queryParams.push(`%${query}%`);
    paramIndex++;

    // Add category filter if provided
    if (category) {
      whereConditions.push(`"category" = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await NeonClientManager.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM foods ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult[0]?.count || "0", 10);

    // Get paginated results
    const dataResult = await NeonClientManager.query<any>(
      `SELECT * FROM foods ${whereClause} ORDER BY "name" ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      foods: (dataResult || []).map((food) => this.normalizeFoodRecord(food)),
      total,
      page,
      limit,
    };
  }

  async findPopular(limit: number): Promise<FoodRecord[]> {
    const data = await neonAdapter.food.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return (data || []).map((food) => this.normalizeFoodRecord(food));
  }

  async listByCategory(category: FoodCategory, from: number, to: number): Promise<FoodRecord[]> {
    const limit = to - from + 1;

    const data = await neonAdapter.food.findMany({
      where: { category },
      orderBy: { name: "asc" },
      skip: from,
      take: limit,
    });

    return (data || []).map((food) => this.normalizeFoodRecord(food));
  }

  async countByCategory(category: FoodCategory): Promise<number> {
    const count = await neonAdapter.food.count({
      where: { category },
    });

    return count || 0;
  }
}
