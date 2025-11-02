/**
 * 趋势分析服务
 * 提供时序数据分析、移动平均、线性回归和同环比计算
 */

import { PrismaClient, TrendDataType } from '@prisma/client';

const prisma = new PrismaClient();

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
 * 聚合时序数据
 */
export async function aggregateTimeSeriesData(
  memberId: string,
  dataType: TrendDataType,
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesPoint[]> {
  const dataPoints: TimeSeriesPoint[] = [];

  switch (dataType) {
  case 'WEIGHT':
  case 'BODY_FAT':
  case 'MUSCLE_MASS':
  case 'BLOOD_PRESSURE':
  case 'HEART_RATE': {
    const healthData = await prisma.healthData.findMany({
      where: {
        memberId,
        measuredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { measuredAt: 'asc' },
    });

    for (const data of healthData) {
      let value: number | null = null;
      if (dataType === 'WEIGHT') value = data.weight;
      else if (dataType === 'BODY_FAT') value = data.bodyFat;
      else if (dataType === 'MUSCLE_MASS') value = data.muscleMass;
      else if (dataType === 'HEART_RATE') value = data.heartRate;
      else if (dataType === 'BLOOD_PRESSURE' && data.bloodPressureSystolic) {
        value = data.bloodPressureSystolic;
      }

      if (value !== null) {
        dataPoints.push({ date: data.measuredAt, value });
      }
    }
    break;
  }

  case 'CALORIES':
  case 'PROTEIN':
  case 'CARBS':
  case 'FAT': {
    const mealLogs = await prisma.mealLog.findMany({
      where: {
        memberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // 按日期聚合
    const dailyData = new Map<string, number>();
    for (const log of mealLogs) {
      const dateKey = log.date.toISOString().split('T')[0];
      let value = 0;
      if (dataType === 'CALORIES') value = log.calories;
      else if (dataType === 'PROTEIN') value = log.protein;
      else if (dataType === 'CARBS') value = log.carbs;
      else if (dataType === 'FAT') value = log.fat;

      dailyData.set(dateKey, (dailyData.get(dateKey) || 0) + value);
    }

    for (const [dateKey, value] of dailyData.entries()) {
      dataPoints.push({ date: new Date(dateKey), value });
    }
    break;
  }

  case 'EXERCISE':
  case 'SLEEP':
  case 'WATER': {
    const auxiliaryData = await prisma.auxiliaryTracking.findMany({
      where: {
        memberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    for (const data of auxiliaryData) {
      let value: number | null = null;
      if (dataType === 'EXERCISE') value = data.exerciseMinutes;
      else if (dataType === 'SLEEP') value = data.sleepHours;
      else if (dataType === 'WATER') value = data.waterIntake;

      if (value !== null) {
        dataPoints.push({ date: new Date(data.date), value });
      }
    }
    break;
  }

  case 'HEALTH_SCORE': {
    const scores = await prisma.healthScore.findMany({
      where: {
        memberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    for (const score of scores) {
      dataPoints.push({ date: new Date(score.date), value: score.overallScore });
    }
    break;
  }
  }

  return dataPoints;
}

/**
 * 计算描述性统计
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
  
  // 计算标准差
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, median, min, max, stdDev };
}

/**
 * 计算移动平均（平滑曲线）
 */
export function calculateMovingAverage(
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
 */
export function calculateLinearRegression(dataPoints: TimeSeriesPoint[]) {
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
      value: Math.max(0, futureValue), // 确保预测值非负
    });
  }

  return predictions;
}

/**
 * 计算同比/环比
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

/**
 * 完整的趋势分析
 */
export async function analyzeTrend(
  memberId: string,
  dataType: TrendDataType,
  startDate: Date,
  endDate: Date
): Promise<TrendAnalysis> {
  // 获取当前时期数据
  const dataPoints = await aggregateTimeSeriesData(memberId, dataType, startDate, endDate);

  // 计算统计数据
  const statistics = calculateStatistics(dataPoints);

  // 计算移动平均
  const movingAverage = calculateMovingAverage(dataPoints, 7);

  // 计算趋势
  const trend = calculateLinearRegression(dataPoints);

  // 预测未来7天
  const predictions = predictFutureTrend(dataPoints, 7);

  // 计算同比（上一个相同时长的时期）
  const periodLength = endDate.getTime() - startDate.getTime();
  const previousStartDate = new Date(startDate.getTime() - periodLength);
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousDataPoints = await aggregateTimeSeriesData(
    memberId,
    dataType,
    previousStartDate,
    previousEndDate
  );
  
  const periodComparison = calculatePeriodComparison(dataPoints, previousDataPoints);

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
 * 缓存趋势数据
 */
export async function cacheTrendData(
  memberId: string,
  dataType: TrendDataType,
  analysis: TrendAnalysis,
  startDate: Date,
  endDate: Date
) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

  await prisma.trendData.upsert({
    where: {
      memberId_dataType_startDate_endDate: {
        memberId,
        dataType,
        startDate,
        endDate,
      },
    },
    update: {
      aggregatedData: JSON.stringify(analysis.dataPoints),
      mean: analysis.statistics.mean,
      median: analysis.statistics.median,
      min: analysis.statistics.min,
      max: analysis.statistics.max,
      stdDev: analysis.statistics.stdDev,
      trendDirection: analysis.trend.direction,
      slope: analysis.trend.slope,
      rSquared: analysis.trend.rSquared,
      predictions: JSON.stringify(analysis.predictions),
      expiresAt,
      hitCount: { increment: 1 },
      updatedAt: new Date(),
    },
    create: {
      memberId,
      dataType,
      startDate,
      endDate,
      aggregatedData: JSON.stringify(analysis.dataPoints),
      mean: analysis.statistics.mean,
      median: analysis.statistics.median,
      min: analysis.statistics.min,
      max: analysis.statistics.max,
      stdDev: analysis.statistics.stdDev,
      trendDirection: analysis.trend.direction,
      slope: analysis.trend.slope,
      rSquared: analysis.trend.rSquared,
      predictions: JSON.stringify(analysis.predictions),
      expiresAt,
    },
  });
}

/**
 * 获取缓存的趋势数据
 */
export async function getCachedTrendData(
  memberId: string,
  dataType: TrendDataType,
  startDate: Date,
  endDate: Date
): Promise<TrendAnalysis | null> {
  const cached = await prisma.trendData.findUnique({
    where: {
      memberId_dataType_startDate_endDate: {
        memberId,
        dataType,
        startDate,
        endDate,
      },
    },
  });

  if (!cached || cached.expiresAt < new Date()) {
    return null;
  }

  // 更新命中次数
  await prisma.trendData.update({
    where: { id: cached.id },
    data: { hitCount: { increment: 1 } },
  });

  return {
    dataPoints: JSON.parse(cached.aggregatedData),
    statistics: {
      mean: cached.mean || 0,
      median: cached.median || 0,
      min: cached.min || 0,
      max: cached.max || 0,
      stdDev: cached.stdDev || 0,
    },
    trend: {
      direction: (cached.trendDirection as 'UP' | 'DOWN' | 'STABLE') || 'STABLE',
      slope: cached.slope || 0,
      rSquared: cached.rSquared || 0,
    },
    movingAverage: [], // 不缓存移动平均
    predictions: cached.predictions ? JSON.parse(cached.predictions) : [],
  };
}

