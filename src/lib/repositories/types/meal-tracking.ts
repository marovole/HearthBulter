/**
 * 膳食追踪域 DTO 类型定义
 *
 * 本模块定义膳食记录相关的数据传输对象，包括：
 * - 膳食记录（MealLog）
 * - 膳食食物明细（MealLogFood）
 * - 快速模板（QuickTemplate）
 * - 连续打卡统计（TrackingStreak）
 *
 * @module meal-tracking
 */

import { z } from 'zod';

/**
 * 餐次类型枚举
 */
export const mealTypeSchema = z.enum([
  'BREAKFAST', // 早餐
  'LUNCH', // 午餐
  'DINNER', // 晚餐
  'SNACK', // 加餐
]);
export type MealType = z.infer<typeof mealTypeSchema>;

/**
 * 膳食食物明细 Schema
 */
export const mealLogFoodSchema = z.object({
  id: z.string().uuid(),
  mealLogId: z.string().uuid(),
  foodId: z.string().uuid(),
  amount: z.number().positive(), // 克数
  food: z.object({
    id: z.string().uuid(),
    name: z.string(),
    nameEn: z.string().optional(),
    category: z.string(),
    calories: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MealLogFoodDTO = z.infer<typeof mealLogFoodSchema>;

/**
 * 膳食记录 Schema
 */
export const mealLogSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  date: z.coerce.date(),
  mealType: mealTypeSchema,
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
  sugar: z.number().nonnegative().optional(),
  sodium: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  checkedAt: z.coerce.date(),
  isTemplate: z.boolean().default(false),
  foods: z.array(mealLogFoodSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MealLogDTO = z.infer<typeof mealLogSchema>;

/**
 * 创建膳食记录输入 Schema
 */
export const mealLogCreateInputSchema = z.object({
  memberId: z.string().uuid(),
  date: z.coerce.date(),
  mealType: mealTypeSchema,
  foods: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        amount: z.number().positive(),
      }),
    )
    .min(1),
  notes: z.string().max(500).optional(),
  isTemplate: z.boolean().optional(),
});
export type MealLogCreateInputDTO = z.infer<typeof mealLogCreateInputSchema>;

/**
 * 更新膳食记录 Schema
 */
export const mealLogUpdateInputSchema = z.object({
  date: z.coerce.date().optional(),
  mealType: mealTypeSchema.optional(),
  foods: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        amount: z.number().positive(),
      }),
    )
    .optional(),
  notes: z.string().max(500).optional(),
  isTemplate: z.boolean().optional(),
});
export type MealLogUpdateInputDTO = z.infer<typeof mealLogUpdateInputSchema>;

/**
 * 膳食记录过滤器 Schema
 */
export const mealLogFilterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  mealType: mealTypeSchema.optional(),
  isTemplate: z.boolean().optional(),
});
export type MealLogFilterDTO = z.infer<typeof mealLogFilterSchema>;

/**
 * 快速模板 Schema
 */
export const quickTemplateSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  mealType: mealTypeSchema,
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  useCount: z.number().int().nonnegative().default(0),
  lastUsed: z.coerce.date().optional(),
  score: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type QuickTemplateDTO = z.infer<typeof quickTemplateSchema>;

/**
 * 创建快速模板 Schema
 */
export const quickTemplateCreateInputSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  mealType: mealTypeSchema,
  mealLogId: z.string().uuid(), // 基于哪个记录创建模板
});
export type QuickTemplateCreateInputDTO = z.infer<
  typeof quickTemplateCreateInputSchema
>;

/**
 * 连续打卡统计 Schema
 */
export const trackingStreakSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  currentStreak: z.number().int().nonnegative().default(0),
  longestStreak: z.number().int().nonnegative().default(0),
  totalDays: z.number().int().nonnegative().default(0),
  lastCheckIn: z.coerce.date().optional(),
  badges: z.array(z.string()).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type TrackingStreakDTO = z.infer<typeof trackingStreakSchema>;

/**
 * 每日营养汇总 Schema
 */
export const dailyNutritionSummarySchema = z.object({
  date: z.coerce.date(),
  totalCalories: z.number().nonnegative(),
  totalProtein: z.number().nonnegative(),
  totalCarbs: z.number().nonnegative(),
  totalFat: z.number().nonnegative(),
  totalFiber: z.number().nonnegative().optional(),
  totalSugar: z.number().nonnegative().optional(),
  totalSodium: z.number().nonnegative().optional(),
  mealCounts: z.object({
    BREAKFAST: z.number().int().nonnegative(),
    LUNCH: z.number().int().nonnegative(),
    DINNER: z.number().int().nonnegative(),
    SNACK: z.number().int().nonnegative(),
  }),
});
export type DailyNutritionSummaryDTO = z.infer<
  typeof dailyNutritionSummarySchema
>;

/**
 * 营养计算输入 Schema
 */
export const nutritionCalculationInputSchema = z.array(
  z.object({
    foodId: z.string().uuid(),
    amount: z.number().positive(),
  }),
);
export type NutritionCalculationInputDTO = z.infer<
  typeof nutritionCalculationInputSchema
>;

/**
 * 营养计算结果 Schema
 */
export const nutritionCalculationResultSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  sugar: z.number().nonnegative(),
  sodium: z.number().nonnegative(),
});
export type NutritionCalculationResultDTO = z.infer<
  typeof nutritionCalculationResultSchema
>;
