import { PrismaClient } from '@prisma/client';
import { RecipeRecommendation, RecommendationContext } from './recommendation-engine';

interface RecipeFeatures {
  recipeId: string;
  ingredients: string[];
  nutritionProfile: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  cookingTime: number;
  difficulty: string;
  category: string;
  tags: string[];
  costLevel: string;
}

interface UserProfile {
  preferredIngredients: string[];
  avoidedIngredients: string[];
  nutritionPreferences: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
    maxFat?: number;
  };
  cookingPreferences: {
    maxTime?: number;
    preferredDifficulty?: string;
    preferredCategories?: string[];
  };
  costPreference: string;
}

export class ContentFilter {
  private prisma: PrismaClient;
  private featureCache = new Map<string, RecipeFeatures>();
  private profileCache = new Map<string, UserProfile>();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 基于内容的推荐
   */
  async getRecommendations(
    context: RecommendationContext,
    limit: number = 10
  ): Promise<RecipeRecommendation[]> {
    // 获取用户偏好档案
    const userProfile = await this.getUserProfile(context.memberId);
    
    // 获取候选食谱
    const candidateRecipes = await this.getCandidateRecipes(context, limit * 3);
    
    // 提取食谱特征
    const recipeFeatures = await this.extractRecipeFeatures(candidateRecipes);
    
    // 计算内容相似度分数
    const recommendations = recipeFeatures.map(features => {
      const score = this.calculateContentSimilarity(features, userProfile, context);
      
      return {
        recipeId: features.recipeId,
        score,
        reasons: this.generateContentReasons(features, userProfile, score),
        explanation: this.generateContentExplanation(features, userProfile),
        metadata: {
          inventoryMatch: 0,
          priceMatch: this.calculatePriceMatch(features, userProfile),
          nutritionMatch: this.calculateNutritionMatch(features, userProfile),
          preferenceMatch: score / 100,
          seasonalMatch: 0
        }
      };
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 获取相似食谱推荐
   */
  async getSimilarRecipes(
    targetRecipe: any,
    limit: number = 5
  ): Promise<RecipeRecommendation[]> {
    const targetFeatures = await this.extractSingleRecipeFeatures(targetRecipe);
    
    const similarRecipes = await this.prisma.recipe.findMany({
      where: {
        id: { not: targetRecipe.id },
        status: 'PUBLISHED',
        isPublic: true
      },
      take: limit * 2,
      include: {
        ingredients: { include: { food: true } }
      }
    });

    const recommendations = await Promise.all(
      similarRecipes.map(async recipe => {
        const features = await this.extractSingleRecipeFeatures(recipe);
        const similarity = this.calculateRecipeSimilarity(targetFeatures, features);
        
        return {
          recipeId: recipe.id,
          score: similarity * 100,
          reasons: ['相似食谱'],
          explanation: `与《${targetRecipe.name}》食材和制作方法相似。`,
          metadata: {
            inventoryMatch: 0,
            priceMatch: 0,
            nutritionMatch: 0,
            preferenceMatch: similarity,
            seasonalMatch: 0
          }
        };
      })
    );

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 获取用户偏好档案
   */
  private async getUserProfile(memberId: string): Promise<UserProfile> {
    // 检查缓存
    if (this.profileCache.has(memberId)) {
      return this.profileCache.get(memberId)!;
    }

    const [userPreference, healthGoal, recentRatings, recentFavorites] = await Promise.all([
      this.prisma.userPreference.findUnique({
        where: { memberId }
      }),
      this.prisma.healthGoal.findFirst({
        where: { memberId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.recipeRating.findMany({
        where: { memberId, rating: { gte: 4 } },
        include: { recipe: { include: { ingredients: { include: { food: true } } } } },
        orderBy: { ratedAt: 'desc' },
        take: 20
      }),
      this.prisma.recipeFavorite.findMany({
        where: { memberId },
        include: { recipe: { include: { ingredients: { include: { food: true } } } } },
        orderBy: { favoritedAt: 'desc' },
        take: 20
      })
    ]);

    // 从用户行为中学习偏好
    const learnedPreferences = this.learnFromUserBehavior(recentRatings, recentFavorites);

    const profile: UserProfile = {
      preferredIngredients: [
        ...(userPreference?.preferredIngredients ? JSON.parse(userPreference.preferredIngredients) : []),
        ...learnedPreferences.preferredIngredients
      ],
      avoidedIngredients: userPreference?.avoidedIngredients ? JSON.parse(userPreference.avoidedIngredients) : [],
      nutritionPreferences: this.buildNutritionPreferences(healthGoal, userPreference),
      cookingPreferences: {
        maxTime: userPreference?.maxCookTime,
        preferredDifficulty: userPreference?.spiceLevel ? this.mapSpiceToDifficulty(userPreference.spiceLevel) : undefined,
        preferredCategories: learnedPreferences.preferredCategories
      },
      costPreference: userPreference?.costLevel || 'MEDIUM'
    };

    // 缓存档案
    this.profileCache.set(memberId, profile);
    
    return profile;
  }

  /**
   * 从用户行为中学习偏好
   */
  private learnFromUserBehavior(ratings: any[], favorites: any[]): any {
    const allRecipes = [...ratings.map(r => r.recipe), ...favorites.map(f => f.recipe)];
    
    const ingredientCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();

    allRecipes.forEach(recipe => {
      // 统计食材偏好
      recipe.ingredients?.forEach((ing: any) => {
        ingredientCount.set(ing.food.name, (ingredientCount.get(ing.food.name) || 0) + 1);
      });

      // 统计分类偏好
      if (recipe.category) {
        categoryCount.set(recipe.category, (categoryCount.get(recipe.category) || 0) + 1);
      }
    });

    // 提取最偏好的食材和分类
    const preferredIngredients = Array.from(ingredientCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ingredient]) => ingredient);

    const preferredCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    return {
      preferredIngredients,
      preferredCategories
    };
  }

  /**
   * 构建营养偏好
   */
  private buildNutritionPreferences(healthGoal: any, userPreference: any): any {
    const preferences: any = {};

    if (healthGoal) {
      switch (healthGoal.goalType) {
        case 'LOSE_WEIGHT':
          preferences.maxCalories = 400;
          preferences.maxCarbs = healthGoal.carbRatio ? 30 : undefined;
          preferences.minProtein = healthGoal.proteinRatio ? 15 : undefined;
          break;
        case 'GAIN_MUSCLE':
          preferences.minProtein = 25;
          preferences.maxCalories = 800;
          break;
        case 'MAINTAIN':
          preferences.maxCalories = 600;
          preferences.minProtein = 15;
          break;
        case 'IMPROVE_HEALTH':
          preferences.maxFat = 20;
          preferences.maxCalories = 500;
          break;
      }
    }

    // 考虑用户饮食类型
    if (userPreference) {
      if (userPreference.isLowCarb) preferences.maxCarbs = 15;
      if (userPreference.isLowFat) preferences.maxFat = 10;
      if (userPreference.isHighProtein) preferences.minProtein = 20;
    }

    return preferences;
  }

  /**
   * 获取候选食谱
   */
  private async getCandidateRecipes(context: RecommendationContext, limit: number) {
    const whereClause: any = {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null
    };

    if (context.mealType) {
      whereClause.mealTypes = {
        path: [],
        string_contains: context.mealType
      };
    }

    if (context.maxCookTime) {
      whereClause.totalTime = { lte: context.maxCookTime };
    }

    if (context.excludeRecipeIds?.length) {
      whereClause.id = { notIn: context.excludeRecipeIds };
    }

    return this.prisma.recipe.findMany({
      where: whereClause,
      include: {
        ingredients: { include: { food: true } }
      },
      take: limit
    });
  }

  /**
   * 提取食谱特征
   */
  private async extractRecipeFeatures(recipes: any[]): Promise<RecipeFeatures[]> {
    return Promise.all(
      recipes.map(recipe => this.extractSingleRecipeFeatures(recipe))
    );
  }

  /**
   * 提取单个食谱特征
   */
  private async extractSingleRecipeFeatures(recipe: any): Promise<RecipeFeatures> {
    // 检查缓存
    if (this.featureCache.has(recipe.id)) {
      return this.featureCache.get(recipe.id)!;
    }

    const features: RecipeFeatures = {
      recipeId: recipe.id,
      ingredients: recipe.ingredients?.map((ing: any) => ing.food.name) || [],
      nutritionProfile: {
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat
      },
      cookingTime: recipe.totalTime,
      difficulty: recipe.difficulty,
      category: recipe.category,
      tags: recipe.tags ? JSON.parse(recipe.tags) : [],
      costLevel: recipe.costLevel
    };

    // 缓存特征
    this.featureCache.set(recipe.id, features);
    
    return features;
  }

  /**
   * 计算内容相似度
   */
  private calculateContentSimilarity(
    features: RecipeFeatures,
    profile: UserProfile,
    context: RecommendationContext
  ): number {
    let score = 0;

    // 1. 食材匹配 (40分)
    const ingredientScore = this.calculateIngredientMatch(features.ingredients, profile);
    score += ingredientScore * 0.4;

    // 2. 营养匹配 (25分)
    const nutritionScore = this.calculateNutritionMatch(features, profile);
    score += nutritionScore * 0.25;

    // 3. 烹饪偏好匹配 (20分)
    const cookingScore = this.calculateCookingMatch(features, profile, context);
    score += cookingScore * 0.2;

    // 4. 分类和标签匹配 (15分)
    const categoryScore = this.calculateCategoryMatch(features, profile);
    score += categoryScore * 0.15;

    return Math.round(score);
  }

  /**
   * 计算食材匹配分数
   */
  private calculateIngredientMatch(ingredients: string[], profile: UserProfile): number {
    if (ingredients.length === 0) return 0;

    let matchScore = 0;
    let penaltyScore = 0;

    // 计算偏好食材匹配
    const preferredMatches = ingredients.filter(ing => 
      profile.preferredIngredients.includes(ing)
    ).length;
    
    matchScore += (preferredMatches / ingredients.length) * 50;

    // 计算避开食材的惩罚
    const avoidedMatches = ingredients.filter(ing => 
      profile.avoidedIngredients.includes(ing)
    ).length;
    
    penaltyScore = (avoidedMatches / ingredients.length) * 100;

    return Math.max(0, matchScore - penaltyScore);
  }

  /**
   * 计算营养匹配分数
   */
  private calculateNutritionMatch(features: RecipeFeatures, profile: UserProfile): number {
    const { nutritionProfile } = features;
    const { nutritionPreferences } = profile;
    
    let score = 50; // 基础分

    if (nutritionPreferences.maxCalories && nutritionProfile.calories > nutritionPreferences.maxCalories) {
      score -= 30;
    }

    if (nutritionPreferences.minProtein && nutritionProfile.protein < nutritionPreferences.minProtein) {
      score -= 20;
    }

    if (nutritionPreferences.maxCarbs && nutritionProfile.carbs > nutritionPreferences.maxCarbs) {
      score -= 15;
    }

    if (nutritionPreferences.maxFat && nutritionProfile.fat > nutritionPreferences.maxFat) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算烹饪偏好匹配
   */
  private calculateCookingMatch(
    features: RecipeFeatures,
    profile: UserProfile,
    context: RecommendationContext
  ): number {
    let score = 30; // 基础分

    // 时间匹配
    if (profile.cookingPreferences.maxTime) {
      if (features.cookingTime <= profile.cookingPreferences.maxTime) {
        score += 30;
      } else if (features.cookingTime <= profile.cookingPreferences.maxTime * 1.5) {
        score += 15;
      } else {
        score -= 20;
      }
    }

    // 难度匹配
    if (profile.cookingPreferences.preferredDifficulty) {
      const difficultyOrder = ['EASY', 'MEDIUM', 'HARD'];
      const preferredIndex = difficultyOrder.indexOf(profile.cookingPreferences.preferredDifficulty);
      const recipeIndex = difficultyOrder.indexOf(features.difficulty);
      
      if (preferredIndex === recipeIndex) {
        score += 20;
      } else if (Math.abs(preferredIndex - recipeIndex) === 1) {
        score += 10;
      }
    }

    // 上下文时间限制
    if (context.maxCookTime && features.cookingTime <= context.maxCookTime) {
      score += 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算分类匹配分数
   */
  private calculateCategoryMatch(features: RecipeFeatures, profile: UserProfile): number {
    if (!profile.cookingPreferences.preferredCategories) {
      return 50; // 无偏好时给中等分数
    }

    return profile.cookingPreferences.preferredCategories.includes(features.category) ? 100 : 30;
  }

  /**
   * 计算价格匹配
   */
  private calculatePriceMatch(features: RecipeFeatures, profile: UserProfile): number {
    const costScores = {
      LOW: { LOW: 100, MEDIUM: 60, HIGH: 20 },
      MEDIUM: { LOW: 80, MEDIUM: 100, HIGH: 60 },
      HIGH: { LOW: 40, MEDIUM: 70, HIGH: 100 }
    };

    return costScores[profile.costPreference as keyof typeof costScores][features.costLevel as keyof typeof costScores['LOW']] / 100;
  }

  /**
   * 计算食谱间相似度
   */
  private calculateRecipeSimilarity(recipe1: RecipeFeatures, recipe2: RecipeFeatures): number {
    // 食材相似度
    const ingredientSimilarity = this.calculateJaccardSimilarity(
      new Set(recipe1.ingredients),
      new Set(recipe2.ingredients)
    );

    // 营养相似度
    const nutritionSimilarity = this.calculateNutritionSimilarity(
      recipe1.nutritionProfile,
      recipe2.nutritionProfile
    );

    // 综合相似度
    return ingredientSimilarity * 0.7 + nutritionSimilarity * 0.3;
  }

  /**
   * 计算Jaccard相似度
   */
  private calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * 计算营养相似度
   */
  private calculateNutritionSimilarity(nutrition1: any, nutrition2: any): number {
    const normalize = (value: number, max: number) => Math.min(value / max, 1);
    
    const normalized1 = {
      calories: normalize(nutrition1.calories, 1000),
      protein: normalize(nutrition1.protein, 50),
      carbs: normalize(nutrition1.carbs, 100),
      fat: normalize(nutrition1.fat, 50)
    };

    const normalized2 = {
      calories: normalize(nutrition2.calories, 1000),
      protein: normalize(nutrition2.protein, 50),
      carbs: normalize(nutrition2.carbs, 100),
      fat: normalize(nutrition2.fat, 50)
    };

    // 计算欧几里得距离的倒数
    const distance = Math.sqrt(
      Math.pow(normalized1.calories - normalized2.calories, 2) +
      Math.pow(normalized1.protein - normalized2.protein, 2) +
      Math.pow(normalized1.carbs - normalized2.carbs, 2) +
      Math.pow(normalized1.fat - normalized2.fat, 2)
    );

    return Math.max(0, 1 - distance);
  }

  /**
   * 生成内容推荐理由
   */
  private generateContentReasons(features: RecipeFeatures, profile: UserProfile, score: number): string[] {
    const reasons: string[] = [];

    if (score >= 80) {
      reasons.push('高度匹配您的偏好');
    } else if (score >= 60) {
      reasons.push('比较符合您的口味');
    }

    const ingredientMatches = features.ingredients.filter(ing => 
      profile.preferredIngredients.includes(ing)
    ).length;

    if (ingredientMatches > 0) {
      reasons.push(`包含${ingredientMatches}种您喜欢的食材`);
    }

    if (profile.cookingPreferences.preferredCategories?.includes(features.category)) {
      reasons.push('您偏好的菜系');
    }

    return reasons;
  }

  /**
   * 生成内容推荐解释
   */
  private generateContentExplanation(features: RecipeFeatures, profile: UserProfile): string {
    const explanations: string[] = [];

    const ingredientMatches = features.ingredients.filter(ing => 
      profile.preferredIngredients.includes(ing)
    );

    if (ingredientMatches.length > 0) {
      explanations.push(`这道菜使用了您喜欢的${ingredientMatches.slice(0, 3).join('、')}等食材`);
    }

    if (features.cookingTime <= 30) {
      explanations.push('制作时间较短，适合快节奏生活');
    }

    if (features.difficulty === 'EASY') {
      explanations.push('难度简单，适合厨房新手');
    }

    return explanations.length > 0 ? explanations.join('，') + '。' : '基于您的偏好分析推荐。';
  }

  /**
   * 映射辣度到难度
   */
  private mapSpiceToDifficulty(spiceLevel: string): string {
    const mapping: { [key: string]: string } = {
      'NONE': 'EASY',
      'LOW': 'EASY',
      'MEDIUM': 'MEDIUM',
      'HIGH': 'MEDIUM',
      'EXTREME': 'HARD'
    };
    return mapping[spiceLevel] || 'MEDIUM';
  }
}
