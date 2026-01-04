import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { safeParseArray } from '@/lib/utils/json-helpers';
import type {
  RecipeRepository,
  RecipeFavoriteDTO,
  RecipeRatingDTO,
  GetFavoritesQuery,
  FavoritesResult,
  AddFavoriteInput,
  AddOrUpdateRatingInput,
  RecipeWithIngredientsDTO,
} from '@/lib/repositories/interfaces/recipe-repository';

/**
 * Supabase Recipe Repository 实现
 *
 * 使用 Supabase Client 访问食谱数据
 */
export class SupabaseRecipeRepository implements RecipeRepository {
  constructor(
    private readonly supabase = SupabaseClientManager.getInstance(),
  ) {}

  async getFavoritesByMember(
    query: GetFavoritesQuery,
  ): Promise<FavoritesResult> {
    const {
      memberId,
      page = 1,
      limit = 10,
      sortBy = 'favoritedAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // 获取收藏列表（带recipe关联）
    const {
      data: favorites,
      error: favoritesError,
      count,
    } = await this.supabase
      .from('recipe_favorites')
      .select(
        `
        id,
        favoritedAt,
        notes,
        recipe:recipes!inner(
          id,
          name,
          description,
          servings,
          prepTime,
          cookTime,
          difficulty,
          cuisine,
          tags,
          imageUrl,
          createdAt,
          updatedAt
        )
      `,
        { count: 'exact' },
      )
      .eq('memberId', memberId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(skip, skip + limit - 1);

    if (favoritesError) {
      throw favoritesError;
    }

    const total = count || 0;

    // 如果有收藏，查询对应的ingredients
    let favoritesWithIngredients = favorites || [];
    if (favorites && favorites.length > 0) {
      const recipeIds = favorites.map((fav: any) => fav.recipe.id);

      // 查询所有相关的ingredients
      const { data: ingredients, error: ingredientsError } = await this.supabase
        .from('recipe_ingredients')
        .select(
          `
          id,
          recipeId,
          amount,
          unit,
          notes,
          food:foods!inner(
            id,
            name,
            nameEn,
            calories,
            protein,
            carbs,
            fat,
            category
          )
        `,
        )
        .in('recipeId', recipeIds);

      if (ingredientsError) {
        console.error('查询食材失败:', ingredientsError);
      } else {
        // 按recipeId分组ingredients
        const ingredientsMap = new Map<string, any[]>();
        ingredients?.forEach((ing: any) => {
          if (!ingredientsMap.has(ing.recipeId)) {
            ingredientsMap.set(ing.recipeId, []);
          }
          ingredientsMap.get(ing.recipeId)!.push(ing);
        });

        // 组装数据
        favoritesWithIngredients = favorites.map((fav: any) => ({
          ...fav,
          recipe: {
            ...fav.recipe,
            tags: safeParseArray(fav.recipe.tags),
            ingredients: ingredientsMap.get(fav.recipe.id) || [],
          },
        }));
      }
    }

    return {
      favorites: favoritesWithIngredients.map((fav: any) =>
        this.normalizeFavorite(fav),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addFavorite(input: AddFavoriteInput): Promise<RecipeFavoriteDTO> {
    const { recipeId, memberId, notes } = input;

    // 创建收藏记录
    const { data: favorite, error } = await this.supabase
      .from('recipe_favorites')
      .insert({
        recipeId,
        memberId,
        notes: notes || null,
        favoritedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // 如果是重复收藏（违反唯一约束），返回现有记录
      if (error.code === '23505') {
        const existingFavorite = await this.checkFavoriteStatus(
          recipeId,
          memberId,
        );
        if (existingFavorite) {
          return existingFavorite;
        }
      }
      throw error;
    }

    return this.normalizeFavorite(favorite);
  }

  async removeFavorite(recipeId: string, memberId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recipe_favorites')
      .delete()
      .eq('recipeId', recipeId)
      .eq('memberId', memberId);

    if (error) {
      throw error;
    }
  }

  async checkFavoriteStatus(
    recipeId: string,
    memberId: string,
  ): Promise<RecipeFavoriteDTO | null> {
    const { data, error } = await this.supabase
      .from('recipe_favorites')
      .select('*')
      .eq('recipeId', recipeId)
      .eq('memberId', memberId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizeFavorite(data) : null;
  }

  async addOrUpdateRating(
    input: AddOrUpdateRatingInput,
  ): Promise<RecipeRatingDTO> {
    const { recipeId, memberId, rating, comment, tags } = input;

    const ratingData = {
      recipeId,
      memberId,
      rating,
      comment: comment || null,
      tags: tags || [],
      ratedAt: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('recipe_ratings')
      .upsert(ratingData, {
        onConflict: 'recipeId,memberId',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return this.normalizeRating(data);
  }

  async getRating(
    recipeId: string,
    memberId: string,
  ): Promise<RecipeRatingDTO | null> {
    const { data, error } = await this.supabase
      .from('recipe_ratings')
      .select('*')
      .eq('recipeId', recipeId)
      .eq('memberId', memberId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? this.normalizeRating(data) : null;
  }

  async recipeExists(recipeId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return !!data;
  }

  /**
   * 规范化收藏记录
   */
  private normalizeFavorite(data: any): RecipeFavoriteDTO {
    return {
      id: data.id,
      recipeId: data.recipeId,
      memberId: data.memberId,
      favoritedAt: new Date(data.favoritedAt),
      notes: data.notes,
      recipe: data.recipe ? this.normalizeRecipe(data.recipe) : undefined,
    };
  }

  /**
   * 规范化食谱记录
   */
  private normalizeRecipe(data: any): RecipeWithIngredientsDTO {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      servings: data.servings,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      difficulty: data.difficulty,
      cuisine: data.cuisine,
      tags: safeParseArray(data.tags),
      imageUrl: data.imageUrl,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      ingredients: data.ingredients || [],
    };
  }

  /**
   * 规范化评分记录
   */
  private normalizeRating(data: any): RecipeRatingDTO {
    return {
      id: data.id,
      recipeId: data.recipeId,
      memberId: data.memberId,
      rating: data.rating,
      comment: data.comment,
      tags: safeParseArray(data.tags),
      ratedAt: new Date(data.ratedAt),
    };
  }
}
