// @ts-nocheck - Legacy Supabase code, pending removal
/**
 * Supabase 推荐 Repository 实现
 *
 * 基于 Supabase PostgreSQL 实现推荐引擎的数据访问层，
 * 提供食谱查询、用户行为分析、健康目标管理等功能。
 *
 * @module supabase-recommendation-repository
 */

import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase-database";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import type {
  BehaviorDetailQueryOptions,
  LearnedPreferenceInsightsDTO,
  RecommendationBehaviorWithDetailsDTO,
  RecommendationRepository,
  RecipeDetailDTO,
} from "../interfaces/recommendation-repository";
import type {
  HealthGoalDTO,
  InventorySnapshotDTO,
  RecommendationBehaviorDTO,
  RecommendationLogDTO,
  RecommendationRecipeFilter,
  RecommendationWeightsDTO,
  RecipeSummaryDTO,
  UserPreferenceDTO,
} from "../types/recommendation";
import type {
  DateRangeFilter,
  PaginatedResult,
  PaginationInput,
} from "../types/common";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];

type RecipeIngredientRow = {
  id?: string | null;
  food_id?: string | null;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
  optional?: boolean | null;
  food?:
    | {
        id?: string | null;
        name?: string | null;
        category?: string | null;
      }
    | Array<{
        id?: string | null;
        name?: string | null;
        category?: string | null;
      }>;
};

type RecipeDetailRow = RecipeRow & {
  ingredients?: RecipeIngredientRow[] | null;
};
type UserPreferenceRow =
  Database["public"]["Tables"]["user_preferences"]["Row"];
type RecipeRatingRow = Database["public"]["Tables"]["recipe_ratings"]["Row"];
type RecipeFavoriteRow =
  Database["public"]["Tables"]["recipe_favorites"]["Row"];
type RecipeViewRow = Database["public"]["Tables"]["recipe_views"]["Row"];
type HealthGoalRow = Database["public"]["Tables"]["health_goals"]["Row"];
type InventoryItemRow = Database["public"]["Tables"]["inventory_items"]["Row"];

/**
 * Supabase 推荐 Repository 实现
 *
 * 特性：
 * - 类型安全的数据映射
 * - JSONB 字段序列化/反序列化
 * - 批量并发查询
 * - 完善的错误处理
 */
export class SupabaseRecommendationRepository
implements RecommendationRepository
{
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = "[SupabaseRecommendationRepository]";

  constructor(
    client: SupabaseClient<Database> = SupabaseClientManager.getInstance(),
  ) {
    this.client = client;
  }

  /**
   * 获取用户偏好配置
   */
  async getUserPreference(memberId: string): Promise<UserPreferenceDTO | null> {
    const { data, error } = await this.client
      .from("user_preferences")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getUserPreference", error);
    }

    return data ? this.mapUserPreference(data) : null;
  }

  /**
   * 查询可用的候选食谱
   *
   * 支持多维度过滤：餐型、菜系、标签、烹饪时间、预算限制等
   */
  async listCandidateRecipes(
    filters: RecommendationRecipeFilter,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<RecipeSummaryDTO>> {
    let query = this.client
      .from("recipes")
      .select(
        `
        id,
        name,
        description,
        cuisine_type,
        meal_type,
        difficulty,
        servings,
        prep_time,
        cook_time,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        tags,
        ingredients
      `,
        { count: "exact" },
      )
      .eq("status", "PUBLISHED")
      .eq("is_public", true);

    // 应用过滤条件
    if (filters.mealTypes?.length) {
      query = query.in("meal_type", filters.mealTypes);
    }

    if (filters.cuisineTypes?.length) {
      query = query.in("cuisine_type", filters.cuisineTypes);
    }

    if (filters.tags?.length) {
      query = query.contains("tags", filters.tags);
    }

    if (filters.excludeRecipeIds?.length) {
      // 使用 Supabase 的 .in() 方法的否定形式
      query = query.not("id", "in", filters.excludeRecipeIds);
    }

    if (filters.maxCookTimeMinutes) {
      query = query.lte("cook_time", filters.maxCookTimeMinutes);
    }

    if (filters.budgetLimit) {
      query = query.lte("estimated_cost", filters.budgetLimit);
    }

    // 应用分页
    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) {
      this.handleError("listCandidateRecipes", error);
    }

    const items = (data || []).map((row) => this.mapRecipe(row as RecipeRow));

    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit
        ? (pagination.offset ?? 0) + items.length < (count ?? 0)
        : false,
    };
  }

  /**
   * 获取用户的行为数据
   *
   * 并发查询评分、收藏、浏览记录，提升性能
   */
  async getRecipeBehavior(
    memberId: string,
    range?: DateRangeFilter,
  ): Promise<RecommendationBehaviorDTO> {
    const [ratingsRes, favoritesRes, viewsRes] = await Promise.all([
      this.selectWithRange("recipe_ratings", "rated_at", memberId, range),
      this.selectWithRange("recipe_favorites", "favorited_at", memberId, range),
      this.selectWithRange("recipe_views", "viewed_at", memberId, range),
    ]);

    if (ratingsRes.error)
      this.handleError("getRecipeBehavior:ratings", ratingsRes.error);
    if (favoritesRes.error)
      this.handleError("getRecipeBehavior:favorites", favoritesRes.error);
    if (viewsRes.error)
      this.handleError("getRecipeBehavior:views", viewsRes.error);

    return {
      ratings: (ratingsRes.data || []).map((row) => ({
        recipeId: row.recipe_id as string,
        rating: row.rating ?? undefined,
        ratedAt: row.rated_at ? new Date(row.rated_at) : undefined,
      })),
      favorites: (favoritesRes.data || []).map((row) => ({
        recipeId: row.recipe_id as string,
        favoritedAt: row.favorited_at ? new Date(row.favorited_at) : undefined,
      })),
      views: (viewsRes.data || []).map((row) => ({
        recipeId: row.recipe_id as string,
        viewedAt: row.viewed_at ? new Date(row.viewed_at) : undefined,
      })),
    };
  }

  async getDetailedRecipeBehavior(
    memberId: string,
    options?: BehaviorDetailQueryOptions,
  ): Promise<RecommendationBehaviorWithDetailsDTO> {
    const limit = options?.limit ?? 50;
    const minRating = options?.minRating ?? 4;
    const range = options?.range;

    const buildRange = (query: any, column: string) => {
      let nextQuery = query;
      if (range?.start) nextQuery = nextQuery.gte(column, range.start);
      if (range?.end) nextQuery = nextQuery.lte(column, range.end);
      return nextQuery;
    };

    const ratingsQuery = buildRange(
      this.client
        .from("recipe_ratings")
        .select(
          `
          recipe_id,
          rating,
          rated_at,
          recipe:recipes!inner(
            id,
            name,
            description,
            cuisine_type,
            meal_type,
            difficulty,
            servings,
            prep_time,
            cook_time,
            calories_per_serving,
            protein_per_serving,
            carbs_per_serving,
            fat_per_serving,
            average_rating,
            rating_count,
            view_count,
            estimated_cost,
            tags,
            ingredients:recipe_ingredients(
              id,
              food_id,
              amount,
              unit,
              notes,
              optional,
              food:foods(id, name, category)
            )
          )
        `,
        )
        .eq("member_id", memberId)
        .gte("rating", minRating)
        .order("rated_at", { ascending: false })
        .limit(limit),
      "rated_at",
    );

    const favoritesQuery = buildRange(
      this.client
        .from("recipe_favorites")
        .select(
          `
          recipe_id,
          favorited_at,
          recipe:recipes!inner(
            id,
            name,
            description,
            cuisine_type,
            meal_type,
            difficulty,
            servings,
            prep_time,
            cook_time,
            calories_per_serving,
            protein_per_serving,
            carbs_per_serving,
            fat_per_serving,
            average_rating,
            rating_count,
            view_count,
            estimated_cost,
            tags,
            ingredients:recipe_ingredients(
              id,
              food_id,
              amount,
              unit,
              notes,
              optional,
              food:foods(id, name, category)
            )
          )
        `,
        )
        .eq("member_id", memberId)
        .order("favorited_at", { ascending: false })
        .limit(limit),
      "favorited_at",
    );

    const viewsQuery = buildRange(
      this.client
        .from("recipe_views")
        .select(
          `
          recipe_id,
          viewed_at,
          recipe:recipes!inner(
            id,
            name,
            description,
            cuisine_type,
            meal_type,
            difficulty,
            servings,
            prep_time,
            cook_time,
            calories_per_serving,
            protein_per_serving,
            carbs_per_serving,
            fat_per_serving,
            average_rating,
            rating_count,
            view_count,
            estimated_cost,
            tags,
            ingredients:recipe_ingredients(
              id,
              food_id,
              amount,
              unit,
              notes,
              optional,
              food:foods(id, name, category)
            )
          )
        `,
        )
        .eq("member_id", memberId)
        .order("viewed_at", { ascending: false })
        .limit(limit),
      "viewed_at",
    );

    const [ratingsRes, favoritesRes, viewsRes] = await Promise.all([
      ratingsQuery,
      favoritesQuery,
      viewsQuery,
    ]);

    if (ratingsRes.error)
      this.handleError("getDetailedRecipeBehavior:ratings", ratingsRes.error);
    if (favoritesRes.error)
      this.handleError(
        "getDetailedRecipeBehavior:favorites",
        favoritesRes.error,
      );
    if (viewsRes.error)
      this.handleError("getDetailedRecipeBehavior:views", viewsRes.error);

    const ratingRows = (ratingsRes.data || []) as Array<
      RecipeRatingRow & { recipe: RecipeDetailRow }
    >;
    const favoriteRows = (favoritesRes.data || []) as Array<
      RecipeFavoriteRow & { recipe: RecipeDetailRow }
    >;
    const viewRows = (viewsRes.data || []) as Array<
      RecipeViewRow & { recipe: RecipeDetailRow }
    >;

    return {
      ratings: ratingRows.map((row) => ({
        recipeId: row.recipe_id,
        rating: row.rating,
        ratedAt: row.rated_at ? new Date(row.rated_at) : new Date(),
        recipe: this.mapRecipeDetail(row.recipe),
      })),
      favorites: favoriteRows.map((row) => ({
        recipeId: row.recipe_id,
        favoritedAt: row.favorited_at ? new Date(row.favorited_at) : new Date(),
        recipe: this.mapRecipeDetail(row.recipe),
      })),
      views: viewRows.map((row) => ({
        recipeId: row.recipe_id,
        viewedAt: row.viewed_at ? new Date(row.viewed_at) : new Date(),
        recipe: this.mapRecipeDetail(row.recipe),
      })),
    };
  }

  async getRecipeById(recipeId: string): Promise<RecipeDetailDTO | null> {
    const { data, error } = await this.client
      .from("recipes")
      .select(
        `
        id,
        name,
        description,
        cuisine_type,
        meal_type,
        difficulty,
        servings,
        prep_time,
        cook_time,
        total_time,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        average_rating,
        rating_count,
        view_count,
        estimated_cost,
        created_at,
        updated_at,
        tags,
        ingredients:recipe_ingredients(
          id,
          food_id,
          amount,
          unit,
          notes,
          optional,
          food:foods(id, name, category)
        )
      `,
      )
      .eq("id", recipeId)
      .eq("status", "PUBLISHED")
      .eq("is_public", true)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getRecipeById", error);
    }

    if (!data) return null;

    return this.mapRecipeDetail(data as RecipeDetailRow);
  }

  async listPopularRecipes(
    limit = 10,
    category?: string,
  ): Promise<RecipeDetailDTO[]> {
    let query = this.client
      .from("recipes")
      .select(
        `
        id,
        name,
        description,
        cuisine_type,
        meal_type,
        difficulty,
        servings,
        prep_time,
        cook_time,
        total_time,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        average_rating,
        rating_count,
        view_count,
        estimated_cost,
        created_at,
        updated_at,
        tags,
        ingredients:recipe_ingredients(
          id,
          food_id,
          amount,
          unit,
          notes,
          optional,
          food:foods(id, name, category)
        )
      `,
      )
      .eq("status", "PUBLISHED")
      .eq("is_public", true)
      .order("average_rating", { ascending: false })
      .order("rating_count", { ascending: false })
      .order("view_count", { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) {
      this.handleError("listPopularRecipes", error);
    }

    return (data || []).map((row) =>
      this.mapRecipeDetail(row as RecipeDetailRow),
    );
  }

  async upsertLearnedUserPreferences(
    memberId: string,
    payload: LearnedPreferenceInsightsDTO,
  ): Promise<void> {
    const learnedPreferences = {
      ...payload,
      analyzedAt: payload.analyzedAt?.toISOString() ?? new Date().toISOString(),
    };

    const { error } = await this.client.from("user_preferences").upsert(
      {
        member_id: memberId,
        preferred_cuisines: payload.preferences.preferredCuisines,
        preferred_ingredients: payload.preferences.preferredIngredients,
        learned_preferences: learnedPreferences,
        preference_score: payload.confidence,
        last_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    );

    if (error) {
      this.handleError("upsertLearnedUserPreferences", error);
    }
  }

  async getRecipesByIds(ids: string[]): Promise<RecipeDetailDTO[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.client
      .from("recipes")
      .select(
        `
        id,
        name,
        description,
        cuisine_type,
        meal_type,
        difficulty,
        servings,
        prep_time,
        cook_time,
        total_time,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        average_rating,
        rating_count,
        view_count,
        estimated_cost,
        created_at,
        updated_at,
        tags,
        ingredients:recipe_ingredients(
          id,
          food_id,
          amount,
          unit,
          notes,
          optional,
          food:foods(id, name, category)
        )
      `,
      )
      .in("id", ids)
      .eq("status", "PUBLISHED")
      .eq("is_public", true);

    if (error) {
      this.handleError("getRecipesByIds", error);
    }

    return (data || []).map((row) =>
      this.mapRecipeDetail(row as RecipeDetailRow),
    );
  }

  async listMemberBehaviorSamples(options: {
    excludeMemberId?: string;
    limit?: number;
  }): Promise<
    Array<{ memberId: string; behavior: RecommendationBehaviorDTO }>
  > {
    const limit = options.limit ?? 50;

    const [ratingsRes, favoritesRes] = await Promise.all([
      this.client
        .from("recipe_ratings")
        .select("member_id")
        .neq("member_id", options.excludeMemberId ?? "")
        .limit(limit),
      this.client
        .from("recipe_favorites")
        .select("member_id")
        .neq("member_id", options.excludeMemberId ?? "")
        .limit(limit),
    ]);

    if (ratingsRes.error) {
      this.handleError("listMemberBehaviorSamples:ratings", ratingsRes.error);
    }

    if (favoritesRes.error) {
      this.handleError(
        "listMemberBehaviorSamples:favorites",
        favoritesRes.error,
      );
    }

    const memberIds = new Set<string>();
    (ratingsRes.data || []).forEach((row: { member_id: string | null }) => {
      if (row.member_id) memberIds.add(row.member_id);
    });
    (favoritesRes.data || []).forEach((row: { member_id: string | null }) => {
      if (row.member_id) memberIds.add(row.member_id);
    });

    const slicedMemberIds = Array.from(memberIds).slice(0, limit);

    const behaviors = await Promise.all(
      slicedMemberIds.map(async (memberId) => ({
        memberId,
        behavior: await this.getRecipeBehavior(memberId),
      })),
    );

    return behaviors;
  }

  async getRecipeCooccurrence(
    recipeId: string,
    limit = 10,
  ): Promise<Array<{ recipeId: string; count: number }>> {
    const { data: baseFavorites, error: baseError } = await this.client
      .from("recipe_favorites")
      .select("member_id")
      .eq("recipe_id", recipeId);

    if (baseError) {
      this.handleError("getRecipeCooccurrence:base", baseError);
    }

    const memberIds = (baseFavorites || [])
      .map((row) => row.member_id)
      .filter(Boolean);

    if (memberIds.length === 0) return [];

    const { data: relatedFavorites, error: relatedError } = await this.client
      .from("recipe_favorites")
      .select("recipe_id")
      .in("member_id", memberIds)
      .neq("recipe_id", recipeId);

    if (relatedError) {
      this.handleError("getRecipeCooccurrence:related", relatedError);
    }

    const counts = new Map<string, number>();
    (relatedFavorites || []).forEach((row) => {
      const relatedId = row.recipe_id;
      counts.set(relatedId, (counts.get(relatedId) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([recipeId, count]) => ({ recipeId, count }));
  }

  async listDetailedCandidateRecipes(
    filters: RecommendationRecipeFilter,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<RecipeDetailDTO>> {
    let query = this.client
      .from("recipes")
      .select(
        `
        id,
        name,
        description,
        cuisine_type,
        meal_type,
        difficulty,
        servings,
        prep_time,
        cook_time,
        total_time,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        average_rating,
        rating_count,
        view_count,
        estimated_cost,
        created_at,
        updated_at,
        tags,
        ingredients:recipe_ingredients(
          id,
          food_id,
          amount,
          unit,
          notes,
          optional,
          food:foods(id, name, category)
        )
      `,
        { count: "exact" },
      )
      .eq("status", "PUBLISHED")
      .eq("is_public", true);

    if (filters.mealTypes?.length) {
      query = query.in("meal_type", filters.mealTypes);
    }

    if (filters.cuisineTypes?.length) {
      query = query.in("cuisine_type", filters.cuisineTypes);
    }

    if (filters.tags?.length) {
      query = query.contains("tags", filters.tags);
    }

    if (filters.excludeRecipeIds?.length) {
      query = query.not("id", "in", filters.excludeRecipeIds);
    }

    if (filters.maxCookTimeMinutes) {
      query = query.lte("cook_time", filters.maxCookTimeMinutes);
    }

    if (filters.budgetLimit) {
      query = query.lte("estimated_cost", filters.budgetLimit);
    }

    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) {
      this.handleError("listDetailedCandidateRecipes", error);
    }

    const items = (data || []).map((row) =>
      this.mapRecipeDetail(row as RecipeDetailRow),
    );

    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit
        ? (pagination.offset ?? 0) + items.length < (count ?? 0)
        : false,
    };
  }

  /**
   * 获取相似食谱集合
   *
   * 基于菜系和标签计算相似度
   */
  async getSimilarRecipes(
    recipeId: string,
    limit = 10,
  ): Promise<RecipeSummaryDTO[]> {
    // 1. 获取目标食谱
    const { data: baseRecipe, error } = await this.client
      .from("recipes")
      .select("id, cuisine_type, tags, meal_type")
      .eq("id", recipeId)
      .single();

    if (error) {
      this.handleError("getSimilarRecipes:baseRecipe", error);
    }

    if (!baseRecipe) {
      return [];
    }

    // 2. 查询相似食谱
    let query = this.client
      .from("recipes")
      .select(
        `
        id,
        name,
        cuisine_type,
        meal_type,
        difficulty,
        servings,
        prep_time,
        cook_time,
        calories_per_serving,
        protein_per_serving,
        carbs_per_serving,
        fat_per_serving,
        tags,
        ingredients
      `,
      )
      .neq("id", recipeId)
      .eq("status", "PUBLISHED")
      .eq("is_public", true)
      .limit(limit * 2); // 查询更多，后续过滤

    // 菜系匹配优先
    if (baseRecipe.cuisine_type) {
      query = query.eq("cuisine_type", baseRecipe.cuisine_type);
    }

    // 标签重叠过滤
    if (Array.isArray(baseRecipe.tags) && baseRecipe.tags.length) {
      query = query.overlaps("tags", baseRecipe.tags as string[]);
    }

    const { data, error: listError } = await query;
    if (listError) {
      this.handleError("getSimilarRecipes:list", listError);
    }

    return (data || [])
      .map((row) => this.mapRecipe(row as RecipeRow))
      .slice(0, limit);
  }

  /**
   * 查询用户当前生效的健康目标
   */
  async getActiveHealthGoal(memberId: string): Promise<HealthGoalDTO | null> {
    const { data, error } = await this.client
      .from("health_goals")
      .select("*")
      .eq("member_id", memberId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getActiveHealthGoal", error);
    }

    return data ? this.mapHealthGoal(data) : null;
  }

  /**
   * 获取最新库存快照
   */
  async getInventorySnapshot(memberId: string): Promise<InventorySnapshotDTO> {
    const { data, error } = await this.client
      .from("inventory_items")
      .select("*")
      .eq("member_id", memberId)
      .is("deleted_at", null);

    if (error) {
      this.handleError("getInventorySnapshot", error);
    }

    return {
      memberId,
      capturedAt: new Date(),
      items: (data || []).map((item) => ({
        ingredientName: item.name,
        quantity: item.quantity ?? 0,
        unit: item.unit ?? undefined,
        freshnessScore: item.freshness_score ?? undefined,
        expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
      })),
    };
  }

  /**
   * 记录推荐日志
   */
  async saveRecommendationLog(entry: RecommendationLogDTO): Promise<void> {
    const { error } = await this.client.from("recommendation_logs").insert({
      member_id: entry.memberId,
      recipe_id: entry.recipeId,
      rank: entry.rank,
      score: entry.score,
      reasons: entry.reasons,
      metadata: entry.metadata ?? null,
      generated_at: entry.generatedAt.toISOString(),
    });

    if (error) {
      this.handleError("saveRecommendationLog", error);
    }
  }

  /**
   * 更新或创建用户的推荐权重
   */
  async upsertRecommendationWeights(
    memberId: string,
    weights: RecommendationWeightsDTO,
  ): Promise<void> {
    const { error } = await this.client.from("user_preferences").upsert(
      {
        member_id: memberId,
        recommendation_weight: weights as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    );

    if (error) {
      this.handleError("upsertRecommendationWeights", error);
    }
  }

  private mapRecipeDetail(row: RecipeDetailRow): RecipeDetailDTO {
    const ingredients: RecipeIngredientRow[] = Array.isArray(row.ingredients)
      ? row.ingredients
      : [];

    return {
      id: row.id,
      name: row.name,
      cuisineType: row.cuisine_type ?? null,
      mealType: row.meal_type ?? null,
      difficulty: row.difficulty ?? null,
      servings: row.servings ?? null,
      prepTimeMinutes: row.prep_time ?? null,
      cookTimeMinutes: row.cook_time ?? null,
      caloriesPerServing: row.calories_per_serving ?? null,
      proteinPerServing: row.protein_per_serving ?? null,
      carbsPerServing: row.carbs_per_serving ?? null,
      fatPerServing: row.fat_per_serving ?? null,
      averageRating: row.average_rating ?? null,
      ratingCount: row.rating_count ?? null,
      viewCount: row.view_count ?? null,
      estimatedCost: row.estimated_cost ?? null,
      tags: this.parseStringArray(row.tags ?? null),
      ingredients: this.normalizeIngredients(
        row.ingredients as unknown as Json,
      ),
      description: row.description ?? undefined,
      cuisine: row.cuisine_type ?? undefined,
      category: row.category ?? undefined,
      totalTime: row.total_time ?? undefined,
      calories: row.calories_per_serving ?? undefined,
      protein: row.protein_per_serving ?? undefined,
      carbs: row.carbs_per_serving ?? undefined,
      fat: row.fat_per_serving ?? undefined,
      mealTypes: row.meal_type ? [row.meal_type] : undefined,
      costLevel: row.cost_level ?? null,
      tagsRaw: this.parseTagsRaw(row.tags ?? null),
      ingredientsDetailed: ingredients
        .map((ingredient: RecipeIngredientRow) => {
          const foodValue:
            | {
                id?: string | null;
                name?: string | null;
                category?: string | null;
              }
            | undefined = Array.isArray(ingredient.food)
              ? ingredient.food[0]
              : ingredient.food;
          if (!ingredient.food_id && !foodValue?.id) return null;
          const foodId = foodValue?.id ?? ingredient.food_id ?? "";
          return {
            id: ingredient.id ?? foodId,
            foodId,
            amount: ingredient.amount ?? 0,
            unit: ingredient.unit ?? "",
            optional: ingredient.optional ?? undefined,
            notes: ingredient.notes ?? undefined,
            food: {
              id: foodId,
              name: foodValue?.name ?? "",
              category: foodValue?.category ?? null,
            },
          };
        })
        .filter((ingredient): ingredient is NonNullable<typeof ingredient> =>
          Boolean(ingredient?.foodId),
        ),
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  private mapRecipe(row: RecipeRow): RecipeSummaryDTO {
    return {
      id: row.id,
      name: row.name,
      cuisineType: row.cuisine_type,
      mealType: row.meal_type,
      difficulty: row.difficulty,
      servings: row.servings,
      prepTimeMinutes: row.prep_time,
      cookTimeMinutes: row.cook_time,
      caloriesPerServing: row.calories_per_serving,
      proteinPerServing: row.protein_per_serving,
      carbsPerServing: row.carbs_per_serving,
      fatPerServing: row.fat_per_serving,
      averageRating: row.average_rating ?? null,
      ratingCount: row.rating_count ?? null,
      viewCount: row.view_count ?? null,
      estimatedCost: row.estimated_cost ?? null,
      tags: this.parseStringArray(row.tags),
      ingredients: this.normalizeIngredients(row.ingredients),
    };
  }

  /**
   * 数据映射：UserPreferenceRow → UserPreferenceDTO
   */
  private mapUserPreference(row: UserPreferenceRow): UserPreferenceDTO {
    const weights =
      row.recommendation_weight as RecommendationWeightsDTO | null;
    return {
      memberId: row.member_id,
      preferredIngredients: this.parseStringArray(row.preferred_ingredients),
      avoidedIngredients: this.parseStringArray(row.avoided_ingredients),
      maxCookTimeMinutes: row.max_cook_time,
      costLevel: (row.cost_level as UserPreferenceDTO["costLevel"]) || "MEDIUM",
      preferredCuisines: this.parseStringArray(row.preferred_cuisines),
      recommendationWeights: weights ?? undefined,
    };
  }

  /**
   * 数据映射：HealthGoalRow → HealthGoalDTO
   */
  private mapHealthGoal(row: HealthGoalRow): HealthGoalDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      goalType: row.goal_type,
      status: row.status as HealthGoalDTO["status"],
      targetCalories: row.target_calories,
      macroTargets: {
        protein: row.target_protein,
        carbs: row.target_carbs,
        fat: row.target_fat,
      },
      createdAt: new Date(row.created_at),
    };
  }

  private parseTagsRaw(
    value: Json | null | undefined,
  ): string | string[] | null {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    return null;
  }

  /**
   * 辅助：解析 JSONB 字符串数组
   */
  private parseStringArray(value: Json | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * 辅助：规范化食材数据
   */
  private normalizeIngredients(value: Json | null | undefined) {
    if (!value) return [];
    const array = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? JSON.parse(value)
        : [];
    if (!Array.isArray(array)) return [];
    return array
      .map((item) => {
        if (typeof item !== "object" || !item) return null;
        return {
          name:
            "name" in item && typeof item.name === "string" ? item.name : "",
          amount:
            "amount" in item && typeof item.amount === "number"
              ? item.amount
              : undefined,
          unit:
            "unit" in item && typeof item.unit === "string"
              ? item.unit
              : undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item?.name);
  }

  /**
   * 辅助：带时间范围的查询
   */
  private async selectWithRange<T extends { member_id: string }>(
    table: keyof Database["public"]["Tables"],
    column: string,
    memberId: string,
    range?: DateRangeFilter,
  ) {
    let query = this.client
      .from(table as string)
      .select("*")
      .eq("member_id", memberId);
    if (range?.start) {
      query = query.gte(column, range.start.toISOString());
    }
    if (range?.end) {
      query = query.lte(column, range.end.toISOString());
    }
    return query;
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? "Unknown Supabase error";
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`RecommendationRepository.${operation} failed: ${message}`);
  }
}
