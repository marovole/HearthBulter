/**
 * 食材 Repository 单例
 *
 * 提供统一的双写 FoodRepository 实例，供所有食材相关端点使用
 *
 * @module food-repository-singleton
 */

import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaFoodRepository } from './prisma/prisma-food-repository';
import { SupabaseFoodRepository } from './supabase/supabase-food-repository';
import type { FoodRepository } from './interfaces/food-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();

export const foodRepository = createDualWriteDecorator<FoodRepository>(
  new PrismaFoodRepository(),
  new SupabaseFoodRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/foods',
  }
);
