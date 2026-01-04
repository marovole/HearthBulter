/**
 * Leaderboard Repository 接口
 *
 * 定义排行榜系统的数据访问层接口，抽象所有数据库操作。
 * 实现可以是 SupabaseLeaderboardRepository 或 PrismaLeaderboardRepository。
 *
 * @module leaderboard-repository-interface
 */

import type {
  LeaderboardEntry,
  LeaderboardType,
  FamilyMember,
  LeaderboardEntryData,
  HealthData,
} from "@prisma/client";

/**
 * 健康数据聚合结果
 */
export interface HealthDataAggregationResult {
  memberId: string;
  avgWeight?: number;
  avgHeartRate?: number;
  avgBloodPressureSystolic?: number;
  avgBloodPressureDiastolic?: number;
  dataCount: number;
}

/**
 * 成员健康数据
 */
export interface MemberHealthData {
  memberId: string;
  name: string;
  avatar?: string;
  healthData: HealthData[];
}

/**
 * 排行榜条目查询条件
 */
export interface LeaderboardEntryQuery {
  memberId: string;
  type: LeaderboardType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * 排行榜条目创建数据
 */
export interface LeaderboardEntryCreateDTO {
  memberId: string;
  type: LeaderboardType;
  rank: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Health Data 查询过滤器
 */
export interface HealthDataFilter {
  memberId?: string;
  startDate?: Date;
  endDate?: Date;
  hasWeight?: boolean;
  hasHeartRate?: boolean;
  hasBloodPressure?: boolean;
  notesContains?: string;
  source?: string;
}

/**
 * Leaderboard Repository 接口
 *
 * 提供排行榜系统的所有数据访问方法
 */
export interface LeaderboardRepository {
  // ========================================================================
  // Health Data 聚合查询
  // ========================================================================

  /**
   * 聚合健康数据，按成员分组计算平均值和计数
   *
   * @param filter - 查询过滤器
   * @returns 聚合结果数组
   */
  aggregateHealthDataByMember(
    filter: HealthDataFilter,
  ): Promise<HealthDataAggregationResult[]>;

  /**
   * 获取成员的健康数据列表
   *
   * @param memberId - 成员ID
   * @param filter - 可选的查询过滤器
   * @returns 成员健康数据
   */
  getMemberHealthData(
    memberId: string,
    filter?: HealthDataFilter,
  ): Promise<MemberHealthData>;

  /**
   * 批量获取多个成员的健康数据
   *
   * @param memberIds - 成员ID数组
   * @param filter - 可选的查询过滤器
   * @returns 成员健康数据数组
   */
  getMembersHealthData(
    memberIds: string[],
    filter?: HealthDataFilter,
  ): Promise<MemberHealthData[]>;

  // ========================================================================
  // Family Member 查询
  // ========================================================================

  /**
   * 根据ID获取成员信息
   *
   * @param memberId - 成员ID
   * @returns 成员信息（仅包含必要字段）
   */
  getMemberById(
    memberId: string,
  ): Promise<Pick<FamilyMember, "id" | "name" | "avatar"> | null>;

  /**
   * 查询有健康数据的成员
   *
   * @param filter - 查询过滤器
   * @returns 成员列表（包含健康数据）
   */
  getMembersWithHealthData(
    filter: HealthDataFilter,
  ): Promise<MemberHealthData[]>;

  // ========================================================================
  // Leaderboard Entry 操作
  // ========================================================================

  /**
   * 创建排行榜条目
   *
   * @param data - 排行榜条目数据
   * @returns 创建的排行榜条目
   */
  createLeaderboardEntry(
    data: LeaderboardEntryCreateDTO,
  ): Promise<LeaderboardEntry>;

  /**
   * 批量创建排行榜条目
   *
   * @param entries - 排行榜条目数据数组
   * @returns 创建的排行榜条目数组
   */
  createLeaderboardEntries(
    entries: LeaderboardEntryCreateDTO[],
  ): Promise<LeaderboardEntry[]>;

  /**
   * 查询排行榜条目
   *
   * @param query - 查询条件
   * @returns 排行榜条目数组
   */
  getLeaderboardEntries(
    query: LeaderboardEntryQuery,
  ): Promise<LeaderboardEntry[]>;

  /**
   * 获取最新的排行榜条目
   *
   * @param query - 查询条件（不包含日期范围）
   * @returns 最新的排行榜条目或null
   */
  getLatestLeaderboardEntry(
    query: Omit<LeaderboardEntryQuery, "startDate" | "endDate">,
  ): Promise<LeaderboardEntry | null>;

  /**
   * 获取排行榜历史
   *
   * @param memberId - 成员ID
   * @param type - 排行榜类型
   * @param days - 历史天数（默认30天）
   * @returns 历史排行榜条目数组
   */
  getRankingHistory(
    memberId: string,
    type: LeaderboardType,
    days?: number,
  ): Promise<LeaderboardEntry[]>;

  // ========================================================================
  // 数据统计
  // ========================================================================

  /**
   * 统计成员的总数据点数
   *
   * @param memberId - 成员ID
   * @param filter - 可选的查询过滤器
   * @returns 数据点数
   */
  countMemberHealthData(
    memberId: string,
    filter?: HealthDataFilter,
  ): Promise<number>;

  /**
   * 计算连续打卡天数
   *
   * @param memberId - 成员ID
   * @returns 连续打卡天数
   */
  calculateCheckinStreakDays(memberId: string): Promise<number>;
}
