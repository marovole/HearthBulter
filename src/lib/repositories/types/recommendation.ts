/**
 * 推荐域 DTO 类型定义
 *
 * 本模块定义推荐引擎相关的数据传输对象，包括：
 * - 食谱摘要
 * - 用户偏好
 * - 推荐行为
 * - 健康目标
 * - 库存快照
 *
 * @module recommendation
 */

import { z } from 'zod';
import type { Database, Json } from '@/types/supabase-database';
import { dateRangeFilterSchema } from './common';

type RecipeRow = Database['public']['Tables']['recipes']['Row'];
type MealRecordRow = Database['public']['Tables']['meal_records']['Row'];
type FamilyMemberRow = Database['public']['Tables']['family_members']['Row'];

/**
 * 食材 Schema
 */
const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nonnegative().optional(),
  unit: z.string().optional(),
});

/**
 * 食谱摘要 Schema
 * 包含推荐引擎所需的核心食谱信息
 */
export const recipeSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  cuisineType: z.string().nullable(),
  mealType: z.string().nullable(),
  difficulty: z.string().nullable(),
  servings: z.number().int().positive().nullable(),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  caloriesPerServing: z.number().nonnegative().nullable(),
  proteinPerServing: z.number().nonnegative().nullable(),
  carbsPerServing: z.number().nonnegative().nullable(),
  fatPerServing: z.number().nonnegative().nullable(),
  averageRating: z.number().min(0).max(5).nullable(),
  ratingCount: z.number().int().nonnegative().nullable(),
  viewCount: z.number().int().nonnegative().nullable(),
  estimatedCost: z.number().nonnegative().nullable(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(ingredientSchema).optional(),
});

export type RecipeSummaryDTO = z.infer<typeof recipeSummarySchema>;

/**
 * 推荐食谱过滤器 Schema
 */
export const recommendationRecipeFilterSchema = z.object({
  memberId: z.string().uuid().optional(),
  mealTypes: z.array(z.string()).optional(),
  cuisineTypes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  excludeRecipeIds: z.array(z.string().uuid()).optional(),
  maxCookTimeMinutes: z.number().int().positive().optional(),
  season: z.enum(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER']).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  budgetLimit: z.number().positive().optional(),
});

export type RecommendationRecipeFilter = z.infer<typeof recommendationRecipeFilterSchema>;

/**
 * 用户偏好 Schema
 */
export const userPreferenceSchema = z.object({
  memberId: z.string().uuid(),
  preferredIngredients: z.array(z.string()).default([]),
  avoidedIngredients: z.array(z.string()).default([]),
  maxCookTimeMinutes: z.number().int().positive().nullable(),
  costLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  preferredCuisines: z.array(z.string()).default([]),
  recommendationWeights: z
    .object({
      inventory: z.number().min(0).max(1),
      price: z.number().min(0).max(1),
      nutrition: z.number().min(0).max(1),
      preference: z.number().min(0).max(1),
      seasonal: z.number().min(0).max(1),
    })
    .partial()
    .optional(),
});

export type UserPreferenceDTO = z.infer<typeof userPreferenceSchema>;

/**
 * 行为事件 Schema
 */
const behaviorEventSchema = z.object({
  recipeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional(),
  ratedAt: z.coerce.date().optional(),
  favoritedAt: z.coerce.date().optional(),
  viewedAt: z.coerce.date().optional(),
});

/**
 * 推荐行为 Schema
 * 包含用户对食谱的评分、收藏、浏览历史
 */
export const recommendationBehaviorSchema = z.object({
  ratings: z.array(behaviorEventSchema).default([]),
  favorites: z.array(behaviorEventSchema).default([]),
  views: z.array(behaviorEventSchema).default([]),
});

export type RecommendationBehaviorDTO = z.infer<typeof recommendationBehaviorSchema>;

/**
 * 健康目标 Schema
 */
export const healthGoalSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  goalType: z.string().min(1),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).default('ACTIVE'),
  targetCalories: z.number().positive().nullable(),
  macroTargets: z
    .object({
      protein: z.number().nonnegative().nullable(),
      carbs: z.number().nonnegative().nullable(),
      fat: z.number().nonnegative().nullable(),
    })
    .partial(),
  createdAt: z.coerce.date(),
});

export type HealthGoalDTO = z.infer<typeof healthGoalSchema>;

/**
 * 库存项目 Schema
 */
export const inventoryItemSchema = z.object({
  ingredientName: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().optional(),
  freshnessScore: z.number().min(0).max(1).optional(),
  expiresAt: z.coerce.date().optional(),
});

/**
 * 库存快照 Schema
 */
export const inventorySnapshotSchema = z.object({
  memberId: z.string().uuid(),
  capturedAt: z.coerce.date(),
  items: z.array(inventoryItemSchema),
});

export type InventorySnapshotDTO = z.infer<typeof inventorySnapshotSchema>;

/**
 * 推荐权重 Schema
 */
export const recommendationWeightsSchema = z.object({
  inventory: z.number().min(0).max(1),
  price: z.number().min(0).max(1),
  nutrition: z.number().min(0).max(1),
  preference: z.number().min(0).max(1),
  seasonal: z.number().min(0).max(1),
});

export type RecommendationWeightsDTO = z.infer<typeof recommendationWeightsSchema>;

/**
 * 推荐日志 Schema
 * 用于记录推荐结果，支持 A/B 测试和审计
 */
export const recommendationLogSchema = z.object({
  memberId: z.string().uuid(),
  recipeId: z.string().uuid(),
  rank: z.number().int().positive(),
  score: z.number(),
  reasons: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  generatedAt: z.coerce.date(),
});

export type RecommendationLogDTO = z.infer<typeof recommendationLogSchema>;
