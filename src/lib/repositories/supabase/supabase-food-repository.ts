import type { FoodCategory } from "@prisma/client";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { safeParseArray } from "@/lib/utils/json-helpers";
import type {
  FoodRecord,
  FoodRepository,
  FoodSearchQuery,
  FoodSearchResult,
} from "@/lib/repositories/interfaces/food-repository";

/**
 * Supabase Food Repository 实现
 *
 * 使用 Supabase Client 访问食材数据
 */
export class SupabaseFoodRepository implements FoodRepository {
  constructor(
    private readonly supabase = SupabaseClientManager.getInstance(),
  ) {}

  /**
   * 规范化 Supabase 返回的 Food 对象
   */
  private normalizeFoodRecord(food: any): FoodRecord {
    return {
      ...food,
      aliases: safeParseArray(food.aliases),
      tags: safeParseArray(food.tags),
    } as FoodRecord;
  }

  async findById(id: string): Promise<FoodRecord | null> {
    const { data, error } = await this.supabase
      .from("foods")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizeFoodRecord(data) : null;
  }

  async searchFoods(params: FoodSearchQuery): Promise<FoodSearchResult> {
    const { query, category, page = 1, limit = 20 } = params;

    // 构建 ILIKE 查询 (name ILIKE %query% OR nameEn ILIKE %query%)
    const ilikeValue = `%${query}%`;

    let dbQuery = this.supabase
      .from("foods")
      .select("*", { count: "exact" })
      .or(`name.ilike.${ilikeValue},nameEn.ilike.${ilikeValue}`)
      .order("name", { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    // 添加分类过滤
    if (category) {
      dbQuery = dbQuery.eq("category", category);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      throw error;
    }

    return {
      foods: (data || []).map((food) => this.normalizeFoodRecord(food)),
      total: count || 0,
      page,
      limit,
    };
  }

  async findPopular(limit: number): Promise<FoodRecord[]> {
    const { data, error } = await this.supabase
      .from("foods")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []).map((food) => this.normalizeFoodRecord(food));
  }

  async listByCategory(
    category: FoodCategory,
    from: number,
    to: number,
  ): Promise<FoodRecord[]> {
    const { data, error } = await this.supabase
      .from("foods")
      .select("*")
      .eq("category", category)
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    return (data || []).map((food) => this.normalizeFoodRecord(food));
  }

  async countByCategory(category: FoodCategory): Promise<number> {
    const { count, error } = await this.supabase
      .from("foods")
      .select("*", { count: "exact", head: true })
      .eq("category", category);

    if (error) {
      throw error;
    }

    return count || 0;
  }
}
