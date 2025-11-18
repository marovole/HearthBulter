/**
 * 食谱 Repository 单例
 *
 * 提供全局单例 RecipeRepository 实例
 *
 * @module recipe-repository-singleton
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { SupabaseRecipeRepository } from './implementations/supabase-recipe-repository';
import type { RecipeRepository } from './interfaces/recipe-repository';

let instance: RecipeRepository | null = null;

/**
 * 获取 RecipeRepository 单例实例
 *
 * @returns RecipeRepository 实例
 */
export function getRecipeRepository(): RecipeRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseRecipeRepository(supabaseClient);
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
