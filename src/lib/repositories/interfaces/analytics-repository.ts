/**
 * 分析 Repository 接口
 *
 * 定义分析报告系统所需的数据访问契约，包括：
 * - 成员档案获取
 * - 膳食记录聚合
 * - 趋势数据查询
 * - 异常检测
 * - 报告生成与存储
 *
 * @module analytics-repository
 */

import type { DateRangeFilter, PaginatedResult, PaginationInput } from '../types/common';
import type {
  AnomalyDTO,
  MemberProfileDTO,
  ReportSnapshotDTO,
  ReportSummaryDTO,
  TimeSeriesPointDTO,
  TrendQueryDTO,
  TrendSeriesDTO,
} from '../types/analytics';

/**
 * 分析 Repository 接口
 *
 * 抽象了分析报告所需的所有数据访问操作，
 * 支持多指标趋势分析、异常检测、报告生成
 */
export interface AnalyticsRepository {
  /**
   * 获取成员档案
   *
   * 用于报告抬头和基础信息展示
   *
   * @param memberId - 成员ID
   * @returns 成员档案，不存在时返回 null
   */
  getMemberProfile(memberId: string): Promise<MemberProfileDTO | null>;

  /**
   * 聚合膳食记录
   *
   * 返回指定时间范围内的：
   * - 总天数
   * - 有数据的天数（数据完整性指标）
   *
   * @param memberId - 成员ID
   * @param range - 时间范围
   * @returns 聚合统计信息
   */
  aggregateMealLogs(
    memberId: string,
    range: DateRangeFilter
  ): Promise<{
    totalDays: number;
    dataCompleteDays: number;
  }>;

  /**
   * 获取指定指标的时间序列数据
   *
   * 支持的指标包括：
   * - 体重、体脂、肌肉量
   * - 血压、心率
   * - 卡路里、蛋白质、碳水、脂肪
   * - 运动、睡眠、饮水
   * - 健康评分
   *
   * 返回包含统计信息（均值/中位数/标准差等）
   *
   * @param query - 趋势查询参数
   * @returns 趋势序列数据
   */
  fetchTrendSeries(query: TrendQueryDTO): Promise<TrendSeriesDTO>;

  /**
   * 列出指定时间范围内的异常
   *
   * @param memberId - 成员ID
   * @param range - 时间范围
   * @param limit - 返回数量限制
   * @returns 异常列表
   */
  listAnomalies(memberId: string, range: DateRangeFilter, limit?: number): Promise<AnomalyDTO[]>;

  /**
   * 生成报告所需的综合数据
   *
   * 整合膳食、营养、行为数据，生成：
   * - 数据完整性统计
   * - 平均健康评分
   * - 成就列表
   * - 关注点列表
   * - 建议列表
   * - 异常列表
   *
   * @param memberId - 成员ID
   * @param period - 报告周期
   * @returns 报告摘要数据
   */
  getReportSummary(memberId: string, period: ReportSummaryDTO['period']): Promise<ReportSummaryDTO>;

  /**
   * 保存报告快照
   *
   * 用于历史报告查看和对比
   *
   * @param snapshot - 报告快照对象
   */
  saveReportSnapshot(snapshot: ReportSnapshotDTO): Promise<void>;

  /**
   * 分页查询历史报告
   *
   * @param memberId - 成员ID
   * @param pagination - 分页参数
   * @returns 分页的报告快照列表
   */
  listReportSnapshots(
    memberId: string,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<ReportSnapshotDTO>>;
}
