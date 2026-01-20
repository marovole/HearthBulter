import type {
  RecommendationRepository,
  RecipeDetailDTO,
} from "@/lib/repositories/interfaces/recommendation-repository";
import {
  RecipeRecommendation,
  RecommendationContext,
  RecommendationWeights,
} from "./recommendation-engine";

interface RankingFeatures {
  recipeId: string;
  baseScore: number;
  popularityScore: number;
  freshnessScore: number;
  diversityScore: number;
  personalizationScore: number;
  qualityScore: number;
}

export class RecommendationRanker {
  constructor(private readonly repository: RecommendationRepository) {}

  async rankRecipes(
    candidates: RecipeRecommendation[],
    context: RecommendationContext,
    weights: RecommendationWeights
  ): Promise<RecipeRecommendation[]> {
    const { features, recipeDetails } = await this.extractRankingFeatures(candidates, context);

    const rankedRecipes = features.map((feature) => {
      const finalScore = this.calculateFinalScore(feature, weights);

      return {
        recipeId: feature.recipeId,
        score: finalScore,
        reasons: this.generateRankingReasons(feature),
        explanation: this.generateRankingExplanation(feature, weights),
        metadata: {
          inventoryMatch: 0,
          priceMatch: 0,
          nutritionMatch: 0,
          preferenceMatch: finalScore / 100,
          seasonalMatch: 0,
        },
      };
    });

    return this.applyDiversityAdjustment(rankedRecipes, recipeDetails);
  }

  private async extractRankingFeatures(
    candidates: RecipeRecommendation[],
    context: RecommendationContext
  ): Promise<{
    features: RankingFeatures[];
    recipeDetails: Map<string, RecipeDetailDTO | undefined>;
  }> {
    const recipeIds = candidates.map((candidate) => candidate.recipeId);
    const recipes = await this.repository.getRecipesByIds(recipeIds);
    const recipeDetails = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    const features = candidates.map((candidate) => {
      const recipe = recipeDetails.get(candidate.recipeId);

      return {
        recipeId: candidate.recipeId,
        baseScore: candidate.score,
        popularityScore: this.calculatePopularityScore(recipe),
        freshnessScore: this.calculateFreshnessScore(recipe),
        diversityScore: 0,
        personalizationScore: this.calculatePersonalizationScore(recipe, context),
        qualityScore: this.calculateQualityScore(recipe),
      };
    });

    return { features, recipeDetails };
  }

  private calculatePopularityScore(recipe?: RecipeDetailDTO): number {
    const averageRating = recipe?.averageRating ?? 0;
    const ratingCount = recipe?.ratingCount ?? 0;
    const viewCount = recipe?.viewCount ?? 0;

    const ratingScore = (averageRating / 5) * 40;
    const reviewScore = Math.min(ratingCount / 100, 1) * 30;
    const viewScore = Math.min(Math.log(viewCount + 1) / Math.log(10000), 1) * 30;

    return ratingScore + reviewScore + viewScore;
  }

  private calculateFreshnessScore(recipe?: RecipeDetailDTO): number {
    if (!recipe?.createdAt) {
      return 50;
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(recipe.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation <= 7) {
      return 100;
    }
    if (daysSinceCreation <= 30) {
      return 80;
    }
    if (daysSinceCreation <= 90) {
      return 60;
    }
    if (daysSinceCreation <= 365) {
      return 40;
    }
    return 20;
  }

  private calculatePersonalizationScore(
    recipe: RecipeDetailDTO | undefined,
    context: RecommendationContext
  ): number {
    if (!recipe) {
      return 50;
    }

    const score = 50;

    if (context.mealType && recipe.mealType === context.mealType) {
      return Math.min(score + 10, 100);
    }

    return score;
  }

  private calculateQualityScore(recipe?: RecipeDetailDTO): number {
    if (!recipe) {
      return 0;
    }

    let score = 0;

    if ((recipe.averageRating ?? 0) >= 4.5) {
      score += 40;
    } else if ((recipe.averageRating ?? 0) >= 4.0) {
      score += 30;
    } else if ((recipe.averageRating ?? 0) >= 3.5) {
      score += 20;
    } else if ((recipe.averageRating ?? 0) >= 3.0) {
      score += 10;
    }

    if ((recipe.ratingCount ?? 0) >= 100) {
      score += 30;
    } else if ((recipe.ratingCount ?? 0) >= 50) {
      score += 25;
    } else if ((recipe.ratingCount ?? 0) >= 20) {
      score += 20;
    } else if ((recipe.ratingCount ?? 0) >= 10) {
      score += 15;
    } else if ((recipe.ratingCount ?? 0) >= 5) {
      score += 10;
    }

    if (recipe.difficulty === "EASY") {
      score += 10;
    } else if (recipe.difficulty === "MEDIUM") {
      score += 5;
    }

    if ((recipe.totalTime ?? 0) <= 30) {
      score += 10;
    } else if ((recipe.totalTime ?? 0) <= 60) {
      score += 5;
    }

    if ((recipe.estimatedCost ?? 0) <= 30) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateFinalScore(features: RankingFeatures, weights: RecommendationWeights): number {
    const rankingWeights = {
      base: 0.3,
      popularity: 0.2,
      freshness: 0.1,
      diversity: 0.1,
      personalization: 0.2,
      quality: 0.1,
    };

    const weightedScore =
      features.baseScore * rankingWeights.base +
      features.popularityScore * rankingWeights.popularity +
      features.freshnessScore * rankingWeights.freshness +
      features.diversityScore * rankingWeights.diversity +
      features.personalizationScore * rankingWeights.personalization +
      features.qualityScore * rankingWeights.quality;

    const userWeightAdjustment = this.calculateUserWeightAdjustment(weights);

    return Math.round(weightedScore * userWeightAdjustment);
  }

  private calculateUserWeightAdjustment(weights: RecommendationWeights): number {
    if (weights.inventory > 0.4) {
      return 1.1;
    }

    if (weights.preference > 0.3) {
      return 1.05;
    }

    return 1.0;
  }

  private applyDiversityAdjustment(
    rankedRecipes: RecipeRecommendation[],
    recipeDetails: Map<string, RecipeDetailDTO | undefined>
  ): RecipeRecommendation[] {
    const adjusted = [...rankedRecipes];
    const usedCategories = new Set<string>();
    const usedCuisines = new Set<string>();
    const usedTags = new Set<string>();

    for (const recipe of adjusted) {
      const recipeData = recipeDetails.get(recipe.recipeId);
      if (!recipeData) continue;

      let diversityBonus = 0;

      if (recipeData.category && !usedCategories.has(recipeData.category)) {
        diversityBonus += 10;
        usedCategories.add(recipeData.category);
      }

      const cuisine = recipeData.cuisine ?? recipeData.cuisineType ?? undefined;
      if (cuisine && !usedCuisines.has(cuisine)) {
        diversityBonus += 8;
        usedCuisines.add(cuisine);
      }

      const recipeTags = this.normalizeTags(recipeData);
      const newTags = recipeTags.filter((tag) => !usedTags.has(tag));
      if (newTags.length > 0) {
        diversityBonus += Math.min(newTags.length * 2, 5);
        newTags.forEach((tag) => usedTags.add(tag));
      }

      recipe.score = Math.min(recipe.score + diversityBonus, 100);
    }

    return adjusted.sort((a, b) => b.score - a.score);
  }

  private normalizeTags(recipe: RecipeDetailDTO): string[] {
    if (recipe.tags && recipe.tags.length) {
      return recipe.tags;
    }

    const rawTags = recipe.tagsRaw;
    if (!rawTags) return [];

    if (Array.isArray(rawTags)) {
      return rawTags.filter((tag): tag is string => typeof tag === "string");
    }

    if (typeof rawTags === "string") {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          return parsed.filter((tag): tag is string => typeof tag === "string");
        }
      } catch {
        return rawTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    return [];
  }

  private generateRankingReasons(features: RankingFeatures): string[] {
    const reasons: string[] = [];

    if (features.popularityScore >= 80) {
      reasons.push("热门推荐");
    }

    if (features.freshnessScore >= 80) {
      reasons.push("新鲜食谱");
    }

    if (features.qualityScore >= 80) {
      reasons.push("高品质");
    }

    if (features.personalizationScore >= 70) {
      reasons.push("个性化推荐");
    }

    return reasons.length > 0 ? reasons : ["综合推荐"];
  }

  private generateRankingExplanation(
    features: RankingFeatures,
    weights: RecommendationWeights
  ): string {
    const explanations: string[] = [];

    if (features.popularityScore >= 70) {
      explanations.push("这是一道广受欢迎的食谱");
    }

    if (features.freshnessScore >= 70) {
      explanations.push("食谱内容新颖及时");
    }

    if (features.qualityScore >= 70) {
      explanations.push("经过用户验证的高质量食谱");
    }

    const weightEntries = Object.entries(weights) as Array<[keyof RecommendationWeights, number]>;
    const [firstEntry, ...restEntries] = weightEntries;
    const topWeight = firstEntry
      ? restEntries.reduce((a, b) => (a[1] > b[1] ? a : b), firstEntry)
      : undefined;

    const weightExplanations: Record<keyof RecommendationWeights, string> = {
      inventory: "特别考虑了您现有的食材库存",
      price: "重点考虑了您的预算需求",
      nutrition: "优先考虑了您的营养目标",
      preference: "深度匹配了您的个人口味偏好",
      seasonal: "推荐了当季最新鲜的食材搭配",
    };

    const [topKey, topValue] = (topWeight ?? ["inventory", 0]) as [
      keyof RecommendationWeights,
      number,
    ];
    if (topValue > 0.3) {
      const explanation = weightExplanations[topKey] ?? weightExplanations.inventory ?? "";
      explanations.push(explanation);
    }

    return explanations.length > 0
      ? `${explanations.join("，")}。`
      : "经过多维度综合评估为您推荐。";
  }
}
