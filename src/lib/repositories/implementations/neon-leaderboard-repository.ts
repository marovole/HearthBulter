// @ts-nocheck - Legacy migration: pending full type safety review
import type { LeaderboardType } from "@/types/social-sharing";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { NeonClientManager } from "@/lib/db/neon-client";
import type { HealthDataSource } from "@/lib/repositories/interfaces/member-repository";
import type {
  FamilyMemberRecord,
  HealthDataRecord,
  LeaderboardEntryRecord,
} from "../interfaces/leaderboard-repository";

type FamilyMember = FamilyMemberRecord;
type HealthData = HealthDataRecord;
type LeaderboardEntry = LeaderboardEntryRecord;

import type {
  HealthDataAggregationResult,
  HealthDataFilter,
  LeaderboardEntryCreateDTO,
  LeaderboardEntryQuery,
  LeaderboardRepository,
  MemberHealthData,
} from "../interfaces/leaderboard-repository";

export class NeonLeaderboardRepository implements LeaderboardRepository {
  async aggregateHealthDataByMember(
    filter: HealthDataFilter
  ): Promise<HealthDataAggregationResult[]> {
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.memberId) {
      whereConditions.push(`member_id = $${paramIndex++}`);
      params.push(filter.memberId);
    }
    if (filter.startDate) {
      whereConditions.push(`measured_at >= $${paramIndex++}`);
      params.push(filter.startDate.toISOString());
    }
    if (filter.endDate) {
      whereConditions.push(`measured_at <= $${paramIndex++}`);
      params.push(filter.endDate.toISOString());
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        member_id,
        AVG(weight) as avg_weight,
        AVG(heart_rate) as avg_heart_rate,
        AVG(blood_pressure_systolic) as avg_blood_pressure_systolic,
        AVG(blood_pressure_diastolic) as avg_blood_pressure_diastolic,
        COUNT(*) as data_count
      FROM health_data
      ${whereClause}
      GROUP BY member_id
    `;

    const rows = await NeonClientManager.query<any>(sql, params);

    return rows.map((row) => ({
      memberId: row.member_id,
      avgWeight: row.avg_weight ? Number(row.avg_weight) : undefined,
      avgHeartRate: row.avg_heart_rate ? Number(row.avg_heart_rate) : undefined,
      avgBloodPressureSystolic: row.avg_blood_pressure_systolic
        ? Number(row.avg_blood_pressure_systolic)
        : undefined,
      avgBloodPressureDiastolic: row.avg_blood_pressure_diastolic
        ? Number(row.avg_blood_pressure_diastolic)
        : undefined,
      dataCount: Number(row.data_count) || 0,
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
      avatar: member.avatar,
      healthData,
    };
  }

  async getMembersHealthData(
    memberIds: string[],
    filter?: HealthDataFilter
  ): Promise<MemberHealthData[]> {
    if (!memberIds.length) return [];

    const members = await neonAdapter.familyMember.findMany({
      where: { id: { in: memberIds } },
    });

    if (!members || members.length === 0) return [];

    const results: MemberHealthData[] = [];
    for (const member of members) {
      const healthData = await this.fetchHealthDataForMember(member.id, filter);
      results.push({
        memberId: member.id,
        name: member.name,
        avatar: member.avatar ?? undefined,
        healthData,
      });
    }

    return results;
  }

  async getMemberById(
    memberId: string
  ): Promise<Pick<FamilyMember, "id" | "name" | "avatar"> | null> {
    const data = await neonAdapter.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      avatar: data.avatar ?? undefined,
    };
  }

  async getMembersWithHealthData(filter: HealthDataFilter): Promise<MemberHealthData[]> {
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.memberId) {
      whereConditions.push(`member_id = $${paramIndex++}`);
      params.push(filter.memberId);
    }
    if (filter.startDate) {
      whereConditions.push(`measured_at >= $${paramIndex++}`);
      params.push(filter.startDate.toISOString());
    }
    if (filter.endDate) {
      whereConditions.push(`measured_at <= $${paramIndex++}`);
      params.push(filter.endDate.toISOString());
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const memberIdRows = await NeonClientManager.query<{ member_id: string }>(
      `SELECT DISTINCT member_id FROM health_data ${whereClause}`,
      params
    );

    const memberIds = memberIdRows.map((row) => row.member_id).filter(Boolean);
    if (!memberIds.length) return [];

    return this.getMembersHealthData(memberIds, filter);
  }

  async createLeaderboardEntry(data: LeaderboardEntryCreateDTO): Promise<LeaderboardEntry> {
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const created = await neonAdapter.leaderboardEntry.create({
      data: {
        memberId: data.memberId,
        leaderboardType: data.type,
        rank: data.rank,
        score: data.value,
        metadata: data.metadata ?? {},
        calculatedAt: now,
        isAnonymous: false,
        showRank: true,
        percentile: 0,
        period: "MONTHLY",
        periodStart: now,
        periodEnd: periodEnd,
        totalParticipants: 0,
      },
    });

    return this.mapLeaderboardEntry(created);
  }

  async createLeaderboardEntries(
    entries: LeaderboardEntryCreateDTO[]
  ): Promise<LeaderboardEntry[]> {
    if (!entries.length) return [];

    const results: LeaderboardEntry[] = [];
    for (const entry of entries) {
      const created = await this.createLeaderboardEntry(entry);
      results.push(created);
    }
    return results;
  }

  async getLeaderboardEntries(query: LeaderboardEntryQuery): Promise<LeaderboardEntry[]> {
    const whereConditions: string[] = ["member_id = $1", "leaderboard_type = $2"];
    const params: any[] = [query.memberId, query.type];
    let paramIndex = 3;

    if (query.startDate) {
      whereConditions.push(`calculated_at >= $${paramIndex++}`);
      params.push(query.startDate.toISOString());
    }
    if (query.endDate) {
      whereConditions.push(`calculated_at <= $${paramIndex++}`);
      params.push(query.endDate.toISOString());
    }

    let sql = `
      SELECT * FROM leaderboard_entry
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY calculated_at DESC
    `;

    if (query.limit && query.limit > 0) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(query.limit);
    }

    const rows = await NeonClientManager.query<any>(sql, params);
    return rows.map((row) => this.mapLeaderboardEntry(row));
  }

  async getLatestLeaderboardEntry(
    query: Omit<LeaderboardEntryQuery, "startDate" | "endDate">
  ): Promise<LeaderboardEntry | null> {
    const data = await neonAdapter.leaderboardEntry.findFirst({
      where: {
        memberId: query.memberId,
        leaderboardType: query.type,
      },
      orderBy: { calculatedAt: "desc" },
    });

    return data ? this.mapLeaderboardEntry(data) : null;
  }

  async getRankingHistory(
    memberId: string,
    type: LeaderboardType,
    days?: number
  ): Promise<LeaderboardEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days ?? 30));

    const data = await neonAdapter.leaderboardEntry.findMany({
      where: {
        memberId,
        leaderboardType: type,
        calculatedAt: { gte: startDate },
      },
      orderBy: { calculatedAt: "desc" },
    });

    return (data || []).map((row) => this.mapLeaderboardEntry(row));
  }

  async countMemberHealthData(memberId: string, filter?: HealthDataFilter): Promise<number> {
    const whereConditions: string[] = ["member_id = $1"];
    const params: any[] = [memberId];
    let paramIndex = 2;

    if (filter) {
      if (filter.startDate) {
        whereConditions.push(`measured_at >= $${paramIndex++}`);
        params.push(filter.startDate.toISOString());
      }
      if (filter.endDate) {
        whereConditions.push(`measured_at <= $${paramIndex++}`);
        params.push(filter.endDate.toISOString());
      }
    }

    const result = await NeonClientManager.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM health_data WHERE ${whereConditions.join(" AND ")}`,
      params
    );

    return parseInt(result[0]?.count || "0", 10);
  }

  async calculateCheckinStreakDays(memberId: string): Promise<number> {
    const streakData = await neonAdapter.trackingStreak.findFirst({
      where: { memberId },
    });

    if (streakData?.currentStreak !== null && streakData?.currentStreak !== undefined) {
      return Number(streakData.currentStreak) || 0;
    }

    return 0;
  }

  private async fetchHealthDataForMember(
    memberId: string,
    filter?: HealthDataFilter
  ): Promise<HealthData[]> {
    const whereConditions: string[] = ["member_id = $1"];
    const params: any[] = [memberId];
    let paramIndex = 2;

    if (filter) {
      if (filter.startDate) {
        whereConditions.push(`measured_at >= $${paramIndex++}`);
        params.push(filter.startDate.toISOString());
      }
      if (filter.endDate) {
        whereConditions.push(`measured_at <= $${paramIndex++}`);
        params.push(filter.endDate.toISOString());
      }
      if (filter.source) {
        whereConditions.push(`source = $${paramIndex++}`);
        params.push(filter.source);
      }
    }

    const rows = await NeonClientManager.query<any>(
      `SELECT * FROM health_data WHERE ${whereConditions.join(" AND ")} ORDER BY measured_at DESC`,
      params
    );

    return rows.map((row) => this.mapHealthData(row));
  }

  private mapLeaderboardEntry(row: any): LeaderboardEntry {
    const calculatedAt = row.calculatedAt || row.calculated_at;
    const createdAt = row.createdAt || row.created_at;
    const updatedAt = row.updatedAt || row.updated_at;

    return {
      id: row.id,
      memberId: row.memberId || row.member_id,
      leaderboardType: (row.leaderboardType || row.leaderboard_type) as LeaderboardType,
      rank: row.rank,
      score: row.score ?? 0,
      metadata: row.metadata ?? {},
      calculatedAt: calculatedAt ? new Date(calculatedAt) : new Date(),
      isAnonymous: row.isAnonymous || row.is_anonymous || false,
      showRank: row.showRank ?? row.show_rank ?? true,
      percentile: row.percentile ?? 0,
      period: row.period || "",
      periodStart:
        row.periodStart || row.period_start
          ? new Date(row.periodStart || row.period_start)
          : new Date(),
      periodEnd:
        row.periodEnd || row.period_end ? new Date(row.periodEnd || row.period_end) : new Date(),
      totalParticipants: row.totalParticipants || row.total_participants || 0,
      previousRank: row.previousRank ?? row.previous_rank ?? null,
      rankChange: row.rankChange ?? row.rank_change ?? null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    };
  }

  private mapHealthData(row: any): HealthData {
    const measuredAt = row.measuredAt || row.measured_at;
    const createdAt = row.createdAt || row.created_at;
    const updatedAt = row.updatedAt || row.updated_at;

    return {
      id: row.id,
      memberId: row.memberId || row.member_id,
      weight: row.weight ?? null,
      bodyFat: row.bodyFat ?? row.body_fat ?? null,
      muscleMass: row.muscleMass ?? row.muscle_mass ?? null,
      bloodPressureSystolic: row.bloodPressureSystolic ?? row.blood_pressure_systolic ?? null,
      bloodPressureDiastolic: row.bloodPressureDiastolic ?? row.blood_pressure_diastolic ?? null,
      heartRate: row.heartRate ?? row.heart_rate ?? null,
      measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
      source: (row.source ?? "MANUAL") as HealthDataSource,
      notes: row.notes ?? null,
      deviceConnectionId: row.deviceConnectionId ?? row.device_connection_id ?? null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
    };
  }
}
