import { api, convexClient } from "../../convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface AffordableFoodDoc {
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unitPrice: number;
  platform: string;
}

export interface PromotionInfo {
  foodId: string;
  foodName: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  platform: string;
  validUntil: number;
}

export interface GroupBuyInfo {
  foodId: string;
  foodName: string;
  regularPrice: number;
  groupPrice: number;
  minQuantity: number;
  currentParticipants: number;
  platform: string;
  expiresAt: number;
}

export interface SeasonalAlternative {
  originalFoodId: string;
  originalFoodName: string;
  originalPrice: number;
  alternativeFoodId: string;
  alternativeFoodName: string;
  alternativePrice: number;
  savings: number;
  season: string;
}

export interface BulkPurchaseSuggestion {
  foodId: string;
  foodName: string;
  unitPrice: number;
  bulkPrice: number;
  minBulkQuantity: number;
  totalSavings: number;
  platform: string;
}

export interface CouponMatch {
  foodId: string;
  foodName: string;
  couponCode: string;
  discountAmount: number;
  discountType: "PERCENTAGE" | "FIXED";
  platform: string;
  validUntil: number;
}

export class SavingsRecommender {
  async getSavingsRecommendations(memberId: string): Promise<{
    promotions: PromotionInfo[];
    groupBuys: GroupBuyInfo[];
    seasonalAlternatives: SeasonalAlternative[];
    bulkPurchases: BulkPurchaseSuggestion[];
    coupons: CouponMatch[];
  }> {
    const [
      promotions,
      groupBuys,
      seasonalAlternatives,
      bulkPurchases,
      coupons,
    ] = await Promise.all([
      this.identifyPromotions(memberId),
      this.identifyGroupBuys(memberId),
      this.identifySeasonalAlternatives(memberId),
      this.identifyBulkPurchases(memberId),
      this.matchCoupons(memberId),
    ]);

    return {
      promotions,
      groupBuys,
      seasonalAlternatives,
      bulkPurchases,
      coupons,
    };
  }

  private async identifyPromotions(memberId: string): Promise<PromotionInfo[]> {
    const recentPurchases = await this.getRecentPurchases(memberId, 30);

    if (recentPurchases.length === 0) return [];

    const foodIds = recentPurchases;

    const promotions: PromotionInfo[] = [];

    for (const foodId of foodIds) {
      const priceHistories = (await convexClient.query(
        api.budget.getPriceHistories,
        {
          foodId: foodId as Id<"foods">,
          isValid: true,
          limit: 10,
        },
      )) as Doc<"priceHistories">[];

      if (priceHistories.length < 2) continue;

      const latestPrice = priceHistories[0];
      const previousPrice = priceHistories[1];
      if (!latestPrice || !previousPrice) continue;

      const food = (await convexClient.query(api.budget.getFoodById, {
        foodId: foodId as Id<"foods">,
      })) as Doc<"foods"> | null;
      const foodName = food?.name ?? "食物";

      if (latestPrice.unitPrice < previousPrice.unitPrice * 0.9) {
        const discountPercentage =
          ((previousPrice.unitPrice - latestPrice.unitPrice) /
            previousPrice.unitPrice) *
          100;

        promotions.push({
          foodId,
          foodName,
          originalPrice: previousPrice.unitPrice,
          discountedPrice: latestPrice.unitPrice,
          discountPercentage,
          platform: latestPrice.platform,
          validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
      }
    }

    return promotions.sort(
      (a, b) => b.discountPercentage - a.discountPercentage,
    );
  }

  private async identifyGroupBuys(memberId: string): Promise<GroupBuyInfo[]> {
    const recentPurchases = await this.getRecentPurchases(memberId, 30);
    const groupBuys: GroupBuyInfo[] = [];

    for (const foodId of recentPurchases) {
      const food = (await convexClient.query(api.budget.getFoodById, {
        foodId: foodId as Id<"foods">,
      })) as Doc<"foods"> | null;
      if (!food) continue;

      const latestPrice = (await convexClient.query(api.budget.getLatestPrice, {
        foodId: foodId as Id<"foods">,
      })) as Doc<"priceHistories"> | null;
      if (!latestPrice) continue;

      if (Math.random() > 0.7) {
        const groupPrice = latestPrice.unitPrice * 0.8;
        const minQuantity = Math.floor(Math.random() * 5 + 2);

        groupBuys.push({
          foodId,
          foodName: food.name,
          regularPrice: latestPrice.unitPrice,
          groupPrice,
          minQuantity,
          currentParticipants: Math.floor(Math.random() * minQuantity),
          platform: latestPrice.platform,
          expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
        });
      }
    }

    return groupBuys.sort(
      (a, b) => b.regularPrice - b.groupPrice - (a.regularPrice - a.groupPrice),
    );
  }

  private async identifySeasonalAlternatives(
    memberId: string,
  ): Promise<SeasonalAlternative[]> {
    const recentPurchases = await this.getRecentPurchases(memberId, 30);
    const seasonalAlternatives: SeasonalAlternative[] = [];

    const currentMonth = new Date().getMonth();
    const currentSeason = this.getSeason(currentMonth);

    for (const purchase of recentPurchases) {
      const originalFood = (await convexClient.query(api.budget.getFoodById, {
        foodId: purchase as Id<"foods">,
      })) as Doc<"foods"> | null;

      const originalLatestPrice = (await convexClient.query(
        api.budget.getLatestPrice,
        { foodId: purchase as Id<"foods"> },
      )) as Doc<"priceHistories"> | null;
      if (!originalFood || !originalLatestPrice) continue;

      const seasonalFoods = (await convexClient.query(
        api.budget.getFoodsByCategory,
        {
          category: originalFood.category,
          excludeIds: [purchase as Id<"foods">],
          limit: 5,
        },
      )) as Doc<"foods">[];

      for (const seasonalFood of seasonalFoods) {
        const latestPrice = (await convexClient.query(
          api.budget.getLatestPrice,
          { foodId: seasonalFood._id },
        )) as Doc<"priceHistories"> | null;
        if (!latestPrice) continue;

        if (latestPrice.unitPrice < originalLatestPrice.unitPrice * 0.8) {
          const savings = originalLatestPrice.unitPrice - latestPrice.unitPrice;

          seasonalAlternatives.push({
            originalFoodId: originalFood._id,
            originalFoodName: originalFood.name,
            originalPrice: originalLatestPrice.unitPrice,
            alternativeFoodId: seasonalFood._id,
            alternativeFoodName: seasonalFood.name,
            alternativePrice: latestPrice.unitPrice,
            savings,
            season: currentSeason,
          });
        }
      }
    }

    return seasonalAlternatives.sort((a, b) => b.savings - a.savings);
  }

  private async identifyBulkPurchases(
    memberId: string,
  ): Promise<BulkPurchaseSuggestion[]> {
    const purchaseFrequency = await this.getPurchaseFrequency(memberId, 90);

    const bulkPurchases: BulkPurchaseSuggestion[] = [];

    for (const [foodId, frequency] of Object.entries(purchaseFrequency)) {
      if (frequency >= 2) {
        const food = (await convexClient.query(api.budget.getFoodById, {
          foodId: foodId as Id<"foods">,
        })) as Doc<"foods"> | null;

        const latestPrice = (await convexClient.query(
          api.budget.getLatestPrice,
          { foodId: foodId as Id<"foods"> },
        )) as Doc<"priceHistories"> | null;
        if (!food || !latestPrice) continue;

        const unitPrice = latestPrice.unitPrice;
        const bulkDiscount = 0.15;
        const bulkPrice = unitPrice * (1 - bulkDiscount);
        const minBulkQuantity = 5;

        const totalSavings = (unitPrice - bulkPrice) * minBulkQuantity;

        bulkPurchases.push({
          foodId,
          foodName: food.name,
          unitPrice,
          bulkPrice,
          minBulkQuantity,
          totalSavings,
          platform: latestPrice.platform,
        });
      }
    }

    return bulkPurchases.sort((a, b) => b.totalSavings - a.totalSavings);
  }

  private async matchCoupons(memberId: string): Promise<CouponMatch[]> {
    const recentPurchases = await this.getRecentPurchases(memberId, 30);
    const coupons: CouponMatch[] = [];

    for (const purchase of recentPurchases) {
      const food = (await convexClient.query(api.budget.getFoodById, {
        foodId: purchase as Id<"foods">,
      })) as Doc<"foods"> | null;

      const latestPrice = (await convexClient.query(api.budget.getLatestPrice, {
        foodId: purchase as Id<"foods">,
      })) as Doc<"priceHistories"> | null;
      if (!food || !latestPrice) continue;

      if (Math.random() > 0.7) {
        const discountType = Math.random() > 0.5 ? "PERCENTAGE" : "FIXED";
        const discountAmount =
          discountType === "PERCENTAGE"
            ? Math.floor(Math.random() * 20 + 5)
            : Math.floor(Math.random() * 10 + 2);

        coupons.push({
          foodId: purchase,
          foodName: food.name,
          couponCode: this.generateCouponCode(),
          discountAmount,
          discountType,
          platform: latestPrice.platform,
          validUntil: Date.now() + 14 * 24 * 60 * 60 * 1000,
        });
      }
    }

    return coupons.sort((a, b) => b.discountAmount - a.discountAmount);
  }

  async generateEconomyRecipes(
    memberId: string,
    budgetConstraint: number,
  ): Promise<{
    recipes: Array<{
      name: string;
      ingredients: Array<{
        foodName: string;
        amount: number;
        cost: number;
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
  }> {
    const affordableFoods = await this.getAffordableFoods(
      memberId,
      budgetConstraint,
    );

    const recipes = [];

    const breakfastRecipe = this.generateBreakfastRecipe(
      affordableFoods,
      budgetConstraint * 0.3,
    );
    if (breakfastRecipe) recipes.push(breakfastRecipe);

    const lunchRecipe = this.generateLunchRecipe(
      affordableFoods,
      budgetConstraint * 0.4,
    );
    if (lunchRecipe) recipes.push(lunchRecipe);

    const dinnerRecipe = this.generateDinnerRecipe(
      affordableFoods,
      budgetConstraint * 0.3,
    );
    if (dinnerRecipe) recipes.push(dinnerRecipe);

    return { recipes };
  }

  private async getRecentPurchases(
    memberId: string,
    days: number,
  ): Promise<string[]> {
    return await convexClient.query(api.budget.getRecentPurchases, {
      memberId,
      days,
    });
  }

  private async getPurchaseFrequency(
    memberId: string,
    days: number,
  ): Promise<{ [key: string]: number }> {
    const purchases = await this.getRecentPurchases(memberId, days);
    const frequency: { [key: string]: number } = {};

    purchases.forEach((foodId) => {
      frequency[foodId] = (frequency[foodId] || 0) + 1;
    });

    const months = days / 30;
    Object.keys(frequency).forEach((foodId) => {
      const count = frequency[foodId] ?? 0;
      frequency[foodId] = count / months;
    });

    return frequency;
  }

  private async getAffordableFoods(
    memberId: string,
    maxPrice: number,
  ): Promise<
    Array<{
      food: {
        name: string;
        category: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      };
      unitPrice: number;
      platform: string;
    }>
  > {
    const foods = await convexClient.query<AffordableFoodDoc[]>(
      api.budget.getAffordableFoods,
      {
        maxUnitPrice: maxPrice / 10,
        limit: 50,
      },
    );

    return foods.map((f) => ({
      food: {
        name: f.name,
        category: f.category,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      },
      unitPrice: f.unitPrice,
      platform: f.platform,
    }));
  }

  private generateBreakfastRecipe(affordableFoods: any[], budget: number): any {
    const breakfastFoods = affordableFoods
      .filter(
        (f) =>
          f.food.category === "GRAINS" ||
          f.food.category === "DAIRY" ||
          f.food.category === "FRUITS",
      )
      .slice(0, 3);

    if (breakfastFoods.length < 2) return null;

    const ingredients = breakfastFoods.map((food) => ({
      foodName: food.food.name,
      amount: 100,
      cost: food.unitPrice * 0.1,
    }));

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);

    return {
      name: "经济早餐组合",
      ingredients,
      totalCost,
      nutrition: {
        calories: breakfastFoods.reduce((sum, f) => sum + f.food.calories, 0),
        protein: breakfastFoods.reduce((sum, f) => sum + f.food.protein, 0),
        carbs: breakfastFoods.reduce((sum, f) => sum + f.food.carbs, 0),
        fat: breakfastFoods.reduce((sum, f) => sum + f.food.fat, 0),
      },
      savings: Math.max(0, budget - totalCost),
    };
  }

  private generateLunchRecipe(affordableFoods: any[], budget: number): any {
    const lunchFoods = affordableFoods
      .filter(
        (f) =>
          f.food.category === "PROTEIN" ||
          f.food.category === "VEGETABLES" ||
          f.food.category === "GRAINS",
      )
      .slice(0, 4);

    if (lunchFoods.length < 3) return null;

    const ingredients = lunchFoods.map((food) => ({
      foodName: food.food.name,
      amount: 150,
      cost: food.unitPrice * 0.15,
    }));

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);

    return {
      name: "经济午餐组合",
      ingredients,
      totalCost,
      nutrition: {
        calories: lunchFoods.reduce((sum, f) => sum + f.food.calories * 1.5, 0),
        protein: lunchFoods.reduce((sum, f) => sum + f.food.protein * 1.5, 0),
        carbs: lunchFoods.reduce((sum, f) => sum + f.food.carbs * 1.5, 0),
        fat: lunchFoods.reduce((sum, f) => sum + f.food.fat * 1.5, 0),
      },
      savings: Math.max(0, budget - totalCost),
    };
  }

  private generateDinnerRecipe(affordableFoods: any[], budget: number): any {
    const dinnerFoods = affordableFoods
      .filter(
        (f) =>
          f.food.category === "PROTEIN" || f.food.category === "VEGETABLES",
      )
      .slice(0, 3);

    if (dinnerFoods.length < 2) return null;

    const ingredients = dinnerFoods.map((food) => ({
      foodName: food.food.name,
      amount: 120,
      cost: food.unitPrice * 0.12,
    }));

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);

    return {
      name: "经济晚餐组合",
      ingredients,
      totalCost,
      nutrition: {
        calories: dinnerFoods.reduce(
          (sum, f) => sum + f.food.calories * 1.2,
          0,
        ),
        protein: dinnerFoods.reduce((sum, f) => sum + f.food.protein * 1.2, 0),
        carbs: dinnerFoods.reduce((sum, f) => sum + f.food.carbs * 1.2, 0),
        fat: dinnerFoods.reduce((sum, f) => sum + f.food.fat * 1.2, 0),
      },
      savings: Math.max(0, budget - totalCost),
    };
  }

  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return "春季";
    if (month >= 5 && month <= 7) return "夏季";
    if (month >= 8 && month <= 10) return "秋季";
    return "冬季";
  }

  private generateCouponCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async saveSavingsRecommendation(
    memberId: string,
    type: string,
    recommendation: {
      title: string;
      description: string;
      savings: number;
      originalPrice?: number;
      discountedPrice?: number;
      platform?: string;
      foodItems?: any[];
      validUntil?: number;
    },
  ): Promise<string> {
    return await convexClient.mutation(api.budget.createSavingsRecommendation, {
      memberId,
      type,
      title: recommendation.title,
      description: recommendation.description,
      savings: recommendation.savings,
      originalPrice: recommendation.originalPrice,
      discountedPrice: recommendation.discountedPrice,
      platform: recommendation.platform,
      foodItems: recommendation.foodItems,
      validUntil: recommendation.validUntil,
    });
  }
}

export const savingsRecommender = new SavingsRecommender();
