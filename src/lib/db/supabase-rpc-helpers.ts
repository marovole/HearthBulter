/**
 * Supabase RPC 函数调用辅助工具
 *
 * 提供统一的 RPC 调用封装，包含：
 * - 结构化错误处理
 * - 统一日志格式
 * - 返回明确的成功/失败状态
 *
 * 这些 wrapper 确保 RPC 失败时能够被正确记录和监控，
 * 避免静默失败导致数据不一致。
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * RPC 调用结果类型
 */
export type RpcResult = {
  success: boolean;
  error?: unknown;
};

/**
 * 记录 RPC 错误的统一日志格式
 *
 * @param fnName - RPC 函数名称
 * @param recipeId - 相关的 recipe ID
 * @param error - 错误对象
 */
function logRpcError(fnName: string, recipeId: string, error: unknown): void {
  console.error(`[RPC:${fnName}] recipeId=${recipeId} error:`, error);
}

/**
 * 更新食谱收藏计数
 *
 * 调用 Supabase RPC 函数 `update_recipe_favorite_count`，
 * 重新计算指定食谱的收藏数量并更新 `recipes` 表。
 *
 * @param recipeId - 食谱 ID
 * @returns 包含成功状态和可能的错误信息的结果对象
 *
 * @example
 * const result = await updateRecipeFavoriteCount('recipe-123');
 * if (!result.success) {
 *   console.error('Failed to update favorite count:', result.error);
 * }
 */
export async function updateRecipeFavoriteCount(
  recipeId: string
): Promise<RpcResult> {
  const supabase = SupabaseClientManager.getInstance();

  const { error } = await supabase.rpc('update_recipe_favorite_count', {
    p_recipe_id: recipeId,
  });

  if (error) {
    logRpcError('update_recipe_favorite_count', recipeId, error);
    return { success: false, error };
  }

  return { success: true };
}

/**
 * 更新食谱平均评分和评分数量
 *
 * 调用 Supabase RPC 函数 `update_recipe_average_rating`，
 * 重新计算指定食谱的平均评分和评分总数，并更新 `recipes` 表。
 *
 * @param recipeId - 食谱 ID
 * @returns 包含成功状态和可能的错误信息的结果对象
 *
 * @example
 * const result = await updateRecipeAverageRating('recipe-123');
 * if (!result.success) {
 *   console.error('Failed to update average rating:', result.error);
 * }
 */
export async function updateRecipeAverageRating(
  recipeId: string
): Promise<RpcResult> {
  const supabase = SupabaseClientManager.getInstance();

  const { error } = await supabase.rpc('update_recipe_average_rating', {
    p_recipe_id: recipeId,
  });

  if (error) {
    logRpcError('update_recipe_average_rating', recipeId, error);
    return { success: false, error };
  }

  return { success: true };
}
