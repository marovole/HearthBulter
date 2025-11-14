/**
 * 膳食计划 Repository 单例
 *
 * 提供统一的双写 MealPlanRepository 实例，供所有膳食计划相关端点使用
 *
 * @module meal-plan-repository-singleton
 */

import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaMealPlanRepository } from './implementations/prisma-meal-plan-repository';
import { SupabaseMealPlanRepository } from './implementations/supabase-meal-plan-repository';
import type { MealPlanRepository } from './interfaces/meal-plan-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();

export const mealPlanRepository = createDualWriteDecorator<MealPlanRepository>(
  new PrismaMealPlanRepository(),
  new SupabaseMealPlanRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/meal-plans',
  }
);
