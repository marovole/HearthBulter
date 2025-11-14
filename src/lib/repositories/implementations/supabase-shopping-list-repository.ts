/**
 * Supabase 购物清单 Repository 实现
 *
 * @module supabase-shopping-list-repository
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { ShoppingListRepository } from '../interfaces/shopping-list-repository';
import type {
  ShoppingListDTO,
  ShoppingListGetOptions,
  ShoppingListListQuery,
  UpdateShoppingListDTO,
  ShoppingListItemDTO,
} from '../types/shopping-list';
import type { PaginatedResult, PaginationInput } from '../types/common';

type ShoppingListRow = Database['public']['Tables']['shopping_lists']['Row'];
type ShoppingListItemRow = Database['public']['Tables']['shopping_list_items']['Row'];

/**
 * Supabase 购物清单 Repository 实现
 */
export class SupabaseShoppingListRepository implements ShoppingListRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = '[SupabaseShoppingListRepository]';

  constructor(client: SupabaseClient<Database> = SupabaseClientManager.getInstance()) {
    this.client = client;
  }

  async listShoppingLists(
    query: ShoppingListListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ShoppingListDTO>> {
    const {
      planId,
      planIds,
      statuses,
      includeDeleted = false,
      includePlan = false,
      includeItems = false,
      search,
      sort,
    } = query;

    // 构建 select 字符串
    let selectStr = '*';
    if (includePlan) {
      selectStr += `, plan:meal_plans(id, name, member:family_members(id, name))`;
    }
    if (includeItems) {
      selectStr += `, items:shopping_list_items(*, food:foods(*))`;
    }

    // 构建查询
    let supabaseQuery = this.client
      .from('shopping_lists')
      .select(selectStr, { count: 'exact' });

    // 应用筛选条件
    if (planId) {
      supabaseQuery = supabaseQuery.eq('plan_id', planId);
    }
    if (planIds && planIds.length > 0) {
      supabaseQuery = supabaseQuery.in('plan_id', planIds);
    }
    if (statuses && statuses.length > 0) {
      supabaseQuery = supabaseQuery.in('status', statuses);
    }
    if (!includeDeleted) {
      supabaseQuery = supabaseQuery.is('deleted_at', null);
    }
    if (search) {
      supabaseQuery = supabaseQuery.ilike('name', `%${search}%`);
    }

    // 排序
    if (sort) {
      const direction = { ascending: sort.direction === 'asc' };
      supabaseQuery = supabaseQuery.order(this.mapSortField(sort.field), direction);
    } else {
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
    }

    // 分页
    const offset = pagination?.offset || 0;
    const limit = pagination?.limit || 20;
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      this.handleError('listShoppingLists', error);
    }

    // 映射数据并排序 items
    const items = (data || []).map(row => {
      const mapped = this.mapShoppingListRow(row);

      // 如果包含 items，进行排序
      if (mapped.items && mapped.items.length > 0) {
        mapped.items = this.sortShoppingListItems(mapped.items);
      }

      return mapped;
    });

    return {
      items,
      total: count || 0,
      hasMore: offset + items.length < (count || 0),
    };
  }

  async getShoppingListById(
    id: string,
    options?: ShoppingListGetOptions
  ): Promise<ShoppingListDTO | null> {
    const { includePlan = false, includeItems = false } = options || {};

    // 构建 select 字符串
    let selectStr = '*';
    if (includePlan) {
      selectStr += `, plan:meal_plans(id, name, member:family_members(id, name))`;
    }
    if (includeItems) {
      selectStr += `, items:shopping_list_items(*, food:foods(*))`;
    }

    const { data, error } = await this.client
      .from('shopping_lists')
      .select(selectStr)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      this.handleError('getShoppingListById', error);
    }

    if (!data) {
      return null;
    }

    const mapped = this.mapShoppingListRow(data);

    // 如果包含 items，进行排序
    if (mapped.items && mapped.items.length > 0) {
      mapped.items = this.sortShoppingListItems(mapped.items);
    }

    return mapped;
  }

  async updateShoppingList(
    id: string,
    payload: UpdateShoppingListDTO
  ): Promise<ShoppingListDTO> {
    const updateData: Partial<ShoppingListRow> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.budget !== undefined) updateData.budget = payload.budget;
    if (payload.status !== undefined) updateData.status = payload.status;

    const { data, error } = await this.client
      .from('shopping_lists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.handleError('updateShoppingList', error);
    }

    return this.mapShoppingListRow(data!);
  }

  async deleteShoppingList(id: string): Promise<void> {
    // Supabase 使用外键级联删除配置，直接删除购物清单即可
    const { error } = await this.client
      .from('shopping_lists')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError('deleteShoppingList', error);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 映射排序字段名
   */
  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      budget: 'budget',
    };
    return fieldMap[field] || 'created_at';
  }

  /**
   * 排序购物项
   * 按 category -> purchased -> food.name
   */
  private sortShoppingListItems(items: ShoppingListItemDTO[]): ShoppingListItemDTO[] {
    return items.sort((a, b) => {
      // 按分类排序
      if (a.category !== b.category) {
        return (a.category || '').localeCompare(b.category || '');
      }
      // 未购买的排在前面
      if (a.purchased !== b.purchased) {
        return a.purchased ? 1 : -1;
      }
      // 按食材名称排序
      return (a.food?.name || '').localeCompare(b.food?.name || '');
    });
  }

  /**
   * 映射 ShoppingListRow -> ShoppingListDTO
   */
  private mapShoppingListRow(row: ShoppingListRow): ShoppingListDTO {
    const rowWithRelations = row as any;

    return {
      id: row.id,
      planId: row.plan_id,
      name: row.name,
      budget: row.budget,
      status: row.status as any,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      plan: rowWithRelations.plan
        ? {
            id: rowWithRelations.plan.id,
            name: rowWithRelations.plan.name,
            member: rowWithRelations.plan.member
              ? {
                  id: rowWithRelations.plan.member.id,
                  name: rowWithRelations.plan.member.name,
                }
              : undefined,
          }
        : undefined,
      items: rowWithRelations.items
        ? rowWithRelations.items.map(this.mapShoppingListItemRow)
        : undefined,
    };
  }

  /**
   * 映射 ShoppingListItemRow -> ShoppingListItemDTO
   */
  private mapShoppingListItemRow(row: ShoppingListItemRow): ShoppingListItemDTO {
    const rowWithFood = row as any;

    return {
      id: row.id,
      shoppingListId: row.shopping_list_id,
      foodId: row.food_id,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      purchased: row.purchased,
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      food: rowWithFood.food
        ? {
            id: rowWithFood.food.id,
            name: rowWithFood.food.name,
            category: rowWithFood.food.category || undefined,
            defaultUnit: rowWithFood.food.default_unit || undefined,
            imageUrl: rowWithFood.food.image_url || undefined,
          }
        : undefined,
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? 'Unknown Supabase error';
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`ShoppingListRepository.${operation} failed: ${message}`);
  }
}
