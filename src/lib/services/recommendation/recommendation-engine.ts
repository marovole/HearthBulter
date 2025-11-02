import { PrismaClient } from '@prisma/client';
import { RuleBasedRecommender } from './rule-based-recommender';
import { CollaborativeFilter } from './collaborative-filter';
import { ContentFilter } from './content-filter';
import { RecommendationRanker } from './recommendation-ranker';

export interface RecipeRecommendation {
  recipeId: string;
  score: number;
  reasons: string[];
  explanation: string;
  metadata: {
    inventoryMatch: number;
    priceMatch: number;
    nutritionMatch: number;
    preferenceMatch: number;
    seasonalMatch: number;
  };
}

export interface RecommendationContext {
  memberId: string;
  mealType?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  servings?: number;
  maxCookTime?: number;
  budgetLimit?: number;
  dietaryRestrictions?: string[];
  excludedIngredients?: string[];
  preferredCuisines?: string[];
  season?: 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
}

export interface RecommendationWeights {
  inventory: number;
  price: number;
  nutrition: number;
  preference: number;
  seasonal: number;
}

export class RecommendationEngine {
  private prisma: PrismaClient;
  private ruleBasedRecommender: RuleBasedRecommender;
  private collaborativeFilter: CollaborativeFilter;
  private contentFilter: ContentFilter;
  private ranker: RecommendationRanker;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.ruleBasedRecommender = new RuleBasedRecommender(prisma);
    this.collaborativeFilter = new CollaborativeFilter(prisma);
    this.contentFilter = new ContentFilter(prisma);
    this.ranker = new RecommendationRanker(prisma);
  }

  /**
   * 获取智能食谱推荐
   */
  async getRecommendations(
    context: RecommendationContext,
    limit: number = 10,
    weights?: Partial<RecommendationWeights>
  ): Promise<RecipeRecommendation[]> {
    // 获取用户偏好和权重设置
    const userPreference = await this.prisma.userPreference.findUnique({
      where: { memberId: context.memberId },
    });

    const defaultWeights: RecommendationWeights = {
      inventory: 0.3,
      price: 0.2,
      nutrition: 0.3,
      preference: 0.15,
      seasonal: 0.05,
    };

    const finalWeights = {
      ...defaultWeights,
      ...weights,
      ...(userPreference?.recommendationWeight as RecommendationWeights),
    };

    // 并行获取不同策略的推荐结果
    const [
      ruleBasedResults,
      collaborativeResults,
      contentResults,
    ] = await Promise.all([
      this.ruleBasedRecommender.getRecommendations(context, limit * 2),
      this.collaborativeFilter.getRecommendations(context.memberId, limit * 2),
      this.contentFilter.getRecommendations(context, limit * 2),
    ]);

    // 合并和去重推荐结果
    const allCandidates = this.mergeCandidates([
      ruleBasedResults,
      collaborativeResults,
      contentResults,
    ]);

    // 使用排名算法对候选食谱进行排序
    const rankedRecommendations = await this.ranker.rankRecipes(
      allCandidates,
      context,
      finalWeights
    );

    // 生成推荐理由和解释
    const recommendationsWithExplanation = await this.generateExplanations(
      rankedRecommendations.slice(0, limit),
      context,
      finalWeights
    );

    return recommendationsWithExplanation;
  }

  /**
   * 刷新推荐结果（换一批）
   */
  async refreshRecommendations(
    context: RecommendationContext,
    excludeRecipeIds: string[],
    limit: number = 10
  ): Promise<RecipeRecommendation[]> {
    // 获取推荐时排除已推荐的食谱
    const extendedContext = {
      ...context,
      excludeRecipeIds,
    };

    return this.getRecommendations(extendedContext, limit);
  }

  /**
   * 获取相似食谱推荐
   */
  async getSimilarRecipes(
    recipeId: string,
    limit: number = 5
  ): Promise<RecipeRecommendation[]> {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: { food: true },
        },
        tags: true,
      },
    });

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // 基于内容相似度获取推荐
    const similarRecipes = await this.contentFilter.getSimilarRecipes(
      recipe,
      limit
    );

    return similarRecipes;
  }

  /**
   * 获取热门食谱推荐
   */
  async getPopularRecipes(
    limit: number = 10,
    category?: string
  ): Promise<RecipeRecommendation[]> {
    const whereClause: any = {
      status: 'PUBLISHED',
      isPublic: true,
      averageRating: { gte: 4.0 },
    };

    if (category) {
      whereClause.category = category;
    }

    const popularRecipes = await this.prisma.recipe.findMany({
      where: whereClause,
      orderBy: [
        { averageRating: 'desc' },
        { ratingCount: 'desc' },
        { viewCount: 'desc' },
      ],
      take: limit,
      include: {
        ingredients: {
          include: { food: true },
        },
      },
    });

    return popularRecipes.map(recipe => ({
      recipeId: recipe.id,
      score: recipe.averageRating,
      reasons: ['热门推荐', '高评分'],
      explanation: `此食谱评分${recipe.averageRating}分，已有${recipe.ratingCount}人评价，深受用户喜爱。`,
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0,
        preferenceMatch: 0,
        seasonalMatch: 0,
      },
    }));
  }

  /**
   * 合并不同策略的候选食谱
   */
  private mergeCandidates(candidates: RecipeRecommendation[][]): Map<string, RecipeRecommendation> {
    const merged = new Map<string, RecipeRecommendation>();

    candidates.forEach(candidateList => {
      candidateList.forEach(candidate => {
        const existing = merged.get(candidate.recipeId);
        if (!existing || candidate.score > existing.score) {
          merged.set(candidate.recipeId, candidate);
        }
      });
    });

    return merged;
  }

  /**
   * 生成推荐理由和解释
   */
  private async generateExplanations(
    recommendations: RecipeRecommendation[],
    context: RecommendationContext,
    weights: RecommendationWeights
  ): Promise<RecipeRecommendation[]> {
    return Promise.all(
      recommendations.map(async rec => {
        const reasons: string[] = [];
        const explanationParts: string[] = [];

        // 基于权重生成理由
        if (rec.metadata.inventoryMatch > 0.7) {
          reasons.push('现有食材充足');
          explanationParts.push('您现有的食材可以制作这道菜');
        }

        if (rec.metadata.priceMatch > 0.7) {
          reasons.push('经济实惠');
          explanationParts.push('成本符合您的预算要求');
        }

        if (rec.metadata.nutritionMatch > 0.7) {
          reasons.push('营养均衡');
          explanationParts.push('营养成分符合您的健康目标');
        }

        if (rec.metadata.preferenceMatch > 0.7) {
          reasons.push('符合口味');
          explanationParts.push('根据您的口味偏好推荐');
        }

        if (rec.metadata.seasonalMatch > 0.7) {
          reasons.push('当季食材');
          explanationParts.push('使用当季新鲜食材制作');
        }

        return {
          ...rec,
          reasons: reasons.length > 0 ? reasons : ['综合推荐'],
          explanation: explanationParts.length > 0 
            ? `${explanationParts.join('，')}。`
            : '根据多维度分析为您推荐这道菜。',
        };
      })
    );
  }

  /**
   * 更新用户偏好模型
   */
  async updateUserPreferences(memberId: string): Promise<void> {
    // 分析用户行为数据
    const [ratings, favorites, views] = await Promise.all([
      this.prisma.recipeRating.findMany({
        where: { memberId },
        include: { recipe: true },
      }),
      this.prisma.recipeFavorite.findMany({
        where: { memberId },
        include: { recipe: true },
      }),
      this.prisma.recipeView.findMany({
        where: { memberId },
        include: { recipe: true },
        orderBy: { viewedAt: 'desc' },
        take: 50,
      }),
    ]);

    // 调用AI服务分析偏好
    const learnedPreferences = await this.analyzeUserBehavior({
      ratings,
      favorites,
      views,
    });

    // 更新用户偏好记录
    await this.prisma.userPreference.upsert({
      where: { memberId },
      update: {
        learnedPreferences,
        preferenceScore: learnedPreferences.confidence,
        lastAnalyzedAt: new Date(),
      },
      create: {
        memberId,
        learnedPreferences,
        preferenceScore: learnedPreferences.confidence,
        lastAnalyzedAt: new Date(),
      },
    });
  }

  /**
   * 分析用户行为数据（AI服务）
   */
  private async analyzeUserBehavior(data: {
    ratings: any[];
    favorites: any[];
    views: any[];
  }): Promise<{ preferences: any; confidence: number }> {
    // 这里可以集成AI服务进行偏好分析
    // 暂时返回基础分析结果
    const highRatedRecipes = data.ratings.filter(r => r.rating >= 4);
    const favoriteRecipes = data.favorites;
    
    // 提取偏好菜系、食材等
    const preferredCuisines = this.extractCuisines([...highRatedRecipes, ...favoriteRecipes]);
    const preferredIngredients = this.extractIngredients([...highRatedRecipes, ...favoriteRecipes]);
    
    return {
      preferences: {
        preferredCuisines,
        preferredIngredients,
        avgRating: data.ratings.reduce((sum, r) => sum + r.rating, 0) / data.ratings.length || 0,
        favoriteCount: favoriteRecipes.length,
      },
      confidence: Math.min(data.ratings.length + favoriteRecipes.length, 100) / 100,
    };
  }

  private extractCuisines(recipes: any[]): string[] {
    const cuisineCount = new Map<string, number>();
    recipes.forEach(r => {
      if (r.recipe.cuisine) {
        cuisineCount.set(r.recipe.cuisine, (cuisineCount.get(r.recipe.cuisine) || 0) + 1);
      }
    });
    return Array.from(cuisineCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine]) => cuisine);
  }

  private extractIngredients(recipes: any[]): string[] {
    const ingredientCount = new Map<string, number>();
    recipes.forEach(r => {
      r.recipe.ingredients?.forEach((ing: any) => {
        ingredientCount.set(ing.food.name, (ingredientCount.get(ing.food.name) || 0) + 1);
      });
    });
    return Array.from(ingredientCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ingredient]) => ingredient);
  }
}
