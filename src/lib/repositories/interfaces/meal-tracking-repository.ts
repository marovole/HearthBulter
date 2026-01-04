/**
 * 膳食追踪 Repository 接口
 *
 * 定义膳食记录管理系统所需的数据访问契约，包括：
 * - 膳食记录 CRUD 操作
 * - 营养计算和汇总
 * - 快速模板管理
 * - 连续打卡统计
 *
 * @module meal-tracking-repository
 */

import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  MealLogDTO,
  MealLogCreateInputDTO,
  MealLogUpdateInputDTO,
  MealLogFilterDTO,
  QuickTemplateDTO,
  QuickTemplateCreateInputDTO,
  TrackingStreakDTO,
  DailyNutritionSummaryDTO,
  NutritionCalculationInputDTO,
  NutritionCalculationResultDTO,
} from '../types/meal-tracking';

/**
 * 膳食追踪 Repository 接口
 *
 * 抽象了膳食记录管理所需的所有数据访问操作，
 * 支持膳食记录、营养计算、快速模板、连续打卡等功能
 */
export interface MealTrackingRepository {
  // ==================== CRUD 操作 ====================

  /**
   * 创建膳食记录
   *
   * 自动执行：
   * - 根据食物列表计算营养成分
   * - 创建膳食记录和食物明细
   * - 更新连续打卡统计
   *
   * @param input - 膳食记录创建参数
   * @returns 创建的膳食记录对象（含食物明细）
   */
  createMealLog(input: MealLogCreateInputDTO): Promise<MealLogDTO>;

  /**
   * 更新膳食记录
   *
   * 支持更新：
   * - 日期和餐次类型
   * - 食物列表（自动重新计算营养）
   * - 备注
   *
   * @param id - 膳食记录ID
   * @param input - 更新参数
   * @returns 更新后的膳食记录对象
   */
  updateMealLog(id: string, input: MealLogUpdateInputDTO): Promise<MealLogDTO>;

  /**
   * 获取膳食记录详情
   *
   * 包含完整的关联数据：
   * - 食物明细列表
   * - 食物营养信息
   *
   * @param id - 膳食记录ID
   * @returns 膳食记录对象，不存在时返回 null
   */
  getMealLogById(id: string): Promise<MealLogDTO | null>;

  /**
   * 查询成员的膳食记录列表
   *
   * 支持多维度过滤：
   * - 按日期范围
   * - 按餐次类型
   * - 按模板标记
   *
   * @param memberId - 成员ID
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页的膳食记录列表
   */
  listMealLogs(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealLogDTO>>;

  /**
   * 软删除膳食记录
   *
   * 标记为已删除，保留历史数据用于分析
   *
   * @param id - 膳食记录ID
   */
  deleteMealLog(id: string): Promise<void>;

  // ==================== 特殊查询 ====================

  /**
   * 获取今日膳食记录
   *
   * 快捷方法，返回成员今日的所有膳食记录
   *
   * @param memberId - 成员ID
   * @returns 今日的膳食记录列表
   */
  getTodayMealLogs(memberId: string): Promise<MealLogDTO[]>;

  /**
   * 获取膳食记录历史
   *
   * 支持日期范围查询和分页
   *
   * @param memberId - 成员ID
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页的膳食记录列表
   */
  getMealLogHistory(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealLogDTO>>;

  // ==================== 营养计算 ====================

  /**
   * 计算食物列表的总营养成分
   *
   * 根据食物ID和份量（克数）计算总热量、蛋白质、碳水、脂肪等
   *
   * @param foods - 食物列表（包含foodId和amount）
   * @returns 营养计算结果
   */
  calculateNutrition(
    foods: NutritionCalculationInputDTO,
  ): Promise<NutritionCalculationResultDTO>;

  /**
   * 获取每日营养汇总
   *
   * 汇总某一天的所有膳食记录，计算：
   * - 总营养成分
   * - 各餐次记录数量
   *
   * @param memberId - 成员ID
   * @param date - 日期
   * @returns 每日营养汇总
   */
  getDailySummary(
    memberId: string,
    date: Date,
  ): Promise<DailyNutritionSummaryDTO>;

  // ==================== 快速模板 ====================

  /**
   * 创建快速模板
   *
   * 基于已有的膳食记录创建快速模板，便于下次快速记录
   *
   * @param input - 模板创建参数
   * @returns 创建的快速模板对象
   */
  createQuickTemplate(
    input: QuickTemplateCreateInputDTO,
  ): Promise<QuickTemplateDTO>;

  /**
   * 列出快速模板
   *
   * 按使用频率排序，常用的排在前面
   *
   * @param memberId - 成员ID
   * @param mealType - 可选的餐次类型过滤
   * @returns 快速模板列表
   */
  listQuickTemplates(
    memberId: string,
    mealType?: string,
  ): Promise<QuickTemplateDTO[]>;

  /**
   * 使用快速模板创建膳食记录
   *
   * 基于模板快速创建新的膳食记录，并更新模板的使用统计
   *
   * @param templateId - 模板ID
   * @param date - 记录日期
   * @returns 创建的膳食记录对象
   */
  useQuickTemplate(templateId: string, date: Date): Promise<MealLogDTO>;

  /**
   * 删除快速模板
   *
   * @param id - 模板ID
   */
  deleteQuickTemplate(id: string): Promise<void>;

  // ==================== 连续打卡统计 ====================

  /**
   * 获取成员的连续打卡统计
   *
   * @param memberId - 成员ID
   * @returns 连续打卡统计对象，不存在时返回默认值
   */
  getTrackingStreak(memberId: string): Promise<TrackingStreakDTO>;

  /**
   * 更新连续打卡统计
   *
   * 在创建新的膳食记录时调用，自动更新：
   * - 当前连续天数
   * - 最长连续天数
   * - 总打卡天数
   * - 成就徽章
   *
   * @param memberId - 成员ID
   * @param date - 打卡日期
   * @returns 更新后的连续打卡统计
   */
  updateTrackingStreak(
    memberId: string,
    date: Date,
  ): Promise<TrackingStreakDTO>;

  // ==================== 统计分析 ====================

  /**
   * 获取最近常用的食物列表
   *
   * 用于快速录入，显示用户最近30天常用的食物
   *
   * @param memberId - 成员ID
   * @param limit - 返回数量限制
   * @returns 食物ID列表（按使用频率排序）
   */
  getRecentFoods(
    memberId: string,
    limit?: number,
  ): Promise<Array<{ foodId: string; useCount: number }>>;

  /**
   * 获取营养趋势数据
   *
   * 用于图表展示，显示一段时间内的营养摄入趋势
   *
   * @param memberId - 成员ID
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @returns 每日营养汇总列表
   */
  getNutritionTrends(
    memberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyNutritionSummaryDTO[]>;
}
