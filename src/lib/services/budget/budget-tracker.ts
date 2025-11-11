import type { BudgetRepository } from '@/lib/repositories/interfaces/budget-repository';
import type {
  BudgetDTO,
  BudgetPeriod,
  BudgetStatus,
  BudgetCreateDTO,
  BudgetUpdateDTO,
  SpendingDTO,
  SpendingCreateDTO,
  FoodCategory,
  CategoryBudgets,
} from '@/lib/repositories/types/budget';
import type { BudgetNotificationService } from './budget-notification-service';

// Type aliases for backward compatibility
type Budget = BudgetDTO;
type Spending = SpendingDTO;

export interface BudgetCreateInput {
  memberId: string
  name: string
  period: BudgetPeriod
  startDate: Date
  endDate: Date
  totalAmount: number
  vegetableBudget?: number
  meatBudget?: number
  fruitBudget?: number
  grainBudget?: number
  dairyBudget?: number
  seafoodBudget?: number
  oilsBudget?: number
  snacksBudget?: number
  beveragesBudget?: number
  otherBudget?: number
  alertThreshold80?: boolean
  alertThreshold100?: boolean
  alertThreshold110?: boolean
}

export interface BudgetUpdateInput {
  name?: string
  totalAmount?: number
  vegetableBudget?: number
  meatBudget?: number
  fruitBudget?: number
  grainBudget?: number
  dairyBudget?: number
  seafoodBudget?: number
  oilsBudget?: number
  snacksBudget?: number
  beveragesBudget?: number
  otherBudget?: number
  alertThreshold80?: boolean
  alertThreshold100?: boolean
  alertThreshold110?: boolean
}

export interface SpendingCreateInput {
  budgetId: string
  amount: number
  category: FoodCategory
  description: string
  transactionId?: string
  platform?: string
  items?: any[]
  purchaseDate?: Date
}

export interface BudgetStatusResult {
  budget: Budget
  usedAmount: number
  remainingAmount: number
  usagePercentage: number
  categoryUsage: {
    [key in FoodCategory]?: {
      budget: number
      used: number
      remaining: number
      percentage: number
    }
  }
  dailyAverage: number
  daysRemaining: number
  projectedSpend: number
  alerts: string[]
}

export class BudgetTracker {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetNotificationService: BudgetNotificationService
  ) {}

  /**
   * 创建新预算
   */
  async createBudget(data: BudgetCreateInput): Promise<Budget> {
    // 验证日期范围
    if (data.endDate <= data.startDate) {
      throw new Error('结束日期必须晚于开始日期');
    }

    // 验证分类预算总和不超过总预算
    const categoryTotal =
      (data.vegetableBudget || 0) +
      (data.meatBudget || 0) +
      (data.fruitBudget || 0) +
      (data.grainBudget || 0) +
      (data.dairyBudget || 0) +
      (data.seafoodBudget || 0) +
      (data.oilsBudget || 0) +
      (data.snacksBudget || 0) +
      (data.beveragesBudget || 0) +
      (data.otherBudget || 0);

    if (categoryTotal > data.totalAmount) {
      throw new Error('分类预算总和不能超过总预算');
    }

    const payload: BudgetCreateDTO = {
      memberId: data.memberId,
      name: data.name,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      totalAmount: data.totalAmount,
      categoryBudgets: this.buildCategoryBudgets(data),
      alertThreshold80: data.alertThreshold80 ?? true,
      alertThreshold100: data.alertThreshold100 ?? true,
      alertThreshold110: data.alertThreshold110 ?? true,
    };

    return this.budgetRepository.createBudget(payload);
  }

  /**
   * 更新预算
   */
  async updateBudget(id: string, data: BudgetUpdateInput): Promise<Budget> {
    // 获取当前预算
    const currentBudget = await this.budgetRepository.getBudgetById(id);

    if (!currentBudget) {
      throw new Error('预算不存在');
    }

    // 如果更新了总预算或分类预算，需要验证
    if (data.totalAmount ||
        data.vegetableBudget !== undefined ||
        data.meatBudget !== undefined ||
        data.fruitBudget !== undefined ||
        data.grainBudget !== undefined ||
        data.dairyBudget !== undefined ||
        data.seafoodBudget !== undefined ||
        data.oilsBudget !== undefined ||
        data.snacksBudget !== undefined ||
        data.beveragesBudget !== undefined ||
        data.otherBudget !== undefined) {

      const newTotalAmount = data.totalAmount || currentBudget.totalAmount;
      const categoryTotal =
        (data.vegetableBudget ?? currentBudget.categoryBudgets?.VEGETABLES ?? 0) +
        (data.meatBudget ?? currentBudget.categoryBudgets?.PROTEIN ?? 0) +
        (data.fruitBudget ?? currentBudget.categoryBudgets?.FRUITS ?? 0) +
        (data.grainBudget ?? currentBudget.categoryBudgets?.GRAINS ?? 0) +
        (data.dairyBudget ?? currentBudget.categoryBudgets?.DAIRY ?? 0) +
        (data.seafoodBudget ?? currentBudget.categoryBudgets?.SEAFOOD ?? 0) +
        (data.oilsBudget ?? currentBudget.categoryBudgets?.OILS ?? 0) +
        (data.snacksBudget ?? currentBudget.categoryBudgets?.SNACKS ?? 0) +
        (data.beveragesBudget ?? currentBudget.categoryBudgets?.BEVERAGES ?? 0) +
        (data.otherBudget ?? currentBudget.categoryBudgets?.OTHER ?? 0);

      if (categoryTotal > newTotalAmount) {
        throw new Error('分类预算总和不能超过总预算');
      }
    }

    const payload: BudgetUpdateDTO = {
      name: data.name,
      totalAmount: data.totalAmount,
      categoryBudgets: this.mergeCategoryBudgets(currentBudget, data),
      alertThreshold80: data.alertThreshold80,
      alertThreshold100: data.alertThreshold100,
      alertThreshold110: data.alertThreshold110,
    };

    return this.budgetRepository.updateBudget(id, payload);
  }

  /**
   * 记录支出
   */
  async recordSpending(data: SpendingCreateInput): Promise<Spending> {
    // 获取预算信息
    const budget = await this.budgetRepository.getBudgetById(data.budgetId);

    if (!budget) {
      throw new Error('预算不存在');
    }

    if (budget.status !== 'ACTIVE') {
      throw new Error('预算未激活，无法记录支出');
    }

    // 检查日期是否在预算期间内
    const purchaseDate = data.purchaseDate || new Date();
    if (purchaseDate < budget.startDate || purchaseDate > budget.endDate) {
      throw new Error('支出日期不在预算期间内');
    }

    // 创建支出记录
    const payload: SpendingCreateDTO = {
      budgetId: data.budgetId,
      amount: data.amount,
      category: data.category,
      description: data.description,
      transactionId: data.transactionId,
      platform: data.platform,
      items: data.items,
      purchaseDate,
    };

    const spending = await this.budgetRepository.recordSpending(payload);

    // 更新预算使用情况
    await this.updateBudgetUsage(data.budgetId);

    // 检查是否需要触发预警
    await this.checkBudgetAlerts(data.budgetId);

    return spending;
  }

  /**
   * 更新预算使用情况
   */
  private async updateBudgetUsage(budgetId: string): Promise<void> {
    // Repository已经处理了聚合计算，这里只需要触发更新
    const usage = await this.budgetRepository.aggregateBudgetUsage(budgetId);

    // 更新预算的计算字段（Repository会自动处理）
    await this.budgetRepository.updateBudget(budgetId, {
      totalAmount: usage.usedAmount + usage.remainingAmount,
    });
  }

  /**
   * 检查预算预警
   */
  private async checkBudgetAlerts(budgetId: string): Promise<void> {
    const budget = await this.budgetRepository.getBudgetById(budgetId);

    if (!budget) return;

    // 检查80%预警
    if (budget.alertThreshold80 && budget.usagePercentage >= 80 && budget.usagePercentage < 100) {
      // 发送80%预算预警通知
      await this.budgetNotificationService.sendBudgetAlert(budget.memberId, {
        budgetName: budget.name,
        usagePercentage: budget.usagePercentage,
        threshold: 80,
        remainingBudget: budget.remainingAmount,
        totalBudget: budget.totalAmount,
      });
    }

    // 检查100%预警
    if (budget.alertThreshold100 && budget.usagePercentage >= 100 && budget.usagePercentage < 110) {
      // 发送100%预算预警通知
      await this.budgetNotificationService.sendBudgetAlert(budget.memberId, {
        budgetName: budget.name,
        usagePercentage: budget.usagePercentage,
        threshold: 100,
        remainingBudget: budget.remainingAmount,
        totalBudget: budget.totalAmount,
      });
    }

    // 检查110%超支预警
    if (budget.alertThreshold110 && budget.usagePercentage >= 110) {
      // 发送预算超支通知
      await this.budgetNotificationService.sendBudgetOverspend(budget.memberId, {
        budgetName: budget.name,
        overspendAmount: budget.usedAmount - budget.totalAmount,
        totalSpent: budget.usedAmount,
        budgetLimit: budget.totalAmount,
      });
    }

    // 检查分类预算预警
    await this.checkCategoryAlerts(budgetId, budget);

    // 检查日均超标预警
    await this.checkDailyAverageAlert(budget);
  }

  /**
   * 检查分类预算预警
   */
  private async checkCategoryAlerts(budgetId: string, budget?: Budget): Promise<void> {
    const budgetSnapshot = budget ?? await this.budgetRepository.getBudgetById(budgetId);

    if (!budgetSnapshot) return;

    const categories: Array<{ key: keyof CategoryBudgets; name: string; category: FoodCategory }> = [
      { key: 'VEGETABLES', name: '蔬菜', category: 'VEGETABLES' },
      { key: 'PROTEIN', name: '肉类', category: 'PROTEIN' },
      { key: 'FRUITS', name: '水果', category: 'FRUITS' },
      { key: 'GRAINS', name: '谷物', category: 'GRAINS' },
      { key: 'DAIRY', name: '乳制品', category: 'DAIRY' },
      { key: 'SEAFOOD', name: '海鲜', category: 'SEAFOOD' },
      { key: 'OILS', name: '油脂', category: 'OILS' },
      { key: 'SNACKS', name: '零食', category: 'SNACKS' },
      { key: 'BEVERAGES', name: '饮料', category: 'BEVERAGES' },
      { key: 'OTHER', name: '其他', category: 'OTHER' },
    ];

    for (const { key, name: categoryName, category } of categories) {
      const categoryBudget = budgetSnapshot.categoryBudgets?.[key];
      if (!categoryBudget) continue;

      // 查询分类支出
      const categorySpendings = await this.budgetRepository.listSpendings({
        budgetId,
        category,
      });

      const usedAmount = categorySpendings.items.reduce((sum, spending) => sum + spending.amount, 0);
      const usagePercentage = (usedAmount / categoryBudget) * 100;

      if (usagePercentage >= 100) {
        await this.budgetRepository.createBudgetAlert({
          id: '', // Repository will generate
          budgetId,
          type: 'CATEGORY_BUDGET_ALERT',
          threshold: 100,
          currentValue: usagePercentage,
          message: `${categoryName}分类预算已超支！当前使用${usagePercentage.toFixed(1)}%`,
          category: category,
          status: 'ACTIVE',
          createdAt: new Date(),
        });

        // 发送分类预算预警通知
        await this.budgetNotificationService.sendCategoryBudgetAlert(budgetSnapshot.memberId, {
          budgetName: budgetSnapshot.name,
          category: categoryName,
          spent: usedAmount,
          budget: categoryBudget,
          percentage: usagePercentage,
        });
      }
    }
  }

  /**
   * 检查日均超标预警
   */
  private async checkDailyAverageAlert(budget: Budget): Promise<void> {
    const now = new Date();
    const daysElapsed = Math.ceil((now.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysElapsed <= 0) return;

    const totalDays = Math.ceil((budget.endDate.getTime() - budget.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyBudget = budget.totalAmount / totalDays;
    const currentDailyAverage = budget.usedAmount / daysElapsed;

    if (currentDailyAverage > dailyBudget * 1.2) { // 超过日均预算20%
      await this.budgetRepository.createBudgetAlert({
        id: '', // Repository will generate
        budgetId: budget.id,
        type: 'DAILY_EXCESS',
        threshold: dailyBudget * 1.2,
        currentValue: currentDailyAverage,
        message: `当前日均支出${currentDailyAverage.toFixed(2)}元超过预算${dailyBudget.toFixed(2)}元`,
        status: 'ACTIVE',
        createdAt: new Date(),
      });
    }
  }

  /**
   * 获取预算状态
   */
  async getBudgetStatus(budgetId: string): Promise<BudgetStatusResult> {
    const status = await this.budgetRepository.getBudgetStatus(budgetId);

    return {
      budget: status.budget,
      usedAmount: status.budget.usedAmount,
      remainingAmount: status.budget.remainingAmount,
      usagePercentage: status.budget.usagePercentage,
      categoryUsage: status.categoryUsage,
      dailyAverage: status.dailyAverage,
      daysRemaining: status.daysRemaining,
      projectedSpend: status.projectedSpend,
      alerts: status.alerts.map(alert => alert.message),
    };
  }

  /**
   * 获取用户的所有预算
   */
  async getUserBudgets(memberId: string, status?: BudgetStatus): Promise<Budget[]> {
    const result = await this.budgetRepository.listBudgets(
      memberId,
      status ? { status } : undefined
    );
    return result.items;
  }

  /**
   * 删除预算
   */
  async deleteBudget(id: string): Promise<void> {
    await this.budgetRepository.softDeleteBudget(id);
  }

  /**
   * 获取支出历史
   */
  async getSpendingHistory(budgetId: string, category?: FoodCategory): Promise<Spending[]> {
    const result = await this.budgetRepository.listSpendings({
      budgetId,
      category,
    });

    return result.items;
  }

  /**
   * 辅助方法：从Input构建CategoryBudgets
   */
  private buildCategoryBudgets(data: BudgetCreateInput | BudgetUpdateInput): CategoryBudgets {
    return {
      VEGETABLES: data.vegetableBudget ?? 0,
      FRUITS: data.fruitBudget ?? 0,
      GRAINS: data.grainBudget ?? 0,
      PROTEIN: data.meatBudget ?? 0,
      SEAFOOD: data.seafoodBudget ?? 0,
      DAIRY: data.dairyBudget ?? 0,
      OILS: data.oilsBudget ?? 0,
      SNACKS: data.snacksBudget ?? 0,
      BEVERAGES: data.beveragesBudget ?? 0,
      OTHER: data.otherBudget ?? 0,
    };
  }

  /**
   * 辅助方法：合并现有和新的CategoryBudgets
   */
  private mergeCategoryBudgets(currentBudget: Budget, updateData: BudgetUpdateInput): CategoryBudgets {
    return {
      VEGETABLES: updateData.vegetableBudget ?? currentBudget.categoryBudgets?.VEGETABLES ?? 0,
      FRUITS: updateData.fruitBudget ?? currentBudget.categoryBudgets?.FRUITS ?? 0,
      GRAINS: updateData.grainBudget ?? currentBudget.categoryBudgets?.GRAINS ?? 0,
      PROTEIN: updateData.meatBudget ?? currentBudget.categoryBudgets?.PROTEIN ?? 0,
      SEAFOOD: updateData.seafoodBudget ?? currentBudget.categoryBudgets?.SEAFOOD ?? 0,
      DAIRY: updateData.dairyBudget ?? currentBudget.categoryBudgets?.DAIRY ?? 0,
      OILS: updateData.oilsBudget ?? currentBudget.categoryBudgets?.OILS ?? 0,
      SNACKS: updateData.snacksBudget ?? currentBudget.categoryBudgets?.SNACKS ?? 0,
      BEVERAGES: updateData.beveragesBudget ?? currentBudget.categoryBudgets?.BEVERAGES ?? 0,
      OTHER: updateData.otherBudget ?? currentBudget.categoryBudgets?.OTHER ?? 0,
    };
  }
}

// Note: Singleton instance is now created via ServiceContainer
// Do not export a global instance here
