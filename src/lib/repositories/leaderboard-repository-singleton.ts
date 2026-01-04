/**
 * 排行榜 Repository 单例
 *
 * 提供全局单例 LeaderboardRepository 实例
 *
 * @module leaderboard-repository-singleton
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseLeaderboardRepository } from "./implementations/supabase-leaderboard-repository";
import type { LeaderboardRepository } from "./interfaces/leaderboard-repository";

let instance: LeaderboardRepository | null = null;

/**
 * 获取 LeaderboardRepository 单例实例
 *
 * @returns LeaderboardRepository 实例
 */
export function getLeaderboardRepository(): LeaderboardRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseLeaderboardRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 LeaderboardRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { leaderboardRepository } from '@/lib/repositories/leaderboard-repository-singleton';
 *
 * const leaderboard = await leaderboardRepository.getLeaderboard();
 * ```
 */
export const leaderboardRepository = getLeaderboardRepository();
