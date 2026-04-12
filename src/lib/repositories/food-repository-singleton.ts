import { ConvexFoodRepository } from "./implementations/convex-food-repository";
import type { FoodRepository } from "./interfaces/food-repository";

let instance: FoodRepository | null = null;

export function getFoodRepository(): FoodRepository {
  if (!instance) {
    instance = new ConvexFoodRepository();
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
 * const food = await foodRepository.findById(id);
 * ```
 */
export const foodRepository = getFoodRepository();
