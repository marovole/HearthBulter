import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { RecipeRecommendation, RecommendationContext } from "../recommendation-engine";

export interface UserProfile {
  demographicInfo?: {
    age?: number;
    gender?: string;
    location?: string;
  };
  dietaryPreferences?: {
    dietType?: string;
    allergies?: string[];
    restrictions?: string[];
  };
  cookingPreferences?: {
    skillLevel?: string;
    timePreference?: string;
    cuisinePreference?: string[];
  };
  healthGoals?: {
    goalType?: string;
    targetWeight?: number;
    activityLevel?: string;
  };
}

export interface ColdStartStrategy {
  name: string;
  description: string;
  priority: number;
  applicable: (user: UserProfile) => boolean;
  generateRecommendations: (
    user: UserProfile,
    context: RecommendationContext
  ) => Promise<RecipeRecommendation[]>;
}

type RecipeRecord = Record<string, unknown>;

export class ColdStartHandler {
  private strategies: ColdStartStrategy[] = [];

  constructor() {
    this.initializeStrategies();
  }

  /**
   * 处理冷启动问题
   */
  async handleColdStart(
    memberId: string,
    context: RecommendationContext,
    limit: number = 10
  ): Promise<RecipeRecommendation[]> {
    // 获取用户基础信息
    const userProfile = await this.buildUserProfile(memberId);

    // 选择适用的策略
    const applicableStrategies = this.strategies
      .filter((strategy) => strategy.applicable(userProfile))
      .sort((a, b) => b.priority - a.priority);

    if (applicableStrategies.length === 0) {
      // 使用默认策略
      return this.getDefaultRecommendations(context, limit);
    }

    // 使用最高优先级的策略
    const primaryStrategy = applicableStrategies[0];
    if (!primaryStrategy) {
      return this.getDefaultRecommendations(context, limit);
    }

    let recommendations = await primaryStrategy.generateRecommendations(userProfile, context);

    // 如果推荐数量不足，使用次要策略补充
    if (recommendations.length < limit && applicableStrategies.length > 1) {
      const secondaryStrategy = applicableStrategies[1];
      if (secondaryStrategy) {
        const secondaryRecommendations = await secondaryStrategy.generateRecommendations(
          userProfile,
          context
        );

        // 合并并去重
        const combined = this.mergeRecommendations(recommendations, secondaryRecommendations);
        recommendations = combined.slice(0, limit);
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * 构建用户档案
   */
  private async buildUserProfile(memberId: string): Promise<UserProfile> {
    const [member, userPreference, healthGoals, allergies] = await Promise.all([
      convexClient.query<Doc<"familyMembers"> | null>(api.members.getById, {
        memberId: memberId as Id<"familyMembers">,
      }),
      convexClient.query<Record<string, unknown> | null>(api.recommendations.getUserPreference, {
        memberId: memberId as Id<"familyMembers">,
      }),
      convexClient.query<Doc<"healthGoals">[]>(api.health.listGoals, {
        memberId: memberId as Id<"familyMembers">,
        includeInactive: false,
      }),
      convexClient.query<Doc<"allergies">[]>(api.health.listAllergies, {
        memberId: memberId as Id<"familyMembers">,
      }),
    ]);

    const profile: UserProfile = {};

    if (member) {
      profile.demographicInfo = {
        age: member.birthDate ? this.calculateAge(new Date(member.birthDate)) : undefined,
        gender: member.gender ?? undefined,
      };
    }

    const allergyNames = allergies
      .filter((allergy) => allergy.allergenType === "FOOD" && !allergy.deletedAt)
      .map((allergy) => allergy.allergenName);

    if (userPreference) {
      const preferredCuisines = (userPreference.preferredCuisines as string[] | undefined) ?? [];
      const avoidedIngredients = (userPreference.avoidedIngredients as string[] | undefined) ?? [];
      const maxCookTime = userPreference.maxCookTime as number | undefined;

      profile.dietaryPreferences = {
        dietType: undefined,
        allergies: allergyNames,
        restrictions: avoidedIngredients,
      };

      profile.cookingPreferences = {
        skillLevel: undefined,
        timePreference: maxCookTime ? `${maxCookTime}min` : undefined,
        cuisinePreference: preferredCuisines,
      };
    }

    const activeGoal = healthGoals[0];
    if (activeGoal) {
      profile.healthGoals = {
        goalType: activeGoal.goalType,
        targetWeight: activeGoal.targetValue ?? undefined,
        activityLevel: activeGoal.activityFactor ? String(activeGoal.activityFactor) : undefined,
      };
    }

    return profile;
  }

  /**
   * 初始化冷启动策略
   */
  private initializeStrategies(): void {
    // 策略1：基于人口统计的推荐
    this.strategies.push({
      name: "demographic_based",
      description: "基于用户年龄、性别、地理位置的推荐",
      priority: 3,
      applicable: (user) => !!user.demographicInfo,
      generateRecommendations: async (user, context) => {
        return this.generateDemographicRecommendations(user, context);
      },
    });

    // 策略2：基于饮食偏好的推荐
    this.strategies.push({
      name: "dietary_based",
      description: "基于用户饮食类型和限制的推荐",
      priority: 5,
      applicable: (user) => !!user.dietaryPreferences,
      generateRecommendations: async (user, context) => {
        return this.generateDietaryRecommendations(user, context);
      },
    });

    // 策略3：基于烹饪偏好的推荐
    this.strategies.push({
      name: "cooking_based",
      description: "基于用户烹饪技能和时间偏好的推荐",
      priority: 4,
      applicable: (user) => !!user.cookingPreferences,
      generateRecommendations: async (user, context) => {
        return this.generateCookingRecommendations(user, context);
      },
    });

    // 策略4：基于健康目标的推荐
    this.strategies.push({
      name: "health_based",
      description: "基于用户健康目标的推荐",
      priority: 6,
      applicable: (user) => !!user.healthGoals,
      generateRecommendations: async (user, context) => {
        return this.generateHealthRecommendations(user, context);
      },
    });

    // 策略5：基于热门度的推荐
    this.strategies.push({
      name: "popularity_based",
      description: "基于全局热门度的推荐",
      priority: 1,
      applicable: () => true, // 总是适用
      generateRecommendations: async (user, context) => {
        return this.generatePopularityRecommendations(context);
      },
    });
  }

  private async listPublicRecipes(options: {
    mealTypes?: string[];
    cuisineTypes?: string[];
    maxCookTime?: number;
    season?: string;
    limit?: number;
  }): Promise<RecipeRecord[]> {
    const limit = options.limit ?? 20;
    const result = await convexClient.query<{
      items: RecipeRecord[];
      total: number;
    }>(api.recipes.listPublicDetailed, {
      mealTypes: options.mealTypes,
      cuisineTypes: options.cuisineTypes,
      tags: undefined,
      excludeIds: undefined,
      maxCookTime: options.maxCookTime,
      budgetLimit: undefined,
      season: options.season,
      offset: 0,
      limit: Math.max(limit * 3, 20),
    });

    return result.items;
  }

  /**
   * 基于人口统计的推荐
   */
  private async generateDemographicRecommendations(
    user: UserProfile,
    context: RecommendationContext
  ): Promise<RecipeRecommendation[]> {
    const age = user.demographicInfo?.age;
    const maxCookTime = age && age < 25 ? 45 : undefined;

    const recipes = await this.listPublicRecipes({
      maxCookTime,
      limit: 40,
    });

    const filtered = recipes.filter((recipe: RecipeRecord) => {
      if (!age) return true;

      if (age < 25) {
        const difficulty = recipe.difficulty as string | undefined;
        return difficulty ? difficulty === "EASY" : true;
      }

      if (age > 60) {
        const fiber = (recipe.fiber as number | undefined) ?? 0;
        const sodium = (recipe.sodium as number | undefined) ?? 0;
        return fiber >= 5 && sodium <= 600;
      }

      return true;
    });

    filtered.sort(
      (a, b) =>
        ((b.viewCount as number | undefined) ?? 0) - ((a.viewCount as number | undefined) ?? 0)
    );

    return filtered.slice(0, 20).map((recipe: RecipeRecord) => ({
      recipeId: recipe._id as string,
      score: 70 + Math.random() * 20,
      reasons: ["适合您的年龄段", "热门选择"],
      explanation: "根据您的年龄特征推荐的健康食谱。",
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0.7,
        preferenceMatch: 0.6,
        seasonalMatch: 0,
      },
    }));
  }

  /**
   * 基于饮食偏好的推荐
   */
  private async generateDietaryRecommendations(
    user: UserProfile,
    context: RecommendationContext
  ): Promise<RecipeRecommendation[]> {
    const dietType = user.dietaryPreferences?.dietType;
    const restrictedTerms = new Set(
      [
        ...(user.dietaryPreferences?.restrictions ?? []),
        ...(user.dietaryPreferences?.allergies ?? []),
      ]
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length > 0)
    );

    const recipes = await this.listPublicRecipes({
      limit: 40,
    });

    const filtered = recipes.filter((recipe: RecipeRecord) => {
      const ingredients = (recipe.ingredients as Array<Record<string, unknown>> | undefined) ?? [];

      if (dietType === "VEGETARIAN" || dietType === "VEGAN") {
        const hasMeat = ingredients.some((ingredient) => {
          const food = ingredient.food as Record<string, unknown> | undefined;
          const category = (food?.category as string | undefined) ?? "";
          return ["肉类", "禽肉", "海鲜"].includes(category);
        });
        if (hasMeat) return false;
      }

      if (restrictedTerms.size > 0) {
        const terms = Array.from(restrictedTerms);
        const hasRestricted = ingredients.some((ingredient) => {
          const food = ingredient.food as Record<string, unknown> | undefined;
          const name = (food?.name as string | undefined) ?? "";
          const nameEn = (food?.nameEn as string | undefined) ?? "";
          const combined = `${name} ${nameEn}`.toLowerCase();
          return terms.some((term) => combined.includes(term));
        });
        if (hasRestricted) return false;
      }

      return true;
    });

    filtered.sort(
      (a, b) =>
        ((b.averageRating as number | undefined) ?? 0) -
        ((a.averageRating as number | undefined) ?? 0)
    );

    return filtered.slice(0, 20).map((recipe: RecipeRecord) => ({
      recipeId: recipe._id as string,
      score: 75 + Math.random() * 15,
      reasons: ["符合您的饮食偏好", "高评分"],
      explanation: `根据您的${dietType ?? "当前"}饮食偏好推荐。`,
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0.8,
        preferenceMatch: 0.9,
        seasonalMatch: 0,
      },
    }));
  }

  /**
   * 基于烹饪偏好的推荐
   */
  private async generateCookingRecommendations(
    user: UserProfile,
    context: RecommendationContext
  ): Promise<RecipeRecommendation[]> {
    const skillLevel = user.cookingPreferences?.skillLevel;
    const targetDifficulty = skillLevel ? this.mapSkillLevelToDifficulty(skillLevel) : undefined;

    const maxCookTime = user.cookingPreferences?.timePreference
      ? parseInt(user.cookingPreferences.timePreference)
      : undefined;

    const cuisineTypes = user.cookingPreferences?.cuisinePreference?.length
      ? user.cookingPreferences.cuisinePreference
      : undefined;

    const recipes = await this.listPublicRecipes({
      maxCookTime: maxCookTime && !isNaN(maxCookTime) ? maxCookTime : undefined,
      cuisineTypes,
      limit: 40,
    });

    const filtered = recipes.filter((recipe: RecipeRecord) => {
      if (!targetDifficulty) return true;
      const difficulty = recipe.difficulty as string | undefined;
      return difficulty ? difficulty === targetDifficulty : true;
    });

    filtered.sort(
      (a, b) =>
        ((b.averageRating as number | undefined) ?? 0) -
        ((a.averageRating as number | undefined) ?? 0)
    );

    return filtered.slice(0, 20).map((recipe: RecipeRecord) => ({
      recipeId: recipe._id as string,
      score: 80 + Math.random() * 10,
      reasons: ["适合您的烹饪水平", "符合时间要求"],
      explanation: "根据您的烹饪技能和时间偏好推荐。",
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0.6,
        preferenceMatch: 0.8,
        seasonalMatch: 0,
      },
    }));
  }

  /**
   * 基于健康目标的推荐
   */
  private async generateHealthRecommendations(
    user: UserProfile,
    context: RecommendationContext
  ): Promise<RecipeRecommendation[]> {
    const goalType = user.healthGoals?.goalType;
    const recipes = await this.listPublicRecipes({
      limit: 40,
    });

    const filtered = recipes.filter((recipe: RecipeRecord) => {
      if (!goalType) return true;

      const calories = (recipe.calories as number | undefined) ?? 0;
      const carbs = (recipe.carbs as number | undefined) ?? 0;
      const protein = (recipe.protein as number | undefined) ?? 0;
      const fiber = (recipe.fiber as number | undefined) ?? 0;
      const sodium = (recipe.sodium as number | undefined) ?? 0;

      switch (goalType) {
        case "LOSE_WEIGHT":
          return calories <= 400 && carbs <= 30;
        case "GAIN_MUSCLE":
          return protein >= 25 && calories >= 500;
        case "IMPROVE_HEALTH":
          return fiber >= 5 && sodium <= 600;
        default:
          return true;
      }
    });

    filtered.sort(
      (a, b) =>
        ((b.averageRating as number | undefined) ?? 0) -
        ((a.averageRating as number | undefined) ?? 0)
    );

    return filtered.slice(0, 20).map((recipe: RecipeRecord) => ({
      recipeId: recipe._id as string,
      score: 85 + Math.random() * 10,
      reasons: ["有助于您的健康目标", "营养均衡"],
      explanation: `针对您的${goalType ?? "当前"}目标特别推荐。`,
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0.9,
        preferenceMatch: 0.7,
        seasonalMatch: 0,
      },
    }));
  }

  /**
   * 基于热门度的推荐
   */
  private async generatePopularityRecommendations(
    context: RecommendationContext
  ): Promise<RecipeRecommendation[]> {
    const recipes = await this.listPublicRecipes({
      mealTypes: context.mealType ? [context.mealType] : undefined,
      limit: 40,
    });

    const filtered = recipes.filter(
      (recipe: RecipeRecord) => ((recipe.averageRating as number | undefined) ?? 0) >= 4
    );

    filtered.sort((a, b) => {
      const ratingCountDiff =
        ((b.ratingCount as number | undefined) ?? 0) - ((a.ratingCount as number | undefined) ?? 0);
      if (ratingCountDiff !== 0) return ratingCountDiff;

      const ratingDiff =
        ((b.averageRating as number | undefined) ?? 0) -
        ((a.averageRating as number | undefined) ?? 0);
      if (ratingDiff !== 0) return ratingDiff;

      return (
        ((b.viewCount as number | undefined) ?? 0) - ((a.viewCount as number | undefined) ?? 0)
      );
    });

    return filtered.slice(0, 20).map((recipe: RecipeRecord) => ({
      recipeId: recipe._id as string,
      score: 60 + Math.random() * 20,
      reasons: ["热门推荐", "用户好评"],
      explanation: "这是系统中的热门食谱，深受用户喜爱。",
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0.5,
        preferenceMatch: 0.4,
        seasonalMatch: 0,
      },
    }));
  }

  /**
   * 获取默认推荐
   */
  private async getDefaultRecommendations(
    context: RecommendationContext,
    limit: number
  ): Promise<RecipeRecommendation[]> {
    const recommendations = await this.generatePopularityRecommendations(context);
    return recommendations.slice(0, limit);
  }

  /**
   * 合并推荐结果
   */
  private mergeRecommendations(
    primary: RecipeRecommendation[],
    secondary: RecipeRecommendation[]
  ): RecipeRecommendation[] {
    const merged = new Map<string, RecipeRecommendation>();

    // 添加主要推荐
    primary.forEach((rec) => {
      merged.set(rec.recipeId, rec);
    });

    // 添加次要推荐（去重）
    secondary.forEach((rec) => {
      if (!merged.has(rec.recipeId)) {
        merged.set(rec.recipeId, rec);
      }
    });

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * 映射难度到技能水平
   */
  private mapDifficultyToSkillLevel(difficulty?: string): string {
    const mapping: { [key: string]: string } = {
      NONE: "beginner",
      LOW: "beginner",
      MEDIUM: "intermediate",
      HIGH: "advanced",
      EXTREME: "expert",
    };
    return mapping[difficulty || "MEDIUM"] || "intermediate";
  }

  /**
   * 映射技能水平到难度
   */
  private mapSkillLevelToDifficulty(skillLevel?: string): string {
    const mapping: { [key: string]: string } = {
      beginner: "EASY",
      intermediate: "MEDIUM",
      advanced: "HARD",
      expert: "HARD",
    };
    return mapping[skillLevel || "intermediate"] || "MEDIUM";
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }

  /**
   * 检查是否为冷启动用户
   */
  async isColdStartUser(memberId: string): Promise<boolean> {
    const counts = await convexClient.query<{
      ratingCount: number;
      favoriteCount: number;
      viewCount: number;
    }>(api.recipeInteractions.getMemberInteractionCounts, {
      memberId: memberId as Id<"familyMembers">,
    });

    const COLD_START_THRESHOLD = {
      minRatings: 3,
      minFavorites: 2,
      minViews: 10,
    };

    return (
      counts.ratingCount < COLD_START_THRESHOLD.minRatings &&
      counts.favoriteCount < COLD_START_THRESHOLD.minFavorites &&
      counts.viewCount < COLD_START_THRESHOLD.minViews
    );
  }

  /**
   * 获取可用的冷启动策略
   */
  getAvailableStrategies(): ColdStartStrategy[] {
    return [...this.strategies].sort((a, b) => b.priority - a.priority);
  }

  /**
   * 添加自定义策略
   */
  addStrategy(strategy: ColdStartStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 移除策略
   */
  removeStrategy(strategyName: string): void {
    this.strategies = this.strategies.filter((s) => s.name !== strategyName);
  }
}
