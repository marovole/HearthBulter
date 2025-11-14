/**
 * 成员 Repository 单例
 *
 * 提供统一的双写 MemberRepository 实例，供所有成员健康管理相关端点使用
 *
 * @module member-repository-singleton
 */

import { getPrismaClient } from '@/lib/db';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaMemberRepository } from './implementations/prisma-member-repository';
import { SupabaseMemberRepository } from './implementations/supabase-member-repository';
import type { MemberRepository } from './interfaces/member-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();
const prismaClient = await getPrismaClient();

export const memberRepository = createDualWriteDecorator<MemberRepository>(
  new PrismaMemberRepository(),
  new SupabaseMemberRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/members',
  }
);
