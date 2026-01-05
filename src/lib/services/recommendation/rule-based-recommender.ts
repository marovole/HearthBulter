import { PrismaClient } from "@prisma/client";
import {
  RecipeRecommendation,
  RecommendationContext,
} from "./recommendation-engine";

export class RuleBasedRecommender {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 基于规则的推荐算法
   */
  async getRecommendations(
    context: RecommendationContext,
    limit: number = 10,
  ): Promise<RecipeRecommendation[]> {
    const candidates = await this.getCandidateRecipes(context, limit);
    const scoredRecipes = await this.scoreRecipes(candidates, context);

    return scoredRecipes.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * 获取候选食谱
   */
  private async getCandidateRecipes(
    context: RecommendationContext,
    limit: number = 10,
  ) {
    const whereClause: any = {
      status: "PUBLISHED",
      isPublic: true,
      deletedAt: null,
    };

    // 基础过滤条件
    if (context.mealType) {
      whereClause.mealTypes = {
        path: [],
        string_contains: context.mealType,
      };
    }

    if (context.maxCookTime) {
      whereClause.totalTime = { lte: context.maxCookTime };
    }

    if (context.season) {
      whereClause.seasons = {
        path: [],
        string_contains: context.season,
      };
    }

    // 排除已推荐的食谱
    if (context.excludeRecipeIds && context.excludeRecipeIds.length > 0) {
      whereClause.id = { notIn: context.excludeRecipeIds };
    }

    return this.prisma.recipe.findMany({
      where: whereClause,
      include: {
        ingredients: {
          include: { food: true },
        },
      },
      take: limit * 3, // 获取更多候选以便筛选
    });
  }

  /**
   * 基于规则对食谱评分
   */
  private async scoreRecipes(
    recipes: any[],
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const userPreference = await this.prisma.userPreference.findUnique({
      where: { memberId: context.memberId },
    });

    return Promise.all(
      recipes.map(async (recipe) => {
        let score = 0;
        const metadata = {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: 0,
          seasonalMatch: 0,
        };

        // 1. 库存匹配评分 (0-30分)
        const inventoryScore = await this.calculateInventoryScore(
          recipe,
          context.memberId,
        );
        metadata.inventoryMatch = inventoryScore / 30;
        score += inventoryScore;

        // 2. 价格匹配评分 (0-20分)
        const priceScore = this.calculatePriceScore(
          recipe,
          context.budgetLimit,
          userPreference,
        );
        metadata.priceMatch = priceScore / 20;
        score += priceScore;

        // 3. 营养匹配评分 (0-30分)
        const nutritionScore = await this.calculateNutritionScore(
          recipe,
          context.memberId,
        );
        metadata.nutritionMatch = nutritionScore / 30;
        score += nutritionScore;

        // 4. 偏好匹配评分 (0-15分)
        const preferenceScore = this.calculatePreferenceScore(
          recipe,
          userPreference,
          context,
        );
        metadata.preferenceMatch = preferenceScore / 15;
        score += preferenceScore;

        // 5. 季节匹配评分 (0-5分)
        const seasonalScore = this.calculateSeasonalScore(
          recipe,
          context.season,
        );
        metadata.seasonalMatch = seasonalScore / 5;
        score += seasonalScore;

        return {
          recipeId: recipe.id,
          score,
          reasons: this.generateReasons(metadata),
          explanation: "", // 将在主引擎中生成
          metadata,
        };
      }),
    );
  }

  /**
   * 计算库存匹配评分
   */
  private async calculateInventoryScore(
    recipe: any,
    memberId: string,
  ): Promise<number> {
    // 获取用户库存信息（这里简化处理，实际需要查询库存系统）
    const availableIngredients = await this.getAvailableIngredients(memberId);

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 0;
    }

    const requiredIngredients = recipe.ingredients.map((ing) => ing.food.name);
    const matchCount = requiredIngredients.filter((ing) =>
      availableIngredients.includes(ing),
    ).length;

    const matchRatio = matchCount / requiredIngredients.length;
    return Math.round(matchRatio * 30);
  }

  /**
   * 计算价格匹配评分
   */
  private calculatePriceScore(
    recipe: any,
    budgetLimit?: number,
    userPreference?: any,
  ): number {
    if (!recipe.estimatedCost) {
      return 10; // 默认中等分数
    }

    const userCostLevel = userPreference?.costLevel || "MEDIUM";
    const costThresholds = {
      LOW: 20,
      MEDIUM: 50,
      HIGH: 100,
    };

    const threshold =
      costThresholds[userCostLevel as keyof typeof costThresholds];

    if (budgetLimit && recipe.estimatedCost > budgetLimit) {
      return 0; // 超预算
    }

    if (recipe.estimatedCost <= threshold * 0.5) {
      return 20; // 很便宜
    } else if (recipe.estimatedCost <= threshold) {
      return 15; // 价格合适
    } else if (recipe.estimatedCost <= threshold * 1.5) {
      return 10; // 略贵但可接受
    } else {
      return 5; // 太贵
    }
  }

  /**
   * 计算营养匹配评分
   */
  private async calculateNutritionScore(
    recipe: any,
    memberId: string,
  ): Promise<number> {
    // 获取用户健康目标
    const healthGoal = await this.prisma.healthGoal.findFirst({
      where: {
        memberId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!healthGoal) {
      return 15; // 无健康目标时给中等分数
    }

    let score = 15; // 基础分

    // 根据目标类型调整评分
    switch (healthGoal.goalType) {
      case "LOSE_WEIGHT":
        if (recipe.calories <= 400) score += 10;
        if (recipe.carbs <= recipe.protein * 2) score += 5;
        break;
      case "GAIN_MUSCLE":
        if (recipe.protein >= 25) score += 10;
        if (recipe.calories >= 500) score += 5;
        break;
      case "MAINTAIN":
        if (recipe.calories >= 300 && recipe.calories <= 600) score += 10;
        break;
      case "IMPROVE_HEALTH":
        if (recipe.fiber && recipe.fiber >= 5) score += 8;
        if (recipe.sodium && recipe.sodium <= 600) score += 7;
        break;
    }

    return Math.min(score, 30);
  }

  /**
   * 计算偏好匹配评分
   */
  private calculatePreferenceScore(
    recipe: any,
    userPreference: any,
    context: RecommendationContext,
  ): number {
    if (!userPreference) {
      return 7; // 无偏好数据时给中等分数
    }

    let score = 7; // 基础分

    // 菜系匹配
    if (userPreference.preferredCuisines) {
      const preferredCuisines = JSON.parse(userPreference.preferredCuisines);
      if (preferredCuisines.includes(recipe.cuisine)) {
        score += 3;
      }
    }

    // 食材偏好匹配
    if (userPreference.preferredIngredients) {
      const preferredIngredients = JSON.parse(
        userPreference.preferredIngredients,
      );
      const recipeIngredients =
        recipe.ingredients?.map((ing: any) => ing.food.name) || [];
      const matchCount = recipeIngredients.filter((ing: string) =>
        preferredIngredients.includes(ing),
      ).length;

      if (matchCount > 0) {
        score += Math.min(matchCount * 2, 3);
      }
    }

    // 避开的食材
    if (userPreference.avoidedIngredients) {
      const avoidedIngredients = JSON.parse(userPreference.avoidedIngredients);
      const recipeIngredients =
        recipe.ingredients?.map((ing: any) => ing.food.name) || [];
      const hasAvoided = recipeIngredients.some((ing: string) =>
        avoidedIngredients.includes(ing),
      );

      if (hasAvoided) {
        score = Math.max(score - 5, 0);
      }
    }

    // 饮食类型匹配
    if (this.matchesDietaryType(recipe, userPreference)) {
      score += 2;
    }

    return Math.min(score, 15);
  }

  /**
   * 计算季节匹配评分
   */
  private calculateSeasonalScore(recipe: any, currentSeason?: string): number {
    if (!currentSeason) {
      return 2; // 无季节信息时给中等分数
    }

    // Robust season parsing - handle both JSON arrays and comma-separated strings
    let recipeSeasons: string[] = [];
    if (recipe.seasons) {
      try {
        if (typeof recipe.seasons === "string") {
          if (recipe.seasons.startsWith("[")) {
            recipeSeasons = JSON.parse(recipe.seasons);
          } else {
            recipeSeasons = recipe.seasons
              .split(",")
              .map((s: string) => s.trim());
          }
        } else if (Array.isArray(recipe.seasons)) {
          recipeSeasons = recipe.seasons;
        }
      } catch (error) {
        console.error("Failed to parse recipe seasons:", error);
        recipeSeasons = [];
      }
    }

    if (recipeSeasons.includes(currentSeason)) {
      return 5; // 完全匹配
    } else if (recipeSeasons.length === 0) {
      return 3; // 无季节限制的食谱
    } else {
      return 1; // 不当季
    }
  }

  /**
   * 获取用户可用食材
   */
  private async getAvailableIngredients(memberId: string): Promise<string[]> {
    // 这里应该查询用户的库存系统
    // 暂时返回一些常见食材作为示例
    return [
      "鸡蛋",
      "西红柿",
      "土豆",
      "洋葱",
      "大蒜",
      "鸡肉",
      "猪肉",
      "牛肉",
      "白菜",
      "胡萝卜",
    ];
  }

  /**
   * 检查食谱是否符合饮食类型
   */
  private matchesDietaryType(recipe: any, userPreference: any): boolean {
    const {
      dietType,
      isVegetarian,
      isVegan,
      isLowCarb,
      isLowFat,
      isHighProtein,
    } = userPreference;

    // 检查素食/纯素
    if (
      isVegetarian ||
      isVegan ||
      dietType === "VEGETARIAN" ||
      dietType === "VEGAN"
    ) {
      const hasMeat = recipe.ingredients?.some((ing: any) =>
        ["肉类", "鸡肉", "猪肉", "牛肉", "鱼", "虾"].includes(
          ing.food.category,
        ),
      );
      if (hasMeat) return false;
    }

    // 检查低碳水
    if (isLowCarb && recipe.carbs > 20) return false;

    // 检查低脂
    if (isLowFat && recipe.fat > 15) return false;

    // 检查高蛋白
    if (isHighProtein && recipe.protein < 20) return false;

    return true;
  }

  /**
   * 生成推荐理由
   */
  private generateReasons(metadata: any): string[] {
    const reasons: string[] = [];

    if (metadata.inventoryMatch > 0.7) {
      reasons.push("现有食材充足");
    }
    if (metadata.priceMatch > 0.7) {
      reasons.push("经济实惠");
    }
    if (metadata.nutritionMatch > 0.7) {
      reasons.push("营养均衡");
    }
    if (metadata.preferenceMatch > 0.7) {
      reasons.push("符合口味");
    }
    if (metadata.seasonalMatch > 0.7) {
      reasons.push("当季食材");
    }

    return reasons.length > 0 ? reasons : ["基础推荐"];
  }
}
