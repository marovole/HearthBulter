/**
 * 家庭 Repository 单例
 *
 * 提供全局单例 FamilyRepository 实例
 *
 * @module family-repository-singleton
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { SupabaseFamilyRepository } from './implementations/supabase-family-repository';
import type { FamilyRepository } from './interfaces/family-repository';

let instance: FamilyRepository | null = null;

/**
 * 获取 FamilyRepository 单例实例
 *
 * @returns FamilyRepository 实例
 */
export function getFamilyRepository(): FamilyRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseFamilyRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 FamilyRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { familyRepository } from '@/lib/repositories/family-repository-singleton';
 *
 * const family = await familyRepository.getFamilyById(id);
 * ```
 */
export const familyRepository = getFamilyRepository();
