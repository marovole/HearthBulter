import type { Food, FoodCategory } from "@prisma/client";

/**
 * Food 记录类型（基于 Prisma schema，与 Supabase 一致）
 */
export type FoodRecord = Food;

/**
 * 食材搜索查询参数
 */
export interface FoodSearchQuery {
  /**
   * 搜索关键词（支持中英文）
   */
  query: string;
  /**
   * 可选的分类过滤
   */
  category?: FoodCategory;
  /**
   * 页码（从 1 开始）
   */
  page?: number;
  /**
   * 每页数量
   */
  limit?: number;
}

/**
 * 食材搜索结果
 */
export interface FoodSearchResult {
  /**
   * 食材列表
   */
  foods: FoodRecord[];
  /**
   * 总数量
   */
  total: number;
  /**
   * 当前页码
   */
  page: number;
  /**
   * 每页数量
   */
  limit: number;
}

/**
 * Food Repository 接口
 *
 * 提供食材数据的统一访问接口，支持 Prisma 和 Supabase 两种实现
 */
export interface FoodRepository {
  /**
   * 根据 ID 查找单个食材
   *
   * @param id - 食材 ID
   * @returns 食材记录，如果不存在返回 null
   */
  findById(id: string): Promise<FoodRecord | null>;

  /**
   * 搜索食材（支持中英文搜索、分类过滤、分页）
   *
   * @param params - 搜索参数
   * @returns 搜索结果
   */
  searchFoods(params: FoodSearchQuery): Promise<FoodSearchResult>;

  /**
   * 获取最近创建的热门食材
   *
   * @param limit - 返回数量限制
   * @returns 食材列表
   */
  findPopular(limit: number): Promise<FoodRecord[]>;

  /**
   * 按分类查询食材（分页）
   *
   * @param category - 食材分类
   * @param from - 起始索引
   * @param to - 结束索引
   * @returns 食材列表
   */
  listByCategory(
    category: FoodCategory,
    from: number,
    to: number,
  ): Promise<FoodRecord[]>;

  /**
   * 统计指定分类的食材数量
   *
   * @param category - 食材分类
   * @returns 食材数量
   */
  countByCategory(category: FoodCategory): Promise<number>;
}
