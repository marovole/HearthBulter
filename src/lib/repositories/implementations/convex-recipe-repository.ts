import type {
  RecipeRepository,
  RecipeFavoriteDTO,
  RecipeRatingDTO,
  GetFavoritesQuery,
  FavoritesResult,
  AddFavoriteInput,
  AddOrUpdateRatingInput,
  RecipeWithIngredientsDTO,
} from "@/lib/repositories/interfaces/recipe-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

const toDate = (timestamp?: number | null) =>
  timestamp ? new Date(timestamp) : new Date();

const mapRecipe = (
  recipe: Record<string, unknown>,
): RecipeWithIngredientsDTO => ({
  id: recipe._id as string,
  name: recipe.name as string,
  description: (recipe.description as string | null) ?? null,
  servings: (recipe.servings as number | null) ?? null,
  prepTime: (recipe.prepTime as number | null) ?? null,
  cookTime: (recipe.cookTime as number | null) ?? null,
  difficulty: (recipe.difficulty as string | null) ?? null,
  cuisine: (recipe.cuisine as string | null) ?? null,
  tags: (recipe.tags as string[] | undefined) ?? [],
  mealTypes: (recipe.mealTypes as string[] | undefined) ?? [],
  imageUrl: (recipe.imageUrl as string | null) ?? null,
  createdAt: toDate(recipe.createdAt as number | undefined),
  updatedAt: toDate(recipe.updatedAt as number | undefined),
  ingredients:
    (recipe.ingredients as any[] | undefined)?.map((ingredient) => ({
      id: ingredient.id as string,
      recipeId: ingredient.recipeId as string,
      amount: (ingredient.amount as number | null) ?? null,
      unit: (ingredient.unit as string | null) ?? null,
      notes: (ingredient.notes as string | null) ?? null,
      food: {
        id: ingredient.food?.id as string,
        name: ingredient.food?.name as string,
        nameEn: (ingredient.food?.nameEn as string | null) ?? null,
        calories: (ingredient.food?.calories as number | null) ?? null,
        protein: (ingredient.food?.protein as number | null) ?? null,
        carbs: (ingredient.food?.carbs as number | null) ?? null,
        fat: (ingredient.food?.fat as number | null) ?? null,
        category: (ingredient.food?.category as string | null) ?? null,
      },
    })) ?? [],
});

const mapFavorite = (favorite: Record<string, unknown>): RecipeFavoriteDTO => ({
  id: favorite._id as string,
  recipeId: favorite.recipeId as string,
  memberId: favorite.memberId as string,
  favoritedAt: toDate(favorite.favoritedAt as number | undefined),
  notes: (favorite.notes as string | null) ?? null,
});

const mapRating = (rating: Record<string, unknown>): RecipeRatingDTO => ({
  id: rating._id as string,
  recipeId: rating.recipeId as string,
  memberId: rating.memberId as string,
  rating: rating.rating as number,
  comment: (rating.comment as string | null) ?? null,
  tags: (rating.tags as string[] | undefined) ?? [],
  ratedAt: toDate(rating.ratedAt as number | undefined),
});

export class ConvexRecipeRepository implements RecipeRepository {
  async getFavoritesByMember(
    query: GetFavoritesQuery,
  ): Promise<FavoritesResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const result = await convexClient.query<{
      items: Array<Record<string, unknown>>;
      total: number;
    }>(api["recipe-interactions"].listFavoritesByMember, {
      memberId: query.memberId as Id<"familyMembers">,
      offset,
      limit,
    });

    const recipeIds = result.items.map(
      (favorite) => favorite.recipeId as string,
    );
    const recipes = recipeIds.length
      ? await convexClient.query<Array<Record<string, unknown>>>(
          api.recipes.listByIds,
          { ids: recipeIds as Id<"recipes">[] },
        )
      : [];

    const recipeMap = new Map(recipes.map((recipe) => [recipe._id, recipe]));

    const favorites = result.items.map((favorite) => {
      const dto = mapFavorite(favorite);
      const recipe = recipeMap.get(favorite.recipeId as string);
      return {
        ...dto,
        recipe: recipe ? mapRecipe(recipe) : undefined,
      };
    });

    return {
      favorites,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async addFavorite(input: AddFavoriteInput): Promise<RecipeFavoriteDTO> {
    const favorite = await convexClient.mutation<Record<string, unknown>>(
      api["recipe-interactions"].addFavorite,
      {
        recipeId: input.recipeId as Id<"recipes">,
        memberId: input.memberId as Id<"familyMembers">,
        notes: input.notes ?? undefined,
      },
    );

    return mapFavorite(favorite);
  }

  async removeFavorite(recipeId: string, memberId: string): Promise<void> {
    await convexClient.mutation(api["recipe-interactions"].removeFavorite, {
      recipeId: recipeId as Id<"recipes">,
      memberId: memberId as Id<"familyMembers">,
    });
  }

  async checkFavoriteStatus(
    recipeId: string,
    memberId: string,
  ): Promise<RecipeFavoriteDTO | null> {
    const favorite = await convexClient.query<Record<string, unknown> | null>(
      api["recipe-interactions"].getFavorite,
      {
        recipeId: recipeId as Id<"recipes">,
        memberId: memberId as Id<"familyMembers">,
      },
    );

    return favorite ? mapFavorite(favorite) : null;
  }

  async addOrUpdateRating(
    input: AddOrUpdateRatingInput,
  ): Promise<RecipeRatingDTO> {
    const rating = await convexClient.mutation<Record<string, unknown>>(
      api["recipe-interactions"].addOrUpdateRating,
      {
        recipeId: input.recipeId as Id<"recipes">,
        memberId: input.memberId as Id<"familyMembers">,
        rating: input.rating,
        comment: input.comment ?? undefined,
        tags: input.tags ?? undefined,
      },
    );

    return mapRating(rating);
  }

  async getRating(
    recipeId: string,
    memberId: string,
  ): Promise<RecipeRatingDTO | null> {
    const rating = await convexClient.query<Record<string, unknown> | null>(
      api["recipe-interactions"].getRating,
      {
        recipeId: recipeId as Id<"recipes">,
        memberId: memberId as Id<"familyMembers">,
      },
    );

    return rating ? mapRating(rating) : null;
  }

  async recipeExists(recipeId: string): Promise<boolean> {
    return await convexClient.query<boolean>(api.recipes.recipeExists, {
      recipeId: recipeId as Id<"recipes">,
    });
  }
}
