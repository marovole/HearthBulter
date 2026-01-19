import { api } from "../../convex-client";
import { convexClient } from "../../convex-client";
import {
  costOptimizer,
  OptimizationConstraints,
  OptimizationResult,
} from "./cost-optimizer";
import { savingsRecommender } from "./savings-recommender";

export interface EconomicModeConfig {
  enabled: boolean;
  dailyBudgetLimit?: number;
  weeklyBudgetLimit?: number;
  monthlyBudgetLimit?: number;
  preferredCategories?: string[];
  excludedFoodIds?: string[];
  minSavingsTarget?: number;
  prioritizeSeasonal?: boolean;
  allowSubstitutes?: boolean;
}

export interface EconomicMealPlan {
  meals: Array<{
    type: "BREAKFAST" | "LUNCH" | "DINNER";
    name: string;
    ingredients: Array<{
      foodId: string;
      foodName: string;
      amount: number;
      cost: number;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }>;
    totalCost: number;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    savings: number;
  }>;
  dailyTotal: {
    cost: number;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    savings: number;
    budgetUtilization: number;
  };
  recommendations: string[];
  alternativeOptions: Array<{
    mealType: string;
    alternative: unknown;
    additionalSavings: number;
  }>;
}

type AlternativeOption = EconomicMealPlan["alternativeOptions"][number];

export interface EconomicShoppingList {
  items: Array<{
    foodId: string;
    foodName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    platform: string;
    category: string;
    isSeasonal: boolean;
    savingsReason: string;
  }>;
  totalCost: number;
  originalCost: number;
  totalSavings: number;
  savingsPercentage: number;
  platformOptimizations: {
    platform: string;
    items: string[];
    cost: number;
    shipping: number;
    total: number;
  }[];
  budgetCompliance: {
    withinBudget: boolean;
    overBudget: number;
    recommendations: string[];
  };
}

export class EconomicMode {
  async generateEconomicMealPlan(
    memberId: string,
    config: EconomicModeConfig,
    days: number = 7,
  ): Promise<EconomicMealPlan[]> {
    const mealPlans: EconomicMealPlan[] = [];
    const nutritionTargets = await this.getUserNutritionTargets(memberId);
    const affordableFoods = await this.getAffordableFoodPool(config);

    for (let day = 0; day < days; day++) {
      const dailyPlan = await this.generateDailyMealPlan(
        nutritionTargets,
        affordableFoods,
        config,
        config.dailyBudgetLimit || 50,
      );
      mealPlans.push(dailyPlan);
    }

    return mealPlans;
  }

  async generateEconomicShoppingList(
    memberId: string,
    mealPlanIds: string[],
    config: EconomicModeConfig,
  ): Promise<EconomicShoppingList> {
    const requiredIngredients = await this.getMealPlanIngredients(mealPlanIds);
    const optimizedIngredients = await this.optimizeIngredientSelection(
      requiredIngredients,
      config,
    );
    const platformOptimizations =
      await this.optimizePlatformSelection(optimizedIngredients);

    const totalCost = optimizedIngredients.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
    const originalCost = await this.calculateOriginalCost(requiredIngredients);
    const totalSavings = originalCost - totalCost;
    const savingsPercentage =
      originalCost > 0 ? (totalSavings / originalCost) * 100 : 0;

    const budgetCompliance = await this.checkBudgetCompliance(
      totalCost,
      config,
      memberId,
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

  async applyRealTimeSavings(
    memberId: string,
    currentCart: Array<{
      foodId: string;
      quantity: number;
    }>,
    config: EconomicModeConfig,
  ): Promise<{
    optimizedCart: Array<{
      foodId: string;
      foodName: string;
      originalQuantity: number;
      optimizedQuantity: number;
      originalCost: number;
      optimizedCost: number;
      savings: number;
      reason: string;
    }>;
    totalSavings: number;
    appliedStrategies: string[];
  }> {
    const optimizedCart = [];
    let totalSavings = 0;
    const appliedStrategies = [];

    const seasonalSubstitutions =
      await this.applySeasonalSubstitutions(currentCart);
    if (seasonalSubstitutions.length > 0) {
      appliedStrategies.push("季节性食材替换");
      optimizedCart.push(...seasonalSubstitutions);
    }

    const bulkOptimizations =
      await this.applyBulkPurchaseOptimization(currentCart);
    if (bulkOptimizations.length > 0) {
      appliedStrategies.push("批量采购优化");
      optimizedCart.push(...bulkOptimizations);
    }

    const platformSwitches =
      await this.applyPlatformSwitchOptimization(currentCart);
    if (platformSwitches.length > 0) {
      appliedStrategies.push("平台切换建议");
      optimizedCart.push(...platformSwitches);
    }

    const couponMatches = await this.applyCouponOptimization(currentCart);
    if (couponMatches.length > 0) {
      appliedStrategies.push("优惠券应用");
      optimizedCart.push(...couponMatches);
    }

    totalSavings = optimizedCart.reduce((sum, item) => sum + item.savings, 0);

    return {
      optimizedCart,
      totalSavings,
      appliedStrategies,
    };
  }

  async getEconomicModeReport(
    memberId: string,
    period: "WEEKLY" | "MONTHLY" = "MONTHLY",
  ): Promise<{
    summary: {
      totalSpending: number;
      budgetLimit: number;
      savings: number;
      savingsPercentage: number;
      daysWithinBudget: number;
      totalDays: number;
    };
    categoryBreakdown: Array<{
      category: string;
      spending: number;
      budget: number;
      savings: number;
      efficiency: number;
    }>;
    recommendations: string[];
    trendAnalysis: {
      direction: "IMPROVING" | "DECLINING" | "STABLE";
      monthlyChange: number;
      projectedSavings: number;
    };
  }> {
    const periodData = this.getPeriodData(period);

    const spendings: Array<{ amount: number; category: string }> =
      await this.getPeriodSpendings(memberId, periodData.start, periodData.end);
    const totalSpending = spendings.reduce(
      (sum: number, s) => sum + s.amount,
      0,
    );

    const budgetLimit = await this.getBudgetLimit(memberId, period);

    const originalEstimatedCost = await this.estimateOriginalCost(spendings);
    const savings = originalEstimatedCost - totalSpending;
    const savingsPercentage =
      originalEstimatedCost > 0 ? (savings / originalEstimatedCost) * 100 : 0;

    const dailyBudget = budgetLimit / periodData.days;
    const dailySpending: Array<{ total: number }> = await this.getDailySpending(
      memberId,
      periodData.start,
      periodData.end,
    );
    const daysWithinBudget = dailySpending.filter(
      (day) => day.total <= dailyBudget,
    ).length;

    const categoryBreakdown: Array<{
      category: string;
      spending: number;
      budget: number;
      savings: number;
      efficiency: number;
    }> = await this.getCategoryBreakdown(spendings, budgetLimit);

    const trendAnalysis = await this.analyzeSpendingTrend(memberId, period);

    const recommendations = await this.generateEconomicRecommendations(
      totalSpending,
      budgetLimit,
      categoryBreakdown,
      trendAnalysis,
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

  private async generateDailyMealPlan(
    nutritionTargets: any,
    affordableFoods: any[],
    config: EconomicModeConfig,
    budgetLimit: number,
  ): Promise<EconomicMealPlan> {
    const meals: EconomicMealPlan["meals"] = [];
    const recommendations: EconomicMealPlan["recommendations"] = [];
    const alternativeOptions: AlternativeOption[] = [];

    const breakfast = await this.generateMeal(
      "BREAKFAST",
      nutritionTargets.breakfast,
      affordableFoods.filter((f) =>
        ["GRAINS", "DAIRY", "FRUITS"].includes(f.category),
      ),
      budgetLimit * 0.3,
      config,
    );
    meals.push(breakfast);

    const lunch = await this.generateMeal(
      "LUNCH",
      nutritionTargets.lunch,
      affordableFoods.filter((f) =>
        ["PROTEIN", "VEGETABLES", "GRAINS"].includes(f.category),
      ),
      budgetLimit * 0.4,
      config,
    );
    meals.push(lunch);

    const dinner = await this.generateMeal(
      "DINNER",
      nutritionTargets.dinner,
      affordableFoods.filter((f) =>
        ["PROTEIN", "VEGETABLES"].includes(f.category),
      ),
      budgetLimit * 0.3,
      config,
    );
    meals.push(dinner);

    const dailyTotal = {
      cost: meals.reduce((sum, meal) => sum + meal.totalCost, 0),
      nutrition: meals.reduce(
        (sum, meal) => ({
          calories: sum.calories + meal.nutrition.calories,
          protein: sum.protein + meal.nutrition.protein,
          carbs: sum.carbs + meal.nutrition.carbs,
          fat: sum.fat + meal.nutrition.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
      savings: meals.reduce((sum, meal) => sum + meal.savings, 0),
      budgetUtilization:
        (meals.reduce((sum, meal) => sum + meal.totalCost, 0) / budgetLimit) *
        100,
    };

    if (dailyTotal.budgetUtilization > 90) {
      recommendations.push("接近预算上限，考虑减少分量或选择更便宜的替代品");
    } else if (dailyTotal.budgetUtilization < 70) {
      recommendations.push("预算使用率较低，可以增加营养丰富的食材");
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
    nutritionTargets: any,
    availableFoods: any[],
    budgetLimit: number,
    config: EconomicModeConfig,
  ): Promise<any> {
    const constraints: OptimizationConstraints = {
      nutritionTargets,
      maxCost: budgetLimit,
      economyMode: true,
      allowedCategories: config.preferredCategories,
      excludedFoodIds: config.excludedFoodIds,
      preferSeasonal: config.prioritizeSeasonal,
    };

    const foodIds = availableFoods.map((f) => f.id);
    const optimizationResult = await costOptimizer.optimizeShoppingList(
      foodIds,
      constraints,
    );

    return {
      type: mealType,
      name: `${this.getMealTypeName(mealType)}（经济版）`,
      ingredients: optimizationResult.optimizedFoods.map((food) => ({
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

  private async getAffordableFoodPool(
    config: EconomicModeConfig,
  ): Promise<any[]> {
    const priceHistories = (await convexClient.query(
      api.budget.getAffordableFoods,
      {
        maxUnitPrice: 30,
        limit: 100,
      },
    )) as Array<{
      id: string;
      name: string;
      category: string;
      unitPrice: number;
      platform: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;

    let foods: Array<{
      id: string;
      name: string;
      category: string;
      unitPrice: number;
      platform: string;
      nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
    }> = priceHistories.map((ph) => ({
      id: ph.id,
      name: ph.name,
      category: ph.category,
      unitPrice: ph.unitPrice,
      platform: ph.platform,
      nutrition: {
        calories: ph.calories,
        protein: ph.protein,
        carbs: ph.carbs,
        fat: ph.fat,
      },
    }));

    if (config.preferredCategories && config.preferredCategories.length > 0) {
      foods = foods.filter((f) =>
        config.preferredCategories!.includes(f.category),
      );
    }

    if (config.excludedFoodIds && config.excludedFoodIds.length > 0) {
      foods = foods.filter((f) => !config.excludedFoodIds!.includes(f.id));
    }

    return foods;
  }

  private async getUserNutritionTargets(memberId: string): Promise<any> {
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

  private async getMealPlanIngredients(mealPlanIds: string[]): Promise<any[]> {
    return [];
  }

  private async optimizeIngredientSelection(
    ingredients: any[],
    config: EconomicModeConfig,
  ): Promise<any[]> {
    return [];
  }

  private async optimizePlatformSelection(ingredients: any[]): Promise<any[]> {
    return [];
  }

  private async calculateOriginalCost(ingredients: any[]): Promise<number> {
    return 0;
  }

  private async checkBudgetCompliance(
    totalCost: number,
    config: EconomicModeConfig,
    memberId: string,
  ): Promise<any> {
    return {
      withinBudget: true,
      overBudget: 0,
      recommendations: [],
    };
  }

  private async applySeasonalSubstitutions(cart: any[]): Promise<any[]> {
    return [];
  }

  private async applyBulkPurchaseOptimization(cart: any[]): Promise<any[]> {
    return [];
  }

  private async applyPlatformSwitchOptimization(cart: any[]): Promise<any[]> {
    return [];
  }

  private async applyCouponOptimization(cart: any[]): Promise<any[]> {
    return [];
  }

  private getPeriodData(period: string): any {
    const now = Date.now();
    let start: number;
    let days: number;

    switch (period) {
      case "WEEKLY":
        start = now - 7 * 24 * 60 * 60 * 1000;
        days = 7;
        break;
      case "MONTHLY":
        start = new Date().setDate(1);
        days = 30;
        break;
      default:
        start = now - 30 * 24 * 60 * 60 * 1000;
        days = 30;
    }

    return { start, end: now, days };
  }

  private async getPeriodSpendings(
    memberId: string,
    start: number,
    end: number,
  ): Promise<Array<{ amount: number; category: string }>> {
    const result = (await convexClient.query(api.budget.getSpendingsByMember, {
      memberId,
      startDate: start,
      endDate: end,
    })) as Array<{ amount: number; category: string }>;
    return result ?? [];
  }

  private async getBudgetLimit(
    memberId: string,
    period: string,
  ): Promise<number> {
    const budgets = (await convexClient.query(api.budget.getActiveBudgets, {
      memberId,
    })) as Array<{ status?: string; totalAmount?: number }>;
    const budget = budgets.find((b) => b.status === "ACTIVE");
    return budget?.totalAmount || 1500;
  }

  private async estimateOriginalCost(spendings: any[]): Promise<number> {
    return spendings.reduce((sum, s) => sum + s.amount * 1.2, 0);
  }

  private async getDailySpending(
    memberId: string,
    start: number,
    end: number,
  ): Promise<any[]> {
    return [];
  }

  private async getCategoryBreakdown(
    spendings: any[],
    totalBudget: number,
  ): Promise<any[]> {
    return [];
  }

  private async analyzeSpendingTrend(
    memberId: string,
    period: string,
  ): Promise<any> {
    return {
      direction: "STABLE" as const,
      monthlyChange: 0,
      projectedSavings: 0,
    };
  }

  private async generateEconomicRecommendations(
    totalSpending: number,
    budgetLimit: number,
    categoryBreakdown: any[],
    trendAnalysis: any,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (totalSpending > budgetLimit) {
      recommendations.push("支出超过预算，建议启用经济模式");
    }

    if (trendAnalysis.direction === "DECLINING") {
      recommendations.push("支出趋势上升，需要加强成本控制");
    }

    return recommendations;
  }

  private getMealTypeName(mealType: string): string {
    const names: { [key: string]: string } = {
      BREAKFAST: "早餐",
      LUNCH: "午餐",
      DINNER: "晚餐",
    };
    return names[mealType] || mealType;
  }
}

export const economicMode = new EconomicMode();
