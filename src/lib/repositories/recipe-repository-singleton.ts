/**
 * 食谱 Repository 单例
 *
 * 提供全局单例 RecipeRepository 实例
 *
 * @module recipe-repository-singleton
 */

import { ConvexRecipeRepository } from "./implementations/convex-recipe-repository";
import type { RecipeRepository } from "./interfaces/recipe-repository";

let instance: RecipeRepository | null = null;

/**
 * 获取 RecipeRepository 单例实例
 *
 * @returns RecipeRepository 实例
 */
export function getRecipeRepository(): RecipeRepository {
  if (!instance) {
    instance = new ConvexRecipeRepository();
  }
  return instance;
}

/**
 * 全局 RecipeRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { recipeRepository } from '@/lib/repositories/recipe-repository-singleton';
 *
 * const recipe = await recipeRepository.getRecipeById(id);
 * ```
 */
export const recipeRepository = getRecipeRepository();
