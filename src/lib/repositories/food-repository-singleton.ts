/**
 * 食材 Repository 单例
 *
 * 提供全局单例 FoodRepository 实例
 *
 * @module food-repository-singleton
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseFoodRepository } from "./supabase/supabase-food-repository";
import type { FoodRepository } from "./interfaces/food-repository";

let instance: FoodRepository | null = null;

/**
 * 获取 FoodRepository 单例实例
 *
 * @returns FoodRepository 实例
 */
export function getFoodRepository(): FoodRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseFoodRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 FoodRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { foodRepository } from '@/lib/repositories/food-repository-singleton';
 *
 * const food = await foodRepository.getFoodById(id);
 * ```
 */
export const foodRepository = getFoodRepository();
