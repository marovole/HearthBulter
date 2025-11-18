/**
 * 膳食计划 Repository 单例
 *
 * 提供全局单例 MealPlanRepository 实例
 *
 * @module meal-plan-repository-singleton
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { SupabaseMealPlanRepository } from './implementations/supabase-meal-plan-repository';
import type { MealPlanRepository } from './interfaces/meal-plan-repository';

let instance: MealPlanRepository | null = null;

/**
 * 获取 MealPlanRepository 单例实例
 *
 * @returns MealPlanRepository 实例
 */
export function getMealPlanRepository(): MealPlanRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseMealPlanRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 MealPlanRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { mealPlanRepository } from '@/lib/repositories/meal-plan-repository-singleton';
 *
 * const plan = await mealPlanRepository.getPlanById(id);
 * ```
 */
export const mealPlanRepository = getMealPlanRepository();
