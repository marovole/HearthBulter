import { ConvexMealTrackingRepository } from "./implementations/convex-meal-tracking-repository";
import type { MealTrackingRepository } from "./interfaces/meal-tracking-repository";

let instance: MealTrackingRepository | null = null;

export function getMealTrackingRepository(): MealTrackingRepository {
  if (!instance) {
    instance = new ConvexMealTrackingRepository();
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
