/**
 * 健康评分系统
 * 计算综合健康评分及各分项评分
 */

import { PrismaClient, ScoreGrade } from "@prisma/client";

const prisma = new PrismaClient();

// 评分权重配置
const SCORE_WEIGHTS = {
  nutrition: 0.4, // 营养评分权重 40%
  exercise: 0.3, // 运动评分权重 30%
  sleep: 0.2, // 睡眠评分权重 20%
  medical: 0.1, // 体检评分权重 10%
};

export interface ScoreComponents {
  nutritionScore: number;
  exerciseScore: number;
  sleepScore: number;
  medicalScore: number;
}

export interface HealthScoreResult {
  overallScore: number;
  components: ScoreComponents;
  grade: ScoreGrade;
  dataCompleteness: number;
  recommendations: string[];
}

/**
 * 计算营养评分（0-100分）
 */
async function calculateNutritionScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  // 获取当天的营养目标和实际摄入
  const target = await prisma.dailyNutritionTarget.findUnique({
    where: {
      memberId_date: {
        memberId,
        date,
      },
    },
  });

  if (!target) {
    return { score: 0, hasData: false };
  }

  // 计算各营养素的达成度（目标值的百分比）
  const caloriesRatio = Math.min(
    target.actualCalories / target.targetCalories,
    2,
  );
  const proteinRatio = Math.min(target.actualProtein / target.targetProtein, 2);
  const carbsRatio = Math.min(target.actualCarbs / target.targetCarbs, 2);
  const fatRatio = Math.min(target.actualFat / target.targetFat, 2);

  // 评分逻辑：接近目标值（90-110%）得高分，偏离越多分数越低
  const scoreRatio = (ratio: number): number => {
    if (ratio >= 0.9 && ratio <= 1.1) return 100; // 完美达成
    if (ratio >= 0.8 && ratio < 0.9) return 90; // 略低
    if (ratio > 1.1 && ratio <= 1.2) return 90; // 略高
    if (ratio >= 0.7 && ratio < 0.8) return 75; // 较低
    if (ratio > 1.2 && ratio <= 1.3) return 75; // 较高
    if (ratio >= 0.6 && ratio < 0.7) return 60; // 偏低
    if (ratio > 1.3 && ratio <= 1.5) return 60; // 偏高
    if (ratio < 0.6) return 40; // 严重不足
    return 40; // 严重超标
  };

  const caloriesScore = scoreRatio(caloriesRatio);
  const proteinScore = scoreRatio(proteinRatio);
  const carbsScore = scoreRatio(carbsRatio);
  const fatScore = scoreRatio(fatRatio);

  // 综合营养评分（各营养素平均）
  const nutritionScore =
    (caloriesScore + proteinScore + carbsScore + fatScore) / 4;

  return { score: nutritionScore, hasData: true };
}

/**
 * 计算运动评分（0-100分）
 */
async function calculateExerciseScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  const auxiliary = await prisma.auxiliaryTracking.findUnique({
    where: {
      memberId_date: {
        memberId,
        date,
      },
    },
  });

  if (!auxiliary || auxiliary.exerciseMinutes === null) {
    return { score: 0, hasData: false };
  }

  const minutes = auxiliary.exerciseMinutes || 0;

  // 运动时长评分标准（基于WHO建议：每周150分钟中等强度运动）
  // 每天约22分钟，按此标准评分
  let score = 0;
  if (minutes >= 30) {
    score = 100; // 超过30分钟满分
  } else if (minutes >= 22) {
    score = 90; // 达到建议标准
  } else if (minutes >= 15) {
    score = 75; // 接近标准
  } else if (minutes >= 10) {
    score = 60; // 有运动但不足
  } else if (minutes > 0) {
    score = 40; // 运动量很少
  } else {
    score = 0; // 没有运动
  }

  return { score, hasData: true };
}

/**
 * 计算睡眠评分（0-100分）
 */
async function calculateSleepScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  const auxiliary = await prisma.auxiliaryTracking.findUnique({
    where: {
      memberId_date: {
        memberId,
        date,
      },
    },
  });

  if (!auxiliary || auxiliary.sleepHours === null) {
    return { score: 0, hasData: false };
  }

  const hours = auxiliary.sleepHours || 0;

  // 睡眠时长评分标准（7-9小时为最佳）
  let score = 0;
  if (hours >= 7 && hours <= 9) {
    score = 100; // 最佳睡眠时长
  } else if (hours >= 6 && hours < 7) {
    score = 85; // 略少但可接受
  } else if (hours > 9 && hours <= 10) {
    score = 85; // 略多但可接受
  } else if (hours >= 5 && hours < 6) {
    score = 65; // 睡眠不足
  } else if (hours > 10 && hours <= 11) {
    score = 65; // 睡眠过多
  } else if (hours < 5) {
    score = 40; // 严重睡眠不足
  } else {
    score = 40; // 睡眠过多
  }

  // 考虑睡眠质量
  if (auxiliary.sleepQuality) {
    const qualityBonus =
      {
        EXCELLENT: 10,
        GOOD: 5,
        FAIR: 0,
        POOR: -10,
      }[auxiliary.sleepQuality] || 0;

    score = Math.min(100, Math.max(0, score + qualityBonus));
  }

  return { score, hasData: true };
}

/**
 * 计算体检评分（0-100分）
 */
async function calculateMedicalScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  // 获取最近30天的健康数据
  const thirtyDaysAgo = new Date(date);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const healthData = await prisma.healthData.findMany({
    where: {
      memberId,
      measuredAt: {
        gte: thirtyDaysAgo,
        lte: date,
      },
    },
    orderBy: { measuredAt: "desc" },
    take: 1,
  });

  if (healthData.length === 0) {
    return { score: 0, hasData: false };
  }

  const latest = healthData[0];
  let score = 100;
  let factors = 0;

  // 检查血压（正常范围：收缩压90-120, 舒张压60-80）
  if (latest.bloodPressureSystolic && latest.bloodPressureDiastolic) {
    factors++;
    const systolic = latest.bloodPressureSystolic;
    const diastolic = latest.bloodPressureDiastolic;

    if (
      systolic >= 90 &&
      systolic <= 120 &&
      diastolic >= 60 &&
      diastolic <= 80
    ) {
      // 正常，不扣分
    } else if (systolic > 120 && systolic <= 130) {
      score -= 10; // 略高
    } else if (systolic > 130 || systolic < 90) {
      score -= 20; // 异常
    }
  }

  // 检查心率（正常范围：60-100 bpm）
  if (latest.heartRate) {
    factors++;
    const hr = latest.heartRate;

    if (hr >= 60 && hr <= 100) {
      // 正常，不扣分
    } else if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 110)) {
      score -= 10; // 略异常
    } else {
      score -= 20; // 异常
    }
  }

  // 检查BMI（如果有体重数据）
  if (latest.weight) {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (member?.height) {
      factors++;
      const bmi = latest.weight / Math.pow(member.height / 100, 2);

      if (bmi >= 18.5 && bmi < 24) {
        // 正常，不扣分
      } else if ((bmi >= 17 && bmi < 18.5) || (bmi >= 24 && bmi < 28)) {
        score -= 10; // 偏瘦或偏胖
      } else {
        score -= 20; // 过瘦或过胖
      }
    }
  }

  // 检查体脂率
  if (latest.bodyFat) {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (member) {
      factors++;
      const bf = latest.bodyFat;
      const isMale = member.gender === "MALE";

      // 正常范围：男性10-20%，女性18-28%
      if (isMale) {
        if (bf >= 10 && bf <= 20) {
          // 正常
        } else if ((bf >= 8 && bf < 10) || (bf > 20 && bf <= 25)) {
          score -= 10;
        } else {
          score -= 20;
        }
      } else {
        if (bf >= 18 && bf <= 28) {
          // 正常
        } else if ((bf >= 15 && bf < 18) || (bf > 28 && bf <= 33)) {
          score -= 10;
        } else {
          score -= 20;
        }
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  return { score, hasData: factors > 0 };
}

/**
 * 计算综合健康评分
 */
export async function calculateHealthScore(
  memberId: string,
  date: Date,
): Promise<HealthScoreResult> {
  // 计算各分项评分
  const nutritionResult = await calculateNutritionScore(memberId, date);
  const exerciseResult = await calculateExerciseScore(memberId, date);
  const sleepResult = await calculateSleepScore(memberId, date);
  const medicalResult = await calculateMedicalScore(memberId, date);

  // 计算数据完整度
  const hasDataCount = [
    nutritionResult.hasData,
    exerciseResult.hasData,
    sleepResult.hasData,
    medicalResult.hasData,
  ].filter(Boolean).length;
  const dataCompleteness = hasDataCount / 4;

  // 计算加权综合评分（只对有数据的项目计算）
  let totalWeight = 0;
  let weightedSum = 0;

  if (nutritionResult.hasData) {
    weightedSum += nutritionResult.score * SCORE_WEIGHTS.nutrition;
    totalWeight += SCORE_WEIGHTS.nutrition;
  }
  if (exerciseResult.hasData) {
    weightedSum += exerciseResult.score * SCORE_WEIGHTS.exercise;
    totalWeight += SCORE_WEIGHTS.exercise;
  }
  if (sleepResult.hasData) {
    weightedSum += sleepResult.score * SCORE_WEIGHTS.sleep;
    totalWeight += SCORE_WEIGHTS.sleep;
  }
  if (medicalResult.hasData) {
    weightedSum += medicalResult.score * SCORE_WEIGHTS.medical;
    totalWeight += SCORE_WEIGHTS.medical;
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // 确定评分等级
  let grade: ScoreGrade;
  if (overallScore >= 90) {
    grade = "EXCELLENT";
  } else if (overallScore >= 75) {
    grade = "GOOD";
  } else if (overallScore >= 60) {
    grade = "FAIR";
  } else {
    grade = "POOR";
  }

  // 生成改进建议
  const recommendations: string[] = [];

  if (nutritionResult.hasData && nutritionResult.score < 70) {
    recommendations.push("建议改善饮食平衡，确保营养摄入达到目标值");
  }
  if (exerciseResult.hasData && exerciseResult.score < 70) {
    recommendations.push("建议增加运动时长，每天至少运动30分钟");
  } else if (!exerciseResult.hasData) {
    recommendations.push("建议开始记录运动数据");
  }
  if (sleepResult.hasData && sleepResult.score < 70) {
    recommendations.push("建议改善睡眠质量，每天保证7-9小时睡眠");
  } else if (!sleepResult.hasData) {
    recommendations.push("建议开始记录睡眠数据");
  }
  if (medicalResult.hasData && medicalResult.score < 70) {
    recommendations.push("建议关注健康指标异常，必要时咨询医生");
  }

  return {
    overallScore,
    components: {
      nutritionScore: nutritionResult.score,
      exerciseScore: exerciseResult.score,
      sleepScore: sleepResult.score,
      medicalScore: medicalResult.score,
    },
    grade,
    dataCompleteness,
    recommendations,
  };
}

/**
 * 保存健康评分到数据库
 */
export async function saveHealthScore(
  memberId: string,
  date: Date,
  scoreResult: HealthScoreResult,
) {
  await prisma.healthScore.upsert({
    where: {
      memberId_date: {
        memberId,
        date,
      },
    },
    update: {
      overallScore: scoreResult.overallScore,
      nutritionScore: scoreResult.components.nutritionScore,
      exerciseScore: scoreResult.components.exerciseScore,
      sleepScore: scoreResult.components.sleepScore,
      medicalScore: scoreResult.components.medicalScore,
      grade: scoreResult.grade,
      dataCompleteness: scoreResult.dataCompleteness,
      updatedAt: new Date(),
    },
    create: {
      memberId,
      date,
      overallScore: scoreResult.overallScore,
      nutritionScore: scoreResult.components.nutritionScore,
      exerciseScore: scoreResult.components.exerciseScore,
      sleepScore: scoreResult.components.sleepScore,
      medicalScore: scoreResult.components.medicalScore,
      grade: scoreResult.grade,
      dataCompleteness: scoreResult.dataCompleteness,
    },
  });
}

/**
 * 计算指定时间范围的平均评分
 */
export async function getAverageScore(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const scores = await prisma.healthScore.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (scores.length === 0) {
    return 0;
  }

  const sum = scores.reduce((total, score) => total + score.overallScore, 0);
  return sum / scores.length;
}

/**
 * 获取评分趋势
 */
export async function getScoreTrend(
  memberId: string,
  days: number = 30,
): Promise<Array<{ date: Date; score: number }>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const scores = await prisma.healthScore.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  return scores.map((score) => ({
    date: new Date(score.date),
    score: score.overallScore,
  }));
}
