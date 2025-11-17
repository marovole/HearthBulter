/**
 * 趋势分析服务
 * 提供时序数据分析、移动平均、线性回归和同环比计算
 *
 * 重构说明：
 * - 改为类 + 依赖注入模式
 * - 数据访问通过 AnalyticsRepository
 * - 移除缓存功能（由 Cloudflare KV 处理）
 * - 保留所有纯计算逻辑
 */

import type { AnalyticsRepository } from '@/lib/repositories/interfaces/analytics-repository';
import { SupabaseAnalyticsRepository } from '@/lib/repositories/implementations/supabase-analytics-repository';
import type { TrendDataType } from '@/lib/types/analytics';

export interface TimeSeriesPoint {
  date: Date;
  value: number;
}

export interface TrendAnalysis {
  dataPoints: TimeSeriesPoint[];
  statistics: {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
  trend: {
    direction: 'UP' | 'DOWN' | 'STABLE';
    slope: number;
    rSquared: number;
  };
  movingAverage: TimeSeriesPoint[];
  predictions: TimeSeriesPoint[];
  periodComparison?: {
    currentPeriod: number;
    previousPeriod: number;
    changePercent: number;
    changeType: 'INCREASE' | 'DECREASE' | 'STABLE';
  };
}

/**
 * TrendDataType 到 AnalyticsRepository metric 的映射
 *
 * 中心化维护映射关系,避免重复定义
 */
const TREND_METRIC_MAP: Record<TrendDataType, string> = {
  'WEIGHT': 'WEIGHT',
  'BODY_FAT': 'BODY_FAT',
  'MUSCLE_MASS': 'MUSCLE_MASS',
  'BLOOD_PRESSURE': 'BLOOD_PRESSURE',
  'HEART_RATE': 'HEART_RATE',
  'CALORIES': 'CALORIES',
  'PROTEIN': 'PROTEIN',
  'CARBS': 'CARBS',
  'FAT': 'FAT',
  'EXERCISE': 'EXERCISE',
  'SLEEP': 'SLEEP',
  'WATER': 'WATER',
  'HEALTH_SCORE': 'HEALTH_SCORE',
};

/**
 * 从 AnalyticsRepository 获取时序数据
 *
 * 共享函数,供 TrendAnalyzer 类和向后兼容包装器使用
 *
 * @param repository - 分析数据仓库实例
 * @param memberId - 成员ID
 * @param dataType - 数据类型
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 时序数据点数组
 * @throws {Error} 当数据类型不支持时抛出错误
 */
async function fetchTimeSeriesDataFromRepository(
  repository: AnalyticsRepository,
  memberId: string,
  dataType: TrendDataType,
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesPoint[]> {
  const metric = TREND_METRIC_MAP[dataType];
  if (!metric) {
    throw new Error(`Unsupported data type: ${dataType}`);
  }

  const trendSeries = await repository.fetchTrendSeries({
    memberId,
    metric,
    range: {
      start: startDate,
      end: endDate,
    },
  });

  // 转换为标准时序数据点格式
  return trendSeries.points.map(point => ({
    date: point.date,
    value: point.value,
  }));
}

/**
 * 趋势分析服务类
 *
 * 提供完整的时序数据分析能力，包括：
 * - 统计分析（均值、中位数、标准差等）
 * - 趋势检测（线性回归）
 * - 移动平均平滑
 * - 未来预测
 * - 同比/环比计算
 */
export class TrendAnalyzer {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  /**
   * 完整的趋势分析
   *
   * 主入口方法，整合所有分析功能
   */
  async analyzeTrend(
    memberId: string,
    dataType: TrendDataType,
    startDate: Date,
    endDate: Date
  ): Promise<TrendAnalysis> {
    // 获取当前时期数据
    const dataPoints = await this.fetchTimeSeriesData(memberId, dataType, startDate, endDate);

    // 计算统计数据
    const statistics = this.calculateStatistics(dataPoints);

    // 计算移动平均
    const movingAverage = this.calculateMovingAverage(dataPoints, 7);

    // 计算趋势
    const trend = this.calculateLinearRegression(dataPoints);

    // 预测未来7天
    const predictions = this.predictFutureTrend(dataPoints, 7);

    // 计算同比（上一个相同时长的时期）
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);
    const previousDataPoints = await this.fetchTimeSeriesData(
      memberId,
      dataType,
      previousStartDate,
      previousEndDate
    );

    const periodComparison = this.calculatePeriodComparison(dataPoints, previousDataPoints);

    return {
      dataPoints,
      statistics,
      trend,
      movingAverage,
      predictions,
      periodComparison: periodComparison || undefined,
    };
  }

  /**
   * 获取时序数据
   *
   * 通过 AnalyticsRepository 获取数据，支持多种指标类型
   *
   * @private
   */
  private async fetchTimeSeriesData(
    memberId: string,
    dataType: TrendDataType,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesPoint[]> {
    return fetchTimeSeriesDataFromRepository(
      this.analyticsRepository,
      memberId,
      dataType,
      startDate,
      endDate
    );
  }

  /**
   * 计算描述性统计
   *
   * @private
   */
  private calculateStatistics(dataPoints: TimeSeriesPoint[]) {
    if (dataPoints.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0,
      };
    }

    const values = dataPoints.map(p => p.value).sort((a, b) => a - b);

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = values.length % 2 === 0
      ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
      : values[Math.floor(values.length / 2)];
    const min = values[0];
    const max = values[values.length - 1];

    // 计算标准差
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, median, min, max, stdDev };
  }

  /**
   * 计算移动平均（平滑曲线）
   *
   * @private
   */
  private calculateMovingAverage(
    dataPoints: TimeSeriesPoint[],
    windowSize: number = 7
  ): TimeSeriesPoint[] {
    if (dataPoints.length < windowSize) {
      return dataPoints; // 数据点不足，返回原始数据
    }

    const smoothed: TimeSeriesPoint[] = [];

    for (let i = windowSize - 1; i < dataPoints.length; i++) {
      const window = dataPoints.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
      smoothed.push({
        date: dataPoints[i].date,
        value: avg,
      });
    }

    return smoothed;
  }

  /**
   * 线性回归分析
   *
   * @private
   */
  private calculateLinearRegression(dataPoints: TimeSeriesPoint[]) {
    if (dataPoints.length < 2) {
      return {
        direction: 'STABLE' as const,
        slope: 0,
        rSquared: 0,
      };
    }

    // 将日期转换为数值（天数）
    const firstDate = dataPoints[0].date.getTime();
    const x = dataPoints.map(p => (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
    const y = dataPoints.map(p => p.value);

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    // 计算斜率和截距
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算R²（拟合优度）
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // 判断趋势方向
    let direction: 'UP' | 'DOWN' | 'STABLE';
    if (Math.abs(slope) < 0.01) {
      direction = 'STABLE';
    } else if (slope > 0) {
      direction = 'UP';
    } else {
      direction = 'DOWN';
    }

    return { direction, slope, rSquared };
  }

  /**
   * 预测未来趋势（基于线性回归）
   *
   * @private
   */
  private predictFutureTrend(
    dataPoints: TimeSeriesPoint[],
    daysAhead: number = 7
  ): TimeSeriesPoint[] {
    if (dataPoints.length < 2) {
      return [];
    }

    const firstDate = dataPoints[0].date.getTime();
    const lastDate = dataPoints[dataPoints.length - 1].date.getTime();

    const x = dataPoints.map(p => (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
    const y = dataPoints.map(p => p.value);

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictions: TimeSeriesPoint[] = [];
    const lastX = x[x.length - 1];

    for (let i = 1; i <= daysAhead; i++) {
      const futureX = lastX + i;
      const futureValue = slope * futureX + intercept;
      const futureDate = new Date(lastDate + i * 24 * 60 * 60 * 1000);

      predictions.push({
        date: futureDate,
        value: Math.max(0, futureValue), // 确保预测值非负
      });
    }

    return predictions;
  }

  /**
   * 计算同比/环比
   *
   * @private
   */
  private calculatePeriodComparison(
    currentDataPoints: TimeSeriesPoint[],
    previousDataPoints: TimeSeriesPoint[]
  ) {
    if (currentDataPoints.length === 0 || previousDataPoints.length === 0) {
      return null;
    }

    const currentAvg = currentDataPoints.reduce((sum, p) => sum + p.value, 0) / currentDataPoints.length;
    const previousAvg = previousDataPoints.reduce((sum, p) => sum + p.value, 0) / previousDataPoints.length;

    const changePercent = ((currentAvg - previousAvg) / previousAvg) * 100;

    let changeType: 'INCREASE' | 'DECREASE' | 'STABLE';
    if (Math.abs(changePercent) < 1) {
      changeType = 'STABLE';
    } else if (changePercent > 0) {
      changeType = 'INCREASE';
    } else {
      changeType = 'DECREASE';
    }

    return {
      currentPeriod: currentAvg,
      previousPeriod: previousAvg,
      changePercent: Math.abs(changePercent),
      changeType,
    };
  }
}

// ============================================================================
// 向后兼容的单例和包装函数
// ============================================================================

/**
 * 默认 AnalyticsRepository 单例
 *
 * 避免每次调用都创建新实例,提高性能
 */
let defaultAnalyticsRepository: AnalyticsRepository | undefined;

/**
 * 获取默认的 AnalyticsRepository 实例
 *
 * 使用单例模式,确保整个应用共享同一实例
 *
 * @returns AnalyticsRepository 实例
 */
function getDefaultAnalyticsRepository(): AnalyticsRepository {
  if (!defaultAnalyticsRepository) {
    defaultAnalyticsRepository = new SupabaseAnalyticsRepository();
  }
  return defaultAnalyticsRepository;
}

/**
 * 默认 TrendAnalyzer 单例
 *
 * 避免每次调用都创建新实例和依赖,提高性能
 */
let defaultTrendAnalyzer: TrendAnalyzer | undefined;

/**
 * 获取默认的 TrendAnalyzer 实例
 *
 * 使用单例模式,确保整个应用共享同一实例
 *
 * @returns TrendAnalyzer 实例
 */
function getDefaultTrendAnalyzer(): TrendAnalyzer {
  if (!defaultTrendAnalyzer) {
    defaultTrendAnalyzer = new TrendAnalyzer(getDefaultAnalyticsRepository());
  }
  return defaultTrendAnalyzer;
}

/**
 * 聚合时序数据（向后兼容函数）
 *
 * 为未迁移到依赖注入模式的旧代码提供向后兼容接口。
 * 新代码应该使用 TrendAnalyzer 类实例。
 *
 * @param memberId - 成员ID
 * @param dataType - 数据类型
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 时序数据点数组
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 *
 * @example
 * ```typescript
 * // 当前用法（向后兼容）
 * const data = await aggregateTimeSeriesData(memberId, 'WEIGHT', startDate, endDate);
 *
 * // 推荐用法（依赖注入）- 未来迁移路径
 * const container = getDefaultContainer();
 * const analyzer = container.getTrendAnalyzer();
 * const analysis = await analyzer.analyzeTrend(memberId, 'WEIGHT', startDate, endDate);
 * // 然后从 analysis.dataPoints 获取时序数据
 * ```
 */
export async function aggregateTimeSeriesData(
  memberId: string,
  dataType: TrendDataType,
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesPoint[]> {
  return fetchTimeSeriesDataFromRepository(
    getDefaultAnalyticsRepository(),
    memberId,
    dataType,
    startDate,
    endDate
  );
}

/**
 * 分析趋势（向后兼容函数）
 *
 * 为未迁移到依赖注入模式的旧代码提供向后兼容接口。
 * 新代码应该使用 TrendAnalyzer 类实例。
 *
 * @param memberId - 成员ID
 * @param dataType - 数据类型
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 完整的趋势分析结果
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 *
 * @example
 * ```typescript
 * // 当前用法（向后兼容）
 * const analysis = await analyzeTrend(memberId, 'WEIGHT', startDate, endDate);
 *
 * // 推荐用法（依赖注入）- 未来迁移路径
 * const container = getDefaultContainer();
 * const analyzer = container.getTrendAnalyzer();
 * const analysis = await analyzer.analyzeTrend(memberId, 'WEIGHT', startDate, endDate);
 * ```
 */
export async function analyzeTrend(
  memberId: string,
  dataType: TrendDataType,
  startDate: Date,
  endDate: Date
): Promise<TrendAnalysis> {
  return getDefaultTrendAnalyzer().analyzeTrend(memberId, dataType, startDate, endDate);
}

// ============================================================================
// 向后兼容的工具函数（保留供外部使用）
// ============================================================================

/**
 * 计算描述性统计（独立函数版本）
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 */
export function calculateStatistics(dataPoints: TimeSeriesPoint[]) {
  if (dataPoints.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
    };
  }

  const values = dataPoints.map(p => p.value).sort((a, b) => a - b);

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)];
  const min = values[0];
  const max = values[values.length - 1];

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, median, min, max, stdDev };
}

/**
 * 计算移动平均（独立函数版本）
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 */
export function calculateMovingAverage(
  dataPoints: TimeSeriesPoint[],
  windowSize: number = 7
): TimeSeriesPoint[] {
  if (dataPoints.length < windowSize) {
    return dataPoints;
  }

  const smoothed: TimeSeriesPoint[] = [];

  for (let i = windowSize - 1; i < dataPoints.length; i++) {
    const window = dataPoints.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
    smoothed.push({
      date: dataPoints[i].date,
      value: avg,
    });
  }

  return smoothed;
}

/**
 * 线性回归分析（独立函数版本）
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 */
export function calculateLinearRegression(dataPoints: TimeSeriesPoint[]) {
  if (dataPoints.length < 2) {
    return {
      direction: 'STABLE' as const,
      slope: 0,
      rSquared: 0,
    };
  }

  const firstDate = dataPoints[0].date.getTime();
  const x = dataPoints.map(p => (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
  const y = dataPoints.map(p => p.value);

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const ssResidual = y.reduce((sum, val, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  const rSquared = 1 - (ssResidual / ssTotal);

  let direction: 'UP' | 'DOWN' | 'STABLE';
  if (Math.abs(slope) < 0.01) {
    direction = 'STABLE';
  } else if (slope > 0) {
    direction = 'UP';
  } else {
    direction = 'DOWN';
  }

  return { direction, slope, rSquared };
}

/**
 * 预测未来趋势（独立函数版本）
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 */
export function predictFutureTrend(
  dataPoints: TimeSeriesPoint[],
  daysAhead: number = 7
): TimeSeriesPoint[] {
  if (dataPoints.length < 2) {
    return [];
  }

  const firstDate = dataPoints[0].date.getTime();
  const lastDate = dataPoints[dataPoints.length - 1].date.getTime();

  const x = dataPoints.map(p => (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
  const y = dataPoints.map(p => p.value);

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const predictions: TimeSeriesPoint[] = [];
  const lastX = x[x.length - 1];

  for (let i = 1; i <= daysAhead; i++) {
    const futureX = lastX + i;
    const futureValue = slope * futureX + intercept;
    const futureDate = new Date(lastDate + i * 24 * 60 * 60 * 1000);

    predictions.push({
      date: futureDate,
      value: Math.max(0, futureValue),
    });
  }

  return predictions;
}

/**
 * 计算同比/环比（独立函数版本）
 * @deprecated 推荐使用 TrendAnalyzer 类的实例方法
 */
export function calculatePeriodComparison(
  currentDataPoints: TimeSeriesPoint[],
  previousDataPoints: TimeSeriesPoint[]
) {
  if (currentDataPoints.length === 0 || previousDataPoints.length === 0) {
    return null;
  }

  const currentAvg = currentDataPoints.reduce((sum, p) => sum + p.value, 0) / currentDataPoints.length;
  const previousAvg = previousDataPoints.reduce((sum, p) => sum + p.value, 0) / previousDataPoints.length;

  const changePercent = ((currentAvg - previousAvg) / previousAvg) * 100;

  let changeType: 'INCREASE' | 'DECREASE' | 'STABLE';
  if (Math.abs(changePercent) < 1) {
    changeType = 'STABLE';
  } else if (changePercent > 0) {
    changeType = 'INCREASE';
  } else {
    changeType = 'DECREASE';
  }

  return {
    currentPeriod: currentAvg,
    previousPeriod: previousAvg,
    changePercent: Math.abs(changePercent),
    changeType,
  };
}
