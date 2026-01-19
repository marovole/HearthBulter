import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  LEADERBOARD_TYPE_CONFIGS,
  LeaderboardType,
} from "@/types/social-sharing";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export interface LeaderboardItem {
  rank: number;
  memberId: string;
  memberName: string;
  avatar?: string;
  value: number;
  displayValue: string;
  change: "up" | "down" | "same" | "new";
  changeValue?: number;
  metadata?: Record<string, unknown>;
}

export interface LeaderboardResult {
  type: LeaderboardType;
  title: string;
  description: string;
  unit: string;
  timeframe: string;
  totalUsers: number;
  data: LeaderboardItem[];
  lastUpdated: Date;
  userRank?: LeaderboardItem;
}

export interface LeaderboardEntryRecord {
  id: string;
  memberId: string;
  leaderboardType: LeaderboardType;
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
  metadata?: Record<string, unknown>;
  calculatedAt: number;
  createdAt: number;
  updatedAt: number;
}

export class LeaderboardService {
  private static instance: LeaderboardService;
  private cache = new Map<string, { data: LeaderboardResult; expiry: Date }>();
  private readonly CACHE_TTL = 30 * 60 * 1000;

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  async getLeaderboard(
    type: LeaderboardType,
    memberId?: string,
    timeframe: "daily" | "weekly" | "monthly" | "all-time" = "weekly",
    limit: number = 50,
  ): Promise<LeaderboardResult> {
    const cacheKey = `${type}_${timeframe}_${limit}_${memberId || "all"}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }

    let result: LeaderboardResult;

    switch (type) {
    case LeaderboardType.HEALTH_SCORE:
      result = await this.calculateHealthScoreLeaderboard(
        memberId,
        timeframe,
        limit,
      );
      break;
    case LeaderboardType.CHECK_IN_STREAK:
      result = await this.calculateCheckinStreakLeaderboard(memberId, limit);
      break;
    case LeaderboardType.WEIGHT_LOSS:
      result = await this.calculateWeightLossLeaderboard(
        memberId,
        timeframe,
        limit,
      );
      break;
    case LeaderboardType.EXERCISE_MINUTES:
      result = await this.calculateExerciseMinutesLeaderboard(
        memberId,
        timeframe,
        limit,
      );
      break;
    case LeaderboardType.NUTRITION_SCORE:
      result = await this.calculateCaloriesManagementLeaderboard(
        memberId,
        timeframe,
        limit,
      );
      break;
    default:
      throw new Error(`不支持的排行榜类型: ${type}`);
    }

    this.cache.set(cacheKey, {
      data: result,
      expiry: new Date(Date.now() + this.CACHE_TTL),
    });

    return result;
  }

  private async calculateHealthScoreLeaderboard(
    memberId?: string,
    timeframe: "daily" | "weekly" | "monthly" | "all-time" = "weekly",
    limit: number = 50,
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.HEALTH_SCORE];

    const healthScores = await convexClient.query<
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
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });

    const scoredMembers = healthScores.map((score) => {
      const healthScore = this.calculateHealthScore({
        avgWeight: score.avgWeight,
        avgHeartRate: score.avgHeartRate,
        avgBloodPressureSystolic: score.avgBloodPressureSystolic,
        avgBloodPressureDiastolic: score.avgBloodPressureDiastolic,
        dataCount: score.dataCount,
      });

      return {
        memberId: score.memberId,
        memberName: score.memberName,
        avatar: score.avatar,
        value: healthScore,
        metadata: {
          dataCount: score.dataCount,
          avgWeight: score.avgWeight,
        },
      };
    });

    scoredMembers.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      scoredMembers.slice(0, limit),
      LeaderboardType.HEALTH_SCORE,
      memberId,
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.HEALTH_SCORE,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find((item) => item.memberId === memberId),
    };

    return result;
  }

  private async calculateCheckinStreakLeaderboard(
    memberId?: string,
    limit: number = 50,
  ): Promise<LeaderboardResult> {
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.CHECK_IN_STREAK];
    const startDate = subDays(new Date(), 365).getTime();

    const membersWithStreaks = await convexClient.query<
      Array<{
        memberId: string;
        memberName: string;
        avatar?: string;
        streakDays: number;
        dataCount: number;
      }>
    >(api.leaderboards.getCheckinStreakCandidates, { startDate });

    const entries = membersWithStreaks.map((member) => ({
      memberId: member.memberId,
      memberName: member.memberName,
      avatar: member.avatar,
      value: member.streakDays,
      metadata: {
        totalDataPoints: member.dataCount,
      },
    }));

    entries.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      entries.slice(0, limit),
      LeaderboardType.CHECK_IN_STREAK,
      memberId,
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.CHECK_IN_STREAK,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: "全部时间",
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find((item) => item.memberId === memberId),
    };

    return result;
  }

  private async calculateWeightLossLeaderboard(
    memberId?: string,
    timeframe: "daily" | "weekly" | "monthly" | "all-time" = "monthly",
    limit: number = 50,
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.WEIGHT_LOSS];

    const candidates = await convexClient.query<
      Array<{
        memberId: string;
        memberName: string;
        avatar?: string;
        weightLoss: number;
        initialWeight: number | null;
        currentWeight: number | null;
        dataPoints: number;
      }>
    >(api.leaderboards.getWeightLossCandidates, {
      startDate: subDays(startDate, 30).getTime(),
      endDate: endDate.getTime(),
    });

    const membersWithWeightLoss = candidates.map((member) => ({
      memberId: member.memberId,
      memberName: member.memberName,
      avatar: member.avatar,
      value: member.weightLoss,
      metadata: {
        initialWeight: member.initialWeight,
        currentWeight: member.currentWeight,
        dataPoints: member.dataPoints,
      },
    }));

    membersWithWeightLoss.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      membersWithWeightLoss.slice(0, limit),
      LeaderboardType.WEIGHT_LOSS,
      memberId,
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.WEIGHT_LOSS,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find((item) => item.memberId === memberId),
    };

    return result;
  }

  private async calculateExerciseMinutesLeaderboard(
    memberId?: string,
    timeframe: "daily" | "weekly" | "monthly" | "all-time" = "weekly",
    limit: number = 50,
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.EXERCISE_MINUTES];

    const candidates = await convexClient.query<
      Array<{
        memberId: string;
        memberName: string;
        avatar?: string;
        exerciseMinutes: number;
        exerciseCount: number;
      }>
    >(api.leaderboards.getExerciseMinutesCandidates, {
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });

    const membersWithExercise = candidates.map((member) => ({
      memberId: member.memberId,
      memberName: member.memberName,
      avatar: member.avatar,
      value: member.exerciseMinutes,
      metadata: {
        exerciseCount: member.exerciseCount,
      },
    }));

    membersWithExercise.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      membersWithExercise.slice(0, limit),
      LeaderboardType.EXERCISE_MINUTES,
      memberId,
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.EXERCISE_MINUTES,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find((item) => item.memberId === memberId),
    };

    return result;
  }

  private async calculateCaloriesManagementLeaderboard(
    memberId?: string,
    timeframe: "daily" | "weekly" | "monthly" | "all-time" = "monthly",
    limit: number = 50,
  ): Promise<LeaderboardResult> {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    const config = LEADERBOARD_TYPE_CONFIGS[LeaderboardType.NUTRITION_SCORE];

    const candidates = await convexClient.query<
      Array<{
        memberId: string;
        memberName: string;
        avatar?: string;
        accuracy: number;
        calorieGoal: number;
        dataDays: number;
        accurateDays: number;
      }>
    >(api.leaderboards.getNutritionScoreCandidates, {
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });

    const membersWithCalorieAccuracy = candidates.map((member) => ({
      memberId: member.memberId,
      memberName: member.memberName,
      avatar: member.avatar,
      value: member.accuracy,
      metadata: {
        calorieGoal: member.calorieGoal,
        dataDays: member.dataDays,
        accurateDays: member.accurateDays,
      },
    }));

    membersWithCalorieAccuracy.sort((a, b) => b.value - a.value);

    const leaderboardItems = await this.convertToLeaderboardItems(
      membersWithCalorieAccuracy.slice(0, limit),
      LeaderboardType.NUTRITION_SCORE,
      memberId,
    );

    const result: LeaderboardResult = {
      type: LeaderboardType.NUTRITION_SCORE,
      title: config.label,
      description: config.description,
      unit: config.unit,
      timeframe: this.getTimeframeDisplay(timeframe),
      totalUsers: leaderboardItems.length,
      data: leaderboardItems,
      lastUpdated: new Date(),
      userRank: leaderboardItems.find((item) => item.memberId === memberId),
    };

    return result;
  }

  private async convertToLeaderboardItems(
    members: Array<{
      memberId: string;
      memberName: string;
      avatar?: string;
      value: number;
      metadata?: Record<string, unknown>;
    }>,
    type: LeaderboardType,
    currentMemberId?: string,
  ): Promise<LeaderboardItem[]> {
    const items: LeaderboardItem[] = [];

    for (const [index, member] of members.entries()) {
      const rank = index + 1;
      const change = await this.calculateRankChange(
        member.memberId,
        type,
        rank,
      );

      items.push({
        rank,
        memberId: member.memberId,
        memberName: member.memberName,
        avatar: member.avatar,
        value: member.value,
        displayValue: this.formatDisplayValue(
          type,
          member.value,
          member.metadata,
        ),
        change: change.change,
        changeValue: change.changeValue,
        metadata: member.metadata,
      });
    }

    return items;
  }

  private async calculateRankChange(
    memberId: string,
    type: LeaderboardType,
    currentRank: number,
  ): Promise<{ change: "up" | "down" | "same" | "new"; changeValue?: number }> {
    const lastRanking = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.leaderboards.getLatestEntry, {
      memberId: memberId as Id<"familyMembers">,
      type,
      sinceDate: subDays(new Date(), 7).getTime(),
    });

    if (!lastRanking) {
      return { change: "new" };
    }

    const rankDiff = (lastRanking.rank as number) - currentRank;

    if (rankDiff > 0) {
      return { change: "up", changeValue: rankDiff };
    } else if (rankDiff < 0) {
      return { change: "down", changeValue: Math.abs(rankDiff) };
    }
    return { change: "same" };
  }

  private formatDisplayValue(
    type: LeaderboardType,
    value: number,
    _metadata?: any,
  ): string {
    switch (type) {
    case LeaderboardType.HEALTH_SCORE:
      return `${value}分`;
    case LeaderboardType.CHECK_IN_STREAK:
      return `${value}天`;
    case LeaderboardType.WEIGHT_LOSS:
      return `${value}kg`;
    case LeaderboardType.EXERCISE_MINUTES:
      return `${value}分钟`;
    case LeaderboardType.NUTRITION_SCORE:
      return `${value}%`;
    default:
      return value.toString();
    }
  }

  private getTimeframeDates(
    timeframe: "daily" | "weekly" | "monthly" | "all-time",
  ): { startDate: Date; endDate: Date } {
    const endDate = endOfDay(new Date());
    let startDate: Date;

    switch (timeframe) {
    case "daily":
      startDate = startOfDay(new Date());
      break;
    case "weekly":
      startDate = subDays(endDate, 7);
      break;
    case "monthly":
      startDate = subDays(endDate, 30);
      break;
    case "all-time":
      startDate = new Date(2020, 0, 1);
      break;
    default:
      startDate = subDays(endDate, 7);
    }

    return { startDate, endDate };
  }

  private getTimeframeDisplay(
    timeframe: "daily" | "weekly" | "monthly" | "all-time",
  ): string {
    switch (timeframe) {
    case "daily":
      return "今日";
    case "weekly":
      return "本周";
    case "monthly":
      return "本月";
    case "all-time":
      return "全部时间";
    default:
      return "本周";
    }
  }

  private calculateHealthScore(data: {
    avgWeight: number;
    avgHeartRate: number;
    avgBloodPressureSystolic: number;
    avgBloodPressureDiastolic: number;
    dataCount: number;
  }): number {
    let score = 50;

    if (data.avgWeight > 40 && data.avgWeight < 100) {
      score += 15;
    }

    if (data.avgHeartRate > 60 && data.avgHeartRate < 100) {
      score += 12.5;
    }

    if (
      data.avgBloodPressureSystolic >= 90 &&
      data.avgBloodPressureSystolic <= 120 &&
      data.avgBloodPressureDiastolic >= 60 &&
      data.avgBloodPressureDiastolic <= 80
    ) {
      score += 12.5;
    }

    if (data.dataCount >= 7) {
      score += 10;
    }
    if (data.dataCount >= 15) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }

  async saveLeaderboardEntry(
    memberId: string,
    type: LeaderboardType,
    rank: number,
    value: number,
    metadata?: any,
  ): Promise<LeaderboardEntryRecord> {
    const { startDate, endDate } = this.getTimeframeDates("weekly");
    const entryId = await convexClient.mutation<string>(
      api.leaderboards.createEntry,
      {
        memberId: memberId as Id<"familyMembers">,
        leaderboardType: type,
        period: "weekly",
        periodStart: startDate.getTime(),
        periodEnd: endDate.getTime(),
        score: value,
        rank,
        previousRank: undefined,
        rankChange: undefined,
        totalParticipants: 0,
        percentile: undefined,
        isAnonymous: false,
        showRank: true,
        metadata: metadata ?? {},
        calculatedAt: Date.now(),
      },
    );

    const entry = await convexClient.query<Record<string, unknown> | null>(
      api.leaderboards.getEntryById,
      { id: entryId as Id<"leaderboardEntries"> },
    );

    if (!entry) {
      throw new Error("排行榜记录创建失败");
    }

    return this.normalizeEntry(entry);
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getRankingHistory(
    memberId: string,
    type: LeaderboardType,
    days: number = 30,
  ): Promise<LeaderboardEntryRecord[]> {
    const startDate = subDays(new Date(), days).getTime();

    const entries = await convexClient.query<Array<Record<string, unknown>>>(
      api.leaderboards.listRankingHistory,
      {
        memberId: memberId as Id<"familyMembers">,
        type,
        sinceDate: startDate,
        limit: days,
      },
    );

    return entries.map((entry) => this.normalizeEntry(entry));
  }

  getLeaderboardConfig(type: LeaderboardType): any {
    return LEADERBOARD_TYPE_CONFIGS[type];
  }

  getAvailableLeaderboards(): LeaderboardType[] {
    return Object.values(LeaderboardType);
  }

  private normalizeEntry(
    record: Record<string, unknown>,
  ): LeaderboardEntryRecord {
    return {
      id: record._id as string,
      memberId: record.memberId as string,
      leaderboardType: record.leaderboardType as LeaderboardType,
      period: record.period as string,
      periodStart: record.periodStart as number,
      periodEnd: record.periodEnd as number,
      score: record.score as number,
      rank: record.rank as number,
      previousRank: record.previousRank as number | undefined,
      rankChange: record.rankChange as number | undefined,
      totalParticipants: record.totalParticipants as number,
      percentile: record.percentile as number | undefined,
      isAnonymous: record.isAnonymous as boolean,
      showRank: record.showRank as boolean,
      metadata: record.metadata as Record<string, unknown> | undefined,
      calculatedAt: record.calculatedAt as number,
      createdAt: record.createdAt as number,
      updatedAt: record.updatedAt as number,
    };
  }
}

export const leaderboardService = LeaderboardService.getInstance();

export async function getLeaderboard(
  type: LeaderboardType,
  memberId?: string,
  timeframe?: "daily" | "weekly" | "monthly" | "all-time",
  limit?: number,
): Promise<LeaderboardResult> {
  const service = LeaderboardService.getInstance();
  return service.getLeaderboard(type, memberId, timeframe, limit);
}

export async function getUserRankingHistory(
  memberId: string,
  type: LeaderboardType,
  days?: number,
): Promise<LeaderboardEntryRecord[]> {
  const service = LeaderboardService.getInstance();
  return service.getRankingHistory(memberId, type, days);
}

export async function saveUserRanking(
  memberId: string,
  type: LeaderboardType,
  rank: number,
  value: number,
  metadata?: any,
): Promise<LeaderboardEntryRecord> {
  const service = LeaderboardService.getInstance();
  return service.saveLeaderboardEntry(memberId, type, rank, value, metadata);
}
