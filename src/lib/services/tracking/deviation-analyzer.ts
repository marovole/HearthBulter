/**
 * 营养偏差分析服务
 * 负责分析用户的营养摄入偏差、提供调整建议
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface DeviationAnalysis {
  nutrient: 'calories' | 'protein' | 'carbs' | 'fat';
  target: number;
  actual: number;
  deviation: number; // 百分比
  status: 'normal' | 'low' | 'high' | 'critical';
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  suggestion?: string;
}

export interface WeeklyReport {
  period: { start: Date; end: Date };
  summary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    checkInRate: number;
  };
  deviations: DeviationAnalysis[];
  recommendations: string[];
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * 分析单日营养偏差
 */
export async function analyzeDailyDeviation(
  memberId: string,
  date: Date
): Promise<DeviationAnalysis[]> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // 获取当日营养目标和实际摄入
  const target = await db.dailyNutritionTarget.findUnique({
    where: {
      memberId_date: {
        memberId,
        date: targetDate,
      },
    },
  });

  if (!target) {
    return [];
  }

  const analyses: DeviationAnalysis[] = [];

  // 分析各营养素偏差
  const nutrients = [
    {
      name: 'calories' as const,
      target: target.targetCalories,
      actual: target.actualCalories,
      deviation: target.caloriesDeviation,
    },
    {
      name: 'protein' as const,
      target: target.targetProtein,
      actual: target.actualProtein,
      deviation: target.proteinDeviation,
    },
    {
      name: 'carbs' as const,
      target: target.targetCarbs,
      actual: target.actualCarbs,
      deviation: target.carbsDeviation,
    },
    {
      name: 'fat' as const,
      target: target.targetFat,
      actual: target.actualFat,
      deviation: target.fatDeviation,
    },
  ];

  for (const nutrient of nutrients) {
    const analysis = analyzeNutrientDeviation(nutrient);
    analyses.push(analysis);
  }

  return analyses;
}

/**
 * 分析单个营养素的偏差
 */
function analyzeNutrientDeviation(data: {
  name: 'calories' | 'protein' | 'carbs' | 'fat';
  target: number;
  actual: number;
  deviation: number;
}): DeviationAnalysis {
  const { name, target, actual, deviation } = data;

  // 判断状态和严重程度
  let status: 'normal' | 'low' | 'high' | 'critical' = 'normal';
  let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
  let suggestion: string | undefined;

  const absDeviation = Math.abs(deviation);

  // 根据偏差程度判断
  if (absDeviation < 10) {
    status = 'normal';
    severity = 'none';
  } else if (absDeviation < 20) {
    status = deviation > 0 ? 'high' : 'low';
    severity = 'mild';
  } else if (absDeviation < 30) {
    status = deviation > 0 ? 'high' : 'low';
    severity = 'moderate';
  } else {
    status = 'critical';
    severity = 'severe';
  }

  // 生成建议
  suggestion = generateSuggestion(name, deviation, target, actual);

  return {
    nutrient: name,
    target,
    actual,
    deviation,
    status,
    severity,
    suggestion,
  };
}

/**
 * 生成营养调整建议
 */
function generateSuggestion(
  nutrient: 'calories' | 'protein' | 'carbs' | 'fat',
  deviation: number,
  target: number,
  actual: number
): string | undefined {
  const diff = Math.abs(target - actual);

  if (Math.abs(deviation) < 10) {
    return undefined; // 偏差较小，无需建议
  }

  const nutrientNames = {
    calories: '热量',
    protein: '蛋白质',
    carbs: '碳水化合物',
    fat: '脂肪',
  };

  const name = nutrientNames[nutrient];

  if (deviation > 0) {
    // 摄入过多
    if (nutrient === 'protein') {
      return `今日${name}摄入超标${diff.toFixed(0)}g，建议减少肉类、蛋类的摄入量。`;
    } else if (nutrient === 'carbs') {
      return `今日${name}摄入超标${diff.toFixed(0)}g，建议减少米面、糖类的摄入量。`;
    } else if (nutrient === 'fat') {
      return `今日${name}摄入超标${diff.toFixed(0)}g，建议减少油炸食物、肥肉的摄入量。`;
    } else {
      return `今日${name}摄入超标${diff.toFixed(0)}kcal，建议适当减少食量或增加运动。`;
    }
  } else {
    // 摄入不足
    if (nutrient === 'protein') {
      return `今日${name}摄入不足${diff.toFixed(0)}g，建议增加鸡蛋、鸡胸肉、豆制品等高蛋白食物。`;
    } else if (nutrient === 'carbs') {
      return `今日${name}摄入不足${diff.toFixed(0)}g，建议适当增加主食（米饭、面条、全麦面包）的摄入。`;
    } else if (nutrient === 'fat') {
      return `今日${name}摄入不足${diff.toFixed(0)}g，建议适当增加坚果、橄榄油等健康脂肪。`;
    } else {
      return `今日${name}摄入不足${diff.toFixed(0)}kcal，建议适当增加食量，确保营养充足。`;
    }
  }
}

/**
 * 分析周期性偏差（连续N天）
 */
export async function analyzePeriodDeviation(
  memberId: string,
  days: number = 7
) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  // 获取期间的所有营养目标记录
  const targets = await db.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  if (targets.length === 0) {
    return { hasIssues: false, issues: [] };
  }

  // 分析每个营养素的持续偏差
  const issues: Array<{
    nutrient: string;
    avgDeviation: number;
    consecutiveDays: number;
    severity: 'mild' | 'moderate' | 'severe';
    suggestion: string;
  }> = [];

  const nutrients = ['calories', 'protein', 'carbs', 'fat'] as const;

  for (const nutrient of nutrients) {
    // 计算平均偏差
    const deviations = targets.map((t) => {
      switch (nutrient) {
      case 'calories':
        return t.caloriesDeviation;
      case 'protein':
        return t.proteinDeviation;
      case 'carbs':
        return t.carbsDeviation;
      case 'fat':
        return t.fatDeviation;
      }
    });

    const avgDeviation =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    // 检查是否持续偏差（连续3天以上且偏差>15%）
    let consecutiveDays = 0;
    let currentStreak = 0;

    deviations.forEach((deviation) => {
      if (Math.abs(deviation) > 15 && Math.sign(deviation) === Math.sign(avgDeviation)) {
        currentStreak++;
        consecutiveDays = Math.max(consecutiveDays, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    if (consecutiveDays >= 3 && Math.abs(avgDeviation) > 15) {
      let severity: 'mild' | 'moderate' | 'severe' = 'mild';
      if (Math.abs(avgDeviation) > 30) {
        severity = 'severe';
      } else if (Math.abs(avgDeviation) > 20) {
        severity = 'moderate';
      }

      const nutrientNames = {
        calories: '热量',
        protein: '蛋白质',
        carbs: '碳水化合物',
        fat: '脂肪',
      };

      issues.push({
        nutrient: nutrientNames[nutrient],
        avgDeviation,
        consecutiveDays,
        severity,
        suggestion: generatePeriodSuggestion(nutrient, avgDeviation, consecutiveDays),
      });
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues,
    analyzedDays: targets.length,
  };
}

/**
 * 生成周期性偏差建议
 */
function generatePeriodSuggestion(
  nutrient: 'calories' | 'protein' | 'carbs' | 'fat',
  avgDeviation: number,
  days: number
): string {
  const nutrientNames = {
    calories: '热量',
    protein: '蛋白质',
    carbs: '碳水化合物',
    fat: '脂肪',
  };

  const name = nutrientNames[nutrient];
  const direction = avgDeviation > 0 ? '超标' : '不足';
  const percentage = Math.abs(avgDeviation).toFixed(0);

  let suggestion = `您已连续${days}天${name}摄入${direction}约${percentage}%。`;

  if (nutrient === 'protein') {
    if (avgDeviation > 0) {
      suggestion += '建议调整饮食结构，减少肉类摄入，增加蔬菜水果比例。';
    } else {
      suggestion += '蛋白质摄入不足可能影响肌肉合成，建议每餐增加鸡蛋、瘦肉或豆制品。';
    }
  } else if (nutrient === 'carbs') {
    if (avgDeviation > 0) {
      suggestion += '碳水摄入过多可能导致体重增加，建议减少精制主食，选择全谷物。';
    } else {
      suggestion += '碳水不足可能导致能量不足，建议适当增加主食摄入。';
    }
  } else if (nutrient === 'fat') {
    if (avgDeviation > 0) {
      suggestion += '脂肪摄入过多不利于心血管健康，建议减少油炸食物和肥肉。';
    } else {
      suggestion += '适量脂肪有助于维生素吸收，建议增加坚果、深海鱼等健康脂肪。';
    }
  } else {
    if (avgDeviation > 0) {
      suggestion += '热量摄入持续超标可能导致体重增加，建议适当减少食量或增加运动。';
    } else {
      suggestion += '热量摄入不足可能影响健康，建议适当增加食量，保证营养充足。';
    }
  }

  return suggestion;
}

/**
 * 生成周报告
 */
export async function generateWeeklyReport(
  memberId: string
): Promise<WeeklyReport> {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // 最近7天

  // 获取期间的营养数据
  const targets = await db.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // 计算平均值
  const avgCalories =
    targets.reduce((sum, t) => sum + t.actualCalories, 0) / targets.length || 0;
  const avgProtein =
    targets.reduce((sum, t) => sum + t.actualProtein, 0) / targets.length || 0;
  const avgCarbs =
    targets.reduce((sum, t) => sum + t.actualCarbs, 0) / targets.length || 0;
  const avgFat =
    targets.reduce((sum, t) => sum + t.actualFat, 0) / targets.length || 0;

  const checkInDays = targets.filter((t) => t.isCompleted).length;
  const checkInRate = (checkInDays / 7) * 100;

  // 分析偏差
  const deviationAnalysis = await analyzePeriodDeviation(memberId, 7);

  // 生成建议
  const recommendations: string[] = [];

  // 打卡率建议
  if (checkInRate < 70) {
    recommendations.push(
      '本周打卡率较低，建议坚持每日记录饮食，以便更好地追踪营养摄入。'
    );
  } else if (checkInRate === 100) {
    recommendations.push('恭喜！本周打卡率100%，继续保持！');
  }

  // 偏差建议
  deviationAnalysis.issues.forEach((issue) => {
    recommendations.push(issue.suggestion);
  });

  // 判断趋势（对比前一周）
  const previousWeekStart = new Date(startDate);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(startDate);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

  const previousWeekTargets = await db.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: previousWeekStart,
        lte: previousWeekEnd,
      },
    },
  });

  let trend: 'improving' | 'stable' | 'declining' = 'stable';

  if (previousWeekTargets.length > 0) {
    // 计算前一周的平均偏差
    const thisWeekAvgDeviation =
      targets.reduce(
        (sum, t) =>
          sum +
          Math.abs(t.caloriesDeviation) +
          Math.abs(t.proteinDeviation) +
          Math.abs(t.carbsDeviation) +
          Math.abs(t.fatDeviation),
        0
      ) /
      (targets.length * 4);

    const lastWeekAvgDeviation =
      previousWeekTargets.reduce(
        (sum, t) =>
          sum +
          Math.abs(t.caloriesDeviation) +
          Math.abs(t.proteinDeviation) +
          Math.abs(t.carbsDeviation) +
          Math.abs(t.fatDeviation),
        0
      ) /
      (previousWeekTargets.length * 4);

    if (thisWeekAvgDeviation < lastWeekAvgDeviation * 0.9) {
      trend = 'improving';
    } else if (thisWeekAvgDeviation > lastWeekAvgDeviation * 1.1) {
      trend = 'declining';
    }
  }

  return {
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      checkInRate,
    },
    deviations: deviationAnalysis.issues.map((issue) => ({
      nutrient: issue.nutrient as any,
      target: 0, // 这里需要从targets中获取平均目标值
      actual: 0, // 这里需要从targets中获取平均实际值
      deviation: issue.avgDeviation,
      status: issue.severity === 'severe' ? 'critical' : 'high',
      severity: issue.severity,
      suggestion: issue.suggestion,
    })),
    recommendations,
    trend,
  };
}

/**
 * 获取剩余餐次建议
 */
export async function getRemainingMealSuggestion(
  memberId: string,
  date: Date
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  suggestions: string[];
}> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // 获取当日营养目标
  const target = await db.dailyNutritionTarget.findUnique({
    where: {
      memberId_date: {
        memberId,
        date: targetDate,
      },
    },
  });

  if (!target) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      suggestions: ['暂无营养目标数据'],
    };
  }

  // 计算剩余应摄入量
  const remaining = {
    calories: Math.max(0, target.targetCalories - target.actualCalories),
    protein: Math.max(0, target.targetProtein - target.actualProtein),
    carbs: Math.max(0, target.targetCarbs - target.actualCarbs),
    fat: Math.max(0, target.targetFat - target.actualFat),
  };

  // 生成建议
  const suggestions: string[] = [];

  if (remaining.calories > 100) {
    suggestions.push(`建议剩余餐次摄入约${Math.round(remaining.calories)}kcal`);
  }

  if (remaining.protein > 10) {
    suggestions.push(
      `蛋白质还差${Math.round(remaining.protein)}g，建议增加鸡蛋、鸡胸肉等高蛋白食物`
    );
  }

  if (remaining.carbs > 20) {
    suggestions.push(
      `碳水化合物还差${Math.round(remaining.carbs)}g，建议适当增加主食摄入`
    );
  }

  if (remaining.fat > 5) {
    suggestions.push(
      `脂肪还差${Math.round(remaining.fat)}g，建议增加坚果或橄榄油等健康脂肪`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('今日营养摄入已达标，无需额外补充');
  }

  return {
    ...remaining,
    suggestions,
  };
}

