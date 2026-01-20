// @ts-nocheck - Pending type definitions migration
/**
 * Neon 分析 Repository 实现
 *
 * 基于 Neon PostgreSQL + neonAdapter 实现分析报告系统的数据访问层
 *
 * @module neon-analytics-repository
 */

import { neonAdapter } from "@/lib/db/neon-adapter";
import type {
  AnalyticsRepository,
  MemberHealthContext,
  HealthAdviceInput,
  SavedHealthAdvice,
  MemberHealthHistory,
  ConversationInput,
  SavedConversation,
} from "../interfaces/analytics-repository";
import type {
  AnomalyDTO,
  MemberProfileDTO,
  ReportSnapshotDTO,
  ReportSummaryDTO,
  TimeSeriesPointDTO,
  TrendQueryDTO,
  TrendSeriesDTO,
} from "../types/analytics";
import type { DateRangeFilter, PaginatedResult, PaginationInput } from "../types/common";

interface FamilyMemberRow {
  id: string;
  familyId: string;
  name: string;
  gender: string | null;
  birthDate: string;
  height: number | null;
  weight: number | null;
  avatar: string | null;
}

interface MealRecordRow {
  recordedAt: string;
  totalCalories: number | null;
  totalProtein: number | null;
  totalCarbs: number | null;
  totalFat: number | null;
}

interface HealthDataRow {
  measuredAt: string;
  weight: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  bloodPressureSystolic: number | null;
  heartRate: number | null;
}

interface HealthAnomalyRow {
  id: string;
  memberId: string;
  title: string;
  description: string | null;
  severity: string;
  detectedAt: string;
}

interface HealthScoreRow {
  date: string;
  overallScore: number | null;
}

interface ReportSnapshotRow {
  id: string;
  memberId: string;
  period: Record<string, unknown>;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export class NeonAnalyticsRepository implements AnalyticsRepository {
  private readonly loggerPrefix = "[NeonAnalyticsRepository]";

  async getMemberProfile(memberId: string): Promise<MemberProfileDTO | null> {
    const data = await neonAdapter.familyMember.findUnique<FamilyMemberRow>({
      where: { id: memberId },
    });

    return data ? this.mapMemberRow(data) : null;
  }

  async aggregateMealLogs(
    memberId: string,
    range: DateRangeFilter
  ): Promise<{ totalDays: number; dataCompleteDays: number }> {
    const data = await neonAdapter.mealLog.findMany<{ recordedAt: string }>({
      where: { memberId },
    });

    const filteredData = data.filter((row) => {
      const date = new Date(row.recordedAt);
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;
      return true;
    });

    const uniqueDays = new Set(filteredData.map((row) => row.recordedAt?.split("T")[0]));

    const totalDays =
      range.start && range.end
        ? Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
        : uniqueDays.size;

    return {
      totalDays,
      dataCompleteDays: uniqueDays.size,
    };
  }

  async fetchTrendSeries(queryInput: TrendQueryDTO): Promise<TrendSeriesDTO> {
    const points = await this.fetchTrendPoints(queryInput);
    const statistics = this.computeStatistics(points);

    return {
      metric: queryInput.metric,
      points,
      statistics,
    };
  }

  async listAnomalies(memberId: string, range: DateRangeFilter, limit = 10): Promise<AnomalyDTO[]> {
    const data = await neonAdapter.healthAnomaly.findMany<HealthAnomalyRow>({
      where: { memberId },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });

    const filteredData = data.filter((row) => {
      const date = new Date(row.detectedAt);
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;
      return true;
    });

    return filteredData.map((row) => this.mapAnomalyRow(row));
  }

  async getReportSummary(
    memberId: string,
    period: ReportSummaryDTO["period"]
  ): Promise<ReportSummaryDTO> {
    const member = await this.getMemberProfile(memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    const range: DateRangeFilter = {
      start: period.startDate,
      end: period.endDate,
    };

    const [aggregation, trends, anomalies] = await Promise.all([
      this.aggregateMealLogs(memberId, range),
      this.fetchTrendSeries({ memberId, metric: "HEALTH_SCORE", range }),
      this.listAnomalies(memberId, range, 5),
    ]);

    return {
      member,
      period,
      totalDays: aggregation.totalDays,
      dataCompleteDays: aggregation.dataCompleteDays,
      averageScore: trends.statistics.mean,
      achievements: this.deriveAchievements(trends.points),
      concerns: this.deriveConcerns(trends.points),
      recommendations: this.deriveRecommendations(trends.points),
      anomalies,
    };
  }

  async saveReportSnapshot(snapshot: ReportSnapshotDTO): Promise<void> {
    await neonAdapter.healthReport.create({
      data: {
        id: snapshot.id,
        memberId: snapshot.memberId,
        period: snapshot.period,
        payload: snapshot.payload,
        status: snapshot.status,
      },
    });
  }

  async listReportSnapshots(
    memberId: string,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ReportSnapshotDTO>> {
    const data = await neonAdapter.healthReport.findMany<ReportSnapshotRow>({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: pagination?.limit,
      skip: pagination?.offset,
    });

    const total = await neonAdapter.healthReport.count({ where: { memberId } });

    const items = data.map((row) => this.mapSnapshotRow(row));
    return {
      items,
      total,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < total : false,
    };
  }

  private async fetchTrendPoints(query: TrendQueryDTO): Promise<TimeSeriesPointDTO[]> {
    switch (query.metric) {
      case "CALORIES":
      case "PROTEIN":
      case "CARBS":
      case "FAT":
        return this.fetchNutritionTrend(query);
      case "HEALTH_SCORE":
        return this.fetchScoreTrend(query);
      default:
        return this.fetchHealthMetricTrend(query);
    }
  }

  private async fetchNutritionTrend(query: TrendQueryDTO): Promise<TimeSeriesPointDTO[]> {
    const data = await neonAdapter.mealLog.findMany<MealRecordRow>({
      where: { memberId: query.memberId },
      orderBy: { recordedAt: "asc" },
    });

    const filteredData = data.filter((row) => {
      const date = new Date(row.recordedAt);
      if (query.range.start && date < query.range.start) return false;
      if (query.range.end && date > query.range.end) return false;
      return true;
    });

    const fieldMap: Record<string, keyof MealRecordRow> = {
      CALORIES: "totalCalories",
      PROTEIN: "totalProtein",
      CARBS: "totalCarbs",
      FAT: "totalFat",
    };

    const field = fieldMap[query.metric];
    if (!field) return [];

    const dailyMap = new Map<string, number>();
    for (const row of filteredData) {
      if (!row.recordedAt) continue;
      const dateKey = row.recordedAt.split("T")[0] ?? "";
      const value = (row[field] as number | null) ?? 0;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + value);
    }

    return Array.from(dailyMap.entries()).map(([date, value]) => ({
      date: new Date(date),
      value,
    }));
  }

  private async fetchScoreTrend(query: TrendQueryDTO): Promise<TimeSeriesPointDTO[]> {
    const data = await neonAdapter.healthScore.findMany<HealthScoreRow>({
      where: { memberId: query.memberId },
      orderBy: { date: "asc" },
    });

    const filteredData = data.filter((row) => {
      const date = new Date(row.date);
      if (query.range.start && date < query.range.start) return false;
      if (query.range.end && date > query.range.end) return false;
      return true;
    });

    return filteredData.map((row) => ({
      date: new Date(row.date),
      value: row.overallScore ?? 0,
    }));
  }

  private async fetchHealthMetricTrend(query: TrendQueryDTO): Promise<TimeSeriesPointDTO[]> {
    const data = await neonAdapter.healthData.findMany<HealthDataRow>({
      where: { memberId: query.memberId },
      orderBy: { measuredAt: "asc" },
    });

    const filteredData = data.filter((row) => {
      const date = new Date(row.measuredAt);
      if (query.range.start && date < query.range.start) return false;
      if (query.range.end && date > query.range.end) return false;
      return true;
    });

    const fieldMap: Record<string, keyof HealthDataRow> = {
      WEIGHT: "weight",
      BODY_FAT: "bodyFat",
      MUSCLE_MASS: "muscleMass",
      BLOOD_PRESSURE: "bloodPressureSystolic",
      HEART_RATE: "heartRate",
    };

    const field = fieldMap[query.metric];
    if (!field) return [];

    return filteredData
      .filter((row) => row.measuredAt)
      .map((row) => ({
        date: new Date(row.measuredAt),
        value: (row[field] as number | null) ?? 0,
      }));
  }

  private computeStatistics(points: TimeSeriesPointDTO[]) {
    if (!points.length) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }

    const values = points.map((p) => p.value).sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const middleIndex = Math.floor(values.length / 2);
    const median =
      values.length % 2 === 0
        ? ((values[values.length / 2 - 1] ?? 0) + (values[values.length / 2] ?? 0)) / 2
        : (values[middleIndex] ?? 0);
    const min = values[0] ?? 0;
    const max = values[values.length - 1] ?? min;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, min, max, stdDev };
  }

  private deriveAchievements(points: TimeSeriesPointDTO[]): string[] {
    if (!points.length) return ["完成健康数据记录是迈出的第一步"];
    const latest = points[points.length - 1];
    if (!latest) {
      return ["完成健康数据记录是迈出的第一步"];
    }
    if (latest.value >= 85) {
      return ["健康评分保持在优秀范围，继续保持当前习惯"];
    }
    return ["完成了本周期的健康数据记录"];
  }

  private deriveConcerns(points: TimeSeriesPointDTO[]): string[] {
    if (!points.length) return [];
    const trend = points.slice(-5);
    const falling = trend.every((point, index, arr) => {
      if (index === 0) return true;
      const previous = arr[index - 1];
      return previous ? point.value <= previous.value : true;
    });
    if (falling) {
      return ["近期健康评分持续下降，请关注饮食与运动平衡"];
    }
    return [];
  }

  private deriveRecommendations(points: TimeSeriesPointDTO[]): string[] {
    if (!points.length) return ["继续记录健康数据以便模型学习您的状态"];
    const mean = this.computeStatistics(points).mean;
    if (mean < 70) {
      return ["建议增加适度运动并保持规律作息"];
    }
    return ["保持当前习惯，同时继续追踪趋势变化"];
  }

  private mapMemberRow(row: FamilyMemberRow): MemberProfileDTO {
    return {
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      gender: row.gender ?? null,
      birthDate: new Date(row.birthDate),
      height: row.height ?? null,
      weight: row.weight ?? null,
      avatar: row.avatar ?? null,
    };
  }

  private mapAnomalyRow(row: HealthAnomalyRow): AnomalyDTO {
    return {
      id: row.id,
      memberId: row.memberId,
      title: row.title,
      description: row.description ?? "",
      severity: row.severity as AnomalyDTO["severity"],
      detectedAt: new Date(row.detectedAt),
    };
  }

  private mapSnapshotRow(row: ReportSnapshotRow): ReportSnapshotDTO {
    return {
      id: row.id,
      memberId: row.memberId,
      period: row.period as ReportSnapshotDTO["period"],
      payload: row.payload as ReportSnapshotDTO["payload"],
      status: row.status as ReportSnapshotDTO["status"],
      createdAt: new Date(row.createdAt),
    };
  }

  async getMemberHealthContext(
    memberId: string,
    options?: {
      healthDataLimit?: number;
      medicalReportsLimit?: number;
    }
  ): Promise<MemberHealthContext | null> {
    const healthDataLimit = options?.healthDataLimit ?? 30;
    const medicalReportsLimit = options?.medicalReportsLimit ?? 5;

    const member = (await neonAdapter.familyMember.findUnique({
      where: { id: memberId },
    })) as {
      id: string;
      familyId: string;
      userId: string;
      name: string;
      gender: string;
      birthDate: Date;
      height: number | null;
      weight: number | null;
      bmi: number | null;
    } | null;

    if (!member) return null;

    const [healthGoals, allergies, dietaryPreference, healthData, medicalReports] =
      await Promise.all([
        neonAdapter.healthGoal.findMany({
          where: { memberId, deletedAt: null },
        }) as Promise<
          Array<{
            id: string;
            goalType: string;
            targetWeight: number | null;
            status: string;
          }>
        >,
        neonAdapter.allergy.findMany({
          where: { memberId, deletedAt: null },
        }) as Promise<
          Array<{
            id: string;
            allergenName: string;
            severity: string;
          }>
        >,
        neonAdapter.dietaryPreference.findFirst({
          where: { memberId, deletedAt: null },
        }) as Promise<{
          dietType: string;
          isVegetarian: boolean;
          isVegan: boolean;
        } | null>,
        neonAdapter.healthData.findMany({
          where: { memberId, deletedAt: null },
          orderBy: { measuredAt: "desc" },
          take: healthDataLimit,
        }) as Promise<
          Array<{
            id: string;
            measuredAt: Date;
            weight: number | null;
            bodyFat: number | null;
            bloodPressureSystolic: number | null;
            bloodPressureDiastolic: number | null;
          }>
        >,
        medicalReportsLimit > 0
          ? (neonAdapter.healthReport.findMany({
              where: { memberId, deletedAt: null },
              orderBy: { reportDate: "desc" },
              take: medicalReportsLimit,
            }) as Promise<
              Array<{
                id: string;
                reportType: string;
                reportDate: Date;
                indicators: unknown[];
              }>
            >)
          : Promise.resolve([]),
      ]);

    return {
      member,
      healthGoals,
      allergies,
      dietaryPreference,
      healthData,
      medicalReports,
    };
  }

  async saveHealthAdvice(advice: HealthAdviceInput): Promise<SavedHealthAdvice | null> {
    const result = (await neonAdapter.aiAdvice.create({
      data: {
        memberId: advice.memberId,
        type: advice.type,
        content: advice.content,
        prompt: advice.prompt,
        tokens: advice.tokens,
        generatedAt: new Date(),
      },
    })) as { id: string; generatedAt: Date } | null;

    return result;
  }

  async getMemberHealthHistory(memberId: string, days: number = 30): Promise<MemberHealthHistory> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [healthData, mealLogs] = await Promise.all([
      neonAdapter.healthData.findMany({
        where: {
          memberId,
          deletedAt: null,
        },
        orderBy: { measuredAt: "desc" },
      }) as Promise<
        Array<{
          measuredAt: Date;
          weight: number | null;
          bodyFat: number | null;
        }>
      >,
      neonAdapter.mealLog.findMany({
        where: {
          memberId,
          deletedAt: null,
        },
        orderBy: { recordedAt: "desc" },
      }) as Promise<
        Array<{
          recordedAt: Date;
          totalCalories: number | null;
        }>
      >,
    ]);

    const filteredHealthData = healthData.filter((d) => {
      const date = new Date(d.measuredAt);
      return date >= startDate;
    });

    const filteredMealLogs = mealLogs.filter((m) => {
      const date = new Date(m.recordedAt);
      return date >= startDate;
    });

    return {
      healthData: filteredHealthData,
      mealLogs: filteredMealLogs,
    };
  }

  async saveConversation(conversation: ConversationInput): Promise<SavedConversation> {
    const now = new Date();
    const data = {
      memberId: conversation.memberId,
      title: conversation.title || "AI 对话",
      messages: conversation.messages,
      tokens: conversation.tokens ?? 0,
      status: conversation.status || "ACTIVE",
      lastMessageAt: conversation.lastMessageAt || now,
      updatedAt: conversation.updatedAt || now,
    };

    // If id is provided, try to update existing conversation
    if (conversation.id) {
      const existing = await neonAdapter.aiConversation.findUnique({
        where: { id: conversation.id },
      });

      if (existing) {
        const result = (await neonAdapter.aiConversation.update({
          where: { id: conversation.id },
          data: {
            messages: data.messages,
            tokens: data.tokens,
            status: data.status,
            lastMessageAt: data.lastMessageAt,
            updatedAt: data.updatedAt,
          },
        })) as { id: string; createdAt: Date };
        return result;
      }

      // If not found, create with provided id
      const result = (await neonAdapter.aiConversation.create({
        data: {
          id: conversation.id,
          ...data,
        },
      })) as { id: string; createdAt: Date };
      return result;
    }

    // Create new conversation
    const result = (await neonAdapter.aiConversation.create({
      data,
    })) as { id: string; createdAt: Date };

    return result;
  }
}
