import { NeonFoodRepository } from "./implementations/neon-food-repository";
import type { FoodRepository } from "./interfaces/food-repository";

let instance: FoodRepository | null = null;

export function getFoodRepository(): FoodRepository {
  if (!instance) {
    instance = new NeonFoodRepository();
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
