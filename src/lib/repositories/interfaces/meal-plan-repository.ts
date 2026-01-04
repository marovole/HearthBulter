/**
 * 膳食计划 Repository 接口
 *
 * 提供膳食计划（MealPlan）、餐次（Meal）、食材（MealIngredient）的
 * 统一数据访问层抽象。
 *
 * 职责范围：
 * - 膳食计划的完整生命周期管理
 * - 计划内餐次的 CRUD 操作
 * - 餐次食材的维护
 * - 基于时间和成员的计划查询
 *
 * @module meal-plan-repository
 */

import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  MealPlanDTO,
  MealPlanCreateInputDTO,
  MealPlanUpdateInputDTO,
  MealPlanFilterDTO,
  MealDTO,
  MealCreateInputDTO,
  MealUpdateInputDTO,
  MealIngredientCreateInputDTO,
} from '../types/meal-plan';

/**
 * 膳食计划 Repository 接口
 */
export interface MealPlanRepository {
  // ==================== 计划 CRUD ====================

  /**
   * 创建新的膳食计划
   *
   * 自动处理：
   * - 验证日期范围（endDate > startDate）
   * - 如果提供了初始餐次，一并创建
   * - 设置默认状态为 ACTIVE
   *
   * @param input - 计划创建参数
   * @returns 创建后的完整计划对象（包含餐次）
   */
  createMealPlan(input: MealPlanCreateInputDTO): Promise<MealPlanDTO>;

  /**
   * 根据 ID 获取膳食计划
   *
   * @param id - 计划 ID
   * @returns 计划对象（包含所有餐次和食材），不存在时返回 null
   */
  getMealPlanById(id: string): Promise<MealPlanDTO | null>;

  /**
   * 查询膳食计划列表
   *
   * 支持多维度过滤：
   * - 按成员筛选
   * - 按目标类型（减重/增肌/维持/改善健康）
   * - 按状态（进行中/已完成/已取消）
   * - 按时间范围
   * - 是否包含已删除的计划
   *
   * @param filter - 可选的过滤条件
   * @param pagination - 可选的分页参数
   * @returns 分页的计划列表
   */
  listMealPlans(
    filter?: MealPlanFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealPlanDTO>>;

  /**
   * 更新膳食计划
   *
   * 允许更新：
   * - 计划时间范围
   * - 目标营养值
   * - 计划状态
   *
   * 注意：不更新餐次列表，请使用餐次相关方法
   *
   * @param id - 计划 ID
   * @param input - 更新参数
   * @returns 更新后的计划对象
   */
  updateMealPlan(
    id: string,
    input: MealPlanUpdateInputDTO,
  ): Promise<MealPlanDTO>;

  /**
   * 软删除膳食计划
   *
   * 标记为已删除，保留历史数据用于分析和审计
   *
   * @param id - 计划 ID
   */
  deleteMealPlan(id: string): Promise<void>;

  // ==================== 餐次 CRUD ====================

  /**
   * 在计划中创建餐次
   *
   * 自动处理：
   * - 验证日期在计划范围内
   * - 如果提供了食材列表，同时创建食材记录
   * - 自动计算总营养值（如果提供食材）
   *
   * @param planId - 所属计划 ID
   * @param input - 餐次创建参数
   * @returns 创建后的餐次对象（包含食材）
   */
  createMeal(planId: string, input: MealCreateInputDTO): Promise<MealDTO>;

  /**
   * 根据 ID 获取餐次
   *
   * @param id - 餐次 ID
   * @returns 餐次对象（包含食材列表），不存在时返回 null
   */
  getMealById(id: string): Promise<MealDTO | null>;

  /**
   * 更新餐次
   *
   * 允许更新：
   * - 日期和类型
   * - 营养值
   * - 食材列表（会替换原有食材）
   *
   * @param id - 餐次 ID
   * @param input - 更新参数
   * @returns 更新后的餐次对象
   */
  updateMeal(id: string, input: MealUpdateInputDTO): Promise<MealDTO>;

  /**
   * 删除餐次
   *
   * 硬删除，同时删除关联的食材记录
   *
   * @param id - 餐次 ID
   */
  deleteMeal(id: string): Promise<void>;

  // ==================== 食材管理 ====================

  /**
   * 更新餐次的食材列表
   *
   * 完全替换现有食材列表，适用于：
   * - 调整食材配比
   * - 替换某些食材
   * - 重新规划营养
   *
   * 自动处理：
   * - 删除旧的食材记录
   * - 创建新的食材记录
   * - 重新计算并更新餐次营养值
   *
   * @param mealId - 餐次 ID
   * @param ingredients - 新的食材列表
   * @returns 更新后的餐次对象（包含新食材）
   */
  updateMealIngredients(
    mealId: string,
    ingredients: MealIngredientCreateInputDTO[],
  ): Promise<MealDTO>;

  // ==================== 特殊查询 ====================

  /**
   * 获取成员当前的活跃计划
   *
   * 查询条件：
   * - status = 'ACTIVE'
   * - 未被软删除
   * - 当前日期在计划时间范围内
   *
   * @param memberId - 成员 ID
   * @returns 活跃计划或 null（无活跃计划时）
   */
  getActivePlanByMember(memberId: string): Promise<MealPlanDTO | null>;

  /**
   * 查询成员在指定时间范围内的计划
   *
   * 返回所有与指定时间范围有重叠的计划，按开始日期排序
   *
   * @param memberId - 成员 ID
   * @param startDate - 查询起始日期
   * @param endDate - 查询结束日期
   * @param pagination - 可选的分页参数
   * @returns 分页的计划列表
   */
  getPlansByDateRange(
    memberId: string,
    startDate: Date,
    endDate: Date,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealPlanDTO>>;
}
