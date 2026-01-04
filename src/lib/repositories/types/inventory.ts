/**
 * 库存域 DTO 类型定义
 *
 * 本模块定义库存管理相关的数据传输对象，包括：
 * - 库存物品记录
 * - 库存使用记录
 * - 浪费记录
 * - 库存统计
 *
 * @module inventory
 */

import { z } from "zod";
import { dateRangeFilterSchema, stringFilterSchema } from "./common";

/**
 * 库存状态枚举
 */
export const inventoryStatusSchema = z.enum([
  "FRESH", // 新鲜
  "NORMAL", // 正常
  "EXPIRING", // 即将过期
  "EXPIRED", // 已过期
  "DEPLETED", // 耗尽
]);
export type InventoryStatus = z.infer<typeof inventoryStatusSchema>;

/**
 * 存储位置枚举
 */
export const storageLocationSchema = z.enum([
  "FRIDGE", // 冰箱
  "FREEZER", // 冷冻室
  "PANTRY", // 食品柜
  "ROOM_TEMP", // 室温
  "OTHER", // 其他
]);
export type StorageLocation = z.infer<typeof storageLocationSchema>;

/**
 * 使用原因枚举
 */
export const usageReasonSchema = z.enum([
  "COOKING", // 烹饪
  "EATING", // 直接食用
  "RECIPE", // 食谱制作
  "EXPIRED", // 过期
  "DAMAGED", // 损坏
  "OTHER", // 其他
]);
export type UsageReason = z.infer<typeof usageReasonSchema>;

/**
 * 浪费原因枚举
 */
export const wasteReasonSchema = z.enum([
  "EXPIRED", // 过期
  "SPOILED", // 腐坏
  "OVERSTOCK", // 库存过剩
  "DAMAGED", // 损坏
  "DISLIKED", // 不喜欢
  "OTHER", // 其他
]);
export type WasteReason = z.infer<typeof wasteReasonSchema>;

/**
 * 食品信息 Schema（嵌套对象）
 */
export const foodInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.string(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});
export type FoodInfo = z.infer<typeof foodInfoSchema>;

/**
 * 库存物品 Schema
 */
export const inventoryItemSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  foodId: z.string().uuid(),
  food: foodInfoSchema,
  quantity: z.number().positive(),
  originalQuantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  purchasePrice: z.number().nonnegative().optional(),
  purchaseSource: z.string().max(100).optional(),
  expiryDate: z.coerce.date().optional(),
  productionDate: z.coerce.date().optional(),
  daysToExpiry: z.number().int().optional(),
  storageLocation: storageLocationSchema.default("ROOM_TEMP"),
  storageNotes: z.string().max(500).optional(),
  minStockThreshold: z.number().nonnegative().optional(),
  isLowStock: z.boolean().default(false),
  barcode: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  packageInfo: z.string().max(200).optional(),
  status: inventoryStatusSchema.default("NORMAL"),
  lastUsedAt: z.coerce.date().optional(),
  usageCount: z.number().int().nonnegative().default(0),
  wasteCount: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type InventoryItemDTO = z.infer<typeof inventoryItemSchema>;

/**
 * 创建库存物品 Schema
 */
export const inventoryItemCreateSchema = z.object({
  memberId: z.string().uuid(),
  foodId: z.string().uuid(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  purchasePrice: z.number().nonnegative().optional(),
  purchaseSource: z.string().max(100).optional(),
  expiryDate: z.coerce.date().optional(),
  productionDate: z.coerce.date().optional(),
  storageLocation: storageLocationSchema.optional(),
  storageNotes: z.string().max(500).optional(),
  minStockThreshold: z.number().nonnegative().optional(),
  barcode: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  packageInfo: z.string().max(200).optional(),
});

export type InventoryItemCreateDTO = z.infer<typeof inventoryItemCreateSchema>;

/**
 * 更新库存物品 Schema
 */
export const inventoryItemUpdateSchema = inventoryItemCreateSchema
  .omit({ memberId: true, foodId: true })
  .partial();

export type InventoryItemUpdateDTO = z.infer<typeof inventoryItemUpdateSchema>;

/**
 * 库存物品过滤器 Schema
 */
export const inventoryItemFilterSchema = z.object({
  status: inventoryStatusSchema.optional(),
  storageLocation: storageLocationSchema.optional(),
  category: z.string().optional(),
  isExpiring: z.boolean().optional(),
  isExpired: z.boolean().optional(),
  isLowStock: z.boolean().optional(),
  foodName: stringFilterSchema.optional(),
  expiryDateRange: dateRangeFilterSchema.optional(),
});

export type InventoryItemFilterDTO = z.infer<typeof inventoryItemFilterSchema>;

/**
 * 库存使用记录 Schema
 */
export const inventoryUsageSchema = z.object({
  id: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: usageReasonSchema,
  mealId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  usageDate: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type InventoryUsageDTO = z.infer<typeof inventoryUsageSchema>;

/**
 * 创建库存使用记录 Schema
 */
export const inventoryUsageCreateSchema = inventoryUsageSchema.omit({
  id: true,
  createdAt: true,
});

export type InventoryUsageCreateDTO = z.infer<
  typeof inventoryUsageCreateSchema
>;

/**
 * 浪费记录 Schema
 */
export const wasteRecordSchema = z.object({
  id: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: wasteReasonSchema,
  wasteDate: z.coerce.date(),
  notes: z.string().max(500).optional(),
  createdAt: z.coerce.date(),
});

export type WasteRecordDTO = z.infer<typeof wasteRecordSchema>;

/**
 * 创建浪费记录 Schema
 */
export const wasteRecordCreateSchema = wasteRecordSchema.omit({
  id: true,
  createdAt: true,
});

export type WasteRecordCreateDTO = z.infer<typeof wasteRecordCreateSchema>;

/**
 * 库存统计 Schema
 */
export const inventoryStatsSchema = z.object({
  totalItems: z.number().int().nonnegative(),
  totalValue: z.number().nonnegative(),
  itemsByStatus: z.record(
    inventoryStatusSchema,
    z.number().int().nonnegative(),
  ),
  itemsByLocation: z.record(
    storageLocationSchema,
    z.number().int().nonnegative(),
  ),
  expiringCount: z.number().int().nonnegative(),
  expiredCount: z.number().int().nonnegative(),
  lowStockCount: z.number().int().nonnegative(),
  wasteStats: z.object({
    totalQuantity: z.number().nonnegative(),
    totalValue: z.number().nonnegative(),
    byReason: z.record(wasteReasonSchema, z.number().nonnegative()),
  }),
});

export type InventoryStatsDTO = z.infer<typeof inventoryStatsSchema>;

/**
 * 库存物品（带关联数据）Schema
 */
export const inventoryItemWithRelationsSchema = inventoryItemSchema.extend({
  usageRecords: z.array(inventoryUsageSchema).default([]),
  wasteRecords: z.array(wasteRecordSchema).default([]),
});

export type InventoryItemWithRelationsDTO = z.infer<
  typeof inventoryItemWithRelationsSchema
>;

/**
 * 使用库存输入 Schema（用于食谱制作等批量使用）
 */
export const useInventoryInputSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive(),
  reason: usageReasonSchema,
  mealId: z.string().uuid().optional(),
  recipeId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

export type UseInventoryInputDTO = z.infer<typeof useInventoryInputSchema>;

/**
 * 批量使用库存输入 Schema
 */
export const batchUseInventoryInputSchema = z.object({
  memberId: z.string().uuid(),
  recipeId: z.string().uuid().optional(),
  mealId: z.string().uuid().optional(),
  items: z.array(useInventoryInputSchema).min(1),
});

export type BatchUseInventoryInputDTO = z.infer<
  typeof batchUseInventoryInputSchema
>;
