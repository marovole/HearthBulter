import { convexClient, api } from "@/lib/convex-client";

const SCORE_WEIGHTS = {
  nutrition: 0.4,
  exercise: 0.3,
  sleep: 0.2,
  medical: 0.1,
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
  grade: string;
  dataCompleteness: number;
  recommendations: string[];
}

async function calculateNutritionScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  const target = await convexClient.query<{
    actualCalories: number;
    targetCalories: number;
    actualProtein: number;
    targetProtein: number;
    actualCarbs: number;
    targetCarbs: number;
    actualFat: number;
    targetFat: number;
  } | null>(api.analytics.getDailyNutritionTarget, {
    memberId: memberId,
    date: date.getTime(),
  });

  if (!target) {
    return { score: 0, hasData: false };
  }

  const caloriesRatio = Math.min(
    target.actualCalories / target.targetCalories,
    2,
  );
  const proteinRatio = Math.min(target.actualProtein / target.targetProtein, 2);
  const carbsRatio = Math.min(target.actualCarbs / target.targetCarbs, 2);
  const fatRatio = Math.min(target.actualFat / target.targetFat, 2);

  const scoreRatio = (ratio: number): number => {
    if (ratio >= 0.9 && ratio <= 1.1) return 100;
    if (ratio >= 0.8 && ratio < 0.9) return 90;
    if (ratio > 1.1 && ratio <= 1.2) return 90;
    if (ratio >= 0.7 && ratio < 0.8) return 75;
    if (ratio > 1.2 && ratio <= 1.3) return 75;
    if (ratio >= 0.6 && ratio < 0.7) return 60;
    if (ratio > 1.3 && ratio <= 1.5) return 60;
    if (ratio < 0.6) return 40;
    return 40;
  };

  const caloriesScore = scoreRatio(caloriesRatio);
  const proteinScore = scoreRatio(proteinRatio);
  const carbsScore = scoreRatio(carbsRatio);
  const fatScore = scoreRatio(fatRatio);

  const nutritionScore =
    (caloriesScore + proteinScore + carbsScore + fatScore) / 4;

  return { score: nutritionScore, hasData: true };
}

async function calculateExerciseScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  const auxiliary = await convexClient.query<{
    exerciseMinutes: number | null;
  } | null>(api.analytics.getAuxiliaryTracking, {
    memberId: memberId,
    date: date.getTime(),
  });

  if (!auxiliary || auxiliary.exerciseMinutes === null) {
    return { score: 0, hasData: false };
  }

  const minutes = auxiliary.exerciseMinutes || 0;
  let score = 0;
  if (minutes >= 30) {
    score = 100;
  } else if (minutes >= 22) {
    score = 90;
  } else if (minutes >= 15) {
    score = 75;
  } else if (minutes >= 10) {
    score = 60;
  } else if (minutes > 0) {
    score = 40;
  } else {
    score = 0;
  }

  return { score, hasData: true };
}

async function calculateSleepScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  const auxiliary = await convexClient.query<{
    sleepHours: number | null;
    sleepQuality: string | null;
  } | null>(api.analytics.getAuxiliaryTracking, {
    memberId: memberId,
    date: date.getTime(),
  });

  if (!auxiliary || auxiliary.sleepHours === null) {
    return { score: 0, hasData: false };
  }

  const hours = auxiliary.sleepHours || 0;
  let score = 0;
  if (hours >= 7 && hours <= 9) {
    score = 100;
  } else if (hours >= 6 && hours < 7) {
    score = 85;
  } else if (hours > 9 && hours <= 10) {
    score = 85;
  } else if (hours >= 5 && hours < 6) {
    score = 65;
  } else if (hours > 10 && hours <= 11) {
    score = 65;
  } else if (hours < 5) {
    score = 40;
  } else {
    score = 40;
  }

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

async function calculateMedicalScore(
  memberId: string,
  date: Date,
): Promise<{ score: number; hasData: boolean }> {
  const thirtyDaysAgo = new Date(date);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const healthData = await convexClient.query<
    Array<{
      bloodPressureSystolic: number | null;
      bloodPressureDiastolic: number | null;
      heartRate: number | null;
      weight: number | null;
      bodyFat: number | null;
      measuredAt: number;
    }>
  >(api.health.listByMemberDateRange, {
    memberId: memberId,
    startDate: thirtyDaysAgo.getTime(),
    endDate: date.getTime(),
  });

  const latest = healthData.sort((a, b) => b.measuredAt - a.measuredAt)[0];

  if (!latest) {
    return { score: 0, hasData: false };
  }

  let score = 100;
  let factors = 0;

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
    } else if (systolic > 120 && systolic <= 130) {
      score -= 10;
    } else if (systolic > 130 || systolic < 90) {
      score -= 20;
    }
  }

  if (latest.heartRate) {
    factors++;
    const hr = latest.heartRate;

    if (hr >= 60 && hr <= 100) {
    } else if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 110)) {
      score -= 10;
    } else {
      score -= 20;
    }
  }

  if (latest.weight) {
    const member = await convexClient.query<{
      height: number | null;
    } | null>(api.members.getById, {
      memberId: memberId,
    });

    if (member?.height) {
      factors++;
      const bmi = latest.weight / Math.pow(member.height / 100, 2);

      if (bmi >= 18.5 && bmi < 24) {
      } else if ((bmi >= 17 && bmi < 18.5) || (bmi >= 24 && bmi < 28)) {
        score -= 10;
      } else {
        score -= 20;
      }
    }
  }

  if (latest.bodyFat) {
    const member = await convexClient.query<{
      gender: string;
    } | null>(api.members.getById, {
      memberId: memberId,
    });

    if (member) {
      factors++;
      const bf = latest.bodyFat;
      const isMale = member.gender === "MALE";

      if (isMale) {
        if (bf >= 10 && bf <= 20) {
        } else if ((bf >= 8 && bf < 10) || (bf > 20 && bf <= 25)) {
          score -= 10;
        } else {
          score -= 20;
        }
      } else {
        if (bf >= 18 && bf <= 28) {
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

export async function calculateHealthScore(
  memberId: string,
  date: Date,
): Promise<HealthScoreResult> {
  const nutritionResult = await calculateNutritionScore(memberId, date);
  const exerciseResult = await calculateExerciseScore(memberId, date);
  const sleepResult = await calculateSleepScore(memberId, date);
  const medicalResult = await calculateMedicalScore(memberId, date);

  const hasDataCount = [
    nutritionResult.hasData,
    exerciseResult.hasData,
    sleepResult.hasData,
    medicalResult.hasData,
  ].filter(Boolean).length;
  const dataCompleteness = hasDataCount / 4;

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

  let grade: string;
  if (overallScore >= 90) {
    grade = "EXCELLENT";
  } else if (overallScore >= 75) {
    grade = "GOOD";
  } else if (overallScore >= 60) {
    grade = "FAIR";
  } else {
    grade = "POOR";
  }

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

export async function saveHealthScore(
  memberId: string,
  date: Date,
  scoreResult: HealthScoreResult,
) {
  await convexClient.mutation(api.analytics.upsertHealthScore, {
    memberId: memberId,
    date: date.getTime(),
    overallScore: scoreResult.overallScore,
    nutritionScore: scoreResult.components.nutritionScore,
    exerciseScore: scoreResult.components.exerciseScore,
    sleepScore: scoreResult.components.sleepScore,
    medicalScore: scoreResult.components.medicalScore,
    grade: scoreResult.grade,
    dataCompleteness: scoreResult.dataCompleteness,
    recommendations: scoreResult.recommendations,
  });
}

export async function getAverageScore(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const scores = await convexClient.query<
    Array<{
      overallScore: number;
    }>
  >(api.analytics.listHealthScores, {
    memberId: memberId,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  });

  if (scores.length === 0) {
    return 0;
  }

  const sum = scores.reduce((total, score) => total + score.overallScore, 0);
  return sum / scores.length;
}

export async function getScoreTrend(
  memberId: string,
  days: number = 30,
): Promise<Array<{ date: Date; score: number }>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const scores = await convexClient.query<
    Array<{
      date: number;
      overallScore: number;
    }>
  >(api.analytics.listHealthScores, {
    memberId: memberId,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  });

  return scores.map((score) => ({
    date: new Date(score.date),
    score: score.overallScore,
  }));
}
