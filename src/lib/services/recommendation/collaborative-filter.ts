import type { RecommendationRepository } from "@/lib/repositories/interfaces/recommendation-repository";
import type { RecommendationBehaviorDTO } from "@/lib/repositories/types/recommendation";
import { RecipeRecommendation } from "./recommendation-engine";

interface UserSimilarity {
  userId: string;
  similarity: number;
}

interface ItemSimilarity {
  recipeId: string;
  similarity: number;
}

export class CollaborativeFilter {
  private similarityCache = new Map<string, Map<string, number>>();
  private cacheExpiry = 60 * 60 * 1000;

  constructor(private readonly repository: RecommendationRepository) {}

  async getRecommendations(_memberId: string, limit: number = 10): Promise<RecipeRecommendation[]> {
    const userBehavior = await this.getUserBehavior(_memberId);

    if (userBehavior.ratings.length === 0 && userBehavior.favorites.length === 0) {
      return this.getColdStartRecommendations(limit);
    }

    const otherUsersBehavior = await this.getOtherUsersBehavior(_memberId);

    const [userBasedRecs, itemBasedRecs] = await Promise.all([
      this.getUserBasedRecommendations(userBehavior, otherUsersBehavior, limit),
      this.getItemBasedRecommendations(userBehavior, limit),
    ]);

    return this.combineRecommendations(userBasedRecs, itemBasedRecs);
  }

  private async getUserBasedRecommendations(
    userBehavior: RecommendationBehaviorDTO,
    otherUsersBehavior: Array<{
      memberId: string;
      behavior: RecommendationBehaviorDTO;
    }>,
    limit: number
  ): Promise<RecipeRecommendation[]> {
    const similarUsers = this.findSimilarUsers(userBehavior, otherUsersBehavior, 50);

    if (similarUsers.length === 0) {
      return [];
    }

    const candidateRecipeIds = this.getCandidateRecipeIdsFromUsers(
      similarUsers,
      otherUsersBehavior,
      userBehavior,
      limit * 3
    );

    if (candidateRecipeIds.length === 0) {
      return [];
    }

    const baseScore = this.calculateUserBasedScore(similarUsers);

    return candidateRecipeIds.map((recipeId) => ({
      recipeId,
      score: baseScore,
      reasons: ["相似用户喜欢"],
      explanation: "与您口味相似的用户也喜欢这道菜。",
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0,
        preferenceMatch: baseScore / 100,
        seasonalMatch: 0,
      },
    }));
  }

  private async getItemBasedRecommendations(
    userBehavior: RecommendationBehaviorDTO,
    limit: number
  ): Promise<RecipeRecommendation[]> {
    const likedRecipes = this.getLikedRecipeIds(userBehavior);

    if (likedRecipes.length === 0) {
      return [];
    }

    const similarRecipesPromises = likedRecipes.map((recipeId) =>
      this.findSimilarRecipes(recipeId, 20)
    );

    const similarRecipesResults = await Promise.all(similarRecipesPromises);
    const allSimilarRecipes = similarRecipesResults.flat();

    const candidateRecipes = this.filterAndDeduplicateRecipes(
      allSimilarRecipes,
      likedRecipes,
      limit * 3
    );

    return candidateRecipes.map((recipe) => {
      const score = this.calculateItemBasedScore(recipe, likedRecipes);

      return {
        recipeId: recipe.recipeId,
        score,
        reasons: ["相似食谱推荐"],
        explanation: "基于您喜欢的相似食谱推荐。",
        metadata: {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: score / 100,
          seasonalMatch: 0,
        },
      };
    });
  }

  private findSimilarUsers(
    userBehavior: RecommendationBehaviorDTO,
    otherUsersBehavior: Array<{
      memberId: string;
      behavior: RecommendationBehaviorDTO;
    }>,
    limit: number
  ): UserSimilarity[] {
    const similarities: UserSimilarity[] = [];

    for (const otherUser of otherUsersBehavior) {
      const similarity = this.calculateUserSimilarity(userBehavior, otherUser.behavior);
      if (similarity > 0.1) {
        similarities.push({
          userId: otherUser.memberId,
          similarity,
        });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  private calculateUserSimilarity(
    user1: RecommendationBehaviorDTO,
    user2: RecommendationBehaviorDTO
  ): number {
    const user1Ratings = this.createRatingVector(user1);
    const user2Ratings = this.createRatingVector(user2);

    return this.cosineSimilarity(user1Ratings, user2Ratings);
  }

  private createRatingVector(userBehavior: RecommendationBehaviorDTO): Map<string, number> {
    const vector = new Map<string, number>();

    userBehavior.ratings.forEach((rating) => {
      if (rating.recipeId) {
        vector.set(rating.recipeId, rating.rating ?? 0);
      }
    });

    userBehavior.favorites.forEach((favorite) => {
      if (favorite.recipeId && !vector.has(favorite.recipeId)) {
        vector.set(favorite.recipeId, 5);
      }
    });

    return vector;
  }

  private cosineSimilarity(vector1: Map<string, number>, vector2: Map<string, number>): number {
    const commonItems = Array.from(vector1.keys()).filter((key) => vector2.has(key));

    if (commonItems.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonItems.forEach((item) => {
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

  private async findSimilarRecipes(recipeId: string, limit: number): Promise<ItemSimilarity[]> {
    const cacheKey = `recipe_${recipeId}`;

    if (this.similarityCache.has(cacheKey)) {
      const cached = this.similarityCache.get(cacheKey)!;
      return Array.from(cached.entries())
        .map(([itemId, similarity]) => ({ recipeId: itemId, similarity }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    }

    const cooccurrence = await this.repository.getRecipeCooccurrence(recipeId, limit);

    const maxCount = Math.max(1, ...cooccurrence.map((entry) => entry.count));

    const similarities: ItemSimilarity[] = cooccurrence
      .map((entry) => ({
        recipeId: entry.recipeId,
        similarity: entry.count / maxCount,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    const cacheMap = new Map<string, number>();
    similarities.forEach(({ recipeId: similarId, similarity }) => {
      cacheMap.set(similarId, similarity);
    });
    this.similarityCache.set(cacheKey, cacheMap);

    setTimeout(() => {
      this.similarityCache.delete(cacheKey);
    }, this.cacheExpiry);

    return similarities;
  }

  private async getUserBehavior(memberId: string) {
    return this.repository.getRecipeBehavior(memberId);
  }

  private async getOtherUsersBehavior(memberId: string) {
    return this.repository.listMemberBehaviorSamples({
      excludeMemberId: memberId,
      limit: 1000,
    });
  }

  private getCandidateRecipeIdsFromUsers(
    similarUsers: UserSimilarity[],
    otherUsersBehavior: Array<{
      memberId: string;
      behavior: RecommendationBehaviorDTO;
    }>,
    userBehavior: RecommendationBehaviorDTO,
    limit: number
  ): string[] {
    const behaviorMap = new Map(otherUsersBehavior.map((item) => [item.memberId, item.behavior]));
    const candidates = new Set<string>();
    const knownRecipes = new Set(this.getKnownRecipeIds(userBehavior));

    similarUsers.forEach((user) => {
      const behavior = behaviorMap.get(user.userId);
      if (!behavior) return;

      behavior.ratings
        .filter((rating) => (rating.rating ?? 0) >= 4)
        .forEach((rating) => {
          if (!knownRecipes.has(rating.recipeId)) {
            candidates.add(rating.recipeId);
          }
        });

      behavior.favorites.forEach((favorite) => {
        if (!knownRecipes.has(favorite.recipeId)) {
          candidates.add(favorite.recipeId);
        }
      });
    });

    return Array.from(candidates.values()).slice(0, limit);
  }

  private calculateUserBasedScore(similarUsers: UserSimilarity[]): number {
    if (similarUsers.length === 0) {
      return 0;
    }

    const similaritySum = similarUsers.reduce((sum, user) => sum + user.similarity, 0);
    const averageSimilarity = similaritySum / similarUsers.length;
    return Math.round(averageSimilarity * 100);
  }

  private calculateItemBasedScore(recipe: ItemSimilarity, likedRecipes: string[]): number {
    const similarityScore = recipe.similarity * 100;
    const diversityBonus = Math.min(likedRecipes.length * 5, 20);
    return Math.min(similarityScore + diversityBonus, 100);
  }

  private filterAndDeduplicateRecipes(
    recipes: ItemSimilarity[],
    excludeIds: string[],
    limit: number
  ): ItemSimilarity[] {
    const uniqueRecipes = new Map<string, ItemSimilarity>();

    recipes.forEach((recipe) => {
      if (!excludeIds.includes(recipe.recipeId)) {
        const existing = uniqueRecipes.get(recipe.recipeId);
        if (!existing || recipe.similarity > existing.similarity) {
          uniqueRecipes.set(recipe.recipeId, recipe);
        }
      }
    });

    return Array.from(uniqueRecipes.values()).slice(0, limit);
  }

  private getKnownRecipeIds(userBehavior: RecommendationBehaviorDTO): string[] {
    return [
      ...userBehavior.ratings.map((rating) => rating.recipeId),
      ...userBehavior.favorites.map((favorite) => favorite.recipeId),
      ...userBehavior.views.map((view) => view.recipeId),
    ];
  }

  private getLikedRecipeIds(userBehavior: RecommendationBehaviorDTO): string[] {
    const ratedRecipes = userBehavior.ratings
      .filter((rating) => (rating.rating ?? 0) >= 4)
      .map((rating) => rating.recipeId);
    const favoritedRecipes = userBehavior.favorites.map((favorite) => favorite.recipeId);

    return Array.from(new Set([...ratedRecipes, ...favoritedRecipes]));
  }

  private combineRecommendations(
    userBased: RecipeRecommendation[],
    itemBased: RecipeRecommendation[]
  ): RecipeRecommendation[] {
    const combined = new Map<string, RecipeRecommendation>();
    const userWeight = userBased.length > 0 ? 0.6 : 0;
    const itemWeight = userBased.length > 0 ? 0.4 : 1;

    userBased.forEach((rec) => {
      combined.set(rec.recipeId, {
        ...rec,
        score: rec.score * userWeight,
        reasons: [...rec.reasons, "用户协同过滤"],
      });
    });

    itemBased.forEach((rec) => {
      const existing = combined.get(rec.recipeId);
      if (existing) {
        existing.score += rec.score * itemWeight;
        existing.reasons = [...new Set([...existing.reasons, ...rec.reasons])];
      } else {
        combined.set(rec.recipeId, {
          ...rec,
          score: rec.score * itemWeight,
          reasons: [...rec.reasons, "物品协同过滤"],
        });
      }
    });

    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  private async getColdStartRecommendations(limit: number): Promise<RecipeRecommendation[]> {
    const popularRecipes = await this.repository.listPopularRecipes(limit);

    return popularRecipes.map((recipe) => ({
      recipeId: recipe.id,
      score: (recipe.averageRating ?? 0) * 20,
      reasons: ["热门推荐", "新手推荐"],
      explanation: "这是系统为您推荐的热门食谱，欢迎尝试并反馈您的喜好。",
      metadata: {
        inventoryMatch: 0,
        priceMatch: 0,
        nutritionMatch: 0,
        preferenceMatch: 0.5,
        seasonalMatch: 0,
      },
    }));
  }
}
