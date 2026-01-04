/**
 * 库存 API Zod Schema 定义
 */

import { z } from 'zod';

// 通用 ID Schema
const idSchema = z.string().min(1, '缺少 ID');
const memberIdSchema = z.string().min(1, '缺少成员 ID');

// 库存项目创建 Schema
export const createInventoryItemSchema = z.object({
  memberId: memberIdSchema,
  foodId: z.string().optional(),
  name: z.string().min(1, '名称不能为空').max(200, '名称过长'),
  quantity: z.number().positive('数量必须大于 0'),
  unit: z.string().min(1, '单位不能为空').max(20, '单位过长'),
  category: z.string().optional(),
  location: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  price: z.number().nonnegative('价格不能为负').optional(),
  notes: z.string().max(500, '备注过长').optional(),
});

// 库存项目更新 Schema
export const updateInventoryItemSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(200, '名称过长').optional(),
  quantity: z.number().positive('数量必须大于 0').optional(),
  unit: z.string().min(1, '单位不能为空').max(20, '单位过长').optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  price: z.number().nonnegative('价格不能为负').optional(),
  notes: z.string().max(500, '备注过长').optional(),
  status: z.enum(['AVAILABLE', 'LOW', 'EXPIRED', 'CONSUMED']).optional(),
});

// 库存查询参数 Schema
export const inventoryQuerySchema = z.object({
  memberId: memberIdSchema,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  status: z.enum(['AVAILABLE', 'LOW', 'EXPIRED', 'CONSUMED']).optional(),
  location: z.string().optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['name', 'expiryDate', 'quantity', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// 库存使用记录 Schema
export const inventoryUsageSchema = z.object({
  itemId: idSchema,
  quantity: z.number().positive('使用数量必须大于 0'),
  usageType: z
    .enum(['CONSUMED', 'DISCARDED', 'GIFTED', 'OTHER'])
    .default('CONSUMED'),
  notes: z.string().max(200).optional(),
});

// 库存统计查询 Schema
export const inventoryStatsQuerySchema = z.object({
  memberId: memberIdSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// 过期提醒查询 Schema
export const expiryQuerySchema = z.object({
  memberId: memberIdSchema,
  daysAhead: z.coerce.number().int().min(1).max(90).default(7),
});

// 类型导出
export type CreateInventoryItemInput = z.infer<
  typeof createInventoryItemSchema
>;
export type UpdateInventoryItemInput = z.infer<
  typeof updateInventoryItemSchema
>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
export type InventoryUsageInput = z.infer<typeof inventoryUsageSchema>;
export type InventoryStatsQueryInput = z.infer<
  typeof inventoryStatsQuerySchema
>;
export type ExpiryQueryInput = z.infer<typeof expiryQuerySchema>;
