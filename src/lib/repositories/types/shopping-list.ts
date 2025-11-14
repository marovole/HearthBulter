/**
 * 购物清单域 DTO 类型定义
 *
 * 本模块定义购物清单管理系统相关的数据传输对象
 *
 * @module shopping-list
 */

import { z } from 'zod';
import type { SortInput } from './common';

/**
 * 购物清单状态枚举
 */
export const shoppingListStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
export type ShoppingListStatus = z.infer<typeof shoppingListStatusSchema>;

/**
 * 关联计划的成员信息
 */
export const shoppingListPlanMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type ShoppingListPlanMemberDTO = z.infer<typeof shoppingListPlanMemberSchema>;

/**
 * 购物清单关联的餐单信息
 */
export const shoppingListPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  member: shoppingListPlanMemberSchema.optional(),
});

export type ShoppingListPlanDTO = z.infer<typeof shoppingListPlanSchema>;

/**
 * 购物项所携带的食材基本信息
 */
export const shoppingListItemFoodSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().optional().nullable(),
  defaultUnit: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export type ShoppingListItemFoodDTO = z.infer<typeof shoppingListItemFoodSchema>;

/**
 * 购物项 DTO
 */
export const shoppingListItemSchema = z.object({
  id: z.string().uuid(),
  shoppingListId: z.string().uuid(),
  foodId: z.string().uuid(),
  category: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  purchased: z.boolean(),
  notes: z.string().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  food: shoppingListItemFoodSchema.optional(),
});

export type ShoppingListItemDTO = z.infer<typeof shoppingListItemSchema>;

/**
 * 购物清单 DTO
 */
export const shoppingListSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  name: z.string().min(1).max(200),
  budget: z.number().min(0).nullable(),
  status: shoppingListStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable(),
  plan: shoppingListPlanSchema.optional(),
  items: z.array(shoppingListItemSchema).optional(),
});

export type ShoppingListDTO = z.infer<typeof shoppingListSchema>;

/**
 * 查询购物清单参数
 */
export interface ShoppingListListQuery {
  /**
   * 仅包含属于某个餐单的清单
   */
  planId?: string;
  /**
   * 支持一次过滤多个餐单
   */
  planIds?: string[];
  /**
   * 过滤指定状态（支持多选）
   */
  statuses?: ShoppingListStatus[];
  /**
   * 调用方用户ID，用于权限验证
   */
  requesterId?: string;
  /**
   * 是否包含已删除的清单
   */
  includeDeleted?: boolean;
  /**
   * 是否在结果中展开关联的餐单信息
   */
  includePlan?: boolean;
  /**
   * 是否在结果中展开购物项
   */
  includeItems?: boolean;
  /**
   * 排序选项
   */
  sort?: SortInput<'name' | 'createdAt' | 'updatedAt' | 'budget'>;
  /**
   * 名称关键字搜索
   */
  search?: string;
}

/**
 * 获取单个购物清单的选项
 */
export interface ShoppingListGetOptions {
  /**
   * 是否展开餐单信息
   */
  includePlan?: boolean;
  /**
   * 是否展开购物项
   */
  includeItems?: boolean;
}

/**
 * 更新购物清单 DTO
 */
export const updateShoppingListSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  budget: z.number().min(0).nullable().optional(),
  status: shoppingListStatusSchema.optional(),
});

export type UpdateShoppingListDTO = z.infer<typeof updateShoppingListSchema>;
