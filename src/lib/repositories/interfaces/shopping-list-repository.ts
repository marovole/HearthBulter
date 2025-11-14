/**
 * 购物清单 Repository 接口
 *
 * 提供购物清单管理系统所需的数据访问契约
 *
 * @module shopping-list-repository
 */

import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  ShoppingListDTO,
  ShoppingListGetOptions,
  ShoppingListListQuery,
  UpdateShoppingListDTO,
} from '../types/shopping-list';

/**
 * 购物清单 Repository 接口
 *
 * 实施建议：
 * - 如果购物项有独立的 CRUD 场景（如数量、购买状态、批量操作等），
 *   可额外提供 ShoppingListItemRepository，让当前接口聚焦清单元数据与聚合查询
 * - 复杂权限（家庭/计划成员）应在业务层或中间件解决，
 *   调用方通过 planId、requesterId 等字段表明上下文
 * - 嵌套数据（plan 与 items）通过 includePlan、includeItems 控制，
 *   避免双写实现无谓同步全部关联
 */
export interface ShoppingListRepository {
  /**
   * 查询购物清单列表
   *
   * 支持按餐单、状态筛选，支持分页和数据展开控制
   *
   * @param query - 查询参数
   * @param pagination - 分页参数
   * @returns 分页的购物清单列表
   */
  listShoppingLists(
    query: ShoppingListListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ShoppingListDTO>>;

  /**
   * 获取单个购物清单详情
   *
   * 可按需展开关联餐单与购物项
   *
   * @param id - 购物清单ID
   * @param options - 数据展开选项
   * @returns 购物清单对象，不存在时返回 null
   */
  getShoppingListById(
    id: string,
    options?: ShoppingListGetOptions
  ): Promise<ShoppingListDTO | null>;

  /**
   * 更新购物清单基本信息
   *
   * @param id - 购物清单ID
   * @param payload - 更新参数
   * @returns 更新后的购物清单对象
   */
  updateShoppingList(
    id: string,
    payload: UpdateShoppingListDTO
  ): Promise<ShoppingListDTO>;

  /**
   * 删除购物清单
   *
   * 必须级联删除所有关联的购物项
   *
   * @param id - 购物清单ID
   */
  deleteShoppingList(id: string): Promise<void>;
}
