import { ConvexLeaderboardRepository } from "./implementations/convex-leaderboard-repository";
import type { LeaderboardRepository } from "./interfaces/leaderboard-repository";

let instance: LeaderboardRepository | null = null;

export function getLeaderboardRepository(): LeaderboardRepository {
  if (!instance) {
    instance = new ConvexLeaderboardRepository();
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
