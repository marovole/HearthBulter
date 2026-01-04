import { PrismaClient } from "@prisma/client";
import {
  Food,
  FoodCategory,
  PriceHistory,
  SavingsType,
  SavingsRecommendation,
} from "@prisma/client";

const prisma = new PrismaClient();

export interface PromotionInfo {
  foodId: string;
  foodName: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  platform: string;
  validUntil: Date;
}

export interface GroupBuyInfo {
  foodId: string;
  foodName: string;
  regularPrice: number;
  groupPrice: number;
  minQuantity: number;
  currentParticipants: number;
  platform: string;
  expiresAt: Date;
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
  validUntil: Date;
}

export class SavingsRecommender {
  /**
   * 获取所有节省建议
   */
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

  /**
   * 识别促销商品
   */
  private async identifyPromotions(memberId: string): Promise<PromotionInfo[]> {
    // 获取用户最近购买的食物
    const recentPurchases = await this.getRecentPurchases(memberId, 30);

    if (recentPurchases.length === 0) return [];

    const foodIds = recentPurchases.map((p) => p.foodId);

    // 获取这些食物的最新价格历史
    const priceHistories = await prisma.priceHistory.findMany({
      where: {
        foodId: { in: foodIds },
        isValid: true,
      },
      include: {
        food: true,
      },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });

    // 按食物分组，检测价格下降
    const promotions: PromotionInfo[] = [];
    const foodPrices: { [key: string]: PriceHistory[] } = {};

    priceHistories.forEach((price) => {
      if (!foodPrices[price.foodId]) {
        foodPrices[price.foodId] = [];
      }
      foodPrices[price.foodId].push(price);
    });

    for (const [foodId, prices] of Object.entries(foodPrices)) {
      if (prices.length < 2) continue;

      const latestPrice = prices[0];
      const previousPrice = prices[1];

      // 检测价格下降超过10%
      if (latestPrice.unitPrice < previousPrice.unitPrice * 0.9) {
        const discountPercentage =
          ((previousPrice.unitPrice - latestPrice.unitPrice) /
            previousPrice.unitPrice) *
          100;

        promotions.push({
          foodId,
          foodName: latestPrice.food.name,
          originalPrice: previousPrice.unitPrice,
          discountedPrice: latestPrice.unitPrice,
          discountPercentage,
          platform: latestPrice.platform,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 假设7天有效期
        });
      }
    }

    return promotions.sort(
      (a, b) => b.discountPercentage - a.discountPercentage,
    );
  }

  /**
   * 识别团购优惠
   */
  private async identifyGroupBuys(memberId: string): Promise<GroupBuyInfo[]> {
    // 模拟团购数据 - 实际应用中会从团购API获取
    const recentPurchases = await this.getRecentPurchases(memberId, 30);
    const foodIds = recentPurchases.map((p) => p.foodId);

    const foods = await prisma.food.findMany({
      where: { id: { in: foodIds } },
      include: {
        priceHistories: {
          where: { isValid: true },
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    const groupBuys: GroupBuyInfo[] = [];

    // 模拟团购优惠（实际应用中调用团购平台API）
    for (const food of foods) {
      const latestPrice = food.priceHistories[0];
      if (!latestPrice) continue;

      // 模拟：某些商品有团购优惠
      if (Math.random() > 0.7) {
        // 30%概率有团购
        const groupPrice = latestPrice.unitPrice * 0.8; // 20%折扣
        const minQuantity = Math.floor(Math.random() * 5 + 2); // 2-6人成团

        groupBuys.push({
          foodId: food.id,
          foodName: food.name,
          regularPrice: latestPrice.unitPrice,
          groupPrice,
          minQuantity,
          currentParticipants: Math.floor(Math.random() * minQuantity),
          platform: latestPrice.platform,
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后过期
        });
      }
    }

    return groupBuys.sort(
      (a, b) => b.regularPrice - b.groupPrice - (a.regularPrice - a.groupPrice),
    );
  }

  /**
   * 识别季节性平价替代
   */
  private async identifySeasonalAlternatives(
    memberId: string,
  ): Promise<SeasonalAlternative[]> {
    const recentPurchases = await this.getRecentPurchases(memberId, 30);
    const seasonalAlternatives: SeasonalAlternative[] = [];

    // 获取当前季节
    const currentMonth = new Date().getMonth();
    const currentSeason = this.getSeason(currentMonth);

    for (const purchase of recentPurchases) {
      const originalFood = await prisma.food.findUnique({
        where: { id: purchase.foodId },
        include: {
          priceHistories: {
            where: { isValid: true },
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!originalFood || !originalFood.priceHistories[0]) continue;

      // 查找同类别的当季食物
      const seasonalFoods = await prisma.food.findMany({
        where: {
          category: originalFood.category,
          id: { not: originalFood.id },
          priceHistories: {
            some: { isValid: true },
          },
        },
        include: {
          priceHistories: {
            where: { isValid: true },
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
        take: 5,
      });

      for (const seasonalFood of seasonalFoods) {
        const latestPrice = seasonalFood.priceHistories[0];
        if (!latestPrice) continue;

        // 如果当季食物更便宜
        if (
          latestPrice.unitPrice <
          originalFood.priceHistories[0].unitPrice * 0.8
        ) {
          const savings =
            originalFood.priceHistories[0].unitPrice - latestPrice.unitPrice;

          seasonalAlternatives.push({
            originalFoodId: originalFood.id,
            originalFoodName: originalFood.name,
            originalPrice: originalFood.priceHistories[0].unitPrice,
            alternativeFoodId: seasonalFood.id,
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

  /**
   * 识别批量采购建议
   */
  private async identifyBulkPurchases(
    memberId: string,
  ): Promise<BulkPurchaseSuggestion[]> {
    // 分析用户购买频率
    const purchaseFrequency = await this.getPurchaseFrequency(memberId, 90);

    const bulkPurchases: BulkPurchaseSuggestion[] = [];

    for (const [foodId, frequency] of Object.entries(purchaseFrequency)) {
      // 如果某食材购买频繁（每月超过2次）
      if (frequency >= 2) {
        const food = await prisma.food.findUnique({
          where: { id },
          include: {
            priceHistories: {
              where: { isValid: true },
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        });

        if (!food || !food.priceHistories[0]) continue;

        // 模拟批量采购折扣
        const unitPrice = food.priceHistories[0].unitPrice;
        const bulkDiscount = 0.15; // 15%折扣
        const bulkPrice = unitPrice * (1 - bulkDiscount);
        const minBulkQuantity = 5; // 最小批量

        const totalSavings = (unitPrice - bulkPrice) * minBulkQuantity;

        bulkPurchases.push({
          foodId,
          foodName: food.name,
          unitPrice,
          bulkPrice,
          minBulkQuantity,
          totalSavings,
          platform: food.priceHistories[0].platform,
        });
      }
    }

    return bulkPurchases.sort((a, b) => b.totalSavings - a.totalSavings);
  }

  /**
   * 优惠券自动匹配
   */
  private async matchCoupons(memberId: string): Promise<CouponMatch[]> {
    const recentPurchases = await this.getRecentPurchases(memberId, 30);
    const coupons: CouponMatch[] = [];

    // 模拟优惠券数据（实际应用中从各平台API获取）
    for (const purchase of recentPurchases) {
      const food = await prisma.food.findUnique({
        where: { id: purchase.foodId },
        include: {
          priceHistories: {
            where: { isValid: true },
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!food || !food.priceHistories[0]) continue;

      // 模拟：30%概率有可用优惠券
      if (Math.random() > 0.7) {
        const discountType =
          Math.random() > 0.5 ? ("PERCENTAGE" as const) : ("FIXED" as const);
        const discountAmount =
          discountType === "PERCENTAGE"
            ? Math.floor(Math.random() * 20 + 5) // 5-25%折扣
            : Math.floor(Math.random() * 10 + 2); // 2-12元固定优惠

        coupons.push({
          foodId: food.id,
          foodName: food.name,
          couponCode: this.generateCouponCode(),
          discountAmount,
          discountType,
          platform: food.priceHistories[0].platform,
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14天有效期
        });
      }
    }

    return coupons.sort((a, b) => b.discountAmount - a.discountAmount);
  }

  /**
   * 生成经济食谱
   */
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
    // 获取平价食材
    const affordableFoods = await this.getAffordableFoods(
      memberId,
      budgetConstraint,
    );

    // 生成食谱组合
    const recipes = [];

    // 早餐组合
    const breakfastRecipe = this.generateBreakfastRecipe(
      affordableFoods,
      budgetConstraint * 0.3,
    );
    if (breakfastRecipe) recipes.push(breakfastRecipe);

    // 午餐组合
    const lunchRecipe = this.generateLunchRecipe(
      affordableFoods,
      budgetConstraint * 0.4,
    );
    if (lunchRecipe) recipes.push(lunchRecipe);

    // 晚餐组合
    const dinnerRecipe = this.generateDinnerRecipe(
      affordableFoods,
      budgetConstraint * 0.3,
    );
    if (dinnerRecipe) recipes.push(dinnerRecipe);

    return { recipes };
  }

  /**
   * 获取用户最近购买记录
   */
  private async getRecentPurchases(
    memberId: string,
    days: number,
  ): Promise<Array<{ foodId: string }>> {
    // 从支出记录中获取购买信息
    const spendings = await prisma.spending.findMany({
      where: {
        budget: {
          memberId,
        },
        purchaseDate: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        items: true,
      },
    });

    const purchases: Array<{ foodId: string }> = [];

    spendings.forEach((spending) => {
      if (spending.items) {
        const items = spending.items as any[];
        items.forEach((item) => {
          if (item.foodId) {
            purchases.push({ foodId: item.foodId });
          }
        });
      }
    });

    return purchases;
  }

  /**
   * 获取购买频率
   */
  private async getPurchaseFrequency(
    memberId: string,
    days: number,
  ): Promise<{ [key: string]: number }> {
    const purchases = await this.getRecentPurchases(memberId, days);
    const frequency: { [key: string]: number } = {};

    purchases.forEach((purchase) => {
      frequency[purchase.foodId] = (frequency[purchase.foodId] || 0) + 1;
    });

    // 转换为月频率
    const months = days / 30;
    Object.keys(frequency).forEach((foodId) => {
      frequency[foodId] = frequency[foodId] / months;
    });

    return frequency;
  }

  /**
   * 获取平价食材
   */
  private async getAffordableFoods(
    memberId: string,
    maxPrice: number,
  ): Promise<
    Array<{
      food: Food;
      unitPrice: number;
      platform: string;
    }>
  > {
    const priceHistories = await prisma.priceHistory.findMany({
      where: {
        isValid: true,
        unitPrice: {
          lte: maxPrice / 10, // 单价不超过预算的1/10
        },
      },
      include: {
        food: true,
      },
      orderBy: { unitPrice: "asc" },
      take: 50,
    });

    return priceHistories.map((ph) => ({
      food: ph.food,
      unitPrice: ph.unitPrice,
      platform: ph.platform,
    }));
  }

  /**
   * 生成早餐食谱
   */
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

  /**
   * 生成午餐食谱
   */
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

  /**
   * 生成晚餐食谱
   */
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

  /**
   * 获取当前季节
   */
  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return "春季";
    if (month >= 5 && month <= 7) return "夏季";
    if (month >= 8 && month <= 10) return "秋季";
    return "冬季";
  }

  /**
   * 生成优惠券代码
   */
  private generateCouponCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 保存节省建议到数据库
   */
  async saveSavingsRecommendation(
    memberId: string,
    type: SavingsType,
    recommendation: {
      title: string;
      description: string;
      savings: number;
      originalPrice?: number;
      discountedPrice?: number;
      platform?: string;
      foodItems?: any[];
      validUntil?: Date;
    },
  ): Promise<SavingsRecommendation> {
    return await prisma.savingsRecommendation.create({
      data: {
        memberId,
        type,
        title: recommendation.title,
        description: recommendation.description,
        savings: recommendation.savings,
        originalPrice: recommendation.originalPrice,
        discountedPrice: recommendation.discountedPrice,
        platform: recommendation.platform,
        foodItems: recommendation.foodItems,
        validUntil:
          recommendation.validUntil ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
}

export const savingsRecommender = new SavingsRecommender();
