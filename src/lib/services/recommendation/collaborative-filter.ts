import { PrismaClient } from '@prisma/client';
import { RecipeRecommendation } from './recommendation-engine';

interface UserSimilarity {
  userId: string;
  similarity: number;
}

interface ItemSimilarity {
  itemId: string;
  similarity: number;
}

export class CollaborativeFilter {
  private prisma: PrismaClient;
  private similarityCache = new Map<string, Map<string, number>>();
  private cacheExpiry = 60 * 60 * 1000; // 1小时缓存

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 基于协同过滤的推荐
   */
  async getRecommendations(
    memberId: string,
    limit: number = 10
  ): Promise<RecipeRecommendation[]> {
    // 获取用户行为数据
    const userBehavior = await this.getUserBehavior(memberId);
    
    if (userBehavior.ratings.length === 0 && userBehavior.favorites.length === 0) {
      // 冷启动：返回热门推荐
      return this.getColdStartRecommendations(limit);
    }

    // 并行计算基于用户和基于物品的推荐
    const [userBasedRecs, itemBasedRecs] = await Promise.all([
      this.getUserBasedRecommendations(memberId, userBehavior, limit),
      this.getItemBasedRecommendations(memberId, userBehavior, limit)
    ]);

    // 混合两种推荐结果
    const hybridRecs = this.combineRecommendations(userBasedRecs, itemBasedRecs);
    
    return hybridRecs.slice(0, limit);
  }

  /**
   * 基于用户的协同过滤
   */
  private async getUserBasedRecommendations(
    memberId: string,
    userBehavior: any,
    limit: number
  ): Promise<RecipeRecommendation[]> {
    // 找到相似用户
    const similarUsers = await this.findSimilarUsers(memberId, userBehavior, 50);
    
    if (similarUsers.length === 0) {
      return [];
    }

    // 获取相似用户喜欢但当前用户未接触的食谱
    const candidateRecipes = await this.getCandidateRecipesFromUsers(
      memberId,
      similarUsers,
      limit * 3
    );

    // 计算推荐分数
    const recommendations = candidateRecipes.map(recipe => {
      const score = this.calculateUserBasedScore(recipe, similarUsers, userBehavior);
      
      return {
        recipeId: recipe.id,
        score,
        reasons: ['相似用户喜欢'],
        explanation: `与您口味相似的用户也喜欢这道菜。`,
        metadata: {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: score / 100,
          seasonalMatch: 0
        }
      };
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * 基于物品的协同过滤
   */
  private async getItemBasedRecommendations(
    memberId: string,
    userBehavior: any,
    limit: number
  ): Promise<RecipeRecommendation[]> {
    // 获取用户喜欢的食谱
    const likedRecipes = [
      ...userBehavior.ratings.filter((r: any) => r.rating >= 4).map((r: any) => r.recipeId),
      ...userBehavior.favorites.map((f: any) => f.recipeId)
    ];

    if (likedRecipes.length === 0) {
      return [];
    }

    // 为每个喜欢的食谱找到相似食谱
    const similarRecipesPromises = likedRecipes.map(recipeId =>
      this.findSimilarRecipes(recipeId, 20)
    );

    const similarRecipesResults = await Promise.all(similarRecipesPromises);
    const allSimilarRecipes = similarRecipesResults.flat();

    // 去重和过滤
    const candidateRecipes = this.filterAndDeduplicateRecipes(
      allSimilarRecipes,
      likedRecipes,
      limit * 3
    );

    // 计算推荐分数
    const recommendations = candidateRecipes.map(recipe => {
      const score = this.calculateItemBasedScore(recipe, likedRecipes);
      
      return {
        recipeId: recipe.id,
        score,
        reasons: ['相似食谱推荐'],
        explanation: `基于您喜欢的相似食谱推荐。`,
        metadata: {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: score / 100,
          seasonalMatch: 0
        }
      };
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * 找到相似用户
   */
  private async findSimilarUsers(
    memberId: string,
    userBehavior: any,
    limit: number
  ): Promise<UserSimilarity[]> {
    // 获取其他用户的行为数据
    const otherUsersBehavior = await this.getOtherUsersBehavior(memberId);
    
    const similarities: UserSimilarity[] = [];

    for (const otherUser of otherUsersBehavior) {
      const similarity = this.calculateUserSimilarity(userBehavior, otherUser);
      if (similarity > 0.1) { // 只保留有一定相似度的用户
        similarities.push({
          userId: otherUser.memberId,
          similarity
        });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * 计算用户相似度（余弦相似度）
   */
  private calculateUserSimilarity(user1: any, user2: any): number {
    const user1Ratings = this.createRatingVector(user1);
    const user2Ratings = this.createRatingVector(user2);

    return this.cosineSimilarity(user1Ratings, user2Ratings);
  }

  /**
   * 创建评分向量
   */
  private createRatingVector(userBehavior: any): Map<string, number> {
    const vector = new Map<string, number>();

    // 添加评分数据
    userBehavior.ratings.forEach((rating: any) => {
      vector.set(rating.recipeId, rating.rating);
    });

    // 添加收藏数据（收藏视为5分）
    userBehavior.favorites.forEach((favorite: any) => {
      if (!vector.has(favorite.recipeId)) {
        vector.set(favorite.recipeId, 5);
      }
    });

    return vector;
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vector1: Map<string, number>, vector2: Map<string, number>): number {
    const commonItems = Array.from(vector1.keys()).filter(key => vector2.has(key));
    
    if (commonItems.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonItems.forEach(item => {
      const rating1 = vector1.get(item) || 0;
      const rating2 = vector2.get(item) || 0;
      
      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    });

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 找到相似食谱
   */
  private async findSimilarRecipes(recipeId: string, limit: number): Promise<ItemSimilarity[]> {
    const cacheKey = `recipe_${recipeId}`;
    
    // 检查缓存
    if (this.similarityCache.has(cacheKey)) {
      const cached = this.similarityCache.get(cacheKey)!;
      return Array.from(cached.entries())
        .map(([itemId, similarity]) => ({ itemId, similarity }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    }

    // 获取食谱的共现数据
    const cooccurrence = await this.getRecipeCooccurrence(recipeId);
    
    const similarities: ItemSimilarity[] = Array.from(cooccurrence.entries())
      .map(([itemId, count]) => ({
        itemId,
        similarity: count / 100 // 简化的相似度计算
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // 缓存结果
    const cacheMap = new Map<string, number>();
    similarities.forEach(({ itemId, similarity }) => {
      cacheMap.set(itemId, similarity);
    });
    this.similarityCache.set(cacheKey, cacheMap);

    // 设置缓存过期
    setTimeout(() => {
      this.similarityCache.delete(cacheKey);
    }, this.cacheExpiry);

    return similarities;
  }

  /**
   * 获取食谱共现数据
   */
  private async getRecipeCooccurrence(recipeId: string): Promise<Map<string, number>> {
    // 获取同时喜欢这个食谱和其他食谱的用户数
    const cooccurrence = new Map<string, number>();

    // 获取喜欢这个食谱的用户
    const users = await this.prisma.$queryRaw`
      SELECT DISTINCT "memberId" 
      FROM (
        SELECT "memberId", "recipeId" FROM "recipe_ratings" WHERE "rating" >= 4
        UNION ALL
        SELECT "memberId", "recipeId" FROM "recipe_favorites"
      ) AS user_actions
      WHERE "recipeId" = ${recipeId}
    `;

    if (!Array.isArray(users) || users.length === 0) {
      return cooccurrence;
    }

    const userIds = (users as any[]).map(u => u.memberId);

    // 获取这些用户喜欢的其他食谱
    const otherRecipes = await this.prisma.$queryRaw`
      SELECT "recipeId", COUNT(*) as count
      FROM (
        SELECT "memberId", "recipeId" FROM "recipe_ratings" 
        WHERE "rating" >= 4 AND "memberId" = ANY(${userIds})
        UNION ALL
        SELECT "memberId", "recipeId" FROM "recipe_favorites" 
        WHERE "memberId" = ANY(${userIds})
      ) AS user_actions
      WHERE "recipeId" != ${recipeId}
      GROUP BY "recipeId"
      ORDER BY count DESC
      LIMIT 50
    `;

    if (Array.isArray(otherRecipes)) {
      (otherRecipes as any[]).forEach(({ recipeId, count }) => {
        cooccurrence.set(recipeId, count);
      });
    }

    return cooccurrence;
  }

  /**
   * 获取用户行为数据
   */
  private async getUserBehavior(memberId: string) {
    const [ratings, favorites] = await Promise.all([
      this.prisma.recipeRating.findMany({
        where: { memberId },
        select: { recipeId: true, rating: true }
      }),
      this.prisma.recipeFavorite.findMany({
        where: { memberId },
        select: { recipeId: true }
      })
    ]);

    return { ratings, favorites };
  }

  /**
   * 获取其他用户的行为数据
   */
  private async getOtherUsersBehavior(memberId: string) {
    // 获取有评分或收藏行为的其他用户
    const otherUsers = await this.prisma.$queryRaw`
      SELECT DISTINCT "memberId"
      FROM (
        SELECT "memberId" FROM "recipe_ratings" WHERE "memberId" != ${memberId}
        UNION ALL
        SELECT "memberId" FROM "recipe_favorites" WHERE "memberId" != ${memberId}
      ) AS users
      LIMIT 1000
    `;

    if (!Array.isArray(otherUsers)) {
      return [];
    }

    const userIds = (otherUsers as any[]).map(u => u.memberId);

    // 批量获取这些用户的行为数据
    const behaviors = await Promise.all(
      userIds.map(async (userId: string) => {
        const [ratings, favorites] = await Promise.all([
          this.prisma.recipeRating.findMany({
            where: { memberId: userId },
            select: { recipeId: true, rating: true }
          }),
          this.prisma.recipeFavorite.findMany({
            where: { memberId: userId },
            select: { recipeId: true }
          })
        ]);

        return { memberId: userId, ratings, favorites };
      })
    );

    return behaviors;
  }

  /**
   * 从相似用户获取候选食谱
   */
  private async getCandidateRecipesFromUsers(
    memberId: string,
    similarUsers: UserSimilarity[],
    limit: number
  ) {
    const userIds = similarUsers.map(u => u.userId);
    
    return this.prisma.recipe.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        id: {
          notIn: await this.getUserKnownRecipes(memberId)
        }
      },
      take: limit
    });
  }

  /**
   * 获取用户已知的食谱
   */
  private async getUserKnownRecipes(memberId: string): Promise<string[]> {
    const [rated, favorited, viewed] = await Promise.all([
      this.prisma.recipeRating.findMany({
        where: { memberId },
        select: { recipeId: true }
      }),
      this.prisma.recipeFavorite.findMany({
        where: { memberId },
        select: { recipeId: true }
      }),
      this.prisma.recipeView.findMany({
        where: { memberId },
        select: { recipeId: true }
      })
    ]);

    return [
      ...rated.map(r => r.recipeId),
      ...favorited.map(f => f.recipeId),
      ...viewed.map(v => v.recipeId)
    ];
  }

  /**
   * 计算基于用户的推荐分数
   */
  private calculateUserBasedScore(
    recipe: any,
    similarUsers: UserSimilarity[],
    userBehavior: any
  ): number {
    let weightedSum = 0;
    let similaritySum = 0;

    similarUsers.forEach(user => {
      // 简化：假设相似用户都会喜欢这个食谱
      const predictedRating = 4.0; // 预测评分
      weightedSum += user.similarity * predictedRating;
      similaritySum += user.similarity;
    });

    if (similaritySum === 0) {
      return 0;
    }

    const predictedScore = weightedSum / similaritySum;
    return Math.round(predictedScore * 20); // 转换为0-100分制
  }

  /**
   * 计算基于物品的推荐分数
   */
  private calculateItemBasedScore(recipe: any, likedRecipes: string[]): number {
    // 简化：基于相似食谱的数量计算分数
    const similarityCount = likedRecipes.length;
    return Math.min(similarityCount * 15, 80);
  }

  /**
   * 过滤和去重食谱
   */
  private filterAndDeduplicateRecipes(
    recipes: ItemSimilarity[],
    excludeIds: string[],
    limit: number
  ): any[] {
    const uniqueRecipes = new Map<string, ItemSimilarity>();

    recipes.forEach(recipe => {
      if (!excludeIds.includes(recipe.itemId)) {
        const existing = uniqueRecipes.get(recipe.itemId);
        if (!existing || recipe.similarity > existing.similarity) {
          uniqueRecipes.set(recipe.itemId, recipe);
        }
      }
    });

    return Array.from(uniqueRecipes.values()).slice(0, limit);
  }

  /**
   * 混合推荐结果
   */
  private combineRecommendations(
    userBased: RecipeRecommendation[],
    itemBased: RecipeRecommendation[]
  ): RecipeRecommendation[] {
    const combined = new Map<string, RecipeRecommendation>();

    // 添加基于用户的推荐（权重0.6）
    userBased.forEach(rec => {
      combined.set(rec.recipeId, {
        ...rec,
        score: rec.score * 0.6,
        reasons: [...rec.reasons, '用户协同过滤']
      });
    });

    // 添加基于物品的推荐（权重0.4）
    itemBased.forEach(rec => {
      const existing = combined.get(rec.recipeId);
      if (existing) {
        existing.score += rec.score * 0.4;
        existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
      } else {
        combined.set(rec.recipeId, {
          ...rec,
          score: rec.score * 0.4,
          reasons: [...rec.reasons, '物品协同过滤']
        });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 冷启动推荐
   */
  private async getColdStartRecommendations(limit: number): Promise<RecipeRecommendation[]> {
    const popularRecipes = await this.prisma.recipe.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        averageRating: { gte: 4.0 }
      },
      orderBy: [
        { ratingCount: 'desc' },
        { averageRating: 'desc' }
      ],
      take: limit
    });

    return popularRecipes.map(recipe => ({
      recipeId: recipe.id,
      score: recipe.averageRating * 20,
      reasons: ['热门推荐', '新手推荐'],
      explanation: '这是系统为您推荐的热门食谱，欢迎尝试并反馈您的喜好。',
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0,
        preferenceMatch: 0.5,
        seasonalMatch: 0
      }
    }));
  }
}
