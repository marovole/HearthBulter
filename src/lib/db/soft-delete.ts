/**
 * 软删除工具函数
 * 
 * 统一软删除查询过滤和操作
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { logger } from '@/lib/logger';

// 支持软删除的表名
export type SoftDeletableTable =
  | 'family_members'
  | 'inventory_items'
  | 'meal_logs'
  | 'health_data'
  | 'health_reports'
  | 'shopping_list_items'
  | 'recipes'
  | 'meal_plans'
  | 'health_goals'
  | 'notifications';

// 软删除字段名
const SOFT_DELETE_FIELD = 'deleted_at';

/**
 * 检查表是否支持软删除
 */
export function supportsSoftDelete(tableName: string): boolean {
  const softDeletableTables: string[] = [
    'family_members',
    'inventory_items',
    'meal_logs',
    'health_data',
    'health_reports',
    'shopping_list_items',
    'recipes',
    'meal_plans',
    'health_goals',
    'notifications',
  ];

  return softDeletableTables.includes(tableName);
}

/**
 * 添加软删除过滤条件
 * 过滤掉已删除的记录（deleted_at 不为 null）
 */
export function addSoftDeleteFilter<T>(
  query: any,
  includeDeleted: boolean = false
): any {
  if (includeDeleted) {
    return query;
  }

  return query.is(SOFT_DELETE_FIELD, null);
}

/**
 * 执行软删除
 */
export async function softDelete(
  supabase: SupabaseClient<Database>,
  tableName: SoftDeletableTable,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) {
      logger.error('软删除失败', { tableName, id, error });
      return { success: false, error: error.message };
    }

    logger.info('软删除成功', { tableName, id });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error('软删除异常', { tableName, id, error: message });
    return { success: false, error: message };
  }
}

/**
 * 批量软删除
 */
export async function softDeleteMany(
  supabase: SupabaseClient<Database>,
  tableName: SoftDeletableTable,
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (ids.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() } as any)
      .in('id', ids)
      .select('id');

    if (error) {
      logger.error('批量软删除失败', { tableName, ids, error });
      return { success: false, deletedCount: 0, error: error.message };
    }

    const deletedCount = data?.length || 0;
    logger.info('批量软删除成功', { tableName, deletedCount });
    return { success: true, deletedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error('批量软删除异常', { tableName, ids, error: message });
    return { success: false, deletedCount: 0, error: message };
  }
}

/**
 * 恢复软删除的记录
 */
export async function restoreSoftDeleted(
  supabase: SupabaseClient<Database>,
  tableName: SoftDeletableTable,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: null } as any)
      .eq('id', id);

    if (error) {
      logger.error('恢复软删除失败', { tableName, id, error });
      return { success: false, error: error.message };
    }

    logger.info('恢复软删除成功', { tableName, id });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error('恢复软删除异常', { tableName, id, error: message });
    return { success: false, error: message };
  }
}

/**
 * 永久删除已软删除的记录（清理任务）
 */
export async function permanentlyDeleteExpired(
  supabase: SupabaseClient<Database>,
  tableName: SoftDeletableTable,
  retentionDays: number = 30
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .not(SOFT_DELETE_FIELD, 'is', null)
      .lt(SOFT_DELETE_FIELD, cutoffDate.toISOString())
      .select('id');

    if (error) {
      logger.error('永久删除过期记录失败', { tableName, error });
      return { success: false, deletedCount: 0, error: error.message };
    }

    const deletedCount = data?.length || 0;
    if (deletedCount > 0) {
      logger.info('永久删除过期记录成功', { tableName, deletedCount, retentionDays });
    }
    return { success: true, deletedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error('永久删除过期记录异常', { tableName, error: message });
    return { success: false, deletedCount: 0, error: message };
  }
}

/**
 * 查询已删除的记录（管理员功能）
 */
export async function findDeleted<T>(
  supabase: SupabaseClient<Database>,
  tableName: SoftDeletableTable,
  options: {
    limit?: number;
    offset?: number;
    deletedAfter?: Date;
    deletedBefore?: Date;
  } = {}
): Promise<{ data: T[]; count: number; error?: string }> {
  try {
    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .not(SOFT_DELETE_FIELD, 'is', null);

    if (options.deletedAfter) {
      query = query.gte(SOFT_DELETE_FIELD, options.deletedAfter.toISOString());
    }

    if (options.deletedBefore) {
      query = query.lte(SOFT_DELETE_FIELD, options.deletedBefore.toISOString());
    }

    query = query
      .order(SOFT_DELETE_FIELD, { ascending: false })
      .range(
        options.offset || 0,
        (options.offset || 0) + (options.limit || 50) - 1
      );

    const { data, count, error } = await query;

    if (error) {
      logger.error('查询已删除记录失败', { tableName, error });
      return { data: [], count: 0, error: error.message };
    }

    return { data: (data || []) as T[], count: count || 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    logger.error('查询已删除记录异常', { tableName, error: message });
    return { data: [], count: 0, error: message };
  }
}

/**
 * 创建软删除 WHERE 条件对象（用于 Prisma 风格查询）
 */
export function softDeleteWhereClause(includeDeleted: boolean = false): object {
  if (includeDeleted) {
    return {};
  }

  return { deletedAt: null };
}

/**
 * 合并软删除条件到现有 WHERE 条件
 */
export function mergeSoftDeleteCondition(
  where: object,
  includeDeleted: boolean = false
): object {
  if (includeDeleted) {
    return where;
  }

  return {
    ...where,
    deletedAt: null,
  };
}
