import { PrismaClient } from '@prisma/client';
import { Food, FoodCategory, PriceHistory, Spending } from '@prisma/client';
import { costOptimizer, OptimizationConstraints, OptimizationResult } from './cost-optimizer';
import { savingsRecommender } from './savings-recommender';
import type {
  NutritionInfo,
  MealNutritionTargets,
  AffordableFood,
  CartItem,
  DateRange,
  TrendAnalysis,
  CategorySpendingData,
  MealRecipe,
} from '@/types/service-types';

const prisma = new PrismaClient();

export interface EconomicModeConfig {
  enabled: boolean
  dailyBudgetLimit?: number
  weeklyBudgetLimit?: number
  monthlyBudgetLimit?: number
  preferredCategories?: FoodCategory[]
  excludedFoodIds?: string[]
  minSavingsTarget?: number // 最小节省目标百分比
  prioritizeSeasonal?: boolean
  allowSubstitutes?: boolean
}

export interface EconomicMealPlan {
  meals: Array<{
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER'
    name: string
    ingredients: Array<{
      foodId: string
      foodName: string
      amount: number // 克数
      cost: number
      nutrition: {
        calories: number
        protein: number
        carbs: number
        fat: number
      }
    }>
    totalCost: number
    nutrition: {
      calories: number
      protein: number
      carbs: number
      fat: number
    }
    savings: number
  }>
  dailyTotal: {
    cost: number
    nutrition: {
      calories: number
      protein: number
      carbs: number
      fat: number
    }
    savings: number
    budgetUtilization: number
  }
  recommendations: string[]
  alternativeOptions: Array<{
    mealType: string
    alternative: MealRecipe | null
    additionalSavings: number
  }>
}

export interface EconomicShoppingList {
  items: Array<{
    foodId: string
    foodName: string
    quantity: number
    unitPrice: number
    totalPrice: number
    platform: string
    category: FoodCategory
    isSeasonal: boolean
    savingsReason: string
  }>
  totalCost: number
  originalCost: number
  totalSavings: number
  savingsPercentage: number
  platformOptimizations: {
    platform: string
    items: string[]
    cost: number
    shipping: number
    total: number
  }[]
  budgetCompliance: {
    withinBudget: boolean
    overBudget: number
    recommendations: string[]
  }
}

export class EconomicMode {
  /**
   * 生成经济模式食谱
   */
  async generateEconomicMealPlan(
    memberId: string,
    config: EconomicModeConfig,
    days: number = 7
  ): Promise<EconomicMealPlan[]> {
    const mealPlans: EconomicMealPlan[] = [];

    // 获取用户营养需求
    const nutritionTargets = await this.getUserNutritionTargets(memberId);
    
    // 获取平价食材池
    const affordableFoods = await this.getAffordableFoodPool(config);
    
    for (let day = 0; day < days; day++) {
      const dailyPlan = await this.generateDailyMealPlan(
        nutritionTargets,
        affordableFoods,
        config,
        config.dailyBudgetLimit || 50
      );
      
      mealPlans.push(dailyPlan);
    }

    return mealPlans;
  }

  /**
   * 生成经济模式购物清单
   */
  async generateEconomicShoppingList(
    memberId: string,
    mealPlanIds: string[],
    config: EconomicModeConfig
  ): Promise<EconomicShoppingList> {
    // 获取食谱所需的食材
    const requiredIngredients = await this.getMealPlanIngredients(mealPlanIds);
    
    // 优化食材选择
    const optimizedIngredients = await this.optimizeIngredientSelection(
      requiredIngredients,
      config
    );
    
    // 平台优化
    const platformOptimizations = await this.optimizePlatformSelection(
      optimizedIngredients
    );

    // 计算总成本和节省
    const totalCost = optimizedIngredients.reduce((sum, item) => sum + item.totalPrice, 0);
    const originalCost = await this.calculateOriginalCost(requiredIngredients);
    const totalSavings = originalCost - totalCost;
    const savingsPercentage = originalCost > 0 ? (totalSavings / originalCost) * 100 : 0;

    // 预算合规性检查
    const budgetCompliance = await this.checkBudgetCompliance(
      totalCost,
      config,
      memberId
    );

    return {
      items: optimizedIngredients,
      totalCost,
      originalCost,
      totalSavings,
      savingsPercentage,
      platformOptimizations,
      budgetCompliance,
    };
  }

  /**
   * 应用实时节省策略
   */
  async applyRealTimeSavings(
    memberId: string,
    currentCart: Array<{
      foodId: string
      quantity: number
    }>,
    config: EconomicModeConfig
  ): Promise<{
    optimizedCart: Array<{
      foodId: string
      foodName: string
      originalQuantity: number
      optimizedQuantity: number
      originalCost: number
      optimizedCost: number
      savings: number
      reason: string
    }>
    totalSavings: number
    appliedStrategies: string[]
  }> {
    const optimizedCart = [];
    let totalSavings = 0;
    const appliedStrategies = [];

    // 策略1: 季节性替换
    const seasonalSubstitutions = await this.applySeasonalSubstitutions(currentCart);
    if (seasonalSubstitutions.length > 0) {
      appliedStrategies.push('季节性食材替换');
      optimizedCart.push(...seasonalSubstitutions);
    }

    // 策略2: 批量采购优化
    const bulkOptimizations = await this.applyBulkPurchaseOptimization(currentCart);
    if (bulkOptimizations.length > 0) {
      appliedStrategies.push('批量采购优化');
      optimizedCart.push(...bulkOptimizations);
    }

    // 策略3: 平台切换建议
    const platformSwitches = await this.applyPlatformSwitchOptimization(currentCart);
    if (platformSwitches.length > 0) {
      appliedStrategies.push('平台切换建议');
      optimizedCart.push(...platformSwitches);
    }

    // 策略4: 优惠券匹配
    const couponMatches = await this.applyCouponOptimization(currentCart);
    if (couponMatches.length > 0) {
      appliedStrategies.push('优惠券应用');
      optimizedCart.push(...couponMatches);
    }

    totalSavings = optimizedCart.reduce((sum, item) => sum + item.savings, 0);

    return {
      optimizedCart,
      totalSavings,
      appliedStrategies,
    };
  }

  /**
   * 获取经济模式分析报告
   */
  async getEconomicModeReport(
    memberId: string,
    period: 'WEEKLY' | 'MONTHLY' = 'MONTHLY'
  ): Promise<{
    summary: {
      totalSpending: number
      budgetLimit: number
      savings: number
      savingsPercentage: number
      daysWithinBudget: number
      totalDays: number
    }
    categoryBreakdown: Array<{
      category: FoodCategory
      spending: number
      budget: number
      savings: number
      efficiency: number
    }>
    recommendations: string[]
    trendAnalysis: {
      direction: 'IMPROVING' | 'DECLINING' | 'STABLE'
      monthlyChange: number
      projectedSavings: number
    }
  }> {
    const periodData = this.getPeriodData(period);
    
    // 获取支出数据
    const spendings = await this.getPeriodSpendings(memberId, periodData.start, periodData.end);
    const totalSpending = spendings.reduce((sum, s) => sum + s.amount, 0);

    // 获取预算限制
    const budgetLimit = await this.getBudgetLimit(memberId, period);
    
    // 计算节省
    const originalEstimatedCost = await this.estimateOriginalCost(spendings);
    const savings = originalEstimatedCost - totalSpending;
    const savingsPercentage = originalEstimatedCost > 0 ? (savings / originalEstimatedCost) * 100 : 0;

    // 预算合规天数
    const dailyBudget = budgetLimit / periodData.days;
    const dailySpending = await this.getDailySpending(memberId, periodData.start, periodData.end);
    const daysWithinBudget = dailySpending.filter(day => day.total <= dailyBudget).length;

    // 分类分析
    const categoryBreakdown = await this.getCategoryBreakdown(spendings, budgetLimit);

    // 趋势分析
    const trendAnalysis = await this.analyzeSpendingTrend(memberId, period);

    // 生成建议
    const recommendations = await this.generateEconomicRecommendations(
      totalSpending,
      budgetLimit,
      categoryBreakdown,
      trendAnalysis
    );

    return {
      summary: {
        totalSpending,
        budgetLimit,
        savings,
        savingsPercentage,
        daysWithinBudget,
        totalDays: periodData.days,
      },
      categoryBreakdown,
      recommendations,
      trendAnalysis,
    };
  }

  /**
   * 私有方法实现
   */
  private async generateDailyMealPlan(
    nutritionTargets: MealNutritionTargets,
    affordableFoods: AffordableFood[],
    config: EconomicModeConfig,
    budgetLimit: number
  ): Promise<EconomicMealPlan> {
    const meals = [];
    const recommendations = [];
    const alternativeOptions = [];

    // 早餐 (预算的30%)
    const breakfast = await this.generateMeal(
      'BREAKFAST',
      nutritionTargets.breakfast,
      affordableFoods.filter(f => ['GRAINS', 'DAIRY', 'FRUITS'].includes(f.category)),
      budgetLimit * 0.3,
      config
    );
    meals.push(breakfast);

    // 午餐 (预算的40%)
    const lunch = await this.generateMeal(
      'LUNCH',
      nutritionTargets.lunch,
      affordableFoods.filter(f => ['PROTEIN', 'VEGETABLES', 'GRAINS'].includes(f.category)),
      budgetLimit * 0.4,
      config
    );
    meals.push(lunch);

    // 晚餐 (预算的30%)
    const dinner = await this.generateMeal(
      'DINNER',
      nutritionTargets.dinner,
      affordableFoods.filter(f => ['PROTEIN', 'VEGETABLES'].includes(f.category)),
      budgetLimit * 0.3,
      config
    );
    meals.push(dinner);

    // 计算日总计
    const dailyTotal = {
      cost: meals.reduce((sum, meal) => sum + meal.totalCost, 0),
      nutrition: meals.reduce((sum, meal) => ({
        calories: sum.calories + meal.nutrition.calories,
        protein: sum.protein + meal.nutrition.protein,
        carbs: sum.carbs + meal.nutrition.carbs,
        fat: sum.fat + meal.nutrition.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 }),
      savings: meals.reduce((sum, meal) => sum + meal.savings, 0),
      budgetUtilization: (meals.reduce((sum, meal) => sum + meal.totalCost, 0) / budgetLimit) * 100,
    };

    // 生成建议
    if (dailyTotal.budgetUtilization > 90) {
      recommendations.push('接近预算上限，考虑减少分量或选择更便宜的替代品');
    } else if (dailyTotal.budgetUtilization < 70) {
      recommendations.push('预算使用率较低，可以增加营养丰富的食材');
    }

    return {
      meals,
      dailyTotal,
      recommendations,
      alternativeOptions,
    };
  }

  private async generateMeal(
    mealType: string,
    nutritionTargets: NutritionInfo,
    availableFoods: AffordableFood[],
    budgetLimit: number,
    config: EconomicModeConfig
  ): Promise<EconomicMealPlan['meals'][0]> {
    // 使用成本优化器生成最优食材组合
    const constraints: OptimizationConstraints = {
      nutritionTargets,
      maxCost: budgetLimit,
      economyMode: true,
      allowedCategories: config.preferredCategories,
      excludedFoodIds: config.excludedFoodIds,
      preferSeasonal: config.prioritizeSeasonal,
    };

    const foodIds = availableFoods.map(f => f.id);
    const optimizationResult = await costOptimizer.optimizeShoppingList(foodIds, constraints);

    return {
      type: mealType,
      name: `${this.getMealTypeName(mealType)}（经济版）`,
      ingredients: optimizationResult.optimizedFoods.map(food => ({
        foodId: food.food.id,
        foodName: food.food.name,
        amount: food.amount,
        cost: food.cost,
        nutrition: food.nutrition,
      })),
      totalCost: optimizationResult.optimizedCost,
      nutrition: optimizationResult.nutritionComparison.optimized,
      savings: optimizationResult.savings,
    };
  }

  private async getAffordableFoodPool(config: EconomicModeConfig): Promise<AffordableFood[]> {
    // 获取价格较低的食材池
    const priceHistories = await prisma.priceHistory.findMany({
      where: {
        isValid: true,
        unitPrice: {
          lte: 30, // 单价不超过30元/kg
        },
      },
      include: {
        food: true,
      },
      orderBy: { unitPrice: 'asc' },
      take: 100,
    });

    let foods = priceHistories.map(ph => ({
      id: ph.food.id,
      name: ph.food.name,
      category: ph.food.category,
      unitPrice: ph.unitPrice,
      platform: ph.platform,
      nutrition: {
        calories: ph.food.calories,
        protein: ph.food.protein,
        carbs: ph.food.carbs,
        fat: ph.food.fat,
      },
    }));

    // 应用过滤条件
    if (config.preferredCategories && config.preferredCategories.length > 0) {
      foods = foods.filter(f => config.preferredCategories!.includes(f.category));
    }

    if (config.excludedFoodIds && config.excludedFoodIds.length > 0) {
      foods = foods.filter(f => !config.excludedFoodIds!.includes(f.id));
    }

    return foods;
  }

  private async getUserNutritionTargets(memberId: string): Promise<MealNutritionTargets> {
    // 获取用户营养需求（简化处理）
    return {
      breakfast: {
        calories: 400,
        protein: 15,
        carbs: 50,
        fat: 15,
      },
      lunch: {
        calories: 600,
        protein: 25,
        carbs: 70,
        fat: 20,
      },
      dinner: {
        calories: 500,
        protein: 20,
        carbs: 60,
        fat: 18,
      },
    };
  }

  private async getMealPlanIngredients(mealPlanIds: string[]): Promise<CartItem[]> {
    // 获取食谱食材（简化实现）
    return [];
  }

  private async optimizeIngredientSelection(ingredients: CartItem[], config: EconomicModeConfig): Promise<EconomicShoppingList['items']> {
    // 优化食材选择
    return [];
  }

  private async optimizePlatformSelection(ingredients: EconomicShoppingList['items']): Promise<EconomicShoppingList['platformOptimizations']> {
    // 平台选择优化
    return [];
  }

  private async calculateOriginalCost(ingredients: CartItem[]): Promise<number> {
    // 计算原始成本
    return 0;
  }

  private async checkBudgetCompliance(totalCost: number, config: EconomicModeConfig, memberId: string): Promise<EconomicShoppingList['budgetCompliance']> {
    // 预算合规性检查
    return {
      withinBudget: true,
      overBudget: 0,
      recommendations: [],
    };
  }

  private async applySeasonalSubstitutions(cart: CartItem[]): Promise<CartItem[]> {
    // 季节性替换
    return [];
  }

  private async applyBulkPurchaseOptimization(cart: CartItem[]): Promise<CartItem[]> {
    // 批量采购优化
    return [];
  }

  private async applyPlatformSwitchOptimization(cart: CartItem[]): Promise<CartItem[]> {
    // 平台切换优化
    return [];
  }

  private async applyCouponOptimization(cart: CartItem[]): Promise<CartItem[]> {
    // 优惠券优化
    return [];
  }

  private getPeriodData(period: string): DateRange {
    const now = new Date();
    let start: Date;
    let days: number;

    switch (period) {
    case 'WEEKLY':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      days = 7;
      break;
    case 'MONTHLY':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      days = 30;
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      days = 30;
    }

    return { start, end: now, days };
  }

  private async getPeriodSpendings(memberId: string, start: Date, end: Date) {
    return await prisma.spending.findMany({
      where: {
        budget: {
          memberId,
        },
        purchaseDate: {
          gte: start,
          lte: end,
        },
      },
    });
  }

  private async getBudgetLimit(memberId: string, period: string): Promise<number> {
    // 获取预算限制
    const budget = await prisma.budget.findFirst({
      where: {
        memberId,
        status: 'ACTIVE',
      },
    });
    return budget?.totalAmount || 1500; // 默认月预算
  }

  private async estimateOriginalCost(spendings: Spending[]): Promise<number> {
    // 估算原始成本（未优化前的成本）
    return spendings.reduce((sum, s) => sum + s.amount * 1.2, 0); // 假设优化后节省20%
  }

  private async getDailySpending(memberId: string, start: Date, end: Date): Promise<Spending[]> {
    // 获取每日支出
    return [];
  }

  private async getCategoryBreakdown(spendings: Spending[], totalBudget: number): Promise<CategorySpendingData[]> {
    // 分类支出分析
    return [];
  }

  private async analyzeSpendingTrend(memberId: string, period: string): Promise<TrendAnalysis> {
    // 支出趋势分析
    return {
      direction: 'STABLE' as const,
      monthlyChange: 0,
      projectedSavings: 0,
    };
  }

  private async generateEconomicRecommendations(
    totalSpending: number,
    budgetLimit: number,
    categoryBreakdown: CategorySpendingData[],
    trendAnalysis: TrendAnalysis
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (totalSpending > budgetLimit) {
      recommendations.push('支出超过预算，建议启用经济模式');
    }

    if (trendAnalysis.direction === 'DECLINING') {
      recommendations.push('支出趋势上升，需要加强成本控制');
    }

    return recommendations;
  }

  private getMealTypeName(mealType: string): string {
    const names: { [key: string]: string } = {
      'BREAKFAST': '早餐',
      'LUNCH': '午餐',
      'DINNER': '晚餐',
    };
    return names[mealType] || mealType;
  }
}

export const economicMode = new EconomicMode();
