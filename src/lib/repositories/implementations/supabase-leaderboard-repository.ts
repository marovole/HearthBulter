/**
 * Supabase Leaderboard Repository 实现
 *
 * 基于 Supabase 的 LeaderboardRepository 实现，提供健康数据聚合、
 * 排行榜管理、成员查询等功能。
 *
 * @module supabase-leaderboard-repository
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type {
  FamilyMember,
  HealthData,
  HealthDataSource,
  LeaderboardEntry,
  LeaderboardType,
} from "@prisma/client";
import type { Database } from "@/types/supabase-database";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import {
  RepositoryError,
  RepositoryErrorCode,
} from "@/lib/errors/repository-error";
import type {
  HealthDataAggregationResult,
  HealthDataFilter,
  LeaderboardEntryCreateDTO,
  LeaderboardEntryQuery,
  LeaderboardRepository,
  MemberHealthData,
} from "../interfaces/leaderboard-repository";

/**
 * Supabase Health Data 行类型，包含所有可能的字段
 */
type SupabaseHealthDataRow =
  Database["public"]["Tables"]["health_data"]["Row"] & {
    weight?: number | null;
    body_fat?: number | null;
    muscle_mass?: number | null;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    heart_rate?: number | null;
    measured_at?: string | null;
    source?: string | null;
    notes?: string | null;
    device_connection_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

/**
 * 健康数据聚合查询结果行类型
 */
type HealthDataAggregationRow = {
  member_id: string;
  avg_weight?: string | number | null;
  avg_heart_rate?: string | number | null;
  avg_blood_pressure_systolic?: string | number | null;
  avg_blood_pressure_diastolic?: string | number | null;
  data_count?: string | number | null;
};

/**
 * Supabase Leaderboard Repository
 *
 * 实现 LeaderboardRepository 接口，基于 Supabase PostgreSQL
 */
export class SupabaseLeaderboardRepository implements LeaderboardRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = "[SupabaseLeaderboardRepository]";

  /**
   * 创建 SupabaseLeaderboardRepository 实例
   *
   * @param client - Supabase 客户端实例，可选，如果不提供则使用单例
   */
  constructor(
    client: SupabaseClient<Database> = SupabaseClientManager.getInstance(),
  ) {
    this.client = client;
  }

  /**
   * 聚合健康数据，按成员分组计算平均值和计数
   *
   * @param filter - 查询过滤器
   * @returns 聚合结果数组
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async aggregateHealthDataByMember(
    filter: HealthDataFilter,
  ): Promise<HealthDataAggregationResult[]> {
    try {
      // 构建聚合查询，计算各健康指标的平均值和数据条数
      const selectClause = `
        member_id,
        avg_weight:avg(weight),
        avg_heart_rate:avg(heart_rate),
        avg_blood_pressure_systolic:avg(blood_pressure_systolic),
        avg_blood_pressure_diastolic:avg(blood_pressure_diastolic),
        data_count:count(*)
      `;

      // 应用过滤条件并执行聚合查询，按 member_id 分组
      const filteredQuery = this.applyHealthDataFilter(
        this.client.from("health_data") as any,
        filter,
      );

      const { data, error } = await filteredQuery
        .select(selectClause)
        .group("member_id");

      if (error) {
        throw Error(`aggregateHealthDataByMember failed: ${error.message}`);
      }

      // 映射结果为数组形式
      return (data ?? []).map((row) =>
        this.mapAggregationRow(row as unknown as HealthDataAggregationRow),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取成员的健康数据列表
   *
   * @param memberId - 成员ID
   * @param filter - 可选的查询过滤器
   * @returns 成员健康数据
   * @throws {RepositoryError} 当成员不存在或数据库操作失败时
   */
  async getMemberHealthData(
    memberId: string,
    filter?: HealthDataFilter,
  ): Promise<MemberHealthData> {
    try {
      // 首先获取成员基本信息
      const member = await this.getMemberById(memberId);
      if (!member) {
        throw new RepositoryError({
          code: RepositoryErrorCode.NOT_FOUND,
          message: `Member with ID ${memberId} not found`,
          operation: "getMemberHealthData",
          metadata: { memberId },
        });
      }

      // 获取健康数据
      const rows = await this.fetchHealthDataRowsForMembers([memberId], filter);
      const healthData = rows.map((row) => this.mapHealthDataRow(row));

      return {
        memberId: member.id,
        name: member.name,
        avatar: member.avatar ?? undefined,
        healthData,
      };
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError({
        code: RepositoryErrorCode.DATABASE_ERROR,
        message: "Repository.getMemberHealthData failed",
        operation: "getMemberHealthData",
        cause: error,
      });
    }
  }

  /**
   * 批量获取多个成员的健康数据
   *
   * @param memberIds - 成员ID数组
   * @param filter - 可选的查询过滤器
   * @returns 成员健康数据数组
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async getMembersHealthData(
    memberIds: string[],
    filter?: HealthDataFilter,
  ): Promise<MemberHealthData[]> {
    try {
      if (!memberIds.length) {
        return [];
      }

      // 获取成员基本信息
      const { data: members, error: memberError } = await this.client
        .from("family_member")
        .select("id, name, avatar")
        .in("id", memberIds);

      if (memberError) {
        throw this.createRepositoryError("getMembersHealthData", memberError);
      }

      if (!members || members.length === 0) {
        return [];
      }

      // 获取所有成员的健康数据
      const rows = await this.fetchHealthDataRowsForMembers(memberIds, filter);

      // 按成员ID分组健康数据
      const groupedData = new Map<string, HealthData[]>();
      for (const row of rows) {
        const memberId = row.member_id;
        const existingData = groupedData.get(memberId) ?? [];
        existingData.push(this.mapHealthDataRow(row));
        groupedData.set(memberId, existingData);
      }

      // 组装结果
      return members.map((member) => ({
        memberId: member.id,
        name: member.name,
        avatar: member.avatar ?? undefined,
        healthData: groupedData.get(member.id) ?? [],
      }));
    } catch (error) {
      throw this.handleError("getMembersHealthData", error);
    }
  }

  /**
   * 根据ID获取成员信息
   *
   * @param memberId - 成员ID
   * @returns 成员信息或null（如果不存在）
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async getMemberById(
    memberId: string,
  ): Promise<Pick<FamilyMember, "id" | "name" | "avatar"> | null> {
    try {
      const { data, error } = await this.client
        .from("family_member")
        .select("id, name, avatar")
        .eq("id", memberId)
        .maybeSingle();

      if (error) {
        throw this.createRepositoryError("getMemberById", error);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        avatar: data.avatar ?? undefined,
      };
    } catch (error) {
      throw this.handleError("getMemberById", error);
    }
  }

  /**
   * 查询有健康数据的成员
   *
   * @param filter - 查询过滤器
   * @returns 成员列表（包含健康数据）
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async getMembersWithHealthData(
    filter: HealthDataFilter,
  ): Promise<MemberHealthData[]> {
    try {
      // 首先查询有健康数据的成员ID
      const memberIdsQuery = this.client
        .from("health_data")
        .select("member_id");

      // 应用过滤器到成员ID查询
      if (filter.memberId) {
        memberIdsQuery.eq("member_id", filter.memberId);
      }
      if (filter.startDate) {
        memberIdsQuery.gte("measured_at", filter.startDate.toISOString());
      }
      if (filter.endDate) {
        memberIdsQuery.lte("measured_at", filter.endDate.toISOString());
      }

      const { data: memberIdsData, error: memberIdsError } =
        await memberIdsQuery;

      if (memberIdsError) {
        throw this.createRepositoryError(
          "getMembersWithHealthData",
          memberIdsError,
        );
      }

      if (!memberIdsData || memberIdsData.length === 0) {
        return [];
      }

      // 去重获取唯一的成员ID
      const uniqueMemberIds = Array.from(
        new Set(memberIdsData.map((row) => row.member_id).filter(Boolean)),
      ) as string[];

      // 获取成员健康数据
      return this.getMembersHealthData(uniqueMemberIds, filter);
    } catch (error) {
      throw this.handleError("getMembersWithHealthData", error);
    }
  }

  /**
   * 创建排行榜条目
   *
   * @param data - 排行榜条目数据
   * @returns 创建的排行榜条目
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async createLeaderboardEntry(
    data: LeaderboardEntryCreateDTO,
  ): Promise<LeaderboardEntry> {
    try {
      // 计算周期
      const now = new Date();
      const periodStart = now;
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 月底

      const { data: createdData, error } = await this.client
        .from("leaderboard_entry")
        .insert({
          member_id: data.memberId,
          leaderboard_type: data.type,
          rank: data.rank,
          score: data.value, // value 映射到 score
          metadata: data.metadata ?? {},
          calculated_at: now.toISOString(),
          is_anonymous: false,
          show_rank: true,
          percentile: 0,
          period: "MONTHLY", // 默认月度周期
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          total_participants: 0,
          previous_rank: null,
          rank_change: null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`createLeaderboardEntry failed: ${error.message}`);
      }

      if (!createdData) {
        throw new Error("Failed to create leaderboard entry: no data returned");
      }

      return this.mapLeaderboardEntryRow(createdData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 批量创建排行榜条目
   *
   * @param entries - 排行榜条目数据数组
   * @returns 创建的排行榜条目数组
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async createLeaderboardEntries(
    entries: LeaderboardEntryCreateDTO[],
  ): Promise<LeaderboardEntry[]> {
    try {
      if (!entries.length) {
        return [];
      }

      const now = new Date();
      const periodStart = now;
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 月底

      const payload = entries.map((entry) => ({
        member_id: entry.memberId,
        leaderboard_type: entry.type,
        rank: entry.rank,
        score: entry.value, // value 映射到 score
        metadata: entry.metadata ?? {},
        calculated_at: now.toISOString(),
        is_anonymous: false,
        show_rank: true,
        percentile: 0,
        period: "MONTHLY", // 默认月度周期
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        total_participants: 0,
        previous_rank: null,
        rank_change: null,
      }));

      const { data, error } = await this.client
        .from("leaderboard_entry")
        .insert(payload)
        .select();

      if (error) {
        throw new Error(`createLeaderboardEntries failed: ${error.message}`);
      }

      return (data ?? []).map((row) => this.mapLeaderboardEntryRow(row));
    } catch (error) {
      throw error;
    }
  }

  /**
   * 查询排行榜条目
   *
   * @param query - 查询条件
   * @returns 排行榜条目数组
   * @throws {RepositoryError} 当数据库操作失败时
   */
  async getLeaderboardEntries(
    query: LeaderboardEntryQuery,
  ): Promise<LeaderboardEntry[]> {
    try {
      let dbQuery = this.client.from("leaderboard_entry").select(`
          *,
          family_member!inner (id, name, avatar)
        `);

      // 应用基础查询条件
      dbQuery = dbQuery
        .eq("member_id", query.memberId)
        .eq("leaderboard_type", query.type);

      // 应用日期范围
      if (query.startDate) {
        dbQuery = dbQuery.gte("calculated_at", query.startDate.toISOString());
      }
      if (query.endDate) {
        dbQuery = dbQuery.lte("calculated_at", query.endDate.toISOString());
      }

      // 应用数量限制
      if (query.limit && query.limit > 0) {
        dbQuery = dbQuery.limit(query.limit);
      }

      // 按计算时间降序排列
      dbQuery = dbQuery.order("calculated_at", { ascending: false });

      const { data, error } = await dbQuery;

      if (error) {
        throw this.createRepositoryError("getLeaderboardEntries", error);
      }

      return (data ?? []).map((row) => this.mapLeaderboardEntryRow(row));
    } catch (error) {
      throw this.handleError("getLeaderboardEntries", error);
    }
  }

  async getLatestLeaderboardEntry(
    query: Omit<LeaderboardEntryQuery, "startDate" | "endDate">,
  ): Promise<LeaderboardEntry | null> {
    try {
      const { data, error } = await this.client
        .from("leaderboard_entry")
        .select(
          `
          *,
          family_member!inner (id, name, avatar)
        `,
        )
        .eq("member_id", query.memberId)
        .eq("leaderboard_type", query.type)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // PGRST116 表示未找到记录，返回null而不是抛出错误
        if (error.code === "PGRST116" || error.code === "PGRST404") {
          return null;
        }
        throw this.createRepositoryError("getLatestLeaderboardEntry", error);
      }

      if (!data) {
        return null;
      }

      return this.mapLeaderboardEntryRow(data);
    } catch (error) {
      throw this.handleError("getLatestLeaderboardEntry", error);
    }
  }

  async getRankingHistory(
    memberId: string,
    type: LeaderboardType,
    days?: number,
  ): Promise<LeaderboardEntry[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days ?? 30));

      const { data, error } = await this.client
        .from("leaderboard_entry")
        .select(
          `
          *,
          family_member!inner (id, name, avatar)
        `,
        )
        .eq("member_id", memberId)
        .eq("leaderboard_type", type)
        .gte("calculated_at", startDate.toISOString())
        .order("calculated_at", { ascending: false });

      if (error) {
        throw this.createRepositoryError("getRankingHistory", error);
      }

      return (data ?? []).map((row) => this.mapLeaderboardEntryRow(row));
    } catch (error) {
      throw this.handleError("getRankingHistory", error);
    }
  }

  async countMemberHealthData(
    memberId: string,
    filter?: HealthDataFilter,
  ): Promise<number> {
    try {
      let query = this.client
        .from("health_data")
        .select("*", { count: "exact", head: true });

      query = query.eq("member_id", memberId);

      // 应用过滤器
      if (filter) {
        if (filter.memberId) {
          query = query.eq("member_id", filter.memberId);
        }
        if (filter.startDate) {
          query = query.gte("measured_at", filter.startDate.toISOString());
        }
        if (filter.endDate) {
          query = query.lte("measured_at", filter.endDate.toISOString());
        }
        if (filter.hasWeight) {
          query = query.not("weight", "is", null);
        }
        if (filter.hasHeartRate) {
          query = query.not("heart_rate", "is", null);
        }
        if (filter.hasBloodPressure) {
          query = query
            .not("blood_pressure_systolic", "is", null)
            .not("blood_pressure_diastolic", "is", null);
        }
        if (filter.notesContains) {
          const keyword = filter.notesContains.trim();
          if (keyword) {
            query = query.ilike("notes", `%${keyword}%`);
          }
        }
        if (filter.source) {
          query = query.eq("source", filter.source);
        }
      }

      const { count, error } = await query;

      if (error) {
        throw this.createRepositoryError("countMemberHealthData", error);
      }

      return count ?? 0;
    } catch (error) {
      throw this.handleError("countMemberHealthData", error);
    }
  }

  async calculateCheckinStreakDays(memberId: string): Promise<number> {
    try {
      // 首先检查 tracking_streak 表
      const { data: streakData, error: streakError } = await this.client
        .from("tracking_streak")
        .select("current_streak")
        .eq("member_id", memberId)
        .single();

      if (streakError && streakError.code !== "PGRST116") {
        throw this.createRepositoryError(
          "calculateCheckinStreakDays",
          streakError,
        );
      }

      if (
        streakData &&
        streakData.current_streak !== null &&
        streakData.current_streak !== undefined
      ) {
        // 如果有 tracking_streak 数据，直接使用
        return Number(streakData.current_streak) || 0;
      }

      // 如果没有 tracking_streak 数据，从健康数据计算
      const daysOfHistory = 365; // 计算最近一年的数据

      const { data: healthData, error: healthError } = await this.client
        .from("health_data")
        .select("measured_at")
        .eq("member_id", memberId)
        .gte(
          "measured_at",
          new Date(
            Date.now() - daysOfHistory * 24 * 60 * 60 * 1000,
          ).toISOString(),
        )
        .order("measured_at", { ascending: false });

      if (healthError) {
        throw this.createRepositoryError(
          "calculateCheckinStreakDays",
          healthError,
        );
      }

      if (!healthData || healthData.length === 0) {
        return 0;
      }

      // 从健康数据中计算连续天数
      return this.calculateStreakFromHealthData(
        healthData.map((row) => row.measured_at),
      );
    } catch (error) {
      throw this.handleError("calculateCheckinStreakDays", error);
    }
  }

  // =======================================================================
  // 私有辅助方法
  // =======================================================================

  /**
   * 为多个成员获取健康数据行
   *
   * @param memberIds - 成员ID数组
   * @param filter - 可选的查询过滤器
   * @returns 健康数据行数组
   * @private
   */
  private async fetchHealthDataRowsForMembers(
    memberIds: string[],
    filter?: HealthDataFilter,
  ): Promise<SupabaseHealthDataRow[]> {
    if (!memberIds.length) {
      return [];
    }

    let query = this.client
      .from("health_data")
      .select("*")
      .in("member_id", memberIds)
      .order("measured_at", { ascending: false });

    // 应用过滤器
    if (filter) {
      if (filter.memberId) {
        query = query.eq("member_id", filter.memberId);
      }
      if (filter.startDate) {
        query = query.gte("measured_at", filter.startDate.toISOString());
      }
      if (filter.endDate) {
        query = query.lte("measured_at", filter.endDate.toISOString());
      }
      if (filter.hasWeight) {
        query = query.not("weight", "is", null);
      }
      if (filter.hasHeartRate) {
        query = query.not("heart_rate", "is", null);
      }
      if (filter.hasBloodPressure) {
        query = query
          .not("blood_pressure_systolic", "is", null)
          .not("blood_pressure_diastolic", "is", null);
      }
      if (filter.notesContains) {
        const keyword = filter.notesContains.trim();
        if (keyword) {
          query = query.ilike("notes", `%${keyword}%`);
        }
      }
      if (filter.source) {
        query = query.eq("source", filter.source);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw this.createRepositoryError("fetchHealthDataRowsForMembers", error);
    }

    return (data ?? []) as SupabaseHealthDataRow[];
  }

  /**
   * 将 Supabase 行映射为 LeaderboardEntry 领域对象
   *
   * @param row - Supabase 排行榜条目行
   * @returns LeaderboardEntry 对象
   * @private
   */
  private mapLeaderboardEntryRow(row: any): LeaderboardEntry {
    const calculatedAt = row.calculated_at
      ? new Date(row.calculated_at)
      : new Date();
    const createdAt = row.created_at ? new Date(row.created_at) : calculatedAt;
    const updatedAt = row.updated_at ? new Date(row.updated_at) : createdAt;

    return {
      id: row.id,
      memberId: row.member_id,
      leaderboardType: row.leaderboard_type as LeaderboardType,
      rank: row.rank,
      score: row.score ?? 0,
      metadata: row.metadata ?? {},
      calculatedAt,
      isAnonymous: row.is_anonymous ?? false,
      showRank: row.show_rank ?? true,
      percentile: row.percentile ?? 0,
      period: row.period || "",
      periodStart: row.period_start ? new Date(row.period_start) : null,
      periodEnd: row.period_end ? new Date(row.period_end) : null,
      totalParticipants: row.total_participants ?? 0,
      previousRank: row.previous_rank ?? null,
      rankChange: row.rank_change ?? null,
      createdAt,
      updatedAt,
    };
  }

  /**
   * 从健康数据中计算连续打卡天数
   *
   * @param measuredAts - 测量时间字符串数组
   * @returns 连续打卡天数
   * @private
   */
  private calculateStreakFromHealthData(
    measuredAts: (string | null | undefined)[],
  ): number {
    if (!measuredAts.length) {
      return 0;
    }

    // 将时间字符串转换为日期并去重
    const dates = Array.from(
      new Set(
        measuredAts
          .filter((d): d is string => Boolean(d))
          .map((d) => new Date(d).toISOString().split("T")[0]),
      ),
    );

    if (!dates.length) {
      return 0;
    }

    // 按日期降序排序
    dates.sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let currentDate = today;

    // 检查今天是否有打卡记录
    if (dates[0] !== today) {
      // 今天没有打卡，从昨天开始计算
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      currentDate = yesterday.toISOString().split("T")[0];
    }

    // 计算连续天数
    for (const date of dates) {
      if (date === currentDate) {
        streak++;
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        currentDate = prevDate.toISOString().split("T")[0];
      } else {
        // 日期不连续，停止计算
        break;
      }
    }

    return streak;
  }

  /**
   * 应用健康数据查询过滤器
   *
   * 复用所有 HealthDataFilter 条件，确保不同查询使用一致的过滤行为。
   *
   * @param query - Supabase PostgREST 过滤器构建器
   * @param filter - 可选的过滤器
   * @returns 配置完成的查询构建器
   * @private
   */
  private applyHealthDataFilter(query: any, filter?: HealthDataFilter): any {
    if (!filter) {
      return query;
    }

    if (filter.memberId !== undefined) {
      query = query.eq("member_id", filter.memberId);
    }
    if (filter.startDate !== undefined) {
      query = query.gte("measured_at", filter.startDate.toISOString());
    }
    if (filter.endDate !== undefined) {
      query = query.lte("measured_at", filter.endDate.toISOString());
    }
    if (filter.hasWeight !== undefined) {
      query = query.not("weight", "is", null);
    }
    if (filter.hasHeartRate !== undefined) {
      query = query.not("heart_rate", "is", null);
    }
    if (filter.hasBloodPressure !== undefined) {
      query = query
        .not("blood_pressure_systolic", "is", null)
        .not("blood_pressure_diastolic", "is", null);
    }
    if (filter.notesContains !== undefined && filter.notesContains !== "") {
      const keyword = filter.notesContains.trim();
      if (keyword) {
        query = query.ilike("notes", `%${keyword}%`);
      }
    }
    if (filter.source !== undefined && filter.source !== "") {
      query = query.eq("source", filter.source);
    }

    return query;
  }

  /**
   * 将聚合行映射为领域对象
   *
   * @param row - Supabase 聚合行
   * @returns 健康数据聚合结果
   * @private
   */
  private mapAggregationRow(
    row: HealthDataAggregationRow,
  ): HealthDataAggregationResult {
    return {
      memberId: row.member_id,
      avgWeight: this.parseNumeric(row.avg_weight),
      avgHeartRate: this.parseNumeric(row.avg_heart_rate),
      avgBloodPressureSystolic: this.parseNumeric(
        row.avg_blood_pressure_systolic,
      ),
      avgBloodPressureDiastolic: this.parseNumeric(
        row.avg_blood_pressure_diastolic,
      ),
      dataCount: this.parseNumeric(row.data_count) ?? 0,
    };
  }

  /**
   * 将 Supabase 行映射为 HealthData 领域对象
   *
   * @param row - Supabase 健康数据行
   * @returns HealthData 对象
   * @private
   */
  private mapHealthDataRow(row: SupabaseHealthDataRow): HealthData {
    const measuredAt = row.measured_at
      ? new Date(row.measured_at)
      : row.created_at
        ? new Date(row.created_at)
        : new Date();

    const createdAt = row.created_at ? new Date(row.created_at) : measuredAt;
    const updatedAt = row.updated_at ? new Date(row.updated_at) : createdAt;

    return {
      id: row.id,
      memberId: row.member_id,
      weight: row.weight ?? null,
      bodyFat: row.body_fat ?? null,
      muscleMass: row.muscle_mass ?? null,
      bloodPressureSystolic: row.blood_pressure_systolic ?? null,
      bloodPressureDiastolic: row.blood_pressure_diastolic ?? null,
      heartRate: row.heart_rate ?? null,
      measuredAt,
      source: (row.source ?? "MANUAL") as HealthDataSource,
      notes: row.notes ?? null,
      deviceConnectionId: row.device_connection_id ?? null,
      createdAt,
      updatedAt,
    };
  }

  /**
   * 将字符串或数字解析为数字类型
   *
   * @param value - 要解析的值
   * @returns 解析后的数字或 undefined
   * @private
   */
  private parseNumeric(value?: string | number | null): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const parsed = typeof value === "string" ? Number(value) : value;

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  /**
   * 创建 RepositoryError 实例
   *
   * @param operation - 操作名称
   * @param error - Supabase 错误
   * @returns RepositoryError
   * @private
   */
  private createRepositoryError(
    operation: string,
    error: any,
  ): RepositoryError {
    return RepositoryError.fromSupabaseError(
      operation,
      error,
      RepositoryErrorCode.DATABASE_ERROR,
    );
  }

  /**
   * 统一错误处理
   *
   * @param operation - 操作名称
   * @param error - 错误对象
   * @throws {RepositoryError}
   * @private
   */
  private handleError(operation: string, error: unknown): never {
    // 如果已经是 RepositoryError，直接抛出
    if (error instanceof RepositoryError) {
      throw error;
    }

    // 创建并抛出新的 RepositoryError
    throw new RepositoryError({
      code: RepositoryErrorCode.DATABASE_ERROR,
      message: `LeaderboardRepository.${operation} failed`,
      operation,
      cause: error,
    });
  }
}
