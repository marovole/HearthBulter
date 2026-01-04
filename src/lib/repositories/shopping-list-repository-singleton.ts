/**
 * 购物清单 Repository 单例
 *
 * 提供全局单例 ShoppingListRepository 实例
 *
 * @module shopping-list-repository-singleton
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseShoppingListRepository } from "./implementations/supabase-shopping-list-repository";
import type { ShoppingListRepository } from "./interfaces/shopping-list-repository";

let instance: ShoppingListRepository | null = null;

/**
 * 获取 ShoppingListRepository 单例实例
 *
 * @returns ShoppingListRepository 实例
 */
export function getShoppingListRepository(): ShoppingListRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseShoppingListRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 ShoppingListRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { shoppingListRepository } from '@/lib/repositories/shopping-list-repository-singleton';
 *
 * const item = await shoppingListRepository.getItemById(id);
 * ```
 */
export const shoppingListRepository = getShoppingListRepository();
