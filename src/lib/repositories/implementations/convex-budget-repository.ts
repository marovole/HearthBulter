import type { PaginatedResult, PaginationInput } from "../types/common";
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
import type { BudgetRepository } from "../interfaces/budget-repository";
import { convexClient, api } from "@/lib/convex-client";
import {
  asConvexMutationReference,
  asConvexQueryReference,
} from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

type BudgetDoc = Doc<"budgets"> & {
  seafoodBudget?: number;
  oilsBudget?: number;
  snacksBudget?: number;
  beveragesBudget?: number;
};

type SpendingDoc = Doc<"spendings"> & {
  transactionId?: string;
  platform?: string;
};

type BudgetAlertDoc = Doc<"budgetAlerts"> & {
  category?: string;
};

export class ConvexBudgetRepository implements BudgetRepository {
  async createBudget(payload: BudgetCreateDTO): Promise<BudgetDTO> {
    const budgetId = await convexClient.mutation(api.budget.createBudget, {
      memberId: payload.memberId as Id<"familyMembers">,
      name: payload.name,
      totalAmount: payload.totalAmount,
      period: payload.period,
      startDate: payload.startDate.getTime(),
      endDate: payload.endDate.getTime(),
      alertThreshold80: payload.alertThreshold80,
      alertThreshold100: payload.alertThreshold100,
      alertThreshold110: payload.alertThreshold110,
      vegetableBudget: payload.categoryBudgets?.VEGETABLES,
      meatBudget: payload.categoryBudgets?.PROTEIN,
      fruitBudget: payload.categoryBudgets?.FRUITS,
      grainBudget: payload.categoryBudgets?.GRAINS,
      seafoodBudget: payload.categoryBudgets?.SEAFOOD,
      dairyBudget: payload.categoryBudgets?.DAIRY,
      oilsBudget: payload.categoryBudgets?.OILS,
      snacksBudget: payload.categoryBudgets?.SNACKS,
      beveragesBudget: payload.categoryBudgets?.BEVERAGES,
      otherBudget: payload.categoryBudgets?.OTHER,
    });

    const budget = await convexClient.query<BudgetDoc | null>(
      api.budget.getBudgetById,
      { budgetId: budgetId as Id<"budgets"> },
    );

    if (!budget) {
      throw new Error("预算创建失败");
    }

    return mapBudget(budget);
  }

  async updateBudget(id: string, payload: BudgetUpdateDTO): Promise<BudgetDTO> {
    await convexClient.mutation(api.budget.updateBudget, {
      budgetId: id as Id<"budgets">,
      name: payload.name,
      totalAmount: payload.totalAmount,
      status: payload.status,
    });

    const budget = await convexClient.query<BudgetDoc | null>(
      api.budget.getBudgetById,
      { budgetId: id as Id<"budgets"> },
    );

    if (!budget) {
      throw new Error("预算不存在");
    }

    return mapBudget(budget);
  }

  async getBudgetById(id: string): Promise<BudgetDTO | null> {
    const budget = await convexClient.query<BudgetDoc | null>(
      api.budget.getBudgetById,
      { budgetId: id as Id<"budgets"> },
    );

    return budget ? mapBudget(budget) : null;
  }

  async listBudgets(
    memberId: string,
    filter?: { status?: BudgetDTO["status"] },
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<BudgetDTO>> {
    const budgets = await convexClient.query<BudgetDoc[]>(
      api.budget.getBudgets,
      {
        memberId: memberId as Id<"familyMembers">,
        includeDeleted: false,
      },
    );

    let items = budgets.map(mapBudget);
    if (filter?.status) {
      items = items.filter((item) => item.status === filter.status);
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit;
    const paginated = limit ? items.slice(offset, offset + limit) : items;

    return {
      items: paginated,
      total: items.length,
      hasMore: limit ? offset + paginated.length < items.length : false,
    };
  }

  async recordSpending(payload: SpendingCreateDTO): Promise<SpendingDTO> {
    const spendingResult = await convexClient.mutation<{
      id: Id<"spendings">;
    }>(api.budget.createSpending, {
      budgetId: payload.budgetId as Id<"budgets">,
      amount: payload.amount,
      description: payload.description,
      category: payload.category,
      transactionId: payload.transactionId,
      platform: payload.platform,
      purchaseDate: payload.purchaseDate
        ? payload.purchaseDate.getTime()
        : Date.now(),
      items: payload.items,
    });

    const spending = await convexClient.query<SpendingDoc | null>(
      asConvexQueryReference("budget:getSpendingById"),
      { spendingId: spendingResult.id },
    );

    if (!spending) {
      throw new Error("支出记录创建失败");
    }

    return mapSpending(spending);
  }

  async listSpendings(
    filter: SpendingFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<SpendingDTO>> {
    const spendings = await convexClient.query<SpendingDoc[]>(
      api.budget.getSpendings,
      {
        budgetId: filter.budgetId as Id<"budgets">,
        startDate: filter.range?.start?.getTime(),
        endDate: filter.range?.end?.getTime(),
      },
    );

    let items = spendings.map(mapSpending);
    if (filter.category) {
      items = items.filter((item) => item.category === filter.category);
    }

    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit;
    const paginated = limit ? items.slice(offset, offset + limit) : items;

    return {
      items: paginated,
      total: items.length,
      hasMore: limit ? offset + paginated.length < items.length : false,
    };
  }

  async aggregateBudgetUsage(budgetId: string): Promise<{
    usedAmount: number;
    remainingAmount: number;
    usagePercentage: number;
  }> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    const spendings = await this.listSpendings({ budgetId }, undefined);
    const usedAmount = spendings.items.reduce(
      (sum, spending) => sum + spending.amount,
      0,
    );
    const remainingAmount = Math.max(0, budget.totalAmount - usedAmount);
    const usagePercentage =
      budget.totalAmount > 0 ? (usedAmount / budget.totalAmount) * 100 : 0;

    return { usedAmount, remainingAmount, usagePercentage };
  }

  async createBudgetAlert(alert: BudgetAlertDTO): Promise<void> {
    await convexClient.mutation(
      asConvexMutationReference("budget:createBudgetAlert"),
      {
        budgetId: alert.budgetId as Id<"budgets">,
        type: alert.type,
        threshold: alert.threshold,
        currentValue: alert.currentValue,
        message: alert.message,
        category: alert.category,
        status: alert.status,
      },
    );
  }

  async listActiveAlerts(budgetId: string): Promise<BudgetAlertDTO[]> {
    const alerts = await convexClient.query<BudgetAlertDoc[]>(
      asConvexQueryReference("budget:listActiveBudgetAlerts"),
      { budgetId: budgetId as Id<"budgets"> },
    );

    return alerts.map(mapAlert);
  }

  async getBudgetStatus(budgetId: string): Promise<BudgetStatusDTO> {
    const budget = await this.getBudgetById(budgetId);
    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    const [usage, alerts, spendings] = await Promise.all([
      this.aggregateBudgetUsage(budgetId),
      this.listActiveAlerts(budgetId),
      this.listSpendings({ budgetId }, undefined),
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
    const categoryUsage = calculateCategoryUsage(budget, spendings.items);

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
    await convexClient.mutation(api.budget.deleteBudget, {
      budgetId: id as Id<"budgets">,
    });
  }
}

function mapBudget(budget: BudgetDoc): BudgetDTO {
  return {
    id: budget._id,
    memberId: budget.memberId,
    name: budget.name,
    period: budget.period as BudgetDTO["period"],
    startDate: new Date(budget.startDate),
    endDate: new Date(budget.endDate),
    totalAmount: budget.totalAmount,
    usedAmount: budget.usedAmount ?? 0,
    remainingAmount: Math.max(0, budget.totalAmount - (budget.usedAmount ?? 0)),
    usagePercentage:
      budget.totalAmount > 0
        ? ((budget.usedAmount ?? 0) / budget.totalAmount) * 100
        : 0,
    status: (budget.status as BudgetDTO["status"]) ?? "ACTIVE",
    alertThreshold80: budget.alertThreshold80 ?? true,
    alertThreshold100: budget.alertThreshold100 ?? true,
    alertThreshold110: budget.alertThreshold110 ?? true,
    createdAt: new Date(budget.createdAt),
    categoryBudgets: {
      VEGETABLES: budget.vegetableBudget ?? 0,
      FRUITS: budget.fruitBudget ?? 0,
      GRAINS: budget.grainBudget ?? 0,
      PROTEIN: budget.meatBudget ?? 0,
      SEAFOOD: budget.seafoodBudget ?? 0,
      DAIRY: budget.dairyBudget ?? 0,
      OILS: budget.oilsBudget ?? 0,
      SNACKS: budget.snacksBudget ?? 0,
      BEVERAGES: budget.beveragesBudget ?? 0,
      OTHER: budget.otherBudget ?? 0,
    },
  };
}

function mapSpending(spending: SpendingDoc): SpendingDTO {
  return {
    id: spending._id,
    budgetId: spending.budgetId,
    amount: spending.amount,
    category: spending.category as SpendingDTO["category"],
    description: spending.description ?? undefined,
    transactionId: spending.transactionId ?? undefined,
    platform: spending.platform ?? undefined,
    items: (spending.items as SpendingDTO["items"]) ?? undefined,
    purchaseDate: new Date(spending.purchaseDate),
    createdAt: new Date(spending.createdAt),
  };
}

function mapAlert(alert: BudgetAlertDoc): BudgetAlertDTO {
  return {
    id: alert._id,
    budgetId: alert.budgetId,
    type: alert.type as BudgetAlertDTO["type"],
    threshold: alert.threshold,
    currentValue: alert.currentValue,
    message: alert.message,
    category: alert.category as BudgetAlertDTO["category"] | undefined,
    status: alert.status as BudgetAlertDTO["status"],
    createdAt: new Date(alert.createdAt),
  };
}

function calculateCategoryUsage(
  budget: BudgetDTO,
  spendings: SpendingDTO[],
): BudgetStatusDTO["categoryUsage"] {
  const usage: BudgetStatusDTO["categoryUsage"] = {};
  const categories = Object.keys(budget.categoryBudgets ?? {});

  for (const category of categories) {
    const categoryBudget =
      budget.categoryBudgets?.[
        category as keyof NonNullable<BudgetDTO["categoryBudgets"]>
      ] ?? 0;
    const categorySpent = spendings
      .filter((s) => s.category === category)
      .reduce((sum, row) => sum + row.amount, 0);
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
