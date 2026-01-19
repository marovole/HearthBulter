/**
 * 预算 Repository 单例
 *
 * 提供全局单例 BudgetRepository 实例
 *
 * @module budget-repository-singleton
 */

import { ConvexBudgetRepository } from "./implementations/convex-budget-repository";
import type { BudgetRepository } from "./interfaces/budget-repository";

let instance: BudgetRepository | null = null;

/**
 * 获取 BudgetRepository 单例实例
 *
 * @returns BudgetRepository 实例
 */
export function getBudgetRepository(): BudgetRepository {
  if (!instance) {
    instance = new ConvexBudgetRepository();
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
