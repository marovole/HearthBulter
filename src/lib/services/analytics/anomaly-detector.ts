/**
 * 异常检测服务
 * 基于统计方法检测健康数据异常并生成预警
 */

import { PrismaClient } from "@prisma/client";
import type {
  AnomalyType,
  AnomalySeverity,
  TrendDataType,
} from "@/lib/types/analytics";
import { aggregateTimeSeriesData, calculateStatistics } from "./trend-analyzer";

const prisma = new PrismaClient();

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

/**
 * 检测突变异常（基于3σ原则）
 */
export async function detectSuddenChange(
  memberId: string,
  dataType: TrendDataType,
  newValue: number,
  date: Date,
): Promise<AnomalyDetectionResult | null> {
  // 获取过去30天的数据
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() - 1); // 排除当天
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const historicalData = await aggregateTimeSeriesData(
    memberId,
    dataType,
    startDate,
    endDate,
  );

  if (historicalData.length < 7) {
    return null; // 数据不足，无法检测
  }

  const stats = calculateStatistics(historicalData);

  // 使用3σ原则：超出均值±3倍标准差视为异常
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

/**
 * 检测体重突变（单日变化>2kg）
 */
export async function detectWeightAnomaly(
  memberId: string,
  newWeight: number,
  date: Date,
): Promise<AnomalyDetectionResult | null> {
  // 获取前一天的体重
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);

  const previousData = await prisma.healthData.findFirst({
    where: {
      memberId,
      measuredAt: {
        gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(0, 0, 0, 0)),
      },
      weight: { not: null },
    },
    orderBy: { measuredAt: "desc" },
  });

  if (!previousData || !previousData.weight) {
    return null; // 无前一天数据
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

/**
 * 检测营养失衡
 */
export async function detectNutritionImbalance(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];

  // 检查过去3天的营养摄入
  const threeDaysAgo = new Date(date);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const targets = await prisma.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: threeDaysAgo,
        lte: date,
      },
    },
    orderBy: { date: "asc" },
  });

  if (targets.length < 3) {
    return anomalies; // 数据不足
  }

  // 检查连续3天蛋白质摄入是否低于目标值的50%
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

  // 检查卡路里是否连续超标
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

/**
 * 检测目标偏离
 */
export async function detectGoalDeviation(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult | null> {
  // 获取活跃的健康目标
  const goal = await prisma.healthGoal.findFirst({
    where: {
      memberId,
      status: "ACTIVE",
      goalType: { in: ["LOSE_WEIGHT", "GAIN_MUSCLE"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!goal || !goal.targetWeight || !goal.startWeight) {
    return null;
  }

  // 获取最新体重
  const latestWeight = await prisma.healthData.findFirst({
    where: {
      memberId,
      weight: { not: null },
      measuredAt: { lte: date },
    },
    orderBy: { measuredAt: "desc" },
  });

  if (!latestWeight || !latestWeight.weight) {
    return null;
  }

  const currentWeight = latestWeight.weight;
  const isLosing = goal.goalType === "LOSE_WEIGHT";

  // 检查趋势是否与目标一致
  let isDeviated = false;
  if (isLosing && currentWeight > goal.startWeight) {
    isDeviated = true; // 减重期体重上升
  } else if (!isLosing && currentWeight < goal.startWeight) {
    isDeviated = true; // 增重期体重下降
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

/**
 * 检测数据缺失
 */
export async function detectMissingData(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];

  // 检查过去7天是否有营养打卡数据
  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const mealLogsCount = await prisma.mealLog.count({
    where: {
      memberId,
      date: {
        gte: sevenDaysAgo,
        lte: date,
      },
    },
  });

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

  // 检查是否缺少运动数据
  const exerciseCount = await prisma.auxiliaryTracking.count({
    where: {
      memberId,
      date: {
        gte: sevenDaysAgo,
        lte: date,
      },
      exerciseMinutes: { not: null },
    },
  });

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

/**
 * 综合异常检测
 */
export async function detectAllAnomalies(
  memberId: string,
  date: Date,
): Promise<AnomalyDetectionResult[]> {
  const anomalies: AnomalyDetectionResult[] = [];

  // 检测营养失衡
  const nutritionAnomalies = await detectNutritionImbalance(memberId, date);
  anomalies.push(...nutritionAnomalies);

  // 检测目标偏离
  const goalAnomaly = await detectGoalDeviation(memberId, date);
  if (goalAnomaly) {
    anomalies.push(goalAnomaly);
  }

  // 检测数据缺失
  const missingDataAnomalies = await detectMissingData(memberId, date);
  anomalies.push(...missingDataAnomalies);

  return anomalies;
}

/**
 * 保存异常记录到数据库
 */
export async function saveAnomaly(
  memberId: string,
  anomaly: AnomalyDetectionResult,
  dataType: TrendDataType,
) {
  await prisma.healthAnomaly.create({
    data: {
      memberId,
      anomalyType: anomaly.anomalyType,
      severity: anomaly.severity,
      title: anomaly.title,
      description: anomaly.description,
      dataType,
      value: anomaly.value,
      expectedMin: anomaly.expectedMin,
      expectedMax: anomaly.expectedMax,
      deviation: anomaly.deviation,
    },
  });
}

/**
 * 获取未处理的异常
 */
export async function getPendingAnomalies(
  memberId: string,
  limit: number = 10,
) {
  return await prisma.healthAnomaly.findMany({
    where: {
      memberId,
      status: "PENDING",
    },
    orderBy: {
      detectedAt: "desc",
    },
    take: limit,
  });
}

/**
 * 标记异常为已确认
 */
export async function acknowledgeAnomaly(anomalyId: string) {
  await prisma.healthAnomaly.update({
    where: { id: anomalyId },
    data: {
      status: "ACKNOWLEDGED",
    },
  });
}

/**
 * 解决异常
 */
export async function resolveAnomaly(anomalyId: string, resolution: string) {
  await prisma.healthAnomaly.update({
    where: { id: anomalyId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolution,
    },
  });
}

/**
 * 忽略异常
 */
export async function ignoreAnomaly(anomalyId: string) {
  await prisma.healthAnomaly.update({
    where: { id: anomalyId },
    data: {
      status: "IGNORED",
    },
  });
}

// 辅助函数：获取数据类型中文名称
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

// 辅助函数：获取数据类型单位
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

/**
 * 快捷函数：检测所有异常（使用当前日期）
 */
export async function detectAnomalies(
  memberId: string,
): Promise<AnomalyDetectionResult[]> {
  return await detectAllAnomalies(memberId, new Date());
}
