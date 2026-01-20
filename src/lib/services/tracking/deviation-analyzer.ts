import { convexTracking } from "@/lib/convex-tracking";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

interface DailyNutritionTargetDoc {
  targetCalories: number;
  actualCalories: number;
  caloriesDeviation: number;
  targetProtein: number;
  actualProtein: number;
  proteinDeviation: number;
  targetCarbs: number;
  actualCarbs: number;
  carbsDeviation: number;
  targetFat: number;
  actualFat: number;
  fatDeviation: number;
  isCompleted: boolean;
}

export interface DeviationAnalysis {
  nutrient: "calories" | "protein" | "carbs" | "fat";
  target: number;
  actual: number;
  deviation: number;
  status: "normal" | "low" | "high" | "critical";
  severity: "none" | "mild" | "moderate" | "severe";
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
  trend: "improving" | "stable" | "declining";
}

export async function analyzeDailyDeviation(
  memberId: string,
  date: Date,
): Promise<DeviationAnalysis[]> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const target = (await convexTracking.getDailyNutritionTarget(
    memberId,
    targetDate,
  )) as DailyNutritionTargetDoc | null;

  if (!target) {
    return [];
  }

  const analyses: DeviationAnalysis[] = [];

  const nutrients = [
    {
      name: "calories" as const,
      target: target.targetCalories,
      actual: target.actualCalories,
      deviation: target.caloriesDeviation,
    },
    {
      name: "protein" as const,
      target: target.targetProtein,
      actual: target.actualProtein,
      deviation: target.proteinDeviation,
    },
    {
      name: "carbs" as const,
      target: target.targetCarbs,
      actual: target.actualCarbs,
      deviation: target.carbsDeviation,
    },
    {
      name: "fat" as const,
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

function analyzeNutrientDeviation(data: {
  name: "calories" | "protein" | "carbs" | "fat";
  target: number;
  actual: number;
  deviation: number;
}): DeviationAnalysis {
  const { name, target, actual, deviation } = data;

  let status: "normal" | "low" | "high" | "critical" = "normal";
  let severity: "none" | "mild" | "moderate" | "severe" = "none";
  let suggestion: string | undefined;

  const absDeviation = Math.abs(deviation);

  if (absDeviation < 10) {
    status = "normal";
    severity = "none";
  } else if (absDeviation < 20) {
    status = deviation > 0 ? "high" : "low";
    severity = "mild";
  } else if (absDeviation < 30) {
    status = deviation > 0 ? "high" : "low";
    severity = "moderate";
  } else {
    status = "critical";
    severity = "severe";
  }

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

function generateSuggestion(
  nutrient: "calories" | "protein" | "carbs" | "fat",
  deviation: number,
  target: number,
  actual: number,
): string | undefined {
  const diff = Math.abs(target - actual);

  if (Math.abs(deviation) < 10) {
    return undefined;
  }

  const nutrientNames = {
    calories: "热量",
    protein: "蛋白质",
    carbs: "碳水化合物",
    fat: "脂肪",
  };

  const name = nutrientNames[nutrient];

  if (deviation > 0) {
    if (nutrient === "protein") {
      return `今日${name}摄入超标${diff.toFixed(0)}g，建议减少肉类、蛋类的摄入量。`;
    } else if (nutrient === "carbs") {
      return `今日${name}摄入超标${diff.toFixed(0)}g，建议减少米面、糖类的摄入量。`;
    } else if (nutrient === "fat") {
      return `今日${name}摄入超标${diff.toFixed(0)}g，建议减少油炸食物、肥肉的摄入量。`;
    } else {
      return `今日${name}摄入超标${diff.toFixed(0)}kcal，建议适当减少食量或增加运动。`;
    }
  } else {
    if (nutrient === "protein") {
      return `今日${name}摄入不足${diff.toFixed(0)}g，建议增加鸡蛋、鸡胸肉、豆制品等高蛋白食物。`;
    } else if (nutrient === "carbs") {
      return `今日${name}摄入不足${diff.toFixed(0)}g，建议适当增加主食（米饭、面条、全麦面包）的摄入。`;
    } else if (nutrient === "fat") {
      return `今日${name}摄入不足${diff.toFixed(0)}g，建议适当增加坚果、橄榄油等健康脂肪。`;
    } else {
      return `今日${name}摄入不足${diff.toFixed(0)}kcal，建议适当增加食量，确保营养充足。`;
    }
  }
}

export async function analyzePeriodDeviation(
  memberId: string,
  days: number = 7,
) {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));

  const targets = (await convexTracking.getDailyNutritionTargetsForPeriod(
    memberId,
    startDate,
    endDate,
  )) as DailyNutritionTargetDoc[];

  if (targets.length === 0) {
    return { hasIssues: false, issues: [] };
  }

  const issues: Array<{
    nutrient: string;
    avgDeviation: number;
    consecutiveDays: number;
    severity: "mild" | "moderate" | "severe";
    suggestion: string;
  }> = [];

  const nutrients = ["calories", "protein", "carbs", "fat"] as const;

  for (const nutrient of nutrients) {
    const deviations = targets.map((t) => {
      switch (nutrient) {
      case "calories":
        return t.caloriesDeviation;
      case "protein":
        return t.proteinDeviation;
      case "carbs":
        return t.carbsDeviation;
      case "fat":
        return t.fatDeviation;
      default:
        return 0;
      }
    });

    const avgDeviation =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    let consecutiveDays = 0;
    let currentStreak = 0;

    deviations.forEach((deviation) => {
      if (
        Math.abs(deviation) > 15 &&
        Math.sign(deviation) === Math.sign(avgDeviation)
      ) {
        currentStreak++;
        consecutiveDays = Math.max(consecutiveDays, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    if (consecutiveDays >= 3 && Math.abs(avgDeviation) > 15) {
      let severity: "mild" | "moderate" | "severe" = "mild";
      if (Math.abs(avgDeviation) > 30) {
        severity = "severe";
      } else if (Math.abs(avgDeviation) > 20) {
        severity = "moderate";
      }

      const nutrientNames = {
        calories: "热量",
        protein: "蛋白质",
        carbs: "碳水化合物",
        fat: "脂肪",
      };

      issues.push({
        nutrient: nutrientNames[nutrient],
        avgDeviation,
        consecutiveDays,
        severity,
        suggestion: generatePeriodSuggestion(
          nutrient,
          avgDeviation,
          consecutiveDays,
        ),
      });
    }
  }

  return {
    hasIssues: issues.length > 0,
    issues,
    analyzedDays: targets.length,
  };
}

function generatePeriodSuggestion(
  nutrient: "calories" | "protein" | "carbs" | "fat",
  avgDeviation: number,
  days: number,
): string {
  const nutrientNames = {
    calories: "热量",
    protein: "蛋白质",
    carbs: "碳水化合物",
    fat: "脂肪",
  };

  const name = nutrientNames[nutrient];
  const direction = avgDeviation > 0 ? "超标" : "不足";
  const percentage = Math.abs(avgDeviation).toFixed(0);

  let suggestion = `您已连续${days}天${name}摄入${direction}约${percentage}%。`;

  if (nutrient === "protein") {
    if (avgDeviation > 0) {
      suggestion += "建议调整饮食结构，减少肉类摄入，增加蔬菜水果比例。";
    } else {
      suggestion +=
        "蛋白质摄入不足可能影响肌肉合成，建议每餐增加鸡蛋、瘦肉或豆制品。";
    }
  } else if (nutrient === "carbs") {
    if (avgDeviation > 0) {
      suggestion +=
        "碳水摄入过多可能导致体重增加，建议减少精制主食，选择全谷物。";
    } else {
      suggestion += "碳水不足可能导致能量不足，建议适当增加主食摄入。";
    }
  } else if (nutrient === "fat") {
    if (avgDeviation > 0) {
      suggestion += "脂肪摄入过多不利于心血管健康，建议减少油炸食物和肥肉。";
    } else {
      suggestion +=
        "适量脂肪有助于维生素吸收，建议增加坚果、深海鱼等健康脂肪。";
    }
  } else {
    if (avgDeviation > 0) {
      suggestion +=
        "热量摄入持续超标可能导致体重增加，建议适当减少食量或增加运动。";
    } else {
      suggestion +=
        "热量摄入不足可能影响健康，建议适当增加食量，保证营养充足。";
    }
  }

  return suggestion;
}

export async function generateWeeklyReport(
  memberId: string,
): Promise<WeeklyReport> {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const targets = (await convexTracking.getDailyNutritionTargetsForPeriod(
    memberId,
    startDate,
    endDate,
  )) as DailyNutritionTargetDoc[];

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

  const deviationAnalysis = await analyzePeriodDeviation(memberId, 7);

  const recommendations: string[] = [];

  if (checkInRate < 70) {
    recommendations.push(
      "本周打卡率较低，建议坚持每日记录饮食，以便更好地追踪营养摄入。",
    );
  } else if (checkInRate === 100) {
    recommendations.push("恭喜！本周打卡率100%，继续保持！");
  }

  deviationAnalysis.issues.forEach((issue) => {
    recommendations.push(issue.suggestion);
  });

  const previousWeekStart = new Date(startDate);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(startDate);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

  const previousWeekTargets = (await convexTracking.getPreviousWeekTargets(
    memberId,
    previousWeekStart,
    previousWeekEnd,
  )) as DailyNutritionTargetDoc[];

  let trend: "improving" | "stable" | "declining" = "stable";

  if (previousWeekTargets.length > 0) {
    const thisWeekAvgDeviation =
      targets.reduce(
        (sum, t) =>
          sum +
          Math.abs(t.caloriesDeviation) +
          Math.abs(t.proteinDeviation) +
          Math.abs(t.carbsDeviation) +
          Math.abs(t.fatDeviation),
        0,
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
        0,
      ) /
      (previousWeekTargets.length * 4);

    if (thisWeekAvgDeviation < lastWeekAvgDeviation * 0.9) {
      trend = "improving";
    } else if (thisWeekAvgDeviation > lastWeekAvgDeviation * 1.1) {
      trend = "declining";
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
      target: 0,
      actual: 0,
      deviation: issue.avgDeviation,
      status: issue.severity === "severe" ? "critical" : "high",
      severity: issue.severity,
      suggestion: issue.suggestion,
    })),
    recommendations,
    trend,
  };
}

export async function getRemainingMealSuggestion(
  memberId: string,
  date: Date,
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  suggestions: string[];
}> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const target = (await convexTracking.getDailyNutritionTarget(
    memberId,
    targetDate,
  )) as DailyNutritionTargetDoc | null;

  if (!target) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      suggestions: ["暂无营养目标数据"],
    };
  }

  const remaining = {
    calories: Math.max(0, target.targetCalories - target.actualCalories),
    protein: Math.max(0, target.targetProtein - target.actualProtein),
    carbs: Math.max(0, target.targetCarbs - target.actualCarbs),
    fat: Math.max(0, target.targetFat - target.actualFat),
  };

  const suggestions: string[] = [];

  if (remaining.calories > 100) {
    suggestions.push(`建议剩余餐次摄入约${Math.round(remaining.calories)}kcal`);
  }

  if (remaining.protein > 10) {
    suggestions.push(
      `蛋白质还差${Math.round(remaining.protein)}g，建议增加鸡蛋、鸡胸肉等高蛋白食物`,
    );
  }

  if (remaining.carbs > 20) {
    suggestions.push(
      `碳水化合物还差${Math.round(remaining.carbs)}g，建议适当增加主食摄入`,
    );
  }

  if (remaining.fat > 5) {
    suggestions.push(
      `脂肪还差${Math.round(remaining.fat)}g，建议增加坚果或橄榄油等健康脂肪`,
    );
  }

  if (suggestions.length === 0) {
    suggestions.push("今日营养摄入已达标，无需额外补充");
  }

  return {
    ...remaining,
    suggestions,
  };
}

export function analyzeNutritionDeviations(
  nutritionData: Array<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>,
  nutritionGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  },
): Array<{
  nutrient: "calories" | "protein" | "carbs" | "fat";
  type: "DEFICIENCY" | "EXCESS";
  severity: "LOW" | "MEDIUM" | "HIGH";
  days: number;
  averageDeviation: number;
  trend: "WORSENING" | "IMPROVING" | "STABLE";
}> {
  if (nutritionData.length < 3) {
    return [];
  }

  const nutrients: Array<keyof typeof nutritionGoals> = [
    "calories",
    "protein",
    "carbs",
    "fat",
  ];

  return nutrients
    .map((nutrient) => {
      const target = nutritionGoals[nutrient];
      const deviations = nutritionData.map(
        (entry) => ((entry[nutrient] - target) / target) * 100,
      );
      const weightTotal = (deviations.length * (deviations.length + 1)) / 2;
      const weightedSum = deviations.reduce(
        (sum, value, index) => sum + value * (index + 1),
        0,
      );
      const averageDeviation = weightTotal ? weightedSum / weightTotal : 0;

      const severity = getDeviationSeverity(averageDeviation);
      if (severity === "NORMAL") {
        return null;
      }

      const trend = calculateTrendDirection(
        nutritionData.map((entry) => entry[nutrient]),
      );

      return {
        nutrient,
        type: (averageDeviation < 0 ? "DEFICIENCY" : "EXCESS") as
          | "DEFICIENCY"
          | "EXCESS",
        severity,
        days: nutritionData.length,
        averageDeviation,
        trend: trend.direction,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function calculateTrendDirection(data: number[]): {
  direction: "WORSENING" | "IMPROVING" | "STABLE";
  slope: number;
  strength: number;
} {
  if (data.length < 3) {
    return { direction: "STABLE", slope: 0, strength: 0 };
  }

  const first = data[0] ?? 0;
  const last = data[data.length - 1] ?? 0;
  const slope = (last - first) / Math.max(1, data.length - 1);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  const strength =
    range === 0 ? 0 : Math.min(1, Math.abs(last - first) / range);

  if (strength < 0.3) {
    return { direction: "STABLE", slope: 0, strength: 0 };
  }

  return {
    direction: slope > 0 ? "IMPROVING" : "WORSENING",
    slope,
    strength,
  };
}

export function detectAnomalyPatterns(
  data: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealsCount?: number;
  }>,
): Array<{
  type: "WEEKEND_OVEREATING" | "MEAL_SKIPPING" | "BINGE_EATING";
  description: string;
  severity: "HIGH" | "MODERATE" | "LOW";
  frequency: number;
}> {
  const patterns: Array<{
    type: "WEEKEND_OVEREATING" | "MEAL_SKIPPING" | "BINGE_EATING";
    description: string;
    severity: "HIGH" | "MODERATE" | "LOW";
    frequency: number;
  }> = [];

  if (data.length === 0) {
    return patterns;
  }

  const weekendCalories: number[] = [];
  const weekdayCalories: number[] = [];

  data.forEach((entry) => {
    const day = new Date(entry.date).getDay();
    if (day === 0 || day === 6) {
      weekendCalories.push(entry.calories);
    } else {
      weekdayCalories.push(entry.calories);
    }
  });

  if (weekendCalories.length >= 2 && weekdayCalories.length > 0) {
    const weekendAvg =
      weekendCalories.reduce((sum, value) => sum + value, 0) /
      weekendCalories.length;
    const weekdayAvg =
      weekdayCalories.reduce((sum, value) => sum + value, 0) /
      weekdayCalories.length;

    if (weekendAvg > weekdayAvg * 1.2) {
      patterns.push({
        type: "WEEKEND_OVEREATING",
        description: "周末热量摄入偏高",
        severity: "MODERATE",
        frequency: weekendCalories.length,
      });
    }
  }

  const skippedMeals = data.filter((entry) =>
    entry.mealsCount !== undefined ? entry.mealsCount < 3 : false,
  );

  if (skippedMeals.length >= 2) {
    patterns.push({
      type: "MEAL_SKIPPING",
      description: "存在漏餐情况",
      severity: "HIGH",
      frequency: skippedMeals.length,
    });
  }

  const avgCalories =
    data.reduce((sum, entry) => sum + entry.calories, 0) / data.length;
  const bingeDays = data.filter((entry) => entry.calories >= avgCalories * 1.4);

  if (bingeDays.length >= 2) {
    patterns.push({
      type: "BINGE_EATING",
      description: "存在暴饮暴食情况",
      severity: "HIGH",
      frequency: bingeDays.length,
    });
  }

  return patterns;
}

export function generateDeviationReport(
  deviations: Array<{
    nutrient: "calories" | "protein" | "carbs" | "fat";
    type: "DEFICIENCY" | "EXCESS";
    severity: "LOW" | "MEDIUM" | "HIGH";
    days: number;
    averageDeviation: number;
  }>,
  patterns: Array<{
    type: string;
    description: string;
    severity: string;
    frequency: number;
  }>,
  weeklyData: Array<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>,
): {
  summary: {
    totalDeviations: number;
    severityBreakdown: Record<"HIGH" | "MEDIUM" | "LOW" | "NORMAL", number>;
  };
  deviations: typeof deviations;
  patterns: typeof patterns;
  recommendations: Array<{
    type?: string;
    nutrient?: string;
    action?: string;
    description?: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
  weeklyStats: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
  };
} {
  const severityBreakdown = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    NORMAL: 0,
  };

  deviations.forEach((deviation) => {
    severityBreakdown[deviation.severity] += 1;
  });

  type DeviationNutrient = "calories" | "protein" | "carbs" | "fat";
  const nutrientActions: Record<DeviationNutrient, string> = {
    calories: "调整热量摄入",
    protein: "增加蛋白质摄入",
    carbs: "调整碳水摄入",
    fat: "调整脂肪摄入",
  };

  const recommendations: Array<{
    type?: string;
    nutrient?: string;
    action?: string;
    description?: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }> = deviations.map((deviation) => {
    const action =
      deviation.type === "DEFICIENCY"
        ? (nutrientActions[deviation.nutrient] ?? "增加营养摄入")
        : (nutrientActions[deviation.nutrient]?.replace("增加", "减少") ??
          "减少营养摄入");
    const priority: "HIGH" | "MEDIUM" =
      deviation.severity === "HIGH" ? "HIGH" : "MEDIUM";

    return {
      nutrient: deviation.nutrient,
      action,
      priority,
    };
  });

  if (deviations.length === 0) {
    recommendations.push({
      type: "MAINTENANCE",
      description: "保持当前饮食习惯即可",
      priority: "LOW",
    });
  }

  const avgCalories =
    weeklyData.reduce((sum, entry) => sum + entry.calories, 0) /
    (weeklyData.length || 1);
  const avgProtein =
    weeklyData.reduce((sum, entry) => sum + entry.protein, 0) /
    (weeklyData.length || 1);
  const avgCarbs =
    weeklyData.reduce((sum, entry) => sum + entry.carbs, 0) /
    (weeklyData.length || 1);
  const avgFat =
    weeklyData.reduce((sum, entry) => sum + entry.fat, 0) /
    (weeklyData.length || 1);

  return {
    summary: {
      totalDeviations: deviations.length,
      severityBreakdown,
    },
    deviations,
    patterns,
    recommendations,
    weeklyStats: {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
    },
  };
}

export function getDeviationSeverity(
  deviation: number,
): "HIGH" | "MEDIUM" | "LOW" | "NORMAL" {
  const absDeviation = Math.abs(deviation);

  if (deviation < 0) {
    if (absDeviation >= 45) {
      return "HIGH";
    }
    if (absDeviation >= 30) {
      return "MEDIUM";
    }
    if (absDeviation >= 15) {
      return "LOW";
    }
    return "NORMAL";
  }

  if (absDeviation >= 60) {
    return "HIGH";
  }
  if (absDeviation >= 30) {
    return "MEDIUM";
  }
  if (absDeviation >= 15) {
    return "LOW";
  }
  return "NORMAL";
}

function generateNutritionSuggestion(
  nutrient: "calories" | "protein" | "carbs" | "fat",
  deviation: number,
): string {
  const nutrientNames = {
    calories: "热量",
    protein: "蛋白质",
    carbs: "碳水化合物",
    fat: "脂肪",
  };

  const name = nutrientNames[nutrient];
  const direction = deviation > 0 ? "超标" : "不足";
  const percentage = Math.abs(deviation).toFixed(0);

  let suggestion = `${name}摄入${direction}约${percentage}%。`;

  if (deviation > 0) {
    suggestion += "建议适当减少相关食物摄入。";
  } else {
    suggestion += "建议适当增加相关食物摄入。";
  }

  return suggestion;
}
