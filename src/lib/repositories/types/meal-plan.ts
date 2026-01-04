/**
 * 膳食计划领域 DTO 类型定义
 *
 * 提供 MealPlan、Meal、MealIngredient 的完整类型系统，包括：
 * - 核心数据模型 DTO
 * - 创建/更新输入验证 Schema
 * - 查询过滤条件
 *
 * @module meal-plan
 */

import { z } from 'zod';

// ==================== 枚举类型 ====================

/**
 * 目标类型
 *
 * 定义用户的健康/营养目标
 */
export const goalTypeSchema = z.enum([
  'LOSE_WEIGHT', // 减重
  'GAIN_MUSCLE', // 增肌
  'MAINTAIN', // 维持
  'IMPROVE_HEALTH', // 改善健康
]);
export type GoalType = z.infer<typeof goalTypeSchema>;

/**
 * 计划状态
 */
export const planStatusSchema = z.enum([
  'ACTIVE', // 进行中
  'COMPLETED', // 已完成
  'CANCELLED', // 已取消
]);
export type PlanStatus = z.infer<typeof planStatusSchema>;

/**
 * 餐次类型
 */
export const mealTypeSchema = z.enum([
  'BREAKFAST', // 早餐
  'LUNCH', // 午餐
  'DINNER', // 晚餐
  'SNACK', // 加餐
]);
export type MealType = z.infer<typeof mealTypeSchema>;

// ==================== 餐次食材 ====================

/**
 * 餐次食材 Schema
 */
export const mealIngredientSchema = z.object({
  id: z.string().uuid(),
  mealId: z.string().uuid(),
  foodId: z.string().uuid(),
  amount: z.number().positive(),
});
export type MealIngredientDTO = z.infer<typeof mealIngredientSchema>;

/**
 * 餐次食材创建输入
 */
export const mealIngredientCreateInputSchema = z.object({
  foodId: z.string().uuid(),
  amount: z.number().positive(),
});
export type MealIngredientCreateInputDTO = z.infer<
  typeof mealIngredientCreateInputSchema
>;

// ==================== 餐次 ====================

/**
 * 餐次 Schema
 *
 * 表示计划中的单次用餐，包含营养信息和食材列表
 */
export const mealSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  date: z.coerce.date(),
  mealType: mealTypeSchema,
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ingredients: z.array(mealIngredientSchema).default([]),
});
export type MealDTO = z.infer<typeof mealSchema>;

/**
 * 餐次创建输入
 */
export const mealCreateInputSchema = z.object({
  date: z.coerce.date(),
  mealType: mealTypeSchema,
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  ingredients: z.array(mealIngredientCreateInputSchema).optional().default([]),
});
export type MealCreateInputDTO = z.infer<typeof mealCreateInputSchema>;

/**
 * 餐次更新输入
 */
export const mealUpdateInputSchema = z.object({
  date: z.coerce.date().optional(),
  mealType: mealTypeSchema.optional(),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  ingredients: z.array(mealIngredientCreateInputSchema).optional(),
});
export type MealUpdateInputDTO = z.infer<typeof mealUpdateInputSchema>;

// ==================== 膳食计划 ====================

/**
 * 膳食计划 Schema
 *
 * 完整的膳食计划数据，包含目标营养值和所有餐次
 */
export const mealPlanSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  goalType: goalTypeSchema,
  targetCalories: z.number().nonnegative(),
  targetProtein: z.number().nonnegative(),
  targetCarbs: z.number().nonnegative(),
  targetFat: z.number().nonnegative(),
  status: planStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable().optional(),
  meals: z.array(mealSchema).default([]),
});
export type MealPlanDTO = z.infer<typeof mealPlanSchema>;

/**
 * 膳食计划创建输入
 */
export const mealPlanCreateInputSchema = z.object({
  memberId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  goalType: goalTypeSchema,
  targetCalories: z.number().nonnegative(),
  targetProtein: z.number().nonnegative(),
  targetCarbs: z.number().nonnegative(),
  targetFat: z.number().nonnegative(),
  status: planStatusSchema.optional(),
  meals: z.array(mealCreateInputSchema).optional().default([]),
});
export type MealPlanCreateInputDTO = z.infer<typeof mealPlanCreateInputSchema>;

/**
 * 膳食计划更新输入
 */
export const mealPlanUpdateInputSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  goalType: goalTypeSchema.optional(),
  targetCalories: z.number().nonnegative().optional(),
  targetProtein: z.number().nonnegative().optional(),
  targetCarbs: z.number().nonnegative().optional(),
  targetFat: z.number().nonnegative().optional(),
  status: planStatusSchema.optional(),
});
export type MealPlanUpdateInputDTO = z.infer<typeof mealPlanUpdateInputSchema>;

/**
 * 膳食计划筛选条件
 */
export const mealPlanFilterSchema = z.object({
  memberId: z.string().uuid().optional(),
  goalType: goalTypeSchema.optional(),
  status: planStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  includeDeleted: z.boolean().optional(),
});
export type MealPlanFilterDTO = z.infer<typeof mealPlanFilterSchema>;
