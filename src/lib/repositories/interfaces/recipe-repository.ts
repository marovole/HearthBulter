/**
 * Recipe Repository 接口
 *
 * 提供食谱相关数据的统一访问接口，支持 Prisma 和 Supabase 两种实现
 * 主要处理 Favorites（收藏）和 Ratings（评分）功能
 */

/**
 * 食谱收藏记录类型
 */
export interface RecipeFavoriteDTO {
  id: string;
  recipeId: string;
  memberId: string;
  favoritedAt: Date;
  notes?: string | null;
  recipe?: RecipeWithIngredientsDTO;
}

/**
 * 食谱（包含食材）DTO
 */
export interface RecipeWithIngredientsDTO {
  id: string;
  name: string;
  description?: string | null;
  servings?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  difficulty?: string | null;
  cuisine?: string | null;
  tags?: string[];
  imageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ingredients?: RecipeIngredientDTO[];
}

/**
 * 食谱食材 DTO
 */
export interface RecipeIngredientDTO {
  id: string;
  recipeId: string;
  amount?: number | null;
  unit?: string | null;
  notes?: string | null;
  food: {
    id: string;
    name: string;
    nameEn?: string | null;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    category?: string | null;
  };
}

/**
 * 食谱评分记录类型
 */
export interface RecipeRatingDTO {
  id: string;
  recipeId: string;
  memberId: string;
  rating: number; // 1-5
  comment?: string | null;
  tags?: string[];
  ratedAt: Date;
}

/**
 * 获取收藏列表的查询参数
 */
export interface GetFavoritesQuery {
  memberId: string;
  page?: number;
  limit?: number;
  sortBy?: 'favoritedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 收藏列表结果
 */
export interface FavoritesResult {
  favorites: RecipeFavoriteDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 添加收藏的输入
 */
export interface AddFavoriteInput {
  recipeId: string;
  memberId: string;
  notes?: string | null;
}

/**
 * 添加/更新评分的输入
 */
export interface AddOrUpdateRatingInput {
  recipeId: string;
  memberId: string;
  rating: number;
  comment?: string | null;
  tags?: string[];
}

/**
 * Recipe Repository 接口
 */
export interface RecipeRepository {
  /**
   * 获取用户的收藏列表（带分页和食谱详情）
   *
   * @param query - 查询参数
   * @returns 收藏列表及分页信息
   */
  getFavoritesByMember(query: GetFavoritesQuery): Promise<FavoritesResult>;

  /**
   * 添加收藏
   *
   * @param input - 收藏输入
   * @returns 创建的收藏记录
   */
  addFavorite(input: AddFavoriteInput): Promise<RecipeFavoriteDTO>;

  /**
   * 移除收藏
   *
   * @param recipeId - 食谱 ID
   * @param memberId - 成员 ID
   * @returns 是否成功
   */
  removeFavorite(recipeId: string, memberId: string): Promise<void>;

  /**
   * 检查收藏状态
   *
   * @param recipeId - 食谱 ID
   * @param memberId - 成员 ID
   * @returns 收藏记录（如果存在）
   */
  checkFavoriteStatus(
    recipeId: string,
    memberId: string,
  ): Promise<RecipeFavoriteDTO | null>;

  /**
   * 添加或更新评分
   *
   * @param input - 评分输入
   * @returns 创建或更新的评分记录
   */
  addOrUpdateRating(input: AddOrUpdateRatingInput): Promise<RecipeRatingDTO>;

  /**
   * 获取用户对食谱的评分
   *
   * @param recipeId - 食谱 ID
   * @param memberId - 成员 ID
   * @returns 评分记录（如果存在）
   */
  getRating(
    recipeId: string,
    memberId: string,
  ): Promise<RecipeRatingDTO | null>;

  /**
   * 检查食谱是否存在
   *
   * @param recipeId - 食谱 ID
   * @returns 是否存在
   */
  recipeExists(recipeId: string): Promise<boolean>;
}
