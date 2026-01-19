/**
 * 预算 Repository 接口
 *
 * 定义预算管理系统所需的数据访问契约，包括：
 * - 预算 CRUD 操作
 * - 支出记录管理
 * - 预算使用率聚合
 * - 预警管理
 * - 预算状态快照
 *
 * @module budget-repository
 */

import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  BudgetAlertDTO,
  BudgetCreateDTO,
  BudgetDTO,
  BudgetStatusDTO,
  BudgetUpdateDTO,
  SpendingCreateDTO,
  SpendingDTO,
  SpendingFilterDTO,
} from "../types/budget";

/**
 * 预算 Repository 接口
 *
 * 抽象了预算管理所需的所有数据访问操作，
 * 支持多维度预算控制、实时聚合计算、预警机制
 */
export interface BudgetRepository {
  /**
   * 创建预算
   *
   * @param payload - 预算创建参数
   * @returns 创建的预算对象
   */
  createBudget(payload: BudgetCreateDTO): Promise<BudgetDTO>;

  /**
   * 更新预算
   *
   * @param id - 预算ID
   * @param payload - 更新参数
   * @returns 更新后的预算对象
   */
  updateBudget(id: string, payload: BudgetUpdateDTO): Promise<BudgetDTO>;

  /**
   * 获取预算详情
   *
   * @param id - 预算ID
   * @returns 预算对象，不存在时返回 null
   */
  getBudgetById(id: string): Promise<BudgetDTO | null>;

  /**
   * 查询成员的预算列表
   *
   * 支持按状态过滤
   *
   * @param memberId - 成员ID
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页的预算列表
   */
  listBudgets(
    memberId: string,
    filter?: { status?: BudgetDTO["status"] },
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<BudgetDTO>>;

  /**
   * 记录支出
   *
   * 自动触发预算使用率更新和预警检查
   *
   * @param payload - 支出创建参数
   * @returns 创建的支出记录
   */
  recordSpending(payload: SpendingCreateDTO): Promise<SpendingDTO>;

  /**
   * 查询支出记录
   *
   * 支持按类别、时间范围过滤
   *
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页的支出列表
   */
  listSpendings(
    filter: SpendingFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<SpendingDTO>>;

  /**
   * 聚合预算使用情况
   *
   * 实时计算：
   * - 已用金额
   * - 剩余金额
   * - 使用率百分比
   *
   * @param budgetId - 预算ID
   * @returns 聚合数据
   */
  aggregateBudgetUsage(budgetId: string): Promise<{
    usedAmount: number;
    remainingAmount: number;
    usagePercentage: number;
  }>;

  /**
   * 创建预算预警
   *
   * @param alert - 预警对象
   */
  createBudgetAlert(alert: BudgetAlertDTO): Promise<void>;

  /**
   * 查询活跃预警
   *
   * @param budgetId - 预算ID
   * @returns 活跃预警列表
   */
  listActiveAlerts(budgetId: string): Promise<BudgetAlertDTO[]>;

  /**
   * 获取预算状态快照
   *
   * 整合预算信息、使用率、预警、分类支出等，
   * 提供完整的预算状态视图
   *
   * @param budgetId - 预算ID
   * @returns 预算状态快照
   */
  getBudgetStatus(budgetId: string): Promise<BudgetStatusDTO>;

  /**
   * 软删除预算
   *
   * 将预算标记为已删除，不实际删除数据
   *
   * @param id - 预算ID
   */
  softDeleteBudget(id: string): Promise<void>;
}
