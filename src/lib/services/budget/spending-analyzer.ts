import { PrismaClient } from '@prisma/client';
import { Budget, Spending, FoodCategory, BudgetAlert, AlertType, AlertStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface SpendingAnalysis {
  memberId: string
  period: {
    start: Date
    end: Date
    type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  }
  totalSpending: number
  categorySpending: {
    category: FoodCategory
    amount: number
    percentage: number
    trend: 'UP' | 'DOWN' | 'STABLE'
  }[]
  dailyAverage: number
  comparisonWithPrevious: {
    period: string
    spending: number
    change: number
    changePercentage: number
  }[]
  topExpenses: Array<{
    description: string
    amount: number
    category: FoodCategory
    date: Date
  }>
  budgetUtilization: {
    budgetId: string
    budgetName: string
    totalBudget: number
    used: number
    remaining: number
    utilizationRate: number
    status: 'HEALTHY' | 'WARNING' | 'OVER_BUDGET'
  }[]
  recommendations: string[]
}

export interface BudgetAlertConfig {
  memberId: string
  budgetId: string
  thresholds: {
    warning80: boolean
    warning100: boolean
    overBudget110: boolean
    categoryOver: boolean
    dailyExcess: boolean
  }
  dailyLimit?: number
  categoryLimits?: {
    [key in FoodCategory]?: number
  }
}

export class SpendingAnalyzer {
  /**
   * 分析用户支出情况
   */
  async analyzeSpending(memberId: string, periodType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY'): Promise<SpendingAnalysis> {
    const period = this.getPeriod(periodType);
    
    // 获取支出数据
    const spendings = await this.getSpendings(memberId, period.start, period.end);
    
    // 计算总支出
    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);
    
    // 分类支出统计
    const categorySpending = await this.analyzeCategorySpending(spendings);
    
    // 日均支出
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalSpending / days;
    
    // 与上期对比
    const comparisonWithPrevious = await this.getPreviousPeriodComparison(memberId, periodType);
    
    // 最大支出项目
    const topExpenses = spendings
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(s => ({
        description: s.description,
        amount: s.amount,
        category: s.category,
        date: s.purchaseDate,
      }));
    
    // 预算使用情况
    const budgetUtilization = await this.getBudgetUtilization(memberId, period);
    
    // 生成建议
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

  /**
   * 生成预算预警
   */
  async generateBudgetAlerts(memberId: string): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    
    // 获取活跃预算
    const activeBudgets = await prisma.budget.findMany({
      where: {
        memberId,
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
        },
      },
      include: {
        spendings: true,
      },
    });

    for (const budget of activeBudgets) {
      // 计算当前使用情况
      const usedAmount = budget.spendings.reduce((sum, s) => sum + s.amount, 0);
      const utilizationRate = (usedAmount / budget.totalAmount) * 100;

      // 80%预警
      if (budget.alertThreshold80 && utilizationRate >= 80 && utilizationRate < 100) {
        await this.createBudgetAlert(budget, AlertType.WARNING_80, utilizationRate, usedAmount);
      }

      // 100%预警
      if (budget.alertThreshold100 && utilizationRate >= 100 && utilizationRate < 110) {
        await this.createBudgetAlert(budget, AlertType.WARNING_100, utilizationRate, usedAmount);
      }

      // 110%超支预警
      if (budget.alertThreshold110 && utilizationRate >= 110) {
        await this.createBudgetAlert(budget, AlertType.OVER_BUDGET_110, utilizationRate, usedAmount);
      }

      // 分类超支检查
      if (budget.alertThreshold100) {
        await this.checkCategoryOverspending(budget);
      }

      // 日均超标检查
      if (budget.alertThreshold100) {
        await this.checkDailyExcess(budget);
      }
    }

    // 返回活跃预警
    return await prisma.budgetAlert.findMany({
      where: {
        budget: {
          memberId,
        },
        status: AlertStatus.ACTIVE,
      },
      include: {
        budget: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取支出趋势分析
   */
  async getSpendingTrends(memberId: string, months: number = 6): Promise<{
    monthlyData: Array<{
      month: string
      spending: number
      budget: number
      utilization: number
    }>
    categoryTrends: {
      [key in FoodCategory]?: Array<{
        month: string
        amount: number
      }>
    }
    overallTrend: 'INCREASING' | 'DECREASING' | 'STABLE'
    trendSlope: number
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months + 1, 1);

    const spendings = await prisma.spending.findMany({
      where: {
        budget: {
          memberId,
        },
        purchaseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        budget: true,
      },
      orderBy: { purchaseDate: 'asc' },
    });

    // 按月分组
    const monthlyData: { [key: string]: { spending: number; budget: number } } = {};
    const categoryTrends: { [key: string]: { [key: string]: number } } = {};

    for (let i = 0; i < months; i++) {
      const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const monthKey = monthDate.toISOString().slice(0, 7);
      monthlyData[monthKey] = { spending: 0, budget: 0 };
    }

    // 统计每月支出
    for (const spending of spendings) {
      const monthKey = spending.purchaseDate.toISOString().slice(0, 7);
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].spending += spending.amount;
        monthlyData[monthKey].budget = spending.budget.totalAmount;
      }

      // 分类趋势
      if (!categoryTrends[spending.category]) {
        categoryTrends[spending.category] = {};
      }
      if (!categoryTrends[spending.category][monthKey]) {
        categoryTrends[spending.category][monthKey] = 0;
      }
      categoryTrends[spending.category][monthKey] += spending.amount;
    }

    // 格式化月度数据
    const formattedMonthlyData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        spending: data.spending,
        budget: data.budget,
        utilization: data.budget > 0 ? (data.spending / data.budget) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // 计算总体趋势
    const spendingValues = formattedMonthlyData.map(d => d.spending);
    const trendSlope = this.calculateTrendSlope(spendingValues);
    
    let overallTrend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (trendSlope > 50) {
      overallTrend = 'INCREASING';
    } else if (trendSlope < -50) {
      overallTrend = 'DECREASING';
    }

    return {
      monthlyData: formattedMonthlyData,
      categoryTrends: categoryTrends as any,
      overallTrend,
      trendSlope,
    };
  }

  /**
   * 获取高支出品类分析
   */
  async getHighSpendingCategories(memberId: string, limit: number = 5): Promise<{
    categories: Array<{
      category: FoodCategory
      totalSpending: number
      averagePerTransaction: number
      transactionCount: number
      percentageOfTotal: number
      trend: 'UP' | 'DOWN' | 'STABLE'
      recommendations: string[]
    }>
    totalSpending: number
  }> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const spendings = await prisma.spending.findMany({
      where: {
        budget: {
          memberId,
        },
        purchaseDate: {
          gte: last30Days,
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);
    
    // 按类别分组
    const categoryData: { [key in FoodCategory]?: {
      total: number
      count: number
      transactions: number[]
    } } = {};

    spendings.forEach(spending => {
      if (!categoryData[spending.category]) {
        categoryData[spending.category] = { total: 0, count: 0, transactions: [] };
      }
      categoryData[spending.category]!.total += spending.amount;
      categoryData[spending.category]!.count += 1;
      categoryData[spending.category]!.transactions.push(spending.amount);
    });

    // 格式化并排序
    const categories = Object.entries(categoryData)
      .map(([category, data]) => ({
        category: category as FoodCategory,
        totalSpending: data.total,
        averagePerTransaction: data.total / data.count,
        transactionCount: data.count,
        percentageOfTotal: (data.total / totalSpending) * 100,
        trend: this.calculateCategoryTrend(data.transactions),
        recommendations: this.generateCategoryRecommendations(category as FoodCategory, data),
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, limit);

    return { categories, totalSpending };
  }

  /**
   * 计算人均饮食成本
   */
  async getPerPersonCost(memberId: string): Promise<{
    dailyCost: number
    weeklyCost: number
    monthlyCost: number
    yearlyCost: number
    familySize: number
    comparison: {
      nationalAverage: number
      cityAverage: number
      percentile: number
    }
  }> {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        family: true,
      },
    });

    if (!member) {
      throw new Error('用户不存在');
    }

    const familySize = member.family.members.length;
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const spendings = await prisma.spending.findMany({
      where: {
        budget: {
          memberId,
        },
        purchaseDate: {
          gte: last30Days,
        },
      },
    });

    const monthlySpending = spendings.reduce((sum, s) => sum + s.amount, 0);
    const dailyCost = monthlySpending / 30;
    const weeklyCost = dailyCost * 7;
    const monthlyCost = monthlySpending;
    const yearlyCost = monthlyCost * 12;

    // 模拟对比数据（实际应用中从统计数据获取）
    const comparison = {
      nationalAverage: 50, // 全国人均日消费
      cityAverage: 60, // 城市人均日消费
      percentile: this.calculatePercentile(dailyCost, 30, 100), // 在30-100元范围内的百分位
    };

    return {
      dailyCost,
      weeklyCost,
      monthlyCost,
      yearlyCost,
      familySize,
      comparison,
    };
  }

  /**
   * 获取支出数据
   */
  private async getSpendings(memberId: string, startDate: Date, endDate: Date) {
    return await prisma.spending.findMany({
      where: {
        budget: {
          memberId,
        },
        purchaseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  /**
   * 分析分类支出
   */
  private async analyzeCategorySpending(spendings: Spending[]) {
    const categoryData: { [key in FoodCategory]?: number } = {};
    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);

    spendings.forEach(spending => {
      if (!categoryData[spending.category]) {
        categoryData[spending.category] = 0;
      }
      categoryData[spending.category]! += spending.amount;
    });

    return Object.entries(categoryData).map(([category, amount]) => ({
      category: category as FoodCategory,
      amount,
      percentage: (amount / totalSpending) * 100,
      trend: 'STABLE' as const, // 简化处理，实际应该与历史数据比较
    }));
  }

  /**
   * 获取上期对比
   */
  private async getPreviousPeriodComparison(memberId: string, periodType: string) {
    const currentPeriod = this.getPeriod(periodType as any);
    const previousPeriod = this.getPreviousPeriod(currentPeriod, periodType as any);

    const currentSpendings = await this.getSpendings(memberId, currentPeriod.start, currentPeriod.end);
    const previousSpendings = await this.getSpendings(memberId, previousPeriod.start, previousPeriod.end);

    const currentTotal = currentSpendings.reduce((sum, s) => sum + s.amount, 0);
    const previousTotal = previousSpendings.reduce((sum, s) => sum + s.amount, 0);

    const change = currentTotal - previousTotal;
    const changePercentage = previousTotal > 0 ? (change / previousTotal) * 100 : 0;

    return [{
      period: previousPeriod.start.toISOString().slice(0, 7),
      spending: previousTotal,
      change,
      changePercentage,
    }];
  }

  /**
   * 获取预算使用情况
   */
  private async getBudgetUtilization(memberId: string, period: { start: Date; end: Date }) {
    const budgets = await prisma.budget.findMany({
      where: {
        memberId,
        status: 'ACTIVE',
        startDate: { lte: period.end },
        endDate: { gte: period.start },
      },
      include: {
        spendings: {
          where: {
            purchaseDate: {
              gte: period.start,
              lte: period.end,
            },
          },
        },
      },
    });

    return budgets.map(budget => {
      const used = budget.spendings.reduce((sum, s) => sum + s.amount, 0);
      const utilizationRate = (used / budget.totalAmount) * 100;

      let status: 'HEALTHY' | 'WARNING' | 'OVER_BUDGET' = 'HEALTHY';
      if (utilizationRate >= 100) {
        status = 'OVER_BUDGET';
      } else if (utilizationRate >= 80) {
        status = 'WARNING';
      }

      return {
        budgetId: budget.id,
        budgetName: budget.name,
        totalBudget: budget.totalAmount,
        used,
        remaining: budget.totalAmount - used,
        utilizationRate,
        status,
      };
    });
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    totalSpending: number,
    categorySpending: any[],
    dailyAverage: number,
    budgetUtilization: any[]
  ): string[] {
    const recommendations: string[] = [];

    // 基于总支出的建议
    if (dailyAverage > 100) {
      recommendations.push('日均支出较高，建议控制非必要采购');
    } else if (dailyAverage < 30) {
      recommendations.push('日均支出较低，注意营养均衡');
    }

    // 基于分类支出的建议
    const highCategory = categorySpending.find(c => c.percentage > 40);
    if (highCategory) {
      recommendations.push(`${highCategory.category}类支出占比过高，建议优化采购结构`);
    }

    // 基于预算使用的建议
    const overBudget = budgetUtilization.find(b => b.status === 'OVER_BUDGET');
    if (overBudget) {
      recommendations.push(`${overBudget.budgetName}已超支，建议严格控制后续支出`);
    }

    return recommendations;
  }

  /**
   * 创建预算预警
   */
  private async createBudgetAlert(
    budget: Budget,
    type: AlertType,
    currentValue: number,
    usedAmount: number
  ): Promise<BudgetAlert> {
    // 检查是否已存在相同类型的活跃预警
    const existingAlert = await prisma.budgetAlert.findFirst({
      where: {
        budgetId: budget.id,
        type,
        status: AlertStatus.ACTIVE,
      },
    });

    if (existingAlert) {
      return existingAlert;
    }

    const threshold = this.getThresholdValue(type);
    const message = this.generateAlertMessage(budget.name, type, currentValue, usedAmount);

    return await prisma.budgetAlert.create({
      data: {
        budgetId: budget.id,
        type,
        threshold,
        currentValue,
        message,
        status: AlertStatus.ACTIVE,
      },
    });
  }

  /**
   * 检查分类超支
   */
  private async checkCategoryOverspending(budget: Budget): Promise<void> {
    // 获取分类预算限制（如果有的话）
    const categoryLimits = {
      vegetableBudget: budget.vegetableBudget,
      meatBudget: budget.meatBudget,
      fruitBudget: budget.fruitBudget,
      grainBudget: budget.grainBudget,
      dairyBudget: budget.dairyBudget,
      otherBudget: budget.otherBudget,
    };

    for (const [categoryField, limit] of Object.entries(categoryLimits)) {
      if (!limit) continue;

      const category = this.mapBudgetFieldToCategory(categoryField);
      if (!category) continue;

      const categorySpending = budget.spendings
        .filter(s => s.category === category)
        .reduce((sum, s) => sum + s.amount, 0);

      const utilizationRate = (categorySpending / limit) * 100;

      if (utilizationRate >= 100) {
        await prisma.budgetAlert.create({
          data: {
            budgetId: budget.id,
            type: AlertType.CATEGORY_OVER,
            threshold: 100,
            currentValue: utilizationRate,
            message: `${category}类支出已超支，当前使用率${utilizationRate.toFixed(1)}%`,
            status: AlertStatus.ACTIVE,
          },
        });
      }
    }
  }

  /**
   * 检查日均超标
   */
  private async checkDailyExcess(budget: Budget): Promise<void> {
    const daysRemaining = Math.ceil(
      (budget.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining <= 0) return;

    const usedAmount = budget.spendings.reduce((sum, s) => sum + s.amount, 0);
    const remainingBudget = budget.totalAmount - usedAmount;
    const dailyLimit = remainingBudget / daysRemaining;

    // 计算最近7天的日均支出
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSpending = budget.spendings
      .filter(s => s.purchaseDate >= last7Days)
      .reduce((sum, s) => sum + s.amount, 0);
    
    const recentDailyAverage = recentSpending / 7;

    if (recentDailyAverage > dailyLimit * 1.5) {
      await prisma.budgetAlert.create({
        data: {
          budgetId: budget.id,
          type: AlertType.DAILY_EXCESS,
          threshold: dailyLimit,
          currentValue: recentDailyAverage,
          message: `最近7天日均支出${recentDailyAverage.toFixed(2)}元，超过建议日均限额${dailyLimit.toFixed(2)}元`,
          status: AlertStatus.ACTIVE,
        },
      });
    }
  }

  /**
   * 辅助方法
   */
  private getPeriod(type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY') {
    const now = new Date();
    const start = new Date();

    switch (type) {
    case 'WEEKLY':
      start.setDate(now.getDate() - 7);
      break;
    case 'MONTHLY':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'QUARTERLY':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'YEARLY':
      start.setFullYear(now.getFullYear() - 1);
      break;
    }

    return { start, end: now, type };
  }

  private getPreviousPeriod(current: any, type: string) {
    const start = new Date(current.start);
    const end = new Date(current.end);

    switch (type) {
    case 'WEEKLY':
      start.setDate(start.getDate() - 7);
      end.setDate(end.getDate() - 7);
      break;
    case 'MONTHLY':
      start.setMonth(start.getMonth() - 1);
      end.setMonth(end.getMonth() - 1);
      break;
    case 'QUARTERLY':
      start.setMonth(start.getMonth() - 3);
      end.setMonth(end.getMonth() - 3);
      break;
    case 'YEARLY':
      start.setFullYear(start.getFullYear() - 1);
      end.setFullYear(end.getFullYear() - 1);
      break;
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
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateCategoryTrend(transactions: number[]): 'UP' | 'DOWN' | 'STABLE' {
    if (transactions.length < 3) return 'STABLE';

    const recent = transactions.slice(-3);
    const earlier = transactions.slice(0, -3);

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? earlier.reduce((sum, val) => sum + val, 0) / earlier.length : recentAvg;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'UP';
    if (change < -0.1) return 'DOWN';
    return 'STABLE';
  }

  private generateCategoryRecommendations(category: FoodCategory, data: any): string[] {
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

  private getThresholdValue(type: AlertType): number {
    switch (type) {
    case AlertType.WARNING_80: return 80;
    case AlertType.WARNING_100: return 100;
    case AlertType.OVER_BUDGET_110: return 110;
    case AlertType.CATEGORY_OVER: return 100;
    case AlertType.DAILY_EXCESS: return 150;
    default: return 100;
    }
  }

  private generateAlertMessage(budgetName: string, type: AlertType, currentValue: number, usedAmount: number): string {
    switch (type) {
    case AlertType.WARNING_80:
      return `${budgetName}已使用${currentValue.toFixed(1)}%，请注意控制支出`;
    case AlertType.WARNING_100:
      return `${budgetName}已用完预算，当前支出${usedAmount.toFixed(2)}元`;
    case AlertType.OVER_BUDGET_110:
      return `${budgetName}已超支${(currentValue - 100).toFixed(1)}%，请立即控制支出`;
    default:
      return `${budgetName}支出异常`;
    }
  }

  private mapBudgetFieldToCategory(field: string): FoodCategory | null {
    const mapping: { [key: string]: FoodCategory } = {
      'vegetableBudget': 'VEGETABLES',
      'meatBudget': 'PROTEIN',
      'fruitBudget': 'FRUITS',
      'grainBudget': 'GRAINS',
      'dairyBudget': 'DAIRY',
      'otherBudget': 'OTHER',
    };
    return mapping[field] || null;
  }
}

export const spendingAnalyzer = new SpendingAnalyzer();
