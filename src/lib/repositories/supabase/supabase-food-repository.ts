import type { FoodCategory } from '@prisma/client';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { safeParseArray } from '@/lib/utils/json-helpers';
import type { FoodRecord, FoodRepository } from '@/lib/repositories/interfaces/food-repository';

/**
 * Supabase Food Repository 实现
 *
 * 使用 Supabase Client 访问食材数据
 */
export class SupabaseFoodRepository implements FoodRepository {
  constructor(private readonly supabase = SupabaseClientManager.getInstance()) {}

  async findPopular(limit: number): Promise<FoodRecord[]> {
    const { data, error } = await this.supabase
      .from('foods')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []).map((food: any) => ({
      ...food,
      aliases: safeParseArray(food.aliases),
      tags: safeParseArray(food.tags),
    })) as FoodRecord[];
  }

  async listByCategory(category: FoodCategory, from: number, to: number): Promise<FoodRecord[]> {
    const { data, error } = await this.supabase
      .from('foods')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    return (data || []).map((food: any) => ({
      ...food,
      aliases: safeParseArray(food.aliases),
      tags: safeParseArray(food.tags),
    })) as FoodRecord[];
  }

  async countByCategory(category: FoodCategory): Promise<number> {
    const { count, error } = await this.supabase
      .from('foods')
      .select('*', { count: 'exact', head: true })
      .eq('category', category);

    if (error) {
      throw error;
    }

    return count || 0;
  }
}
