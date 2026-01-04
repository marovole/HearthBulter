/**
 * 预算 Repository 单例
 *
 * 提供全局单例 BudgetRepository 实例
 *
 * @module budget-repository-singleton
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseBudgetRepository } from "./implementations/supabase-budget-repository";
import type { BudgetRepository } from "./interfaces/budget-repository";

let instance: BudgetRepository | null = null;

/**
 * 获取 BudgetRepository 单例实例
 *
 * @returns BudgetRepository 实例
 */
export function getBudgetRepository(): BudgetRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseBudgetRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 BudgetRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { budgetRepository } from '@/lib/repositories/budget-repository-singleton';
 *
 * const budget = await budgetRepository.getBudgetById(id);
 * ```
 */
export const budgetRepository = getBudgetRepository();
