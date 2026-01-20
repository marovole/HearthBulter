import { api } from "../../convex-client";
import { convexClient } from "../../convex-client";
import { asConvexMutationReference } from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface SpendingDoc {
  _id: Id<"spendings">;
  amount: number;
  category: string;
  description?: string;
  purchaseDate: number;
}

interface BudgetDoc {
  _id: Id<"budgets">;
  name: string;
  totalAmount: number;
  usedAmount?: number;
  alertThreshold80?: boolean;
  alertThreshold100?: boolean;
  alertThreshold110?: boolean;
  startDate: number;
  endDate: number;
}

interface SpendingForBudgetDoc {
  _id: Id<"spendings">;
  amount: number;
}

export interface SpendingAnalysis {
  memberId: string;
  period: {
    start: number;
    end: number;
    type: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  };
  totalSpending: number;
  categorySpending: Array<{
    category: string;
    amount: number;
    percentage: number;
    trend: "UP" | "DOWN" | "STABLE";
  }>;
  dailyAverage: number;
  comparisonWithPrevious: Array<{
    period: string;
    spending: number;
    change: number;
    changePercentage: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    category: string;
    date: number;
  }>;
  budgetUtilization: Array<{
    budgetId: string;
    budgetName: string;
    totalBudget: number;
    used: number;
    remaining: number;
    utilizationRate: number;
    status: "HEALTHY" | "WARNING" | "OVER_BUDGET";
  }>;
  recommendations: string[];
}

export interface BudgetAlertConfig {
  memberId: string;
  budgetId: string;
  thresholds: {
    warning80: boolean;
    warning100: boolean;
    overBudget110: boolean;
    categoryOver: boolean;
    dailyExcess: boolean;
  };
  dailyLimit?: number;
  categoryLimits?: {
    [key: string]: number;
  };
}

export class SpendingAnalyzer {
  async analyzeSpending(
    memberId: string,
    periodType: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" = "MONTHLY"
  ): Promise<SpendingAnalysis> {
    const period = this.getPeriod(periodType);

    const spendings = await this.getSpendings(memberId, period.start, period.end);

    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);

    const categorySpending = await this.analyzeCategorySpending(spendings);

    const days = Math.ceil((period.end - period.start) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalSpending / days;

    const comparisonWithPrevious = await this.getPreviousPeriodComparison(memberId, periodType);

    const topExpenses = spendings
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((s) => ({
        description: s.description ?? "",
        amount: s.amount,
        category: s.category,
        date: s.purchaseDate,
      }));

    const budgetUtilization = await this.getBudgetUtilization(memberId, period);

    const recommendations = this.generateRecommendations(
      totalSpending,
      categorySpending,
      dailyAverage,
      budgetUtilization
    );

    return {
      memberId,
      period,
      totalSpending,
      categorySpending,
      dailyAverage,
      comparisonWithPrevious,
      topExpenses,
      budgetUtilization,
      recommendations,
    };
  }

  async generateBudgetAlerts(memberId: string): Promise<
    Array<{
      _id: string;
      budgetId: string;
      type: string;
      threshold: number;
      currentValue: number;
      message: string;
      status: string;
      createdAt: number;
    }>
  > {
    const alerts: Array<{
      _id: string;
      budgetId: string;
      type: string;
      threshold: number;
      currentValue: number;
      message: string;
      status: string;
      createdAt: number;
    }> = [];

    const activeBudgets = await convexClient.query<BudgetDoc[]>(api.budget.getActiveBudgets, {
      memberId,
    });

    for (const budget of activeBudgets) {
      const budgetId = budget._id;
      const spendings = await convexClient.query<SpendingForBudgetDoc[]>(api.budget.getSpendings, {
        budgetId,
      });

      const usedAmount = spendings.reduce((sum: number, s) => sum + s.amount, 0);
      const utilizationRate = (usedAmount / budget.totalAmount) * 100;

      if (budget.alertThreshold80 && utilizationRate >= 80 && utilizationRate < 100) {
        await this.createBudgetAlert(budgetId, "WARNING_80", utilizationRate, usedAmount);
      }

      if (budget.alertThreshold100 && utilizationRate >= 100 && utilizationRate < 110) {
        await this.createBudgetAlert(budgetId, "WARNING_100", utilizationRate, usedAmount);
      }

      if (budget.alertThreshold110 && utilizationRate >= 110) {
        await this.createBudgetAlert(budgetId, "OVER_BUDGET_110", utilizationRate, usedAmount);
      }
    }

    return await convexClient.query(api.budget.getBudgetAlerts, {
      memberId,
      status: "ACTIVE",
    });
  }

  async getSpendingTrends(
    memberId: string,
    months: number = 6
  ): Promise<{
    monthlyData: Array<{
      month: string;
      spending: number;
      budget: number;
      utilization: number;
    }>;
    categoryTrends: {
      [key: string]: Array<{
        month: string;
        amount: number;
      }>;
    };
    overallTrend: "INCREASING" | "DECREASING" | "STABLE";
    trendSlope: number;
  }> {
    const endDate = Date.now();
    const startDate = new Date().setMonth(new Date().getMonth() - months + 1);

    const spendings = await convexClient.query<SpendingDoc[]>(api.budget.getSpendingsByMember, {
      memberId,
      startDate,
      endDate,
    });

    const monthlyData: { [key: string]: { spending: number; budget: number } } = {};
    const categoryTrends: { [key: string]: { [key: string]: number } } = {};

    for (let i = 0; i < months; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthKey = monthDate.toISOString().slice(0, 7);
      monthlyData[monthKey] = { spending: 0, budget: 0 };
    }

    for (const spending of spendings) {
      const monthKey = new Date(spending.purchaseDate).toISOString().slice(0, 7);

      const monthData = monthlyData[monthKey];
      if (monthData) {
        monthData.spending += spending.amount;
      }

      if (!spending.category) continue;
      const categoryKey = spending.category;
      const categoryTrend = categoryTrends[categoryKey] ?? {};
      categoryTrend[monthKey] = (categoryTrend[monthKey] ?? 0) + spending.amount;
      categoryTrends[categoryKey] = categoryTrend;
    }

    const formattedMonthlyData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        spending: data.spending,
        budget: data.budget,
        utilization: data.budget > 0 ? (data.spending / data.budget) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const spendingValues = formattedMonthlyData.map((d) => d.spending);
    const trendSlope = this.calculateTrendSlope(spendingValues);

    let overallTrend: "INCREASING" | "DECREASING" | "STABLE" = "STABLE";
    if (trendSlope > 50) {
      overallTrend = "INCREASING";
    } else if (trendSlope < -50) {
      overallTrend = "DECREASING";
    }

    return {
      monthlyData: formattedMonthlyData,
      categoryTrends: categoryTrends as any,
      overallTrend,
      trendSlope,
    };
  }

  async getHighSpendingCategories(
    memberId: string,
    limit: number = 5
  ): Promise<{
    categories: Array<{
      category: string;
      totalSpending: number;
      averagePerTransaction: number;
      transactionCount: number;
      percentageOfTotal: number;
      trend: "UP" | "DOWN" | "STABLE";
      recommendations: string[];
    }>;
    totalSpending: number;
  }> {
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const spendings = await convexClient.query<SpendingDoc[]>(api.budget.getSpendingsByMember, {
      memberId,
      startDate: last30Days,
      endDate: Date.now(),
    });

    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);

    const categoryData: {
      [key: string]: { total: number; count: number; transactions: number[] };
    } = {};

    for (const spending of spendings) {
      if (!categoryData[spending.category]) {
        categoryData[spending.category] = {
          total: 0,
          count: 0,
          transactions: [],
        };
      }
      categoryData[spending.category]!.total += spending.amount;
      categoryData[spending.category]!.count += 1;
      categoryData[spending.category]!.transactions.push(spending.amount);
    }

    const categories = Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        totalSpending: data.total,
        averagePerTransaction: data.total / data.count,
        transactionCount: data.count,
        percentageOfTotal: (data.total / totalSpending) * 100,
        trend: this.calculateCategoryTrend(data.transactions),
        recommendations: this.generateCategoryRecommendations(category, data),
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, limit);

    return { categories, totalSpending };
  }

  async getPerPersonCost(memberId: string): Promise<{
    dailyCost: number;
    weeklyCost: number;
    monthlyCost: number;
    yearlyCost: number;
    familySize: number;
    comparison: {
      nationalAverage: number;
      cityAverage: number;
      percentile: number;
    };
  }> {
    const last30Days = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const spendings = await convexClient.query<SpendingDoc[]>(api.budget.getSpendingsByMember, {
      memberId,
      startDate: last30Days,
      endDate: Date.now(),
    });

    const monthlySpending = spendings.reduce((sum, s) => sum + s.amount, 0);
    const dailyCost = monthlySpending / 30;
    const weeklyCost = dailyCost * 7;
    const monthlyCost = monthlySpending;
    const yearlyCost = monthlyCost * 12;

    const comparison = {
      nationalAverage: 50,
      cityAverage: 60,
      percentile: this.calculatePercentile(dailyCost, 30, 100),
    };

    return {
      dailyCost,
      weeklyCost,
      monthlyCost,
      yearlyCost,
      familySize: 1,
      comparison,
    };
  }

  private async getSpendings(
    memberId: string,
    startDate: number,
    endDate: number
  ): Promise<SpendingDoc[]> {
    return await convexClient.query<SpendingDoc[]>(api.budget.getSpendingsByMember, {
      memberId,
      startDate,
      endDate,
    });
  }

  private async analyzeCategorySpending(spendings: any[]) {
    const categoryData: { [key: string]: number } = {};
    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);

    for (const spending of spendings) {
      if (!categoryData[spending.category]) {
        categoryData[spending.category] = 0;
      }
      categoryData[spending.category]! += spending.amount;
    }

    return Object.entries(categoryData).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalSpending) * 100,
      trend: "STABLE" as const,
    }));
  }

  private async getPreviousPeriodComparison(memberId: string, periodType: string) {
    const currentPeriod = this.getPeriod(periodType as any);
    const previousPeriod = this.getPreviousPeriod(currentPeriod, periodType as any);

    const currentSpendings = await this.getSpendings(
      memberId,
      currentPeriod.start,
      currentPeriod.end
    );
    const previousSpendings = await this.getSpendings(
      memberId,
      previousPeriod.start,
      previousPeriod.end
    );

    const currentTotal = currentSpendings.reduce((sum, s) => sum + s.amount, 0);
    const previousTotal = previousSpendings.reduce((sum, s) => sum + s.amount, 0);

    const change = currentTotal - previousTotal;
    const changePercentage = previousTotal > 0 ? (change / previousTotal) * 100 : 0;

    return [
      {
        period: new Date(previousPeriod.start).toISOString().slice(0, 7),
        spending: previousTotal,
        change,
        changePercentage,
      },
    ];
  }

  private async getBudgetUtilization(memberId: string, period: { start: number; end: number }) {
    const budgets = await convexClient.query<BudgetDoc[]>(api.budget.getActiveBudgets, {
      memberId,
    });

    return budgets.map((budget) => {
      const used = budget.usedAmount ?? 0;
      const utilizationRate = (used / budget.totalAmount) * 100;

      let status: "HEALTHY" | "WARNING" | "OVER_BUDGET" = "HEALTHY";
      if (utilizationRate >= 100) {
        status = "OVER_BUDGET";
      } else if (utilizationRate >= 80) {
        status = "WARNING";
      }

      return {
        budgetId: budget._id,
        budgetName: budget.name,
        totalBudget: budget.totalAmount,
        used,
        remaining: budget.totalAmount - used,
        utilizationRate,
        status,
      };
    });
  }

  private generateRecommendations(
    totalSpending: number,
    categorySpending: any[],
    dailyAverage: number,
    budgetUtilization: any[]
  ): string[] {
    const recommendations: string[] = [];

    if (dailyAverage > 100) {
      recommendations.push("日均支出较高，建议控制非必要采购");
    } else if (dailyAverage < 30) {
      recommendations.push("日均支出较低，注意营养均衡");
    }

    const highCategory = categorySpending.find((c) => c.percentage > 40);
    if (highCategory) {
      recommendations.push(`${highCategory.category}类支出占比过高，建议优化采购结构`);
    }

    const overBudget = budgetUtilization.find((b) => b.status === "OVER_BUDGET");
    if (overBudget) {
      recommendations.push(`${overBudget.budgetName}已超支，建议严格控制后续支出`);
    }

    return recommendations;
  }

  private async createBudgetAlert(
    budgetId: string,
    type: string,
    currentValue: number,
    usedAmount: number
  ): Promise<void> {
    const threshold = this.getThresholdValue(type as any);
    const message = this.generateAlertMessage("预算", type as any, currentValue, usedAmount);

    await convexClient.mutation(asConvexMutationReference("budget:createBudgetAlert"), {
      budgetId,
      type,
      threshold,
      currentValue,
      message,
    });
  }

  private getThresholdValue(type: string): number {
    switch (type) {
      case "WARNING_80":
        return 80;
      case "WARNING_100":
        return 100;
      case "OVER_BUDGET_110":
        return 110;
      default:
        return 100;
    }
  }

  private generateAlertMessage(
    budgetName: string,
    type: string,
    currentValue: number,
    usedAmount: number
  ): string {
    switch (type) {
      case "WARNING_80":
        return `${budgetName}已使用${currentValue.toFixed(1)}%，请注意控制支出`;
      case "WARNING_100":
        return `${budgetName}已用完预算，当前支出${usedAmount.toFixed(2)}元`;
      case "OVER_BUDGET_110":
        return `${budgetName}已超支${(currentValue - 100).toFixed(1)}%，请立即控制支出`;
      default:
        return `${budgetName}支出异常`;
    }
  }

  private getPeriod(type: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY") {
    const now = Date.now();
    let start = now;

    switch (type) {
      case "WEEKLY":
        start = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "MONTHLY":
        start = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "QUARTERLY":
        start = now - 90 * 24 * 60 * 60 * 1000;
        break;
      case "YEARLY":
        start = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    return { start, end: now, type };
  }

  private getPreviousPeriod(current: any, type: string) {
    const start = current.start;
    const end = current.end;

    switch (type) {
      case "WEEKLY":
        return {
          start: start - 7 * 24 * 60 * 60 * 1000,
          end: end - 7 * 24 * 60 * 60 * 1000,
        };
      case "MONTHLY":
        return {
          start: start - 30 * 24 * 60 * 60 * 1000,
          end: end - 30 * 24 * 60 * 60 * 1000,
        };
      case "QUARTERLY":
        return {
          start: start - 90 * 24 * 60 * 60 * 1000,
          end: end - 90 * 24 * 60 * 60 * 1000,
        };
      case "YEARLY":
        return {
          start: start - 365 * 24 * 60 * 60 * 1000,
          end: end - 365 * 24 * 60 * 60 * 1000,
        };
    }
    return { start, end };
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => {
      const yValue = y[i] ?? 0;
      return sum + val * yValue;
    }, 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateCategoryTrend(transactions: number[]): "UP" | "DOWN" | "STABLE" {
    if (transactions.length < 3) return "STABLE";

    const recent = transactions.slice(-3);
    const earlier = transactions.slice(0, -3);

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg =
      earlier.length > 0 ? earlier.reduce((sum, val) => sum + val, 0) / earlier.length : recentAvg;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return "UP";
    if (change < -0.1) return "DOWN";
    return "STABLE";
  }

  private generateCategoryRecommendations(category: string, data: any): string[] {
    const recommendations: string[] = [];

    if (data.averagePerTransaction > 100) {
      recommendations.push(`${category}类单次消费较高，建议分批采购`);
    }

    if (data.count > 20) {
      recommendations.push(`${category}类采购频繁，可考虑批量采购节省成本`);
    }

    return recommendations;
  }

  private calculatePercentile(value: number, min: number, max: number): number {
    return Math.round(((value - min) / (max - min)) * 100);
  }
}

export const spendingAnalyzer = new SpendingAnalyzer();
