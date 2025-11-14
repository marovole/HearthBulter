/**
 * 排行榜 Repository 单例
 *
 * 提供统一的双写 LeaderboardRepository 实例，供所有排行榜相关端点使用
 *
 * @module leaderboard-repository-singleton
 */

import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { PrismaLeaderboardRepository } from './implementations/prisma-leaderboard-repository';
import { SupabaseLeaderboardRepository } from './implementations/supabase-leaderboard-repository';
import type { LeaderboardRepository } from './interfaces/leaderboard-repository';

// 模块级别的 Repository 单例（避免请求开销）
const supabaseClient = SupabaseClientManager.getInstance();

export const leaderboardRepository = createDualWriteDecorator<LeaderboardRepository>(
  new PrismaLeaderboardRepository(),
  new SupabaseLeaderboardRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/social/leaderboard',
  }
);
