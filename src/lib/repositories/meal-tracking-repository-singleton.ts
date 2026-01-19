/**
 * 膳食追踪 Repository 单例
 *
 * 提供全局单例 MealTrackingRepository 实例
 *
 * @module meal-tracking-repository-singleton
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseMealTrackingRepository } from "./implementations/supabase-meal-tracking-repository";
import type { MealTrackingRepository } from "./interfaces/meal-tracking-repository";

let instance: MealTrackingRepository | null = null;

/**
 * 获取 MealTrackingRepository 单例实例
 *
 * @returns MealTrackingRepository 实例
 */
export function getMealTrackingRepository(): MealTrackingRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseMealTrackingRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 MealTrackingRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { mealTrackingRepository } from '@/lib/repositories/meal-tracking-repository-singleton';
 *
 * const tracking = await mealTrackingRepository.getTrackingById(id);
 * ```
 */
export const mealTrackingRepository = getMealTrackingRepository();
