/**
 * Supabase 分析 Repository 实现
 *
 * 基于 Supabase PostgreSQL 实现分析报告系统的数据访问层，
 * 提供成员档案、趋势分析、异常检测、报告生成等功能。
 *
 * @module supabase-analytics-repository
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { AnalyticsRepository } from '../interfaces/analytics-repository';
import type {
  AnomalyDTO,
  MemberProfileDTO,
  ReportSnapshotDTO,
  ReportSummaryDTO,
  TimeSeriesPointDTO,
  TrendQueryDTO,
  TrendSeriesDTO,
} from '../types/analytics';
import type {
  DateRangeFilter,
  PaginatedResult,
  PaginationInput,
} from '../types/common';

type FamilyMemberRow = Database['public']['Tables']['family_members']['Row'];
type MealRecordRow = Database['public']['Tables']['meal_records']['Row'];
type HealthDataRow = Database['public']['Tables']['health_data']['Row'];
type HealthAnomalyRow = Database['public']['Tables']['health_anomalies']['Row'];
type ReportSnapshotRow =
  Database['public']['Tables']['report_snapshots']['Row'];

/**
 * Supabase 分析 Repository 实现
 *
 * 特性：
 * - 多源趋势数据聚合
 * - 统计计算（均值/中位数/标准差）
 * - 智能报告生成
 * - 异常检测
 */
export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = '[SupabaseAnalyticsRepository]';

  constructor(
    client: SupabaseClient<Database> = SupabaseClientManager.getInstance(),
  ) {
    this.client = client;
  }

  /**
   * 获取成员档案
   */
  async getMemberProfile(memberId: string): Promise<MemberProfileDTO | null> {
    const { data, error } = await this.client
      .from('family_members')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116')
      this.handleError('getMemberProfile', error);
    return data ? this.mapMemberRow(data) : null;
  }

  /**
   * 聚合膳食记录
   *
   * 计算指定时间范围内的总天数和有数据的天数
   */
  async aggregateMealLogs(
    memberId: string,
    range: DateRangeFilter,
  ): Promise<{ totalDays: number; dataCompleteDays: number }> {
    let query = this.client
      .from('meal_records')
      .select('recorded_at')
      .eq('member_id', memberId);

    if (range.start)
      query = query.gte('recorded_at', range.start.toISOString());
    if (range.end) query = query.lte('recorded_at', range.end.toISOString());

    const { data, error } = await query;
    if (error) this.handleError('aggregateMealLogs', error);

    // 计算唯一日期数
    const uniqueDays = new Set(
      (data || []).map((row) => row.recorded_at?.split('T')[0]),
    );

    const totalDays =
      range.start && range.end
        ? Math.ceil(
            (range.end.getTime() - range.start.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : uniqueDays.size;

    return {
      totalDays,
      dataCompleteDays: uniqueDays.size,
    };
  }

  /**
   * 获取指定指标的时间序列数据
   *
   * 支持多种指标类型，并返回统计信息
   */
  async fetchTrendSeries(queryInput: TrendQueryDTO): Promise<TrendSeriesDTO> {
    const points = await this.fetchTrendPoints(queryInput);
    const statistics = this.computeStatistics(points);

    return {
      metric: queryInput.metric,
      points,
      statistics,
    };
  }

  /**
   * 列出指定时间范围内的异常
   */
  async listAnomalies(
    memberId: string,
    range: DateRangeFilter,
    limit = 10,
  ): Promise<AnomalyDTO[]> {
    let query = this.client
      .from('health_anomalies')
      .select('*')
      .eq('member_id', memberId)
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (range.start)
      query = query.gte('detected_at', range.start.toISOString());
    if (range.end) query = query.lte('detected_at', range.end.toISOString());

    const { data, error } = await query;
    if (error) this.handleError('listAnomalies', error);

    return (data || []).map((row) => this.mapAnomalyRow(row));
  }

  /**
   * 生成报告所需的综合数据
   *
   * 整合多个数据源，生成完整的报告摘要
   */
  async getReportSummary(
    memberId: string,
    period: ReportSummaryDTO['period'],
  ): Promise<ReportSummaryDTO> {
    const member = await this.getMemberProfile(memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found`);
    }

    const range: DateRangeFilter = {
      start: period.startDate,
      end: period.endDate,
    };

    // 并发查询多个数据源
    const [aggregation, trends, anomalies] = await Promise.all([
      this.aggregateMealLogs(memberId, range),
      this.fetchTrendSeries({ memberId, metric: 'HEALTH_SCORE', range }),
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

  /**
   * 保存报告快照
   */
  async saveReportSnapshot(snapshot: ReportSnapshotDTO): Promise<void> {
    const { error } = await this.client.from('report_snapshots').insert({
      id: snapshot.id,
      member_id: snapshot.memberId,
      period: snapshot.period as any,
      payload: snapshot.payload,
      status: snapshot.status,
      created_at: snapshot.createdAt.toISOString(),
    });
    if (error) this.handleError('saveReportSnapshot', error);
  }

  /**
   * 分页查询历史报告
   */
  async listReportSnapshots(
    memberId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<ReportSnapshotDTO>> {
    let query = this.client
      .from('report_snapshots')
      .select('*', { count: 'exact' })
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listReportSnapshots', error);

    const items = (data || []).map((row) => this.mapSnapshotRow(row));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit
        ? (pagination.offset ?? 0) + items.length < (count ?? 0)
        : false,
    };
  }

  /**
   * 根据指标类型获取趋势点数据
   */
  private async fetchTrendPoints(
    query: TrendQueryDTO,
  ): Promise<TimeSeriesPointDTO[]> {
    switch (query.metric) {
      case 'CALORIES':
      case 'PROTEIN':
      case 'CARBS':
      case 'FAT':
        return this.fetchNutritionTrend(query);
      case 'HEALTH_SCORE':
        return this.fetchScoreTrend(query);
      default:
        return this.fetchHealthMetricTrend(query);
    }
  }

  /**
   * 获取营养相关趋势（从膳食日志）
   */
  private async fetchNutritionTrend(
    query: TrendQueryDTO,
  ): Promise<TimeSeriesPointDTO[]> {
    let supabaseQuery = this.client
      .from('meal_records')
      .select(
        'recorded_at, total_calories, total_protein, total_carbs, total_fat',
      )
      .eq('member_id', query.memberId)
      .order('recorded_at', { ascending: true });

    if (query.range.start)
      supabaseQuery = supabaseQuery.gte(
        'recorded_at',
        query.range.start.toISOString(),
      );
    if (query.range.end)
      supabaseQuery = supabaseQuery.lte(
        'recorded_at',
        query.range.end.toISOString(),
      );

    const { data, error } = await supabaseQuery;
    if (error) this.handleError('fetchNutritionTrend', error);

    // 字段映射
    const mapField: Record<string, keyof MealRecordRow> = {
      CALORIES: 'total_calories',
      PROTEIN: 'total_protein',
      CARBS: 'total_carbs',
      FAT: 'total_fat',
    };

    const field = mapField[query.metric];

    // 按日期聚合
    const dailyMap = new Map<string, number>();
    for (const row of data || []) {
      if (!row.recorded_at) continue;
      const dateKey = row.recorded_at.split('T')[0];
      const value = (row[field] as number | null) ?? 0;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + value);
    }

    return Array.from(dailyMap.entries()).map(([date, value]) => ({
      date: new Date(date),
      value,
    }));
  }

  /**
   * 获取健康评分趋势
   */
  private async fetchScoreTrend(
    query: TrendQueryDTO,
  ): Promise<TimeSeriesPointDTO[]> {
    let supabaseQuery = this.client
      .from('health_scores')
      .select('date, overall_score')
      .eq('member_id', query.memberId)
      .order('date', { ascending: true });

    if (query.range.start)
      supabaseQuery = supabaseQuery.gte(
        'date',
        query.range.start.toISOString(),
      );
    if (query.range.end)
      supabaseQuery = supabaseQuery.lte('date', query.range.end.toISOString());

    const { data, error } = await supabaseQuery;
    if (error) this.handleError('fetchScoreTrend', error);

    return (data || []).map((row) => ({
      date: new Date(row.date),
      value: row.overall_score ?? 0,
    }));
  }

  /**
   * 获取健康指标趋势（从健康数据）
   */
  private async fetchHealthMetricTrend(
    query: TrendQueryDTO,
  ): Promise<TimeSeriesPointDTO[]> {
    let supabaseQuery = this.client
      .from('health_data')
      .select(
        'measured_at, weight, body_fat, muscle_mass, blood_pressure_systolic, heart_rate',
      )
      .eq('member_id', query.memberId)
      .order('measured_at', { ascending: true });

    if (query.range.start)
      supabaseQuery = supabaseQuery.gte(
        'measured_at',
        query.range.start.toISOString(),
      );
    if (query.range.end)
      supabaseQuery = supabaseQuery.lte(
        'measured_at',
        query.range.end.toISOString(),
      );

    const { data, error } = await supabaseQuery;
    if (error) this.handleError('fetchHealthMetricTrend', error);

    // 字段映射
    const fieldMap: Record<string, keyof HealthDataRow> = {
      WEIGHT: 'weight',
      BODY_FAT: 'body_fat',
      MUSCLE_MASS: 'muscle_mass',
      BLOOD_PRESSURE: 'blood_pressure_systolic',
      HEART_RATE: 'heart_rate',
    };

    const field = fieldMap[query.metric];

    return (data || [])
      .filter((row) => row.measured_at)
      .map((row) => ({
        date: new Date(row.measured_at!),
        value: (row[field] as number | null) ?? 0,
      }));
  }

  /**
   * 计算统计信息
   */
  private computeStatistics(points: TimeSeriesPointDTO[]) {
    if (!points.length) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }

    const values = points.map((p) => p.value).sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median =
      values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)];
    const min = values[0];
    const max = values[values.length - 1];
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, min, max, stdDev };
  }

  /**
   * 从趋势数据推导成就列表
   */
  private deriveAchievements(points: TimeSeriesPointDTO[]): string[] {
    if (!points.length) return ['完成健康数据记录是迈出的第一步'];
    const latest = points[points.length - 1];
    if (latest.value >= 85) {
      return ['健康评分保持在优秀范围，继续保持当前习惯'];
    }
    return ['完成了本周期的健康数据记录'];
  }

  /**
   * 从趋势数据推导关注点列表
   */
  private deriveConcerns(points: TimeSeriesPointDTO[]): string[] {
    if (!points.length) return [];
    const trend = points.slice(-5);
    const falling = trend.every(
      (point, index, arr) => index === 0 || point.value <= arr[index - 1].value,
    );
    if (falling) {
      return ['近期健康评分持续下降，请关注饮食与运动平衡'];
    }
    return [];
  }

  /**
   * 从趋势数据推导建议列表
   */
  private deriveRecommendations(points: TimeSeriesPointDTO[]): string[] {
    if (!points.length) return ['继续记录健康数据以便模型学习您的状态'];
    const mean = this.computeStatistics(points).mean;
    if (mean < 70) {
      return ['建议增加适度运动并保持规律作息'];
    }
    return ['保持当前习惯，同时继续追踪趋势变化'];
  }

  /**
   * 数据映射：FamilyMemberRow → MemberProfileDTO
   */
  private mapMemberRow(row: FamilyMemberRow): MemberProfileDTO {
    return {
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      gender: row.gender ?? null,
      birthDate: new Date(row.birth_date),
      height: row.height ?? null,
      weight: row.weight ?? null,
      avatar: row.avatar ?? null,
    };
  }

  /**
   * 数据映射：HealthAnomalyRow → AnomalyDTO
   */
  private mapAnomalyRow(row: HealthAnomalyRow): AnomalyDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      title: row.title,
      description: row.description ?? '',
      severity: row.severity as AnomalyDTO['severity'],
      detectedAt: new Date(row.detected_at),
    };
  }

  /**
   * 数据映射：ReportSnapshotRow → ReportSnapshotDTO
   */
  private mapSnapshotRow(row: ReportSnapshotRow): ReportSnapshotDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      period: row.period as ReportSnapshotDTO['period'],
      payload: row.payload as ReportSnapshotDTO['payload'],
      status: row.status as ReportSnapshotDTO['status'],
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? 'Unknown Supabase error';
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`AnalyticsRepository.${operation} failed: ${message}`);
  }
}
