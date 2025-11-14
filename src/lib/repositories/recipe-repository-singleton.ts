/**
 * 食谱 Repository 单例
 *
 * 提供统一的双写 RecipeRepository 实例，供所有食谱相关端点使用
 *
 * @module recipe-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaRecipeRepository } from './implementations/prisma-recipe-repository';
import { SupabaseRecipeRepository } from './implementations/supabase-recipe-repository';
import type { RecipeRepository } from './interfaces/recipe-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const recipeRepository = createDualWriteDecorator<RecipeRepository>(
  new PrismaRecipeRepository(),
  new SupabaseRecipeRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/recipes',
  }
);
