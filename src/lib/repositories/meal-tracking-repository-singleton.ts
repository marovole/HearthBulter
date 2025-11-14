/**
 * 膳食追踪 Repository 单例
 *
 * 提供统一的双写 MealTrackingRepository 实例，供所有膳食追踪相关端点使用
 *
 * @module meal-tracking-repository-singleton
 */

import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaMealTrackingRepository } from './implementations/prisma-meal-tracking-repository';
import { SupabaseMealTrackingRepository } from './implementations/supabase-meal-tracking-repository';
import type { MealTrackingRepository } from './interfaces/meal-tracking-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();

export const mealTrackingRepository = createDualWriteDecorator<MealTrackingRepository>(
  new PrismaMealTrackingRepository(),
  new SupabaseMealTrackingRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/tracking',
  }
);
