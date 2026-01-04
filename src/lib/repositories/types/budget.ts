/**
 * 预算域 DTO 类型定义
 *
 * 本模块定义预算管理相关的数据传输对象，包括：
 * - 预算记录
 * - 支出记录
 * - 预算预警
 * - 预算状态
 *
 * @module budget
 */

import { z } from 'zod';
import { dateRangeFilterSchema } from './common';

/**
 * 预算周期枚举
 */
export const budgetPeriodSchema = z.enum([
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'CUSTOM',
]);
export type BudgetPeriod = z.infer<typeof budgetPeriodSchema>;

/**
 * 预算状态枚举
 */
export const budgetStatusSchema = z.enum([
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);
export type BudgetStatus = z.infer<typeof budgetStatusSchema>;

/**
 * 食品类别枚举（完整列表）
 */
export const foodCategorySchema = z.enum([
  'VEGETABLES',
  'FRUITS',
  'GRAINS',
  'PROTEIN',
  'SEAFOOD',
  'DAIRY',
  'OILS',
  'SNACKS',
  'BEVERAGES',
  'OTHER',
]);
export type FoodCategory = z.infer<typeof foodCategorySchema>;

/**
 * 预算分类类别（完整10种）
 *
 * 数据库schema现已支持所有10种FoodCategory的预算分配：
 * - vegetable_budget (VEGETABLES)
 * - fruit_budget (FRUITS)
 * - grain_budget (GRAINS)
 * - meat_budget (PROTEIN)
 * - seafood_budget (SEAFOOD) ✅ 新增
 * - dairy_budget (DAIRY)
 * - oils_budget (OILS) ✅ 新增
 * - snacks_budget (SNACKS) ✅ 新增
 * - beverages_budget (BEVERAGES) ✅ 新增
 * - other_budget (OTHER)
 */
export const categoryBudgetsSchema = z.object({
  VEGETABLES: z.number().nonnegative(),
  FRUITS: z.number().nonnegative(),
  GRAINS: z.number().nonnegative(),
  PROTEIN: z.number().nonnegative(),
  SEAFOOD: z.number().nonnegative(),
  DAIRY: z.number().nonnegative(),
  OILS: z.number().nonnegative(),
  SNACKS: z.number().nonnegative(),
  BEVERAGES: z.number().nonnegative(),
  OTHER: z.number().nonnegative(),
});
export type CategoryBudgets = z.infer<typeof categoryBudgetsSchema>;

/**
 * 预算 Schema
 */
export const budgetSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  name: z.string().min(1).max(100),
  period: budgetPeriodSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalAmount: z.number().positive(),
  usedAmount: z.number().nonnegative().default(0),
  remainingAmount: z.number().nonnegative().default(0),
  usagePercentage: z.number().min(0).max(100).default(0),
  status: budgetStatusSchema.default('ACTIVE'),
  alertThreshold80: z.boolean().default(true),
  alertThreshold100: z.boolean().default(true),
  alertThreshold110: z.boolean().default(true),
  categoryBudgets: categoryBudgetsSchema.optional(),
  createdAt: z.coerce.date(),
});

export type BudgetDTO = z.infer<typeof budgetSchema>;

/**
 * 创建预算 Schema
 */
export const budgetCreateSchema = budgetSchema.omit({
  id: true,
  usedAmount: true,
  remainingAmount: true,
  usagePercentage: true,
  status: true,
  createdAt: true,
});

export type BudgetCreateDTO = z.infer<typeof budgetCreateSchema>;

/**
 * 更新预算 Schema
 */
export const budgetUpdateSchema = budgetCreateSchema.partial().extend({
  status: budgetStatusSchema.optional(),
});

export type BudgetUpdateDTO = z.infer<typeof budgetUpdateSchema>;

/**
 * 支出 Schema
 */
export const spendingSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string().uuid(),
  amount: z.number().positive(),
  category: foodCategorySchema,
  description: z.string().max(500).optional(),
  transactionId: z.string().optional(),
  platform: z.string().optional(),
  items: z.array(z.record(z.any())).optional(),
  purchaseDate: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type SpendingDTO = z.infer<typeof spendingSchema>;

/**
 * 创建支出 Schema
 */
export const spendingCreateSchema = spendingSchema
  .omit({ id: true, createdAt: true })
  .partial({
    description: true,
    transactionId: true,
    platform: true,
    items: true,
  });

export type SpendingCreateDTO = z.infer<typeof spendingCreateSchema>;

/**
 * 支出过滤器 Schema
 */
export const spendingFilterSchema = z.object({
  budgetId: z.string().uuid(),
  category: foodCategorySchema.optional(),
  range: dateRangeFilterSchema.optional(),
});

export type SpendingFilterDTO = z.infer<typeof spendingFilterSchema>;

/**
 * 预算预警 Schema
 */
export const budgetAlertSchema = z.object({
  id: z.string().uuid(),
  budgetId: z.string().uuid(),
  type: z.enum([
    'WARNING_80',
    'WARNING_100',
    'OVER_BUDGET_110',
    'CATEGORY_BUDGET_ALERT',
    'DAILY_EXCESS',
  ]),
  threshold: z.number(),
  currentValue: z.number(),
  message: z.string().min(1),
  category: foodCategorySchema.optional(),
  status: z.enum(['ACTIVE', 'CLEARED']).default('ACTIVE'),
  createdAt: z.coerce.date(),
});

export type BudgetAlertDTO = z.infer<typeof budgetAlertSchema>;

/**
 * 预算状态 Schema
 */
export const budgetStatusPayloadSchema = z.object({
  budget: budgetSchema,
  dailyAverage: z.number(),
  projectedSpend: z.number(),
  daysRemaining: z.number().int().nonnegative(),
  alerts: z.array(budgetAlertSchema),
  categoryUsage: z.record(
    foodCategorySchema,
    z.object({
      budget: z.number().nonnegative(),
      used: z.number().nonnegative(),
      remaining: z.number().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  ),
});

export type BudgetStatusDTO = z.infer<typeof budgetStatusPayloadSchema>;
