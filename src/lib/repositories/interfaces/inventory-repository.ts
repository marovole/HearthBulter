/**
 * 库存 Repository 接口
 *
 * 定义库存管理系统所需的数据访问契约，包括：
 * - 库存物品 CRUD 操作
 * - 库存使用记录管理
 * - 浪费记录管理
 * - 库存状态聚合和统计
 * - 批量操作支持
 *
 * @module inventory-repository
 */

import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  InventoryItemDTO,
  InventoryItemCreateDTO,
  InventoryItemUpdateDTO,
  InventoryItemFilterDTO,
  InventoryItemWithRelationsDTO,
  InventoryUsageDTO,
  InventoryUsageCreateDTO,
  WasteRecordDTO,
  WasteRecordCreateDTO,
  InventoryStatsDTO,
  UseInventoryInputDTO,
  BatchUseInventoryInputDTO,
} from '../types/inventory';

/**
 * 库存 Repository 接口
 *
 * 抽象了库存管理所需的所有数据访问操作，
 * 支持库存追踪、使用记录、浪费管理、智能提醒等功能
 */
export interface InventoryRepository {
  // ==================== CRUD 操作 ====================

  /**
   * 创建库存物品
   *
   * 自动计算：
   * - 剩余天数（daysToExpiry）
   * - 库存状态（status）
   * - 低库存标记（isLowStock）
   *
   * @param payload - 库存物品创建参数
   * @returns 创建的库存物品对象（含关联食品信息）
   */
  createInventoryItem(
    payload: InventoryItemCreateDTO,
  ): Promise<InventoryItemDTO>;

  /**
   * 更新库存物品
   *
   * 支持部分更新，自动重新计算状态字段
   *
   * @param id - 库存物品ID
   * @param payload - 更新参数
   * @returns 更新后的库存物品对象
   */
  updateInventoryItem(
    id: string,
    payload: InventoryItemUpdateDTO,
  ): Promise<InventoryItemDTO>;

  /**
   * 获取库存物品详情
   *
   * 包含完整的关联数据：
   * - 食品信息
   * - 使用记录（最近5条）
   * - 浪费记录（最近5条）
   *
   * @param id - 库存物品ID
   * @returns 库存物品对象（含关联数据），不存在时返回 null
   */
  getInventoryItemById(
    id: string,
  ): Promise<InventoryItemWithRelationsDTO | null>;

  /**
   * 查询成员的库存物品列表
   *
   * 支持多维度过滤：
   * - 按状态（新鲜、临期、过期、耗尽）
   * - 按存储位置（冰箱、冷冻室、食品柜等）
   * - 按食品分类
   * - 按保质期范围
   * - 低库存标记
   *
   * @param memberId - 成员ID
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @param options - 查询选项（向后兼容）
   * @returns 分页的库存物品列表
   */
  listInventoryItems(
    memberId: string,
    filter?: InventoryItemFilterDTO,
    pagination?: PaginationInput,
    options?: { includeRelations?: boolean },
  ): Promise<PaginatedResult<InventoryItemDTO>>;

  /**
   * 软删除库存物品
   *
   * 将库存物品标记为已删除，保留历史数据用于分析
   *
   * @param id - 库存物品ID
   */
  softDeleteInventoryItem(id: string): Promise<void>;

  // ==================== 库存使用操作 ====================

  /**
   * 使用库存（单个物品）
   *
   * 自动执行：
   * 1. 扣减库存数量
   * 2. 创建使用记录
   * 3. 更新库存状态
   * 4. 检查低库存预警
   *
   * @param payload - 使用库存参数
   * @returns 更新后的库存物品对象
   * @throws 库存不足时抛出错误
   */
  useInventoryItem(payload: UseInventoryInputDTO): Promise<InventoryItemDTO>;

  /**
   * 批量使用库存
   *
   * 用于食谱制作等场景，支持：
   * - 原子性事务处理
   * - 自动选择临期食材优先使用
   * - 批量创建使用记录
   *
   * @param payload - 批量使用参数
   * @returns 更新后的库存物品列表
   * @throws 任一物品库存不足时整体回滚
   */
  batchUseInventory(
    payload: BatchUseInventoryInputDTO,
  ): Promise<InventoryItemDTO[]>;

  /**
   * 查询库存使用记录
   *
   * 支持按时间范围、使用原因、关联对象过滤
   *
   * @param inventoryItemId - 库存物品ID
   * @param pagination - 分页参数
   * @returns 分页的使用记录列表
   */
  listInventoryUsages(
    inventoryItemId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<InventoryUsageDTO>>;

  // ==================== 浪费记录管理 ====================

  /**
   * 创建浪费记录
   *
   * 自动执行：
   * 1. 记录浪费数量和原因
   * 2. 扣减库存数量
   * 3. 更新库存状态
   * 4. 触发浪费预警（如果配置）
   *
   * @param payload - 浪费记录创建参数
   * @returns 创建的浪费记录对象
   */
  createWasteRecord(payload: WasteRecordCreateDTO): Promise<WasteRecordDTO>;

  /**
   * 查询浪费记录
   *
   * 支持按时间范围、浪费原因过滤
   *
   * @param inventoryItemId - 库存物品ID（可选）
   * @param filter - 过滤条件
   * @param pagination - 分页参数
   * @returns 分页的浪费记录列表
   */
  listWasteRecords(
    inventoryItemId?: string,
    filter?: {
      startDate?: Date;
      endDate?: Date;
      reason?: WasteRecordDTO['reason'];
    },
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<WasteRecordDTO>>;

  // ==================== 统计和聚合 ====================

  /**
   * 获取库存统计信息
   *
   * 实时计算：
   * - 总物品数
   * - 总价值（基于购买价格）
   * - 各状态物品数量
   * - 各存储位置物品数量
   * - 临期和过期物品数量
   * - 低库存物品数量
   * - 浪费统计（总量、总价值、按原因分组）
   *
   * @param memberId - 成员ID
   * @returns 库存统计对象
   */
  getInventoryStats(memberId: string): Promise<InventoryStatsDTO>;

  /**
   * 获取即将过期的库存物品
   *
   * 按过期日期升序排列，用于提醒用户
   *
   * @param memberId - 成员ID
   * @param daysThreshold - 天数阈值（默认7天）
   * @returns 即将过期的物品列表
   */
  getExpiringItems(
    memberId: string,
    daysThreshold?: number,
  ): Promise<InventoryItemDTO[]>;

  /**
   * 获取低库存物品
   *
   * 基于每个物品设置的最小库存阈值
   *
   * @param memberId - 成员ID
   * @returns 低库存物品列表
   */
  getLowStockItems(memberId: string): Promise<InventoryItemDTO[]>;

  /**
   * 获取库存价值趋势
   *
   * 用于仪表盘展示，显示库存价值的变化趋势
   *
   * @param memberId - 成员ID
   * @param startDate - 开始日期
   * @param endDate - 结束日期
   * @returns 时间序列数据
   */
  getInventoryValueTrend(
    memberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: Date; totalValue: number; itemCount: number }>>;

  // ==================== 批量操作 ====================

  /**
   * 批量更新库存状态
   *
   * 用于定时任务，自动更新所有库存物品的：
   * - 剩余天数
   * - 库存状态
   * - 低库存标记
   *
   * @param memberId - 成员ID（可选，不传则更新所有用户）
   * @returns 更新的物品数量
   */
  batchUpdateInventoryStatus(memberId?: string): Promise<number>;

  /**
   * 批量删除过期物品
   *
   * 软删除所有已过期超过指定天数的物品
   *
   * @param memberId - 成员ID
   * @param expiredDaysThreshold - 过期天数阈值（默认30天）
   * @returns 删除的物品数量
   */
  batchDeleteExpiredItems(
    memberId: string,
    expiredDaysThreshold?: number,
  ): Promise<number>;
}
