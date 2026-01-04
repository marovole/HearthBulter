/**
 * 推荐 Repository 接口
 *
 * 定义推荐引擎所需的数据访问契约，包括：
 * - 用户偏好管理
 * - 食谱查询与过滤
 * - 用户行为分析
 * - 健康目标获取
 * - 库存快照
 * - 推荐日志记录
 *
 * @module recommendation-repository
 */

import type {
  DateRangeFilter,
  PaginatedResult,
  PaginationInput,
} from '../types/common';
import type {
  RecommendationBehaviorDTO,
  RecommendationLogDTO,
  RecommendationRecipeFilter,
  RecommendationWeightsDTO,
  RecipeSummaryDTO,
  UserPreferenceDTO,
  HealthGoalDTO,
  InventorySnapshotDTO,
} from '../types/recommendation';

/**
 * 食谱配料详情 DTO
 *
 * 提供智能推荐和相似食谱功能所需的原始食材信息，
 * 包含与 Food 表的关联数据。
 */
export interface RecipeIngredientDetailDTO {
  id: string;
  foodId: string;
  amount: number;
  unit: string;
  optional?: boolean;
  notes?: string | null;
  food: {
    id: string;
    name: string;
    category?: string | null;
  };
}

/**
 * 食谱详情 DTO
 *
 * 在 RecipeSummaryDTO 基础上补充 RecommendationEngine/ContentFilter
 * 所需的营养、烹饪与分类字段。
 */
export type RecipeDetailDTO = RecipeSummaryDTO & {
  description?: string | null;
  cuisine?: string | null;
  category?: string | null;
  totalTime?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  mealTypes?: string[];
  costLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  tagsRaw?: string | string[] | null;
  ingredientsDetailed?: RecipeIngredientDetailDTO[];
};

/**
 * 用户行为事件（附带食谱详情）
 */
export interface RecipeRatingDetailDTO {
  recipeId: string;
  rating: number;
  ratedAt: Date;
  recipe: RecipeDetailDTO;
}

export interface RecipeFavoriteDetailDTO {
  recipeId: string;
  favoritedAt: Date;
  recipe: RecipeDetailDTO;
}

export interface RecipeViewDetailDTO {
  recipeId: string;
  viewedAt: Date;
  recipe: RecipeDetailDTO;
}

export interface RecommendationBehaviorWithDetailsDTO {
  ratings: RecipeRatingDetailDTO[];
  favorites: RecipeFavoriteDetailDTO[];
  views: RecipeViewDetailDTO[];
}

/**
 * 行为查询选项
 */
export interface BehaviorDetailQueryOptions {
  range?: DateRangeFilter;
  limit?: number;
  minRating?: number;
}

/**
 * 学习偏好模型 payload
 */
export interface LearnedPreferenceInsightsDTO {
  preferences: {
    preferredCuisines: string[];
    preferredIngredients: string[];
    avgRating: number;
    favoriteCount: number;
  };
  confidence: number;
  analyzedAt?: Date;
}

/**
 * 推荐 Repository 接口
 *
 * 抽象了推荐引擎所需的所有数据访问操作，
 * 使推荐逻辑与具体数据源（Supabase/Mock）解耦
 */
export interface RecommendationRepository {
  /**
   * 获取用户偏好配置
   *
   * @param memberId - 成员ID
   * @returns 用户偏好对象，不存在时返回 null
   */
  getUserPreference(memberId: string): Promise<UserPreferenceDTO | null>;

  /**
   * 查询可用的候选食谱
   *
   * 支持多维度过滤：
   * - 餐型（早/中/晚餐）
   * - 菜系
   * - 标签
   * - 烹饪时间
   * - 预算限制
   *
   * @param filters - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页的食谱列表
   */
  listCandidateRecipes(
    filters: RecommendationRecipeFilter,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<RecipeSummaryDTO>>;

  /**
   * 获取用户的行为数据
   *
   * 包括用户对食谱的：
   * - 评分记录
   * - 收藏记录
   * - 浏览记录
   *
   * @param memberId - 成员ID
   * @param range - 时间范围（可选）
   * @returns 用户行为数据
   */
  getRecipeBehavior(
    memberId: string,
    range?: DateRangeFilter,
  ): Promise<RecommendationBehaviorDTO>;

  /**
   * 获取带有食谱详情的用户行为数据
   *
   * 用于 AI 学习用户偏好，需要原始食谱特征。
   *
   * @param memberId - 成员ID
   * @param options - 限流/筛选配置
   * @returns 富行为数据（含食谱详情）
   */
  getDetailedRecipeBehavior(
    memberId: string,
    options?: BehaviorDetailQueryOptions,
  ): Promise<RecommendationBehaviorWithDetailsDTO>;

  /**
   * 获取相似食谱集合
   *
   * 用于内容过滤或协同过滤场景，
   * 基于菜系、标签等相似度计算
   *
   * @param recipeId - 参考食谱ID
   * @param limit - 返回数量限制
   * @returns 相似食谱列表
   */
  getSimilarRecipes(
    recipeId: string,
    limit?: number,
  ): Promise<RecipeSummaryDTO[]>;

  /**
   * 获取单个食谱的完整详情
   *
   * @param recipeId - 食谱ID
   * @returns 食谱详情，不存在时返回 null
   */
  getRecipeById(recipeId: string): Promise<RecipeDetailDTO | null>;

  /**
   * 获取热门食谱推荐
   *
   * @param limit - 返回数量限制
   * @param category - 可选的分类过滤
   * @returns 热门食谱列表
   */
  listPopularRecipes(
    limit?: number,
    category?: string,
  ): Promise<RecipeDetailDTO[]>;

  /**
   * 查询用户当前生效的健康目标
   *
   * @param memberId - 成员ID
   * @returns 健康目标对象，不存在时返回 null
   */
  getActiveHealthGoal(memberId: string): Promise<HealthGoalDTO | null>;

  /**
   * 获取最新库存快照
   *
   * 用于计算库存匹配评分，
   * 优先推荐利用现有食材的食谱
   *
   * @param memberId - 成员ID
   * @returns 库存快照
   */
  getInventorySnapshot(memberId: string): Promise<InventorySnapshotDTO>;

  /**
   * 记录推荐日志
   *
   * 用于：
   * - A/B 测试
   * - 推荐效果审计
   * - 模型优化
   *
   * @param entry - 推荐日志条目
   */
  saveRecommendationLog(entry: RecommendationLogDTO): Promise<void>;

  /**
   * 更新或创建用户的推荐权重
   *
   * 用户可以自定义各维度（库存/价格/营养/偏好/季节）
   * 的推荐权重
   *
   * @param memberId - 成员ID
   * @param weights - 推荐权重配置
   */
  upsertRecommendationWeights(
    memberId: string,
    weights: RecommendationWeightsDTO,
  ): Promise<void>;

  /**
   * 更新 AI 学习到的用户偏好模型
   *
   * @param memberId - 成员ID
   * @param payload - 学习到的偏好洞察
   */
  upsertLearnedUserPreferences(
    memberId: string,
    payload: LearnedPreferenceInsightsDTO,
  ): Promise<void>;

  /**
   * 批量获取食谱详情
   *
   * @param ids - 食谱ID列表
   * @returns 食谱详情列表
   */
  getRecipesByIds(ids: string[]): Promise<RecipeDetailDTO[]>;

  /**
   * 获取成员行为样本（用于协同过滤）
   *
   * @param options - 查询选项
   * @returns 成员行为样本列表
   */
  listMemberBehaviorSamples(options: {
    excludeMemberId?: string;
    limit?: number;
  }): Promise<Array<{ memberId: string; behavior: RecommendationBehaviorDTO }>>;

  /**
   * 获取食谱共现数据
   *
   * @param recipeId - 参考食谱ID
   * @param limit - 返回数量限制
   * @returns 共现食谱列表
   */
  getRecipeCooccurrence(
    recipeId: string,
    limit?: number,
  ): Promise<Array<{ recipeId: string; count: number }>>;

  /**
   * 获取详细的候选食谱列表
   *
   * @param filters - 过滤条件
   * @param pagination - 分页参数
   * @returns 包含完整详情的食谱列表
   */
  listDetailedCandidateRecipes(
    filters: RecommendationRecipeFilter,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<RecipeDetailDTO>>;
}
