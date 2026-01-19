import { convexClient, api } from "@/lib/convex-client";
import type {
  AnomalyType,
  AnomalySeverity,
  TrendDataType,
} from "@/lib/types/analytics";

import { aggregateTimeSeriesData, calculateStatistics } from "./trend-analyzer";

export interface AnomalyDetectionResult {
  detected: boolean;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  value: number;
  expectedMin?: number;
  expectedMax?: number;
  deviation?: number;
}

export async function detectSuddenChange(
  memberId: string,
  dataType: TrendDataType,
  newValue: number,
  date: Date,
): Promise<AnomalyDetectionResult | null> {
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const historicalData = await aggregateTimeSeriesData(
    memberId,
    dataType,
    startDate,
    endDate,
  );

  if (historicalData.length < 7) {
    return null;
  }

  const stats = calculateStatistics(historicalData);

  const lowerBound = stats.mean - 3 * stats.stdDev;
  const upperBound = stats.mean + 3 * stats.stdDev;

  if (newValue < lowerBound || newValue > upperBound) {
    const deviation = Math.abs((newValue - stats.mean) / stats.stdDev);

    let severity: AnomalySeverity;
    if (deviation >= 4) {
      severity = "CRITICAL";
    } else if (deviation >= 3.5) {
      severity = "HIGH";
    } else if (deviation >= 3) {
      severity = "MEDIUM";
    } else {
      severity = "LOW";
    }

    const dataTypeName = getDataTypeName(dataType);
    const unit = getDataTypeUnit(dataType);

    return {
      detected: true,
      anomalyType: "SUDDEN_CHANGE",
      severity,
      title: `${dataTypeName}异常波动`,
      description: `${dataTypeName}突然${newValue > stats.mean ? "上升" : "下降"}，当前值${newValue.toFixed(1)}${unit}，超出正常范围（${lowerBound.toFixed(1)}-${upperBound.toFixed(1)}${unit}）`,
      value: newValue,
      expectedMin: lowerBound,
      expectedMax: upperBound,
      deviation,
    };
  }

  return null;
}

export async function detectWeightAnomaly(
  memberId: string,
  newWeight: number,
  date: Date,
): Promise<AnomalyDetectionResult | null> {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const todayStart = new Date(date);
  todayStart.setHours(0, 0, 0, 0);

  const healthData = await convexClient.query<Array<{
    _id: string;
    weight: number | null;
    measuredAt: number;
  }> | null>(api.health.listByMemberDateRange, {
    memberId: memberId,
    startDate: yesterday.getTime(),
    endDate: todayStart.getTime(),
  });

  if (!healthData || healthData.length === 0) {
    return null;
  }

  const previousData = healthData
    .filter((d) => d.weight !== null)
    .sort((a, b) => b.measuredAt - a.measuredAt)[0];

  if (!previousData || !previousData.weight) {
    return null;
  }

  const change = Math.abs(newWeight - previousData.weight);

  if (change > 2) {
    let severity: AnomalySeverity;
    if (change > 5) {
      severity = "CRITICAL";
    } else if (change > 3) {
      severity = "HIGH";
    } else {
      severity = "MEDIUM";
    }

    return {
      detected: true,
      anomalyType: "SUDDEN_CHANGE",
      severity,
      title: "体重异常波动",
      description: `体重单日变化${change.toFixed(1)}kg，请确认数据准确性。快速体重变化可能影响健康，建议关注。`,
      value: newWeight,
      expectedMin: previousData.weight - 2,
      expectedMax: previousData.weight + 2,
    };
  }

  return null;
}

export async function detectNutritionImbalance(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];

  const threeDaysAgo = new Date(date);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const targets = await convexClient.query<
    Array<{
      actualProtein: number;
      targetProtein: number;
      actualCalories: number;
      targetCalories: number;
    }>
  >(api.analytics.listDailyNutritionTargets, {
    memberId: memberId,
    startDate: threeDaysAgo.getTime(),
    endDate: date.getTime(),
  });

  if (targets.length < 3) {
    return anomalies;
  }

  const proteinDeficient = targets.every(
    (t) => t.actualProtein < t.targetProtein * 0.5,
  );
  if (proteinDeficient) {
    const avgProtein =
      targets.reduce((sum, t) => sum + t.actualProtein, 0) / targets.length;
    const avgTarget =
      targets.reduce((sum, t) => sum + t.targetProtein, 0) / targets.length;

    anomalies.push({
      detected: true,
      anomalyType: "NUTRITION_IMBALANCE",
      severity: "HIGH",
      title: "蛋白质摄入严重不足",
      description: `连续3天蛋白质摄入低于目标值50%，平均摄入${avgProtein.toFixed(1)}g，目标${avgTarget.toFixed(1)}g。建议增加优质蛋白质食物摄入。`,
      value: avgProtein,
      expectedMin: avgTarget * 0.8,
      expectedMax: avgTarget * 1.2,
    });
  }

  const caloriesExcessive = targets.every(
    (t) => t.actualCalories > t.targetCalories * 1.3,
  );
  if (caloriesExcessive) {
    const avgCalories =
      targets.reduce((sum, t) => sum + t.actualCalories, 0) / targets.length;
    const avgTarget =
      targets.reduce((sum, t) => sum + t.targetCalories, 0) / targets.length;

    anomalies.push({
      detected: true,
      anomalyType: "NUTRITION_IMBALANCE",
      severity: "MEDIUM",
      title: "卡路里摄入超标",
      description: `连续3天卡路里摄入超出目标值30%以上，平均摄入${avgCalories.toFixed(0)}kcal，目标${avgTarget.toFixed(0)}kcal。建议控制饮食量。`,
      value: avgCalories,
      expectedMin: avgTarget * 0.8,
      expectedMax: avgTarget * 1.2,
    });
  }

  return anomalies;
}

export async function detectGoalDeviation(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult | null> {
  const goals = await convexClient.query<
    Array<{
      _id: string;
      goalType: string;
      targetWeight: number | null;
      startWeight: number | null;
      status: string;
    }>
  >(api.health.listGoals, {
    memberId: memberId,
    includeInactive: false,
  });

  const goal = goals.find(
    (g) => g.goalType === "LOSE_WEIGHT" || g.goalType === "GAIN_MUSCLE",
  );

  if (!goal || !goal.targetWeight || !goal.startWeight) {
    return null;
  }

  const latestHealthData = await convexClient.query<
    Array<{
      weight: number | null;
      measuredAt: number;
    }>
  >(api.health.listByMemberDateRange, {
    memberId: memberId,
    startDate: 0,
    endDate: date.getTime(),
  });

  const latestWeight = latestHealthData
    .filter((d) => d.weight !== null)
    .sort((a, b) => b.measuredAt - a.measuredAt)[0];

  if (!latestWeight || !latestWeight.weight) {
    return null;
  }

  const currentWeight = latestWeight.weight;
  const isLosing = goal.goalType === "LOSE_WEIGHT";

  let isDeviated = false;
  if (isLosing && currentWeight > goal.startWeight) {
    isDeviated = true;
  } else if (!isLosing && currentWeight < goal.startWeight) {
    isDeviated = true;
  }

  if (isDeviated) {
    return {
      detected: true,
      anomalyType: "GOAL_DEVIATION",
      severity: "MEDIUM",
      title: "目标进度偏离",
      description: `您的体重趋势与目标（${isLosing ? "减重" : "增肌"}）背离。当前体重${currentWeight.toFixed(1)}kg，建议调整饮食和运动计划。`,
      value: currentWeight,
      expectedMin: isLosing ? 0 : goal.targetWeight || 0,
      expectedMax: isLosing ? goal.targetWeight || 0 : 1000,
    };
  }

  return null;
}

export async function detectMissingData(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];

  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const mealLogsCount = await convexClient.query<number>(
    api.analytics.countMealLogs,
    {
      memberId: memberId,
      startDate: sevenDaysAgo.getTime(),
      endDate: date.getTime(),
    },
  );

  if (mealLogsCount === 0) {
    anomalies.push({
      detected: true,
      anomalyType: "MISSING_DATA",
      severity: "LOW",
      title: "缺少营养打卡数据",
      description: "您已经7天未记录饮食数据，建议恢复记录以便跟踪健康状况。",
      value: 0,
    });
  }

  const exerciseTrackings = await convexClient.query<
    Array<{
      exerciseMinutes: number | null;
    }>
  >(api.analytics.listAuxiliaryTrackings, {
    memberId: memberId,
    startDate: sevenDaysAgo.getTime(),
    endDate: date.getTime(),
  });

  const exerciseCount = exerciseTrackings.filter(
    (t) => t.exerciseMinutes !== null,
  ).length;

  if (exerciseCount === 0) {
    anomalies.push({
      detected: true,
      anomalyType: "MISSING_DATA",
      severity: "LOW",
      title: "缺少运动数据",
      description: "您已经7天未记录运动数据，建议定期记录以监测活动量。",
      value: 0,
    });
  }

  return anomalies;
}

export async function detectAllAnomalies(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];

  const nutritionAnomalies = await detectNutritionImbalance(memberId, date);
  anomalies.push(...nutritionAnomalies);

  const goalAnomaly = await detectGoalDeviation(memberId, date);
  if (goalAnomaly) {
    anomalies.push(goalAnomaly);
  }

  const missingDataAnomalies = await detectMissingData(memberId, date);
  anomalies.push(...missingDataAnomalies);

  return anomalies;
}

export async function saveAnomaly(
  memberId: string,
  anomaly: AnomalyDetectionResult,
  dataType: TrendDataType,
) {
  await convexClient.mutation(api.analytics.createHealthAnomaly, {
    memberId: memberId,
    anomalyType: anomaly.anomalyType,
    severity: anomaly.severity,
    title: anomaly.title,
    description: anomaly.description,
    dataType,
    value: anomaly.value,
    expectedMin: anomaly.expectedMin,
    expectedMax: anomaly.expectedMax,
    deviation: anomaly.deviation,
    detectedAt: Date.now(),
  });
}

export async function getPendingAnomalies(
  memberId: string,
  limit: number = 10,
) {
  return await convexClient.query<
    Array<{
      _id: string;
      anomalyType: string;
      severity: string;
      title: string;
      description: string;
      dataType: string | null;
      value: number;
      expectedMin: number | null;
      expectedMax: number | null;
      deviation: number | null;
      status: string;
      detectedAt: number;
    }>
  >(api.analytics.listPendingAnomalies, {
    memberId: memberId,
    limit,
  });
}

export async function acknowledgeAnomaly(anomalyId: string) {
  await convexClient.mutation(api.analytics.acknowledgeAnomaly, {
    anomalyId: anomalyId,
  });
}

export async function resolveAnomaly(anomalyId: string, resolution: string) {
  await convexClient.mutation(api.analytics.updateAnomalyStatus, {
    anomalyId: anomalyId,
    status: "RESOLVED",
    resolution,
  });
}

export async function ignoreAnomaly(anomalyId: string) {
  await convexClient.mutation(api.analytics.ignoreAnomaly, {
    anomalyId: anomalyId,
  });
}

function getDataTypeName(dataType: TrendDataType): string {
  const names: Record<TrendDataType, string> = {
    WEIGHT: "体重",
    BODY_FAT: "体脂率",
    MUSCLE_MASS: "肌肉量",
    BLOOD_PRESSURE: "血压",
    HEART_RATE: "心率",
    CALORIES: "卡路里",
    PROTEIN: "蛋白质",
    CARBS: "碳水化合物",
    FAT: "脂肪",
    EXERCISE: "运动时长",
    SLEEP: "睡眠时长",
    WATER: "饮水量",
    HEALTH_SCORE: "健康评分",
  };
  return names[dataType] || dataType;
}

function getDataTypeUnit(dataType: TrendDataType): string {
  const units: Record<TrendDataType, string> = {
    WEIGHT: "kg",
    BODY_FAT: "%",
    MUSCLE_MASS: "kg",
    BLOOD_PRESSURE: "mmHg",
    HEART_RATE: "bpm",
    CALORIES: "kcal",
    PROTEIN: "g",
    CARBS: "g",
    FAT: "g",
    EXERCISE: "分钟",
    SLEEP: "小时",
    WATER: "ml",
    HEALTH_SCORE: "分",
  };
  return units[dataType] || "";
}

export async function detectAnomalies(
  memberId: string,
): Promise<AnomalyDetectionResult[]> {
  return await detectAllAnomalies(memberId, new Date());
}
