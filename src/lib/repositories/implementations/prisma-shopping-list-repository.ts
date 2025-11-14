/**
 * Prisma 购物清单 Repository 占位实现
 *
 * 所有方法暂未实现,仅用于双写迁移期间占位
 *
 * @module prisma-shopping-list-repository
 */

import type { PrismaClient } from '@prisma/client';
import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  ShoppingListDTO,
  ShoppingListGetOptions,
  ShoppingListListQuery,
  UpdateShoppingListDTO,
  ShoppingListItemDTO,
  UpdateShoppingListItemDTO,
  CompleteShoppingListDTO,
} from '../types/shopping-list';
import type { ShoppingListRepository } from '../interfaces/shopping-list-repository';

/**
 * Prisma 购物清单 Repository 占位实现
 *
 * 当前仅抛出未实现错误,后续将填充 Prisma 客户端逻辑
 */
export class PrismaShoppingListRepository implements ShoppingListRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  /**
   * 查询购物清单列表
   */
  async listShoppingLists(
    query: ShoppingListListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ShoppingListDTO>> {
    return this.notImplemented('listShoppingLists');
  }

  /**
   * 获取单个购物清单详情
   */
  async getShoppingListById(
    id: string,
    options?: ShoppingListGetOptions
  ): Promise<ShoppingListDTO | null> {
    return this.notImplemented('getShoppingListById');
  }

  /**
   * 更新购物清单基本信息
   */
  async updateShoppingList(
    id: string,
    payload: UpdateShoppingListDTO
  ): Promise<ShoppingListDTO> {
    return this.notImplemented('updateShoppingList');
  }

  /**
   * 删除购物清单
   */
  async deleteShoppingList(id: string): Promise<void> {
    return this.notImplemented('deleteShoppingList');
  }

  /**
   * 更新购物项
   */
  async updateShoppingListItem(
    listId: string,
    itemId: string,
    payload: UpdateShoppingListItemDTO
  ): Promise<ShoppingListItemDTO> {
    return this.notImplemented('updateShoppingListItem');
  }

  /**
   * 完成购物清单
   */
  async completeShoppingList(
    listId: string,
    payload: CompleteShoppingListDTO
  ): Promise<ShoppingListDTO> {
    return this.notImplemented('completeShoppingList');
  }

  /**
   * 抛出未实现错误
   */
  private notImplemented(methodName: string): never {
    void this.client;
    throw new Error(`PrismaShoppingListRepository.${methodName} not implemented`);
  }
}
