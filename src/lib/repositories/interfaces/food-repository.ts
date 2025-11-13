import type { Food, FoodCategory } from '@prisma/client';

/**
 * Food 记录类型（基于 Prisma schema，与 Supabase 一致）
 */
export type FoodRecord = Food;

/**
 * Food Repository 接口
 *
 * 提供食材数据的统一访问接口，支持 Prisma 和 Supabase 两种实现
 */
export interface FoodRepository {
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
  listByCategory(category: FoodCategory, from: number, to: number): Promise<FoodRecord[]>;

  /**
   * 统计指定分类的食材数量
   *
   * @param category - 食材分类
   * @returns 食材数量
   */
  countByCategory(category: FoodCategory): Promise<number>;
}
