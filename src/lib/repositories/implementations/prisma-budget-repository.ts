/**
 * Prisma BudgetRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-budget-repository
 */

import type { BudgetRepository } from "../interfaces/budget-repository";
import type {
  BudgetAlertDTO,
  BudgetCreateDTO,
  BudgetDTO,
  BudgetStatusDTO,
  BudgetUpdateDTO,
  SpendingCreateDTO,
  SpendingDTO,
  SpendingFilterDTO,
} from "../types/budget";
import type { PaginatedResult, PaginationInput } from "../types/common";

/**
 * PrismaBudgetRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaBudgetRepository implements BudgetRepository {
  async createBudget(_payload: BudgetCreateDTO): Promise<BudgetDTO> {
    throw new Error("PrismaBudgetRepository.createBudget not implemented");
  }

  async updateBudget(
    _id: string,
    _payload: BudgetUpdateDTO,
  ): Promise<BudgetDTO> {
    throw new Error("PrismaBudgetRepository.updateBudget not implemented");
  }

  async getBudgetById(_id: string): Promise<BudgetDTO | null> {
    throw new Error("PrismaBudgetRepository.getBudgetById not implemented");
  }

  async listBudgets(
    _memberId: string,
    _filter?: { status?: BudgetDTO["status"] },
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<BudgetDTO>> {
    throw new Error("PrismaBudgetRepository.listBudgets not implemented");
  }

  async recordSpending(_payload: SpendingCreateDTO): Promise<SpendingDTO> {
    throw new Error("PrismaBudgetRepository.recordSpending not implemented");
  }

  async listSpendings(
    _filter: SpendingFilterDTO,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<SpendingDTO>> {
    throw new Error("PrismaBudgetRepository.listSpendings not implemented");
  }

  async aggregateBudgetUsage(_budgetId: string): Promise<{
    usedAmount: number;
    remainingAmount: number;
    usagePercentage: number;
  }> {
    throw new Error(
      "PrismaBudgetRepository.aggregateBudgetUsage not implemented",
    );
  }

  async createBudgetAlert(_alert: BudgetAlertDTO): Promise<void> {
    throw new Error("PrismaBudgetRepository.createBudgetAlert not implemented");
  }

  async listActiveAlerts(_budgetId: string): Promise<BudgetAlertDTO[]> {
    throw new Error("PrismaBudgetRepository.listActiveAlerts not implemented");
  }

  async getBudgetStatus(_budgetId: string): Promise<BudgetStatusDTO> {
    throw new Error("PrismaBudgetRepository.getBudgetStatus not implemented");
  }

  async softDeleteBudget(_id: string): Promise<void> {
    throw new Error("PrismaBudgetRepository.softDeleteBudget not implemented");
  }
}
