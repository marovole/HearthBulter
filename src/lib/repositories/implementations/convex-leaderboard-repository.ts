/**
 * Convex Leaderboard Repository 实现
 *
 * 基于 Convex 实现排行榜系统数据访问层
 * 替代 neon-leaderboard-repository.ts 的原始 SQL 实现
 *
 * @module convex-leaderboard-repository
 */

import type { LeaderboardType } from "@/types/social-sharing";
import type { HealthDataSource } from "@/lib/repositories/interfaces/member-repository";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexQueryReference } from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type {
  FamilyMemberRecord,
  HealthDataAggregationResult,
  HealthDataFilter,
  HealthDataRecord,
  LeaderboardEntryCreateDTO,
  LeaderboardEntryQuery,
  LeaderboardEntryRecord,
  LeaderboardRepository,
  MemberHealthData,
} from "../interfaces/leaderboard-repository";

// ============================================================================
// Convex 文档类型
// ============================================================================

type LeaderboardEntryDoc = Doc<"leaderboardEntries"> & {
  memberId: Id<"familyMembers">;
  leaderboardType: string;
  period: string;
  periodStart: number;
  periodEnd: number;
  score: number;
  rank: number;
  previousRank?: number;
  rankChange?: number;
  totalParticipants: number;
  percentile?: number;
  isAnonymous: boolean;
  showRank: boolean;
  metadata?: any;
  calculatedAt: number;
  createdAt: number;
  updatedAt: number;
};

type HealthDataDoc = Doc<"healthData"> & {
  memberId: Id<"familyMembers">;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  source: string;
  measuredAt: number;
  notes?: string;
  deviceConnectionId?: Id<"deviceConnections">;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

type FamilyMemberDoc = Doc<"familyMembers"> & {
  name: string;
  avatar?: string;
  deletedAt?: number;
};

type TrackingStreakDoc = Doc<"trackingStreaks"> & {
  memberId: Id<"familyMembers">;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastCheckIn?: number;
  badges: string;
};

// ============================================================================
// Mapping 辅助函数
// ============================================================================

function mapLeaderboardEntry(doc: LeaderboardEntryDoc): LeaderboardEntryRecord {
  return {
    id: doc._id as string,
    memberId: doc.memberId as string,
    leaderboardType: doc.leaderboardType as LeaderboardType,
    period: doc.period,
    periodStart: new Date(doc.periodStart),
    periodEnd: new Date(doc.periodEnd),
    score: doc.score,
    rank: doc.rank,
    previousRank: doc.previousRank,
    rankChange: doc.rankChange,
    totalParticipants: doc.totalParticipants,
    percentile: doc.percentile,
    isAnonymous: doc.isAnonymous,
    showRank: doc.showRank,
    metadata: doc.metadata,
    calculatedAt: new Date(doc.calculatedAt),
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

function mapHealthData(doc: HealthDataDoc): HealthDataRecord {
  return {
    id: doc._id as string,
    memberId: doc.memberId as string,
    weight: doc.weight ?? null,
    bodyFat: doc.bodyFat ?? null,
    muscleMass: doc.muscleMass ?? null,
    bloodPressureSystolic: doc.bloodPressureSystolic ?? null,
    bloodPressureDiastolic: doc.bloodPressureDiastolic ?? null,
    heartRate: doc.heartRate ?? null,
    measuredAt: new Date(doc.measuredAt),
    source: doc.source as HealthDataSource,
    notes: doc.notes ?? null,
    deviceConnectionId: doc.deviceConnectionId?.toString() ?? null,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
}

// ============================================================================
// Repository 实现
// ============================================================================

export class ConvexLeaderboardRepository implements LeaderboardRepository {
  // ========================================================================
  // Health Data 聚合查询
  // ========================================================================

  async aggregateHealthDataByMember(
    filter: HealthDataFilter
  ): Promise<HealthDataAggregationResult[]> {
    const startDate = filter.startDate?.getTime() ?? 0;
    const endDate = filter.endDate?.getTime() ?? Date.now();

    // getHealthScoreCandidates 已在 Convex 侧完成聚合，
    // 直接使用其结果替代原始 SQL GROUP BY
    const candidates = await convexClient.query<
      Array<{
        memberId: string;
        memberName: string;
        avatar?: string;
        avgWeight: number;
        avgHeartRate: number;
        avgBloodPressureSystolic: number;
        avgBloodPressureDiastolic: number;
        dataCount: number;
      }>
    >(api.leaderboards.getHealthScoreCandidates, {
      startDate,
      endDate,
    });

    // 如果有 memberId 过滤，客户端过滤
    return candidates
      .filter((c) => !filter.memberId || c.memberId === filter.memberId)
      .map((c) => ({
        memberId: c.memberId,
        avgWeight: c.avgWeight || undefined,
        avgHeartRate: c.avgHeartRate || undefined,
        avgBloodPressureSystolic: c.avgBloodPressureSystolic || undefined,
        avgBloodPressureDiastolic: c.avgBloodPressureDiastolic || undefined,
        dataCount: c.dataCount,
      }));
  }

  async getMemberHealthData(
    memberId: string,
    filter?: HealthDataFilter
  ): Promise<MemberHealthData> {
    const member = await this.getMemberById(memberId);
    if (!member) {
      throw new Error(`Member with ID ${memberId} not found`);
    }

    const healthData = await this.fetchHealthDataForMember(memberId, filter);

    return {
      memberId: member.id,
      name: member.name,
      avatar: member.avatar ?? undefined,
      healthData,
    };
  }

  async getMembersHealthData(
    memberIds: string[],
    filter?: HealthDataFilter
  ): Promise<MemberHealthData[]> {
    if (!memberIds.length) return [];

    // 并行获取所有成员和健康数据
    const results = await Promise.all(
      memberIds.map(async (memberId) => {
        const member = await this.getMemberById(memberId);
        if (!member) return null;

        const healthData = await this.fetchHealthDataForMember(memberId, filter);
        return {
          memberId: member.id,
          name: member.name,
          avatar: member.avatar ?? undefined,
          healthData,
        } satisfies MemberHealthData;
      })
    );

    return results.filter((r): r is MemberHealthData => r !== null);
  }

  // ========================================================================
  // Family Member 查询
  // ========================================================================

  async getMemberById(memberId: string): Promise<FamilyMemberRecord | null> {
    const doc = await convexClient.query<FamilyMemberDoc | null>(api.families.getMemberById, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!doc) return null;

    return {
      id: doc._id as string,
      name: doc.name,
      avatar: doc.avatar ?? null,
    };
  }

  async getMembersWithHealthData(filter: HealthDataFilter): Promise<MemberHealthData[]> {
    const startDate = filter.startDate?.getTime() ?? 0;
    const endDate = filter.endDate?.getTime() ?? Date.now();

    // getHealthScoreCandidates 返回有健康数据的成员 + 聚合
    const candidates = await convexClient.query<
      Array<{
        memberId: string;
        memberName: string;
        avatar?: string;
        avgWeight: number;
        avgHeartRate: number;
        avgBloodPressureSystolic: number;
        avgBloodPressureDiastolic: number;
        dataCount: number;
      }>
    >(api.leaderboards.getHealthScoreCandidates, {
      startDate,
      endDate,
    });

    // 如果有 memberId 过滤，客户端过滤
    const filtered = filter.memberId
      ? candidates.filter((c) => c.memberId === filter.memberId)
      : candidates;

    // 获取每个成员的完整健康数据（N+1 模式，小数据集可接受）
    return Promise.all(
      filtered.map(async (c) => {
        const healthData = await this.fetchHealthDataForMember(c.memberId, filter);
        return {
          memberId: c.memberId,
          name: c.memberName,
          avatar: c.avatar,
          healthData,
        } satisfies MemberHealthData;
      })
    );
  }

  // ========================================================================
  // Leaderboard Entry 操作
  // ========================================================================

  async createLeaderboardEntry(data: LeaderboardEntryCreateDTO): Promise<LeaderboardEntryRecord> {
    const now = Date.now();
    const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime();

    const id = await convexClient.mutation(api.leaderboards.createEntry, {
      memberId: data.memberId as Id<"familyMembers">,
      leaderboardType: data.type as string,
      period: "MONTHLY",
      periodStart: now,
      periodEnd,
      score: data.value,
      rank: data.rank,
      totalParticipants: 0,
      isAnonymous: false,
      showRank: true,
      metadata: data.metadata,
      calculatedAt: now,
    });

    // 读取刚创建的记录以返回完整数据
    const doc = await convexClient.query<LeaderboardEntryDoc | null>(
      api.leaderboards.getEntryById,
      { id: id as Id<"leaderboardEntries"> }
    );

    if (!doc) {
      throw new Error("Failed to read created leaderboard entry");
    }

    return mapLeaderboardEntry(doc);
  }

  async createLeaderboardEntries(
    entries: LeaderboardEntryCreateDTO[]
  ): Promise<LeaderboardEntryRecord[]> {
    if (!entries.length) return [];
    return Promise.all(entries.map((e) => this.createLeaderboardEntry(e)));
  }

  async getLeaderboardEntries(query: LeaderboardEntryQuery): Promise<LeaderboardEntryRecord[]> {
    const sinceDate = query.startDate?.getTime() ?? 0;
    const limit = query.limit ?? 100;

    const docs = await convexClient.query<LeaderboardEntryDoc[]>(
      api.leaderboards.listRankingHistory,
      {
        memberId: query.memberId as Id<"familyMembers">,
        type: query.type as string,
        sinceDate,
        limit,
      }
    );

    // 客户端过滤 endDate
    let results = docs.map(mapLeaderboardEntry);
    if (query.endDate) {
      const endMs = query.endDate.getTime();
      results = results.filter((r) => {
        const at = r.calculatedAt instanceof Date ? r.calculatedAt.getTime() : r.calculatedAt;
        return at <= endMs;
      });
    }

    return results;
  }

  async getLatestLeaderboardEntry(
    query: Omit<LeaderboardEntryQuery, "startDate" | "endDate">
  ): Promise<LeaderboardEntryRecord | null> {
    const doc = await convexClient.query<LeaderboardEntryDoc | null>(
      api.leaderboards.getLatestEntry,
      {
        memberId: query.memberId as Id<"familyMembers">,
        type: query.type as string,
        sinceDate: 0,
      }
    );

    return doc ? mapLeaderboardEntry(doc) : null;
  }

  async getRankingHistory(
    memberId: string,
    type: LeaderboardType,
    days?: number
  ): Promise<LeaderboardEntryRecord[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - (days ?? 30));

    const docs = await convexClient.query<LeaderboardEntryDoc[]>(
      api.leaderboards.listRankingHistory,
      {
        memberId: memberId as Id<"familyMembers">,
        type: type as string,
        sinceDate: sinceDate.getTime(),
        limit: 1000,
      }
    );

    return docs.map(mapLeaderboardEntry);
  }

  // ========================================================================
  // 数据统计
  // ========================================================================

  async countMemberHealthData(memberId: string, filter?: HealthDataFilter): Promise<number> {
    const result = await convexClient.query<{ data: HealthDataDoc[]; total: number }>(
      api.health.listHealthData,
      {
        memberId: memberId as Id<"familyMembers">,
        startDate: filter?.startDate?.getTime(),
        endDate: filter?.endDate?.getTime(),
        page: 1,
        limit: 1,
        sortOrder: "desc",
      }
    );

    return result.total;
  }

  async calculateCheckinStreakDays(memberId: string): Promise<number> {
    const streak = await convexClient.query<TrackingStreakDoc | null>(
      api.tracking.getTrackingStreak,
      { memberId: memberId as Id<"familyMembers"> }
    );

    if (streak?.currentStreak != null) {
      return Number(streak.currentStreak) || 0;
    }

    return 0;
  }

  // ========================================================================
  // 私有辅助方法
  // ========================================================================

  private async fetchHealthDataForMember(
    memberId: string,
    filter?: HealthDataFilter
  ): Promise<HealthDataRecord[]> {
    const args: Record<string, unknown> = {
      memberId: memberId as Id<"familyMembers">,
      startDate: filter?.startDate?.getTime() ?? 0,
      page: 1,
      limit: 1000,
      sortOrder: "desc",
    };

    if (filter?.endDate) {
      args.endDate = filter.endDate.getTime();
    }

    const result = await convexClient.query<{ data: HealthDataDoc[]; total: number }>(
      api.health.listHealthData,
      args
    );

    let docs = result.data;

    // 客户端过滤 source
    if (filter?.source) {
      docs = docs.filter((d) => d.source === filter.source);
    }

    return docs.map(mapHealthData);
  }
}
