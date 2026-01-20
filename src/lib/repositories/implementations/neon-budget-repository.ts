/**
 * Neon 预算 Repository 实现
 *
 * 基于 Neon PostgreSQL + neonAdapter 实现预算管理系统的数据访问层
 *
 * @module neon-budget-repository
 */

import { neonAdapter } from "@/lib/db/neon-adapter";
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

interface BudgetRow {
  id: string;
  memberId: string;
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  usedAmount: number | null;
  remainingAmount: number | null;
  usagePercentage: number | null;
  status: string;
  alertThreshold80: boolean | null;
  alertThreshold100: boolean | null;
  alertThreshold110: boolean | null;
  vegetableBudget: number | null;
  meatBudget: number | null;
  fruitBudget: number | null;
  grainBudget: number | null;
  seafoodBudget: number | null;
  dairyBudget: number | null;
  oilsBudget: number | null;
  snacksBudget: number | null;
  beveragesBudget: number | null;
  otherBudget: number | null;
  createdAt: string;
  deletedAt: string | null;
}

interface SpendingRow {
  id: string;
  budgetId: string;
  amount: number;
  category: string;
  description: string | null;
  transactionId: string | null;
  platform: string | null;
  items: unknown | null;
  purchaseDate: string;
  createdAt: string;
}

interface BudgetAlertRow {
  id: string;
  budgetId: string;
  type: string;
  threshold: number;
  currentValue: number;
  message: string;
  category: string | null;
  status: string;
  createdAt: string;
}

export class NeonBudgetRepository implements BudgetRepository {
  private readonly loggerPrefix = "[NeonBudgetRepository]";

  async createBudget(payload: BudgetCreateDTO): Promise<BudgetDTO> {
    const data = await neonAdapter.budget.create<BudgetRow>({
      data: {
        memberId: payload.memberId,
        name: payload.name,
        period: payload.period,
        startDate: payload.startDate,
        endDate: payload.endDate,
        totalAmount: payload.totalAmount,
        vegetableBudget: payload.categoryBudgets?.VEGETABLES ?? null,
        meatBudget: payload.categoryBudgets?.PROTEIN ?? null,
        fruitBudget: payload.categoryBudgets?.FRUITS ?? null,
        grainBudget: payload.categoryBudgets?.GRAINS ?? null,
        seafoodBudget: payload.categoryBudgets?.SEAFOOD ?? null,
        dairyBudget: payload.categoryBudgets?.DAIRY ?? null,
        oilsBudget: payload.categoryBudgets?.OILS ?? null,
        snacksBudget: payload.categoryBudgets?.SNACKS ?? null,
        beveragesBudget: payload.categoryBudgets?.BEVERAGES ?? null,
        otherBudget: payload.categoryBudgets?.OTHER ?? null,
        alertThreshold80: payload.alertThreshold80,
        alertThreshold100: payload.alertThreshold100,
        alertThreshold110: payload.alertThreshold110,
        status: "ACTIVE",
      },
    });

    return this.mapBudgetRow(data);
  }

  async updateBudget(id: string, payload: BudgetUpdateDTO): Promise<BudgetDTO> {
    const updateData: Record<string, unknown> = {};

    if (payload.name) updateData.name = payload.name;
    if (payload.period) updateData.period = payload.period;
    if (payload.startDate) updateData.startDate = payload.startDate;
    if (payload.endDate) updateData.endDate = payload.endDate;
    if (payload.totalAmount !== undefined)
      updateData.totalAmount = payload.totalAmount;
    if (payload.status) updateData.status = payload.status;

    if (payload.categoryBudgets) {
      updateData.vegetableBudget = payload.categoryBudgets.VEGETABLES ?? null;
      updateData.meatBudget = payload.categoryBudgets.PROTEIN ?? null;
      updateData.fruitBudget = payload.categoryBudgets.FRUITS ?? null;
      updateData.grainBudget = payload.categoryBudgets.GRAINS ?? null;
      updateData.seafoodBudget = payload.categoryBudgets.SEAFOOD ?? null;
      updateData.dairyBudget = payload.categoryBudgets.DAIRY ?? null;
      updateData.oilsBudget = payload.categoryBudgets.OILS ?? null;
      updateData.snacksBudget = payload.categoryBudgets.SNACKS ?? null;
      updateData.beveragesBudget = payload.categoryBudgets.BEVERAGES ?? null;
      updateData.otherBudget = payload.categoryBudgets.OTHER ?? null;
    }

    if (payload.alertThreshold80 !== undefined)
      updateData.alertThreshold80 = payload.alertThreshold80;
    if (payload.alertThreshold100 !== undefined)
      updateData.alertThreshold100 = payload.alertThreshold100;
    if (payload.alertThreshold110 !== undefined)
      updateData.alertThreshold110 = payload.alertThreshold110;

    const data = await neonAdapter.budget.update<BudgetRow>({
      where: { id },
      data: updateData,
    });

    return this.mapBudgetRow(data);
  }

  async getBudgetById(id: string): Promise<BudgetDTO | null> {
    const data = await neonAdapter.budget.findUnique<BudgetRow>({
      where: { id },
    });

    return data ? this.mapBudgetRow(data) : null;
  }

  async listBudgets(
    memberId: string,
    filter?: { status?: BudgetDTO["status"] },
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<BudgetDTO>> {
    const where: Record<string, unknown> = { memberId };
    if (filter?.status) where.status = filter.status;

    const data = await neonAdapter.budget.findMany<BudgetRow>({
      where,
      orderBy: { createdAt: "desc" },
      take: pagination?.limit,
      skip: pagination?.offset,
    });

    const total = await neonAdapter.budget.count({ where });

    const items = data.map((row) => this.mapBudgetRow(row));
    return {
      items,
      total,
      hasMore: pagination?.limit
        ? (pagination.offset ?? 0) + items.length < total
        : false,
    };
  }

  async recordSpending(payload: SpendingCreateDTO): Promise<SpendingDTO> {
    const budget = await this.getBudgetById(payload.budgetId);
    if (!budget) {
      throw new Error(`Budget ${payload.budgetId} not found`);
    }

    if (budget.status !== "ACTIVE") {
      throw new Error(`Budget ${payload.budgetId} is not active`);
    }

    const data = await neonAdapter.spending.create<SpendingRow>({
      data: {
        budgetId: payload.budgetId,
        amount: payload.amount,
        category: payload.category,
        description: payload.description ?? null,
        transactionId: payload.transactionId ?? null,
        platform: payload.platform ?? null,
        items: payload.items ?? null,
        purchaseDate: payload.purchaseDate ?? new Date(),
      },
    });

    const newUsedAmount = (budget.usedAmount ?? 0) + payload.amount;
    await neonAdapter.budget.update({
      where: { id: payload.budgetId },
      data: {
        usedAmount: newUsedAmount,
        remainingAmount: Math.max(0, budget.totalAmount - newUsedAmount),
        usagePercentage:
          budget.totalAmount > 0
            ? (newUsedAmount / budget.totalAmount) * 100
            : 0,
      },
    });

    await this.checkAndCreateAlerts(payload.budgetId);

    return this.mapSpendingRow(data);
  }

  async listSpendings(
    filter: SpendingFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<SpendingDTO>> {
    const where: Record<string, unknown> = { budgetId: filter.budgetId };
    if (filter.category) where.category = filter.category;

    const data = await neonAdapter.spending.findMany<SpendingRow>({
      where,
      orderBy: { purchaseDate: "desc" },
      take: pagination?.limit,
      skip: pagination?.offset,
    });

    let filtered = data;
    if (filter.range?.start || filter.range?.end) {
      filtered = data.filter((row) => {
        const date = new Date(row.purchaseDate);
        if (filter.range?.start && date < filter.range.start) return false;
        if (filter.range?.end && date > filter.range.end) return false;
        return true;
      });
    }

    const total = await neonAdapter.spending.count({ where });

    const items = filtered.map((row) => this.mapSpendingRow(row));
    return {
      items,
      total,
      hasMore: pagination?.limit
        ? (pagination.offset ?? 0) + items.length < total
        : false,
    };
  }

  async aggregateBudgetUsage(budgetId: string): Promise<{
    usedAmount: number;
    remainingAmount: number;
    usagePercentage: number;
  }> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) throw new Error(`Budget ${budgetId} not found`);

    const spendings = await neonAdapter.spending.findMany<{ amount: number }>({
      where: { budgetId },
    });

    const usedAmount = spendings.reduce(
      (sum, row) => sum + (row.amount ?? 0),
      0,
    );
    const remainingAmount = Math.max(0, budget.totalAmount - usedAmount);
    const usagePercentage =
      budget.totalAmount > 0 ? (usedAmount / budget.totalAmount) * 100 : 0;

    return { usedAmount, remainingAmount, usagePercentage };
  }

  async createBudgetAlert(alert: Omit<BudgetAlertDTO, "id">): Promise<void> {
    await neonAdapter.budgetAlert.create({
      data: {
        budgetId: alert.budgetId,
        type: alert.type,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
        message: alert.message,
        category: alert.category ?? null,
        status: alert.status,
      },
    });
  }

  async listActiveAlerts(budgetId: string): Promise<BudgetAlertDTO[]> {
    const data = await neonAdapter.budgetAlert.findMany<BudgetAlertRow>({
      where: { budgetId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    return data.map((row) => this.mapBudgetAlertRow(row));
  }

  async getBudgetStatus(budgetId: string): Promise<BudgetStatusDTO> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) throw new Error(`Budget ${budgetId} not found`);

    const [usage, alerts, spendings] = await Promise.all([
      this.aggregateBudgetUsage(budgetId),
      this.listActiveAlerts(budgetId),
      neonAdapter.spending.findMany<SpendingRow>({ where: { budgetId } }),
    ]);

    const totalDays = Math.ceil(
      (budget.endDate.getTime() - budget.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const elapsedDays = Math.max(
      1,
      Math.ceil(
        (Date.now() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const dailyAverage = usage.usedAmount / elapsedDays;
    const projectedSpend = dailyAverage * totalDays;
    const categoryUsage = this.calculateCategoryUsage(budget, spendings);

    return {
      budget: {
        ...budget,
        usedAmount: usage.usedAmount,
        remainingAmount: usage.remainingAmount,
        usagePercentage: usage.usagePercentage,
      },
      dailyAverage,
      projectedSpend,
      daysRemaining: Math.max(0, totalDays - elapsedDays),
      alerts,
      categoryUsage,
    };
  }

  async softDeleteBudget(id: string): Promise<void> {
    await neonAdapter.budget.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "CANCELLED",
      },
    });
  }

  private async checkAndCreateAlerts(budgetId: string): Promise<void> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) return;

    const usage = await this.aggregateBudgetUsage(budgetId);
    const thresholds = [
      { value: 80, enabled: budget.alertThreshold80, type: "WARNING_80" },
      { value: 100, enabled: budget.alertThreshold100, type: "LIMIT_REACHED" },
      { value: 110, enabled: budget.alertThreshold110, type: "OVERSPENT" },
    ];

    for (const threshold of thresholds) {
      if (threshold.enabled && usage.usagePercentage >= threshold.value) {
        const existingAlerts = await neonAdapter.budgetAlert.findMany<{
          id: string;
        }>({
          where: {
            budgetId,
            type: threshold.type,
            status: "ACTIVE",
          },
        });

        if (existingAlerts.length === 0) {
          await this.createBudgetAlert({
            budgetId,
            type: threshold.type as BudgetAlertDTO["type"],
            threshold: threshold.value,
            currentValue: usage.usagePercentage,
            message: `预算已使用 ${Math.round(usage.usagePercentage)}%`,
            status: "ACTIVE",
            createdAt: new Date(),
          });
        }
      }
    }
  }

  private calculateCategoryUsage(
    budget: BudgetDTO,
    spendings: SpendingRow[],
  ): BudgetStatusDTO["categoryUsage"] {
    const usage: BudgetStatusDTO["categoryUsage"] = {};
    const categories = Object.keys(budget.categoryBudgets ?? {});

    for (const category of categories) {
      const categoryBudget =
        budget.categoryBudgets![
          category as keyof typeof budget.categoryBudgets
        ] ?? 0;
      const categorySpent = spendings
        .filter((s) => s.category === category)
        .reduce((sum, row) => sum + (row.amount ?? 0), 0);
      usage[category as keyof typeof usage] = {
        budget: categoryBudget,
        used: categorySpent,
        remaining: Math.max(0, categoryBudget - categorySpent),
        percentage:
          categoryBudget > 0 ? (categorySpent / categoryBudget) * 100 : 0,
      };
    }

    return usage;
  }

  private mapBudgetRow(row: BudgetRow): BudgetDTO {
    return {
      id: row.id,
      memberId: row.memberId,
      name: row.name,
      period: row.period as BudgetDTO["period"],
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      totalAmount: row.totalAmount,
      usedAmount: row.usedAmount ?? 0,
      remainingAmount: row.remainingAmount ?? 0,
      usagePercentage: row.usagePercentage ?? 0,
      status: row.status as BudgetDTO["status"],
      alertThreshold80: row.alertThreshold80 ?? true,
      alertThreshold100: row.alertThreshold100 ?? true,
      alertThreshold110: row.alertThreshold110 ?? true,
      createdAt: new Date(row.createdAt),
      categoryBudgets: {
        VEGETABLES: row.vegetableBudget ?? 0,
        FRUITS: row.fruitBudget ?? 0,
        GRAINS: row.grainBudget ?? 0,
        PROTEIN: row.meatBudget ?? 0,
        SEAFOOD: row.seafoodBudget ?? 0,
        DAIRY: row.dairyBudget ?? 0,
        OILS: row.oilsBudget ?? 0,
        SNACKS: row.snacksBudget ?? 0,
        BEVERAGES: row.beveragesBudget ?? 0,
        OTHER: row.otherBudget ?? 0,
      },
    };
  }

  private mapSpendingRow(row: SpendingRow): SpendingDTO {
    return {
      id: row.id,
      budgetId: row.budgetId,
      amount: row.amount ?? 0,
      category: row.category as SpendingDTO["category"],
      description: row.description ?? undefined,
      transactionId: row.transactionId ?? undefined,
      platform: row.platform ?? undefined,
      items: (row.items as SpendingDTO["items"]) ?? undefined,
      purchaseDate: new Date(row.purchaseDate),
      createdAt: new Date(row.createdAt),
    };
  }

  private mapBudgetAlertRow(row: BudgetAlertRow): BudgetAlertDTO {
    return {
      id: row.id,
      budgetId: row.budgetId,
      type: row.type as BudgetAlertDTO["type"],
      threshold: row.threshold,
      currentValue: row.currentValue,
      message: row.message,
      category: (row.category as BudgetAlertDTO["category"]) ?? undefined,
      status: row.status as BudgetAlertDTO["status"],
      createdAt: new Date(row.createdAt),
    };
  }
}
