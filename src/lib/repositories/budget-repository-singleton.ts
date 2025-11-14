/**
 * 预算 Repository 单例
 *
 * 提供统一的双写 BudgetRepository 实例，供所有预算相关端点使用
 *
 * @module budget-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaBudgetRepository } from './implementations/prisma-budget-repository';
import { SupabaseBudgetRepository } from './implementations/supabase-budget-repository';
import type { BudgetRepository } from './interfaces/budget-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const budgetRepository = createDualWriteDecorator<BudgetRepository>(
  new PrismaBudgetRepository(),
  new SupabaseBudgetRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/budget',
  }
);
