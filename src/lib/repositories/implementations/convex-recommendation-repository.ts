import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import type {
  RecommendationRepository,
  RecipeDetailDTO,
  RecipeIngredientDetailDTO,
  RecommendationBehaviorWithDetailsDTO,
} from "@/lib/repositories/interfaces/recommendation-repository";
import type {
  RecommendationBehaviorDTO,
  RecommendationLogDTO,
  RecommendationRecipeFilter,
  RecommendationWeightsDTO,
  RecipeSummaryDTO,
  UserPreferenceDTO,
  HealthGoalDTO,
  InventorySnapshotDTO,
} from "@/lib/repositories/types/recommendation";
import type {
  DateRangeFilter,
  PaginatedResult,
  PaginationInput,
} from "@/lib/repositories/types/common";

const toDate = (timestamp?: number | null) => (timestamp ? new Date(timestamp) : undefined);

const mapIngredientsDetailed = (
  ingredients: Array<Record<string, unknown>> = []
): RecipeIngredientDetailDTO[] => {
  const result: RecipeIngredientDetailDTO[] = [];

  ingredients.forEach((ingredient) => {
    const food = ingredient.food as Record<string, unknown> | undefined;
    if (!food) {
      return;
    }

    result.push({
      id: ingredient.id as string,
      foodId: ingredient.foodId as string,
      amount: ingredient.amount as number,
      unit: ingredient.unit as string,
      optional: ingredient.optional as boolean | undefined,
      notes: (ingredient.notes as string | null) ?? null,
      food: {
        id: food.id as string,
        name: food.name as string,
        category: (food.category as string | null) ?? null,
      },
    });
  });

  return result;
};

const mapRecipeDetail = (recipe: Record<string, unknown>): RecipeDetailDTO => ({
  id: recipe._id as string,
  name: recipe.name as string,
  cuisineType: (recipe.cuisine as string | null) ?? null,
  mealType: (recipe.mealTypes as string[] | undefined)?.[0] ?? null,
  difficulty: (recipe.difficulty as string | null) ?? null,
  servings: (recipe.servings as number | null) ?? null,
  prepTimeMinutes: (recipe.prepTime as number | null) ?? null,
  cookTimeMinutes: (recipe.cookTime as number | null) ?? null,
  caloriesPerServing: (recipe.calories as number | null) ?? null,
  proteinPerServing: (recipe.protein as number | null) ?? null,
  carbsPerServing: (recipe.carbs as number | null) ?? null,
  fatPerServing: (recipe.fat as number | null) ?? null,
  averageRating: (recipe.averageRating as number | null) ?? null,
  ratingCount: (recipe.ratingCount as number | null) ?? null,
  viewCount: (recipe.viewCount as number | null) ?? null,
  estimatedCost: (recipe.estimatedCost as number | null) ?? null,
  tags: (recipe.tags as string[] | undefined) ?? [],
  ingredients: mapIngredientsDetailed(
    (recipe.ingredients as Array<Record<string, unknown>> | undefined) ?? []
  ).map((ingredient) => ({
    name: ingredient.food.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
  })),
  description: (recipe.description as string | null) ?? null,
  cuisine: (recipe.cuisine as string | null) ?? null,
  category: (recipe.category as string | null) ?? null,
  totalTime: (recipe.totalTime as number | null) ?? null,
  calories: (recipe.calories as number | null) ?? null,
  protein: (recipe.protein as number | null) ?? null,
  carbs: (recipe.carbs as number | null) ?? null,
  fat: (recipe.fat as number | null) ?? null,
  mealTypes: (recipe.mealTypes as string[] | undefined) ?? [],
  costLevel: (recipe.costLevel as "LOW" | "MEDIUM" | "HIGH" | null) ?? null,
  tagsRaw: (recipe.tags as string[] | undefined) ?? [],
  ingredientsDetailed: mapIngredientsDetailed(
    (recipe.ingredients as Array<Record<string, unknown>> | undefined) ?? []
  ),
  createdAt: toDate(recipe.createdAt as number | undefined),
  updatedAt: toDate(recipe.updatedAt as number | undefined),
});

const mapRecipeSummary = (recipe: Record<string, unknown>): RecipeSummaryDTO => ({
  id: recipe._id as string,
  name: recipe.name as string,
  cuisineType: (recipe.cuisine as string | null) ?? null,
  mealType: (recipe.mealTypes as string[] | undefined)?.[0] ?? null,
  difficulty: (recipe.difficulty as string | null) ?? null,
  servings: (recipe.servings as number | null) ?? null,
  prepTimeMinutes: (recipe.prepTime as number | null) ?? null,
  cookTimeMinutes: (recipe.cookTime as number | null) ?? null,
  caloriesPerServing: (recipe.calories as number | null) ?? null,
  proteinPerServing: (recipe.protein as number | null) ?? null,
  carbsPerServing: (recipe.carbs as number | null) ?? null,
  fatPerServing: (recipe.fat as number | null) ?? null,
  averageRating: (recipe.averageRating as number | null) ?? null,
  ratingCount: (recipe.ratingCount as number | null) ?? null,
  viewCount: (recipe.viewCount as number | null) ?? null,
  estimatedCost: (recipe.estimatedCost as number | null) ?? null,
  tags: (recipe.tags as string[] | undefined) ?? [],
  ingredients: mapIngredientsDetailed(
    (recipe.ingredients as Array<Record<string, unknown>> | undefined) ?? []
  ).map((ingredient) => ({
    name: ingredient.food.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
  })),
});

const buildRangeFilter = (range?: DateRangeFilter) => {
  const start = range?.start ? range.start.getTime() : undefined;
  const end = range?.end ? range.end.getTime() : undefined;
  return { start, end };
};

export class ConvexRecommendationRepository implements RecommendationRepository {
  async getUserPreference(memberId: string): Promise<UserPreferenceDTO | null> {
    const preference = await convexClient.query<Record<string, unknown> | null>(
      api.recommendations.getUserPreference,
      { memberId: memberId as Id<"familyMembers"> }
    );

    if (!preference) return null;

    return {
      memberId,
      preferredIngredients: (preference.preferredIngredients as string[] | undefined) ?? [],
      avoidedIngredients: (preference.avoidedIngredients as string[] | undefined) ?? [],
      maxCookTimeMinutes: (preference.maxCookTime as number | null) ?? null,
      costLevel: (preference.costLevel as "LOW" | "MEDIUM" | "HIGH" | undefined) ?? "MEDIUM",
      preferredCuisines: (preference.preferredCuisines as string[] | undefined) ?? [],
      recommendationWeights: preference.recommendationWeights as
        | RecommendationWeightsDTO
        | undefined,
    };
  }

  async listCandidateRecipes(
    filters: RecommendationRecipeFilter,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<RecipeSummaryDTO>> {
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 20;

    const result = await convexClient.query<{
      items: Array<Record<string, unknown>>;
      total: number;
    }>(api.recipes.listPublicDetailed, {
      mealTypes: filters.mealTypes,
      cuisineTypes: filters.cuisineTypes,
      tags: filters.tags,
      excludeIds: (filters.excludeRecipeIds as Id<"recipes">[] | undefined) ?? undefined,
      maxCookTime: filters.maxCookTimeMinutes,
      budgetLimit: filters.budgetLimit,
      season: filters.season,
      offset,
      limit,
    });

    return {
      items: result.items.map((recipe) => mapRecipeSummary(recipe)),
      total: result.total,
      hasMore: offset + result.items.length < result.total,
    };
  }

  async getRecipeBehavior(
    memberId: string,
    range?: DateRangeFilter
  ): Promise<RecommendationBehaviorDTO> {
    const { start } = buildRangeFilter(range);

    const [ratings, favorites, views] = await Promise.all([
      convexClient.query<Array<Record<string, unknown>>>(
        api["recipe-interactions"].listRatingsByMember,
        { memberId: memberId as Id<"familyMembers">, startDate: start }
      ),
      convexClient.query<Array<Record<string, unknown>>>(
        api["recipe-interactions"].listFavoritesByMemberSimple,
        { memberId: memberId as Id<"familyMembers"> }
      ),
      convexClient.query<Array<Record<string, unknown>>>(
        api["recipe-interactions"].listViewsByMember,
        { memberId: memberId as Id<"familyMembers">, startDate: start }
      ),
    ]);

    return {
      ratings: ratings.map((rating) => ({
        recipeId: rating.recipeId as string,
        rating: rating.rating as number,
        ratedAt: toDate(rating.ratedAt as number | undefined),
      })),
      favorites: favorites.map((favorite) => ({
        recipeId: favorite.recipeId as string,
        favoritedAt: toDate(favorite.favoritedAt as number | undefined),
      })),
      views: views.map((view) => ({
        recipeId: view.recipeId as string,
        viewedAt: toDate(view.viewedAt as number | undefined),
      })),
    };
  }

  async getDetailedRecipeBehavior(
    memberId: string,
    options?: { range?: DateRangeFilter; limit?: number; minRating?: number }
  ): Promise<RecommendationBehaviorWithDetailsDTO> {
    const behavior = await this.getRecipeBehavior(memberId, options?.range);
    const ratingIds = behavior.ratings.map((rating) => rating.recipeId);
    const favoriteIds = behavior.favorites.map((favorite) => favorite.recipeId);
    const viewIds = behavior.views.map((view) => view.recipeId);

    const recipeIds = Array.from(new Set([...ratingIds, ...favoriteIds, ...viewIds]));
    const recipes = recipeIds.length
      ? await convexClient.query<Array<Record<string, unknown>>>(api.recipes.listByIds, {
          ids: recipeIds as Id<"recipes">[],
        })
      : [];

    const recipeMap = new Map(recipes.map((recipe) => [recipe._id, recipe]));

    const minRating = options?.minRating ?? 4;

    return {
      ratings: behavior.ratings
        .filter((rating) => (rating.rating ?? 0) >= minRating)
        .map((rating) => ({
          recipeId: rating.recipeId,
          rating: rating.rating ?? 0,
          ratedAt: rating.ratedAt ?? new Date(),
          recipe: mapRecipeDetail(recipeMap.get(rating.recipeId) ?? {}),
        })),
      favorites: behavior.favorites.map((favorite) => ({
        recipeId: favorite.recipeId,
        favoritedAt: favorite.favoritedAt ?? new Date(),
        recipe: mapRecipeDetail(recipeMap.get(favorite.recipeId) ?? {}),
      })),
      views: behavior.views.map((view) => ({
        recipeId: view.recipeId,
        viewedAt: view.viewedAt ?? new Date(),
        recipe: mapRecipeDetail(recipeMap.get(view.recipeId) ?? {}),
      })),
    };
  }

  async getSimilarRecipes(recipeId: string, limit: number = 5): Promise<RecipeSummaryDTO[]> {
    const recipe = await this.getRecipeById(recipeId);
    if (!recipe) return [];

    const filters: RecommendationRecipeFilter = {
      cuisineTypes: recipe.cuisine ? [recipe.cuisine] : undefined,
      mealTypes: recipe.mealTypes && recipe.mealTypes.length > 0 ? recipe.mealTypes : undefined,
      excludeRecipeIds: [recipeId],
    };

    const result = await this.listCandidateRecipes(filters, {
      offset: 0,
      limit: Math.max(limit, 10),
    });

    return result.items.slice(0, limit);
  }

  async getRecipeById(recipeId: string): Promise<RecipeDetailDTO | null> {
    const recipe = await convexClient.query<Record<string, unknown> | null>(api.recipes.getById, {
      recipeId: recipeId as Id<"recipes">,
    });

    return recipe ? mapRecipeDetail(recipe) : null;
  }

  async listPopularRecipes(limit: number = 10, category?: string): Promise<RecipeDetailDTO[]> {
    const recipes = await convexClient.query<Array<Record<string, unknown>>>(
      api.recipes.listPopular,
      {
        limit,
        category: category ?? undefined,
      }
    );

    return recipes.map((recipe) => mapRecipeDetail(recipe));
  }

  async getActiveHealthGoal(memberId: string): Promise<HealthGoalDTO | null> {
    const goals = await convexClient.query<Array<Record<string, unknown>>>(api.health.listGoals, {
      memberId: memberId as Id<"familyMembers">,
      includeInactive: false,
    });

    const activeGoal = goals[0];
    if (!activeGoal) return null;

    return {
      id: activeGoal._id as string,
      memberId,
      goalType: activeGoal.goalType as string,
      status: (activeGoal.status as "ACTIVE" | "PAUSED" | "COMPLETED") ?? "ACTIVE",
      targetCalories: (activeGoal.targetValue as number | null) ?? null,
      macroTargets: {
        protein: (activeGoal.proteinRatio as number | null) ?? null,
        carbs: (activeGoal.carbRatio as number | null) ?? null,
        fat: (activeGoal.fatRatio as number | null) ?? null,
      },
      createdAt: toDate(activeGoal.createdAt as number | undefined) ?? new Date(),
    };
  }

  async getInventorySnapshot(memberId: string): Promise<InventorySnapshotDTO> {
    const items = await convexClient.query<Array<Record<string, unknown>>>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
    });

    return {
      memberId,
      capturedAt: new Date(),
      items: items.map((item) => {
        const food = item.food as Record<string, unknown> | undefined;
        return {
          ingredientName: (food?.name as string | undefined) ?? "",
          quantity: (item.quantity as number) ?? 0,
          unit: (item.unit as string | undefined) ?? undefined,
          freshnessScore: undefined,
          expiresAt: toDate(item.expiryDate as number | undefined),
        };
      }),
    };
  }

  async saveRecommendationLog(entry: RecommendationLogDTO): Promise<void> {
    await convexClient.mutation(api.recommendations.saveRecommendationLog, {
      memberId: entry.memberId as Id<"familyMembers">,
      recipeId: entry.recipeId as Id<"recipes">,
      rank: entry.rank,
      score: entry.score,
      reasons: entry.reasons,
      metadata: entry.metadata ?? undefined,
      generatedAt: entry.generatedAt.getTime(),
    });
  }

  async upsertRecommendationWeights(
    memberId: string,
    weights: RecommendationWeightsDTO
  ): Promise<void> {
    await convexClient.mutation(api.recommendations.upsertUserPreference, {
      memberId: memberId as Id<"familyMembers">,
      recommendationWeights: weights,
    });
  }

  async upsertLearnedUserPreferences(
    memberId: string,
    payload: { preferences: any; confidence: number }
  ): Promise<void> {
    await convexClient.mutation(api.recommendations.upsertUserPreference, {
      memberId: memberId as Id<"familyMembers">,
      preferredCuisines: payload.preferences.preferredCuisines ?? [],
      preferredIngredients: payload.preferences.preferredIngredients ?? [],
      learnedPreferences: payload,
    });
  }

  async getRecipesByIds(ids: string[]): Promise<RecipeDetailDTO[]> {
    if (ids.length === 0) return [];
    const recipes = await convexClient.query<Array<Record<string, unknown>>>(
      api.recipes.listByIds,
      { ids: ids as Id<"recipes">[] }
    );
    return recipes.map((recipe) => mapRecipeDetail(recipe));
  }

  async listMemberBehaviorSamples(options: {
    excludeMemberId?: string;
    limit?: number;
  }): Promise<Array<{ memberId: string; behavior: RecommendationBehaviorDTO }>> {
    const members = await convexClient.query<Array<Record<string, unknown>>>(
      api.members.listAll,
      {}
    );

    const filtered = members.filter((member) => member._id !== options.excludeMemberId);

    const limited = filtered.slice(0, options.limit ?? 50);

    const behaviors = await Promise.all(
      limited.map(async (member) => ({
        memberId: member._id as string,
        behavior: await this.getRecipeBehavior(member._id as string),
      }))
    );

    return behaviors;
  }

  async getRecipeCooccurrence(
    recipeId: string,
    limit: number = 10
  ): Promise<Array<{ recipeId: string; count: number }>> {
    const samples = await this.listMemberBehaviorSamples({});
    const counts = new Map<string, number>();

    samples.forEach((sample) => {
      const recipeIds = new Set([
        ...sample.behavior.ratings.map((rating) => rating.recipeId),
        ...sample.behavior.favorites.map((favorite) => favorite.recipeId),
      ]);

      if (!recipeIds.has(recipeId)) return;

      recipeIds.forEach((id) => {
        if (id === recipeId) return;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .map(([id, count]) => ({ recipeId: id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async listDetailedCandidateRecipes(
    filters: RecommendationRecipeFilter,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<RecipeDetailDTO>> {
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 20;

    const result = await convexClient.query<{
      items: Array<Record<string, unknown>>;
      total: number;
    }>(api.recipes.listPublicDetailed, {
      mealTypes: filters.mealTypes,
      cuisineTypes: filters.cuisineTypes,
      tags: filters.tags,
      excludeIds: (filters.excludeRecipeIds as Id<"recipes">[] | undefined) ?? undefined,
      maxCookTime: filters.maxCookTimeMinutes,
      budgetLimit: filters.budgetLimit,
      season: filters.season,
      offset,
      limit,
    });

    return {
      items: result.items.map((recipe) => mapRecipeDetail(recipe)),
      total: result.total,
      hasMore: offset + result.items.length < result.total,
    };
  }
}
