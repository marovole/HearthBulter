import type {
  RecommendationRepository,
  RecommendationBehaviorWithDetailsDTO,
  RecommendationWeightsDTO,
  RecipeDetailDTO,
  LearnedPreferenceInsightsDTO,
} from '@/lib/repositories/interfaces/recommendation-repository';
import type { RecommendationRecipeFilter } from '@/lib/repositories/types/recommendation';
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
  excludeRecipeIds?: string[];
}

export type RecommendationWeights = RecommendationWeightsDTO;

export class RecommendationEngine {
  private readonly ruleBased: RuleBasedRecommender;
  private readonly collaborative: CollaborativeFilter;
  private readonly content: ContentFilter;
  private readonly ranker: RecommendationRanker;

  constructor(private readonly repository: RecommendationRepository) {
    this.ruleBased = new RuleBasedRecommender(repository);
    this.collaborative = new CollaborativeFilter(repository);
    this.content = new ContentFilter(repository);
    this.ranker = new RecommendationRanker(repository);
  }

  async getRecommendations(
    context: RecommendationContext,
    limit = 10,
    weights?: Partial<RecommendationWeights>
  ): Promise<RecipeRecommendation[]> {
    const userPreference = await this.repository.getUserPreference(context.memberId);
    const defaultWeights: RecommendationWeights = {
      inventory: 0.3,
      price: 0.2,
      nutrition: 0.3,
      preference: 0.15,
      seasonal: 0.05,
    };

    const finalWeights: RecommendationWeights = {
      ...defaultWeights,
      ...userPreference?.recommendationWeights,
      ...weights,
    };

    const [ruleBased, collaborative, content] = await Promise.all([
      this.ruleBased.getRecommendations(context, limit * 2),
      this.collaborative.getRecommendations(context.memberId, limit * 2),
      this.content.getRecommendations(context, limit * 2),
    ]);

    const merged = Array.from(this.mergeCandidates([ruleBased, collaborative, content]).values());
    const ranked = await this.ranker.rankRecipes(merged, context, finalWeights);
    return this.generateExplanations(ranked.slice(0, limit), finalWeights);
  }

  async refreshRecommendations(
    context: RecommendationContext,
    excludeRecipeIds: string[],
    limit = 10
  ): Promise<RecipeRecommendation[]> {
    return this.getRecommendations({ ...context, excludeRecipeIds }, limit);
  }

  async getSimilarRecipes(recipeId: string, limit = 5): Promise<RecipeRecommendation[]> {
    const recipe = await this.repository.getRecipeById(recipeId);
    if (!recipe) throw new Error('Recipe not found');
    return this.content.getSimilarRecipes(recipe, limit);
  }

  async getPopularRecipes(limit = 10, category?: string): Promise<RecipeRecommendation[]> {
    const recipes = await this.repository.listPopularRecipes(limit, category);
    return recipes.map(recipe => ({
      recipeId: recipe.id,
      score: recipe.averageRating ?? 0,
      reasons: ['热门推荐', '高评分'],
      explanation: `此食谱评分${recipe.averageRating ?? 0}分，已有${recipe.ratingCount ?? 0}人评价。`,
      metadata: { inventoryMatch: 0, priceMatch: 0, nutritionMatch: 0, preferenceMatch: 0, seasonalMatch: 0 },
    }));
  }

  async updateUserPreferences(memberId: string): Promise<void> {
    const behavior = await this.repository.getDetailedRecipeBehavior(memberId, { limit: 100 });
    const insights = this.analyzeUserBehavior(behavior);
    await this.repository.upsertLearnedUserPreferences(memberId, insights);
  }

  private mergeCandidates(candidates: RecipeRecommendation[][]): Map<string, RecipeRecommendation> {
    const merged = new Map<string, RecipeRecommendation>();
    candidates.forEach(list =>
      list.forEach(candidate => {
        const existing = merged.get(candidate.recipeId);
        if (!existing || candidate.score > existing.score) merged.set(candidate.recipeId, candidate);
      })
    );
    return merged;
  }

  private async generateExplanations(
    recommendations: RecipeRecommendation[],
    weights: RecommendationWeights
  ): Promise<RecipeRecommendation[]> {
    return recommendations.map(rec => {
      const reasons = [...rec.reasons];
      if (!reasons.length) reasons.push('综合推荐');

      const explanationParts: string[] = [];
      if (rec.metadata.inventoryMatch > 0.7) explanationParts.push('匹配现有食材');
      if (rec.metadata.priceMatch > 0.7) explanationParts.push('符合预算');
      if (rec.metadata.nutritionMatch > 0.7) explanationParts.push('满足健康目标');
      if (rec.metadata.preferenceMatch > 0.7) explanationParts.push('符合口味');
      if (rec.metadata.seasonalMatch > 0.7) explanationParts.push('使用当季食材');

      const topWeight = Object.entries(weights).sort((a, b) => b[1] - a[1])[0];
      if (topWeight?.[1] >= 0.3) {
        const weightCopy: Record<keyof RecommendationWeights, string> = {
          inventory: '重视库存',
          price: '注重价格',
          nutrition: '关注营养',
          preference: '突出偏好',
          seasonal: '强调季节性',
        };
        explanationParts.push(weightCopy[topWeight[0]]);
      }

      return {
        ...rec,
        reasons,
        explanation: explanationParts.length ? `${explanationParts.join('，')}。` : rec.explanation,
      };
    });
  }

  private analyzeUserBehavior(behavior: RecommendationBehaviorWithDetailsDTO): LearnedPreferenceInsightsDTO {
    const ratedRecipes = behavior.ratings.filter(r => r.rating >= 4).map(r => r.recipe);
    const favoriteRecipes = behavior.favorites.map(f => f.recipe);
    const sample = [...ratedRecipes, ...favoriteRecipes];

    const preferredCuisines = this.extractCuisines(sample);
    const preferredIngredients = this.extractIngredients(sample);

    const avgRating =
      behavior.ratings.reduce((sum, r) => sum + r.rating, 0) / (behavior.ratings.length || 1);

    return {
      preferences: {
        preferredCuisines,
        preferredIngredients,
        avgRating,
        favoriteCount: behavior.favorites.length,
      },
      confidence: Math.min(sample.length, 100) / 100,
      analyzedAt: new Date(),
    };
  }

  private extractCuisines(recipes: RecipeDetailDTO[]): string[] {
    const counts = new Map<string, number>();
    recipes.forEach(recipe => {
      if (!recipe.cuisine) return;
      counts.set(recipe.cuisine, (counts.get(recipe.cuisine) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine]) => cuisine);
  }

  private extractIngredients(recipes: RecipeDetailDTO[]): string[] {
    const counts = new Map<string, number>();
    recipes.forEach(recipe =>
      recipe.ingredientsDetailed?.forEach(ingredient => {
        counts.set(ingredient.food.name, (counts.get(ingredient.food.name) || 0) + 1);
      })
    );
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ingredient]) => ingredient);
  }
}
