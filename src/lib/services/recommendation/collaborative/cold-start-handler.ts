import { PrismaClient } from "@prisma/client";
import {
  RecipeRecommendation,
  RecommendationContext,
} from "../recommendation-engine";

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
    context: RecommendationContext,
  ) => Promise<RecipeRecommendation[]>;
}

export class ColdStartHandler {
  private prisma: PrismaClient;
  private strategies: ColdStartStrategy[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.initializeStrategies();
  }

  /**
   * 处理冷启动问题
   */
  async handleColdStart(
    memberId: string,
    context: RecommendationContext,
    limit: number = 10,
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
    let recommendations = await primaryStrategy.generateRecommendations(
      userProfile,
      context,
    );

    // 如果推荐数量不足，使用次要策略补充
    if (recommendations.length < limit && applicableStrategies.length > 1) {
      const secondaryStrategy = applicableStrategies[1];
      const secondaryRecommendations =
        await secondaryStrategy.generateRecommendations(userProfile, context);

      // 合并并去重
      const combined = this.mergeRecommendations(
        recommendations,
        secondaryRecommendations,
      );
      recommendations = combined.slice(0, limit);
    }

    return recommendations.slice(0, limit);
  }

  /**
   * 构建用户档案
   */
  private async buildUserProfile(memberId: string): Promise<UserProfile> {
    const [member, userPreference, healthGoal] = await Promise.all([
      this.prisma.familyMember.findUnique({
        where: { id: memberId },
        include: { user: true },
      }),
      this.prisma.userPreference.findUnique({
        where: { memberId },
      }),
      this.prisma.healthGoal.findFirst({
        where: { memberId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const profile: UserProfile = {};

    // 人口统计信息
    if (member) {
      profile.demographicInfo = {
        age: member.age,
        gender: member.gender,
        location: member.user?.region,
      };
    }

    // 饮食偏好
    if (userPreference) {
      profile.dietaryPreferences = {
        dietType: userPreference.dietType,
        allergies: [], // 需要从其他地方获取
        restrictions: [],
      };

      if (userPreference.isVegetarian || userPreference.isVegan) {
        profile.dietaryPreferences.restrictions?.push("meat");
      }
      if (userPreference.isGlutenFree) {
        profile.dietaryPreferences.restrictions?.push("gluten");
      }
      if (userPreference.isDairyFree) {
        profile.dietaryPreferences.restrictions?.push("dairy");
      }

      profile.cookingPreferences = {
        skillLevel: this.mapDifficultyToSkillLevel(userPreference.spiceLevel),
        timePreference: userPreference.maxCookTime
          ? `${userPreference.maxCookTime}min`
          : undefined,
        cuisinePreference: userPreference.preferredCuisines
          ? JSON.parse(userPreference.preferredCuisines)
          : [],
      };
    }

    // 健康目标
    if (healthGoal) {
      profile.healthGoals = {
        goalType: healthGoal.goalType,
        targetWeight: healthGoal.targetWeight,
        activityLevel: healthGoal.activityLevel,
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

  /**
   * 基于人口统计的推荐
   */
  private async generateDemographicRecommendations(
    user: UserProfile,
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const whereClause: any = {
      status: "PUBLISHED",
      isPublic: true,
    };

    // 基于年龄调整
    if (user.demographicInfo?.age) {
      if (user.demographicInfo.age < 25) {
        // 年轻用户：偏向简单、快捷的食谱
        whereClause.totalTime = { lte: 45 };
        whereClause.difficulty = "EASY";
      } else if (user.demographicInfo.age > 60) {
        // 老年用户：偏向营养、易消化的食谱
        whereClause.fiber = { gte: 5 };
        whereClause.sodium = { lte: 600 };
      }
    }

    const recipes = await this.prisma.recipe.findMany({
      where: whereClause,
      orderBy: { viewCount: "desc" },
      take: 20,
    });

    return recipes.map((recipe) => ({
      recipeId: recipe.id,
      score: 70 + Math.random() * 20, // 基础分 + 随机变化
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
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const whereClause: any = {
      status: "PUBLISHED",
      isPublic: true,
    };

    // 饮食类型过滤
    if (user.dietaryPreferences?.dietType) {
      switch (user.dietaryPreferences.dietType) {
      case "VEGETARIAN":
      case "VEGAN":
        // 需要检查食谱是否包含肉类
        whereClause.ingredients = {
          none: {
            food: {
              category: {
                in: ["肉类", "禽肉", "海鲜"],
              },
            },
          },
        };
        break;
      }
    }

    // 过敏原和限制
    if (user.dietaryPreferences?.restrictions?.length) {
      // 这里需要更复杂的逻辑来过滤包含特定成分的食谱
    }

    const recipes = await this.prisma.recipe.findMany({
      where: whereClause,
      orderBy: { averageRating: "desc" },
      take: 20,
    });

    return recipes.map((recipe) => ({
      recipeId: recipe.id,
      score: 75 + Math.random() * 15,
      reasons: ["符合您的饮食偏好", "高评分"],
      explanation: `根据您的${user.dietaryPreferences?.dietType}饮食偏好推荐。`,
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
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const whereClause: any = {
      status: "PUBLISHED",
      isPublic: true,
    };

    // 技能水平
    if (user.cookingPreferences?.skillLevel) {
      whereClause.difficulty = this.mapSkillLevelToDifficulty(
        user.cookingPreferences.skillLevel,
      );
    }

    // 时间偏好
    if (user.cookingPreferences?.timePreference) {
      const maxTime = parseInt(user.cookingPreferences.timePreference);
      if (!isNaN(maxTime)) {
        whereClause.totalTime = { lte: maxTime };
      }
    }

    // 菜系偏好
    if (user.cookingPreferences?.cuisinePreference?.length) {
      whereClause.cuisine = { in: user.cookingPreferences.cuisinePreference };
    }

    const recipes = await this.prisma.recipe.findMany({
      where: whereClause,
      orderBy: { averageRating: "desc" },
      take: 20,
    });

    return recipes.map((recipe) => ({
      recipeId: recipe.id,
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
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const whereClause: any = {
      status: "PUBLISHED",
      isPublic: true,
    };

    // 根据健康目标调整营养要求
    if (user.healthGoals?.goalType) {
      switch (user.healthGoals.goalType) {
      case "LOSE_WEIGHT":
        whereClause.calories = { lte: 400 };
        whereClause.carbs = { lte: 30 };
        break;
      case "GAIN_MUSCLE":
        whereClause.protein = { gte: 25 };
        whereClause.calories = { gte: 500 };
        break;
      case "IMPROVE_HEALTH":
        whereClause.fiber = { gte: 5 };
        whereClause.sodium = { lte: 600 };
        break;
      }
    }

    const recipes = await this.prisma.recipe.findMany({
      where: whereClause,
      orderBy: { averageRating: "desc" },
      take: 20,
    });

    return recipes.map((recipe) => ({
      recipeId: recipe.id,
      score: 85 + Math.random() * 10,
      reasons: ["有助于您的健康目标", "营养均衡"],
      explanation: `针对您的${user.healthGoals?.goalType}目标特别推荐。`,
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
    context: RecommendationContext,
  ): Promise<RecipeRecommendation[]> {
    const whereClause: any = {
      status: "PUBLISHED",
      isPublic: true,
      averageRating: { gte: 4.0 },
    };

    if (context.mealType) {
      whereClause.mealTypes = {
        path: [],
        string_contains: context.mealType,
      };
    }

    const recipes = await this.prisma.recipe.findMany({
      where: whereClause,
      orderBy: [
        { ratingCount: "desc" },
        { averageRating: "desc" },
        { viewCount: "desc" },
      ],
      take: 20,
    });

    return recipes.map((recipe) => ({
      recipeId: recipe.id,
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
    limit: number,
  ): Promise<RecipeRecommendation[]> {
    return this.generatePopularityRecommendations(context).slice(0, limit);
  }

  /**
   * 合并推荐结果
   */
  private mergeRecommendations(
    primary: RecipeRecommendation[],
    secondary: RecipeRecommendation[],
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

  /**
   * 检查是否为冷启动用户
   */
  async isColdStartUser(memberId: string): Promise<boolean> {
    const [ratingCount, favoriteCount, viewCount] = await Promise.all([
      this.prisma.recipeRating.count({ where: { memberId } }),
      this.prisma.recipeFavorite.count({ where: { memberId } }),
      this.prisma.recipeView.count({ where: { memberId } }),
    ]);

    // 定义冷启动阈值
    const COLD_START_THRESHOLD = {
      minRatings: 3,
      minFavorites: 2,
      minViews: 10,
    };

    return (
      ratingCount < COLD_START_THRESHOLD.minRatings &&
      favoriteCount < COLD_START_THRESHOLD.minFavorites &&
      viewCount < COLD_START_THRESHOLD.minViews
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
