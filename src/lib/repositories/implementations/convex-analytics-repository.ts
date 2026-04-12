// @ts-nocheck - 类型兼容性问题待解决
/**
 * Convex 分析 Repository 实现
 *
 * 基于 Convex 实现分析报告系统的数据访问层
 *
 * @module convex-analytics-repository
 */

import { convexClient } from "@/lib/convex-client";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
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

export class ConvexAnalyticsRepository implements AnalyticsRepository {
  private readonly loggerPrefix = "[ConvexAnalyticsRepository]";

  async getMemberProfile(memberId: string): Promise<MemberProfileDTO | null> {
    const data = await convexClient.query(api.analytics.getMemberProfile, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!data) return null;

    return {
      id: data.id,
      familyId: data.familyId,
      name: data.name,
      gender: data.gender,
      birthDate: new Date(data.birthDate),
      height: data.height,
      weight: data.weight,
      avatar: data.avatar,
    };
  }

  async aggregateMealLogs(
    memberId: string,
    range: DateRangeFilter
  ): Promise<{
    totalDays: number;
    dataCompleteDays: number;
  }> {
    const startDate = range.start?.getTime() ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = range.end?.getTime() ?? Date.now();

    return await convexClient.query(api.analytics.aggregateMealLogs, {
      memberId: memberId as Id<"familyMembers">,
      startDate,
      endDate,
    });
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
    const startDate = range.start?.getTime() ?? 0;
    const endDate = range.end?.getTime() ?? Date.now();

    const data = await convexClient.query(api.analytics.listAnomaliesByMember, {
      memberId: memberId as Id<"familyMembers">,
      startDate,
      endDate,
      limit,
    });

    return data.map((row: any) => this.mapAnomalyRow(row));
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
    await convexClient.mutation(api.analytics.saveReportSnapshot, {
      id: snapshot.id,
      memberId: snapshot.memberId as Id<"familyMembers">,
      period: {
        startDate: snapshot.period.startDate.getTime(),
        endDate: snapshot.period.endDate.getTime(),
        label: snapshot.period.label,
      },
      payload: snapshot.payload as Record<string, unknown>,
      status: snapshot.status,
    });
  }

  async listReportSnapshots(
    memberId: string,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ReportSnapshotDTO>> {
    const result = await convexClient.query(api.analytics.listReportSnapshots, {
      memberId: memberId as Id<"familyMembers">,
      limit: pagination?.limit,
      offset: pagination?.offset,
    });

    return {
      items: result.items.map((row: any) => ({
        id: row.id,
        memberId: row.memberId,
        period: {
          startDate: new Date(row.period.startDate),
          endDate: new Date(row.period.endDate),
          label: row.period.label,
        },
        payload: row.payload as ReportSnapshotDTO["payload"],
        status: row.status as ReportSnapshotDTO["status"],
        createdAt: new Date(row.createdAt),
      })),
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  // ============================================================================
  // 私有辅助方法
  // ============================================================================

  private async fetchTrendPoints(query: TrendQueryDTO): Promise<TimeSeriesPointDTO[]> {
    const startDate = query.range.start?.getTime() ?? Date.now() - 30 * 24 * 60 * 60 * 1000;
    const endDate = query.range.end?.getTime() ?? Date.now();

    switch (query.metric) {
      case "CALORIES":
      case "PROTEIN":
      case "CARBS":
      case "FAT":
        return this.fetchNutritionTrend(query.memberId, query.metric, startDate, endDate);
      case "HEALTH_SCORE":
        return this.fetchScoreTrend(query.memberId, startDate, endDate);
      default:
        return this.fetchHealthMetricTrend(query.memberId, query.metric, startDate, endDate);
    }
  }

  private async fetchNutritionTrend(
    memberId: string,
    metric: string,
    startDate: number,
    endDate: number
  ): Promise<TimeSeriesPointDTO[]> {
    const data = await convexClient.query(api.analytics.fetchNutritionTrend, {
      memberId: memberId as Id<"familyMembers">,
      metric,
      startDate,
      endDate,
    });

    return data.map((p: any) => ({
      date: new Date(p.date),
      value: p.value,
    }));
  }

  private async fetchScoreTrend(
    memberId: string,
    startDate: number,
    endDate: number
  ): Promise<TimeSeriesPointDTO[]> {
    const data = await convexClient.query(api.analytics.fetchScoreTrend, {
      memberId: memberId as Id<"familyMembers">,
      startDate,
      endDate,
    });

    return data.map((p: any) => ({
      date: new Date(p.date),
      value: p.value,
    }));
  }

  private async fetchHealthMetricTrend(
    memberId: string,
    metric: string,
    startDate: number,
    endDate: number
  ): Promise<TimeSeriesPointDTO[]> {
    const data = await convexClient.query(api.analytics.fetchHealthMetricTrend, {
      memberId: memberId as Id<"familyMembers">,
      metric,
      startDate,
      endDate,
    });

    return data.map((p: any) => ({
      date: new Date(p.date),
      value: p.value,
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

  private mapAnomalyRow(row: any): AnomalyDTO {
    return {
      id: row._id,
      memberId: row.memberId,
      title: row.title,
      description: row.description ?? "",
      severity: row.severity as AnomalyDTO["severity"],
      detectedAt: new Date(row.detectedAt),
    };
  }

  // ============================================================================
  // AI 相关方法（使用 ai 模块）
  // ============================================================================

  async getMemberHealthContext(
    memberId: string,
    options?: {
      healthDataLimit?: number;
      medicalReportsLimit?: number;
    }
  ): Promise<MemberHealthContext | null> {
    // 使用 health 模块获取成员健康上下文
    const member = await convexClient.query(api.members.getById, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!member) return null;

    const [healthGoals, allergies, dietaryPrefs, healthData, medicalReports] = await Promise.all([
      convexClient.query(api.health.listGoalsByMember, {
        memberId: memberId as Id<"familyMembers">,
      }),
      convexClient.query(api.health.listAllergiesByMember, {
        memberId: memberId as Id<"familyMembers">,
      }),
      convexClient.query(api.health.listDietaryPreferences, {
        memberId: memberId as Id<"familyMembers">,
      }),
      convexClient.query(api.health.listHealthDataByMember, {
        memberId: memberId as Id<"familyMembers">,
        limit: options?.healthDataLimit ?? 30,
      }),
      options?.medicalReportsLimit !== 0
        ? convexClient.query(api.health.listMedicalReportsByMember, {
            memberId: memberId as Id<"familyMembers">,
            limit: options?.medicalReportsLimit ?? 5,
          })
        : Promise.resolve([]),
    ]);

    return {
      member: {
        id: member._id,
        familyId: member.familyId,
        userId: member.userId ?? "",
        name: member.name,
        gender: member.gender ?? "",
        birthDate: new Date(member.birthDate),
        height: member.height,
        weight: member.weight,
        bmi:
          member.weight && member.height ? member.weight / Math.pow(member.height / 100, 2) : null,
      },
      healthGoals: healthGoals.map((g: any) => ({
        id: g._id,
        goalType: g.goalType,
        targetWeight: g.targetWeight,
        status: g.status,
      })),
      allergies: allergies.map((a: any) => ({
        id: a._id,
        allergenName: a.allergenName,
        severity: a.severity,
      })),
      dietaryPreference: dietaryPrefs[0]
        ? {
            dietType: dietaryPrefs[0].preferenceType,
            isVegetarian: dietaryPrefs[0].preferenceType === "VEGETARIAN",
            isVegan: dietaryPrefs[0].preferenceType === "VEGAN",
          }
        : null,
      healthData: healthData.map((h: any) => ({
        id: h._id,
        measuredAt: new Date(h.measuredAt),
        weight: h.weight,
        bodyFat: h.bodyFat,
        bloodPressureSystolic: h.bloodPressureSystolic,
        bloodPressureDiastolic: h.bloodPressureDiastolic,
      })),
      medicalReports: medicalReports.map((r: any) => ({
        id: r._id,
        reportType: r.reportType,
        reportDate: new Date(r.reportDate),
        indicators: [],
      })),
    };
  }

  async saveHealthAdvice(advice: HealthAdviceInput): Promise<SavedHealthAdvice | null> {
    const result = await convexClient.mutation(api.ai.createAdvice, {
      memberId: advice.memberId as Id<"familyMembers">,
      type: advice.type,
      content: advice.content,
      prompt: advice.prompt,
      tokens: advice.tokens,
    });

    return result
      ? {
          id: result,
          generatedAt: new Date(),
        }
      : null;
  }

  async getMemberHealthHistory(memberId: string, days: number = 30): Promise<MemberHealthHistory> {
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const [healthData, mealLogs] = await Promise.all([
      convexClient.query(api.health.listHealthDataByMember, {
        memberId: memberId as Id<"familyMembers">,
        limit: 100,
      }),
      convexClient.query(api.tracking.getMealLogsByDateRange, {
        memberId: memberId as Id<"familyMembers">,
        startDate,
        endDate: Date.now(),
      }),
    ]);

    return {
      healthData: healthData
        .filter((d: any) => d.measuredAt >= startDate)
        .map((d: any) => ({
          measuredAt: new Date(d.measuredAt),
          weight: d.weight,
          bodyFat: d.bodyFat,
        })),
      mealLogs: mealLogs
        .filter((m: any) => m.date >= startDate)
        .map((m: any) => ({
          recordedAt: new Date(m.date),
          totalCalories: m.totalCalories,
        })),
    };
  }

  async saveConversation(conversation: ConversationInput): Promise<SavedConversation> {
    const now = Date.now();

    // 如果提供了 id，尝试更新现有对话
    if (conversation.id) {
      const existing = await convexClient.query(api.ai.getConversationById, {
        conversationId: conversation.id as Id<"aiConversations">,
      });

      if (existing) {
        await convexClient.mutation(api.ai.updateConversation, {
          conversationId: conversation.id as Id<"aiConversations">,
          messages: conversation.messages as Array<Record<string, unknown>>,
          tokens: conversation.tokens ?? 0,
          status: conversation.status || "ACTIVE",
          lastMessageAt: conversation.lastMessageAt?.getTime() || now,
        });
        return {
          id: conversation.id,
          createdAt: new Date(existing.createdAt),
        };
      }
    }

    // 创建新对话
    const result = await convexClient.mutation(api.ai.createConversation, {
      memberId: conversation.memberId as Id<"familyMembers">,
      title: conversation.title || "AI 对话",
      messages: conversation.messages as Array<Record<string, unknown>>,
      tokens: conversation.tokens ?? 0,
      status: conversation.status || "ACTIVE",
      lastMessageAt: conversation.lastMessageAt?.getTime() || now,
    });

    return {
      id: result,
      createdAt: new Date(),
    };
  }
}
