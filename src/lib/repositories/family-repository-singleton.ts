/**
 * 家庭 Repository 单例
 *
 * 提供统一的双写 FamilyRepository 实例，供所有家庭相关端点使用
 *
 * @module family-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaFamilyRepository } from './implementations/prisma-family-repository';
import { SupabaseFamilyRepository } from './implementations/supabase-family-repository';
import type { FamilyRepository } from './interfaces/family-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const familyRepository = createDualWriteDecorator<FamilyRepository>(
  new PrismaFamilyRepository(prismaClient),
  new SupabaseFamilyRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/families',
  }
);
