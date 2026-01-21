import { NeonMealPlanRepository } from "./implementations/neon-meal-plan-repository";
import type { MealPlanRepository } from "./interfaces/meal-plan-repository";

let instance: MealPlanRepository | null = null;

export function getMealPlanRepository(): MealPlanRepository {
  if (!instance) {
    instance = new NeonMealPlanRepository();
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
