/**
 * 库存 Repository 单例
 *
 * 提供全局单例 InventoryRepository 实例
 *
 * @module inventory-repository-singleton
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { SupabaseInventoryRepository } from './implementations/supabase-inventory-repository';
import type { InventoryRepository } from './interfaces/inventory-repository';

let instance: InventoryRepository | null = null;

/**
 * 获取 InventoryRepository 单例实例
 *
 * @returns InventoryRepository 实例
 */
export function getInventoryRepository(): InventoryRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseInventoryRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 InventoryRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { inventoryRepository } from '@/lib/repositories/inventory-repository-singleton';
 *
 * const item = await inventoryRepository.getItemById(id);
 * ```
 */
export const inventoryRepository = getInventoryRepository();
