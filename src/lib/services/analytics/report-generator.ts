import { convexClient, api } from "@/lib/convex-client";
import { analyzeTrend, TimeSeriesPoint } from "./trend-analyzer";

import { calculateHealthScore, getAverageScore } from "./health-scorer";
import { getPendingAnomalies } from "./anomaly-detector";
import {
  generateSecureShareToken,
  verifyShareToken,
} from "@/lib/security/token-generator";
import { logger } from "@/lib/logger";

export interface ReportData {
  member: {
    _id: string;
    name: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
    type: string;
  };
  summary: {
    totalDays: number;
    dataCompleteDays: number;
    averageScore: number;
  };
  trends: {
    weight?: TimeSeriesPoint[];
    calories?: TimeSeriesPoint[];
    exercise?: TimeSeriesPoint[];
    sleep?: TimeSeriesPoint[];
  };
  achievements: string[];
  concerns: string[];
  recommendations: string[];
  anomalies: Array<{
    title: string;
    description: string;
    severity: string;
  }>;
}

export async function generateReportData(
  memberId: string,
  reportType: string,
  startDate?: Date,
  endDate?: Date,
): Promise<ReportData> {
  const period = calculatePeriod(reportType as any, startDate, endDate);

  const member = await convexClient.query<{
    _id: string;
    name: string;
  } | null>(api.members.getById, { memberId: memberId });

  if (!member) {
    throw new Error("Member not found");
  }

  const totalDays = Math.ceil(
    (period.endDate.getTime() - period.startDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const mealLogsCount = await convexClient.query<number>(
    api.analytics.countMealLogs,
    {
      memberId: memberId,
      startDate: period.startDate.getTime(),
      endDate: period.endDate.getTime(),
    },
  );

  const dataCompleteDays = Math.min(mealLogsCount, totalDays);

  const averageScore = await getAverageScore(
    memberId,
    period.startDate,
    period.endDate,
  );

  const trends = await getTrendsForReport(
    memberId,
    period.startDate,
    period.endDate,
  );

  const achievements = await generateAchievements(
    memberId,
    period.startDate,
    period.endDate,
  );
  const concerns = await generateConcerns(
    memberId,
    period.startDate,
    period.endDate,
  );
  const recommendations = await generateRecommendations(
    memberId,
    period.startDate,
    period.endDate,
  );

  const anomalies = await convexClient.query<
    Array<{
      title: string;
      description: string;
      severity: string;
    }>
  >(api.analytics.listAnomaliesByMember, {
    memberId: memberId,
    startDate: period.startDate.getTime(),
    endDate: period.endDate.getTime(),
    limit: 5,
  });

  return {
    member,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
      type: reportType,
    },
    summary: {
      totalDays,
      dataCompleteDays,
      averageScore,
    },
    trends,
    achievements,
    concerns,
    recommendations,
    anomalies: anomalies.map((a) => ({
      title: a.title,
      description: a.description,
      severity: a.severity,
    })),
  };
}

export function generateHTMLReport(data: ReportData): string {
  const periodLabels = {
    WEEKLY: "周报",
    MONTHLY: "月报",
    QUARTERLY: "季报",
    CUSTOM: "健康报告",
  };
  const periodName =
    periodLabels[data.period.type as keyof typeof periodLabels] || "报告";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const gradeLabel = {
    90: { text: "优秀", color: "#10b981" },
    75: { text: "良好", color: "#3b82f6" },
    60: { text: "一般", color: "#f59e0b" },
    0: { text: "较差", color: "#ef4444" },
  };

  const grade =
    data.summary.averageScore >= 90
      ? gradeLabel[90]
      : data.summary.averageScore >= 75
        ? gradeLabel[75]
        : data.summary.averageScore >= 60
          ? gradeLabel[60]
          : gradeLabel[0];

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.member.name}的健康${periodName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px 12px 0 0; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header p { opacity: 0.9; }
    .content { padding: 2rem; }
    .section { margin-bottom: 2rem; }
    .section h2 { font-size: 1.5rem; margin-bottom: 1rem; color: #1f2937; border-left: 4px solid #667eea; padding-left: 1rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: #f9fafb; padding: 1.5rem; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 2rem; font-weight: bold; color: #667eea; margin: 0.5rem 0; }
    .summary-card .label { color: #6b7280; font-size: 0.9rem; }
    .score-badge { display: inline-block; padding: 0.5rem 1.5rem; border-radius: 999px; font-weight: bold; font-size: 1.2rem; background: ${grade.color}20; color: ${grade.color}; }
    .list { list-style: none; }
    .list li { padding: 0.75rem; margin-bottom: 0.5rem; background: #f9fafb; border-radius: 6px; border-left: 3px solid #667eea; }
    .achievement { border-left-color: #10b981; }
    .concern { border-left-color: #ef4444; }
    .recommendation { border-left-color: #3b82f6; }
    .anomaly { padding: 1rem; margin-bottom: 1rem; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 6px; }
    .anomaly-title { font-weight: bold; color: #991b1b; margin-bottom: 0.25rem; }
    .anomaly-desc { color: #7f1d1d; font-size: 0.9rem; }
    .footer { text-align: center; padding: 2rem; color: #6b7280; font-size: 0.9rem; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.member.name}的健康${periodName}</h1>
      <p>${formatDate(data.period.startDate)} 至 ${formatDate(data.period.endDate)}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📊 数据概览</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">统计天数</div>
            <div class="value">${data.summary.totalDays}</div>
            <div class="label">天</div>
          </div>
          <div class="summary-card">
            <div class="label">记录天数</div>
            <div class="value">${data.summary.dataCompleteDays}</div>
            <div class="label">天</div>
          </div>
          <div class="summary-card">
            <div class="label">平均健康评分</div>
            <div class="value">${data.summary.averageScore.toFixed(1)}</div>
            <div class="label">
              <span class="score-badge">${grade.text}</span>
            </div>
          </div>
        </div>
      </div>

      ${
        data.achievements.length > 0
          ? `
      <div class="section">
        <h2>🎉 本期成就</h2>
        <ul class="list">
          ${data.achievements.map((a) => `<li class="achievement">✅ ${a}</li>`).join("")}
        </ul>
      </div>
      `
          : ""
      }

      ${
        data.concerns.length > 0
          ? `
      <div class="section">
        <h2>⚠️ 需要关注</h2>
        <ul class="list">
          ${data.concerns.map((c) => `<li class="concern">⚠️ ${c}</li>`).join("")}
        </ul>
      </div>
      `
          : ""
      }

      ${
        data.anomalies.length > 0
          ? `
      <div class="section">
        <h2>🚨 异常检测</h2>
        ${data.anomalies
          .map(
            (a) => `
          <div class="anomaly">
            <div class="anomaly-title">${a.title}</div>
            <div class="anomaly-desc">${a.description}</div>
          </div>
        `,
          )
          .join("")}
      </div>
      `
          : ""
      }

      ${
        data.recommendations.length > 0
          ? `
      <div class="section">
        <h2>💡 改进建议</h2>
        <ul class="list">
          ${data.recommendations.map((r) => `<li class="recommendation">💡 ${r}</li>`).join("")}
        </ul>
      </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      <p>本报告由健康管家系统自动生成</p>
      <p>生成时间：${new Date().toLocaleString("zh-CN")}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function createReport(
  memberId: string,
  reportType: string,
  startDate?: Date,
  endDate?: Date,
) {
  const data = await generateReportData(
    memberId,
    reportType,
    startDate,
    endDate,
  );

  const htmlContent = generateHTMLReport(data);

  const periodLabels = {
    WEEKLY: "周报",
    MONTHLY: "月报",
    QUARTERLY: "季报",
    CUSTOM: "健康报告",
  };
  const periodName =
    periodLabels[reportType as keyof typeof periodLabels] || "报告";

  const title = `${data.member.name}的健康${periodName} - ${data.period.startDate.toLocaleDateString()}`;

  const summary = `统计${data.summary.totalDays}天，记录${data.summary.dataCompleteDays}天，平均健康评分${data.summary.averageScore.toFixed(1)}分`;

  const report = await convexClient.mutation(api.analytics.createHealthReport, {
    memberId: memberId,
    reportType,
    startDate: data.period.startDate.getTime(),
    endDate: data.period.endDate.getTime(),
    title,
    summary,
    htmlContent,
    dataSnapshot: JSON.stringify(data),
    insights: JSON.stringify({
      achievements: data.achievements,
      concerns: data.concerns,
      recommendations: data.recommendations,
    }),
    overallScore: data.summary.averageScore,
  });

  return report;
}

export async function generateShareToken(
  reportId: string,
  expiryDays: number = 7,
) {
  const report = await convexClient.query<{
    _id: string;
    memberId: string;
  } | null>(api.analytics.getHealthReportById, {
    reportId: reportId,
  });

  if (!report) {
    throw new Error("Report not found");
  }

  const token = await generateSecureShareToken(
    reportId,
    "health_report",
    report.memberId,
    expiryDays,
    ["read"],
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  await convexClient.mutation(api.analytics.updateHealthReportShareToken, {
    reportId: reportId,
    shareToken: token,
    shareExpiresAt: expiresAt.getTime(),
  });

  logger.info("生成报告分享Token", {
    reportId,
    expiryDays,
  });

  return token;
}

export async function getReportByShareToken(token: string) {
  const verificationResult = await verifyShareToken(token);

  if (!verificationResult.valid) {
    logger.warn("无效的分享Token", {
      error: verificationResult.error,
    });
    return null;
  }

  const payload = verificationResult.payload;

  if (payload?.resourceType !== "health_report") {
    logger.warn("Token资源类型不匹配", {
      expected: "health_report",
      actual: payload?.resourceType,
    });
    return null;
  }

  const reportId = payload.resourceId;

  const report = await convexClient.query<{
    _id: string;
    memberId: string;
    title: string;
    htmlContent: string;
    createdAt: number;
  } | null>(api.analytics.getHealthReportById, {
    reportId: reportId,
  });

  if (!report) {
    logger.warn("Token对应的报告不存在", { reportId });
    return null;
  }

  if (payload.ownerId !== report.memberId) {
    logger.warn("Token所有权验证失败", {
      tokenOwnerId: payload.ownerId,
      reportMemberId: report.memberId,
    });
    return null;
  }

  return report;
}

function calculatePeriod(
  reportType: string,
  customStartDate?: Date,
  customEndDate?: Date,
): { startDate: Date; endDate: Date } {
  if (reportType === "CUSTOM" && customStartDate && customEndDate) {
    return { startDate: customStartDate, endDate: customEndDate };
  }

  const endDate = new Date();
  const startDate = new Date();

  switch (reportType) {
    case "WEEKLY":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "MONTHLY":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "QUARTERLY":
      startDate.setMonth(endDate.getMonth() - 3);
      break;
  }

  return { startDate, endDate };
}

async function getTrendsForReport(
  memberId: string,
  startDate: Date,
  endDate: Date,
) {
  const trends: any = {};

  const weightTrend = await analyzeTrend(
    memberId,
    "WEIGHT",
    startDate,
    endDate,
  );
  if (weightTrend.dataPoints.length > 0) {
    trends.weight = weightTrend.dataPoints;
  }

  const caloriesTrend = await analyzeTrend(
    memberId,
    "CALORIES",
    startDate,
    endDate,
  );
  if (caloriesTrend.dataPoints.length > 0) {
    trends.calories = caloriesTrend.dataPoints;
  }

  const exerciseTrend = await analyzeTrend(
    memberId,
    "EXERCISE",
    startDate,
    endDate,
  );
  if (exerciseTrend.dataPoints.length > 0) {
    trends.exercise = exerciseTrend.dataPoints;
  }

  const sleepTrend = await analyzeTrend(memberId, "SLEEP", startDate, endDate);
  if (sleepTrend.dataPoints.length > 0) {
    trends.sleep = sleepTrend.dataPoints;
  }

  return trends;
}

async function generateAchievements(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  const achievements: string[] = [];

  const streak = await convexClient.query<{
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    badges: string;
  } | null>(api.analytics.getTrackingStreak, {
    memberId: memberId,
  });

  if (streak && streak.currentStreak >= 7) {
    achievements.push(`连续打卡${streak.currentStreak}天，坚持不懈！`);
  }

  const avgScore = await getAverageScore(memberId, startDate, endDate);
  if (avgScore >= 90) {
    achievements.push(`平均健康评分达到${avgScore.toFixed(1)}分，表现优秀！`);
  }

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

  if (goal) {
    const healthData = await convexClient.query<
      Array<{
        weight: number | null;
        measuredAt: number;
      }>
    >(api.health.listByMemberDateRange, {
      memberId: memberId,
      startDate: 0,
      endDate: endDate.getTime(),
    });

    const latestWeight = healthData
      .filter((d) => d.weight !== null)
      .sort((a, b) => b.measuredAt - a.measuredAt)[0];

    if (latestWeight?.weight && goal.startWeight && goal.targetWeight) {
      const progress = Math.abs(latestWeight.weight - goal.startWeight);
      const target = Math.abs(goal.targetWeight - goal.startWeight);
      const percentage = (progress / target) * 100;

      if (percentage >= 25) {
        achievements.push(
          `体重目标已完成${percentage.toFixed(0)}%，继续加油！`,
        );
      }
    }
  }

  return achievements;
}

async function generateConcerns(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  const concerns: string[] = [];

  const highSeverityAnomalies = await convexClient.query<number>(
    api.analytics.countAnomaliesByMember,
    {
      memberId: memberId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      severities: ["HIGH", "CRITICAL"],
      status: "PENDING",
    },
  );

  if (highSeverityAnomalies > 0) {
    concerns.push(`发现${highSeverityAnomalies}个需要关注的健康异常`);
  }

  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const recordedDays = await convexClient.query<number>(
    api.analytics.groupMealLogsByDate,
    {
      memberId: memberId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    },
  );

  const completeness = (recordedDays / totalDays) * 100;
  if (completeness < 50) {
    concerns.push(
      `数据记录完整度仅${completeness.toFixed(0)}%，建议提高记录频率`,
    );
  }

  return concerns;
}

async function generateRecommendations(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  const recommendations: string[] = [];

  const avgScore = await getAverageScore(memberId, startDate, endDate);

  if (avgScore < 70) {
    const recentScores = await convexClient.query<
      Array<{
        nutritionScore: number;
        exerciseScore: number;
        sleepScore: number;
        date: number;
      }>
    >(api.analytics.listHealthScores, {
      memberId: memberId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });

    if (recentScores.length > 0) {
      const sortedScores = recentScores
        .sort((a, b) => b.date - a.date)
        .slice(0, 7);

      const avgNutrition =
        sortedScores.reduce((sum, s) => sum + (s.nutritionScore || 0), 0) /
        sortedScores.length;
      const avgExercise =
        sortedScores.reduce((sum, s) => sum + (s.exerciseScore || 0), 0) /
        sortedScores.length;
      const avgSleep =
        sortedScores.reduce((sum, s) => sum + (s.sleepScore || 0), 0) /
        sortedScores.length;

      if (avgNutrition < 70) {
        recommendations.push("建议优化饮食结构，确保三大营养素均衡摄入");
      }
      if (avgExercise < 70) {
        recommendations.push("建议增加运动量，每周至少进行150分钟中等强度运动");
      }
      if (avgSleep < 70) {
        recommendations.push("建议改善睡眠质量，保持规律作息，每晚7-9小时睡眠");
      }
    }
  }

  recommendations.push("定期记录健康数据，帮助系统提供更准确的分析");
  recommendations.push("遇到异常情况请及时咨询专业医生");

  return recommendations;
}
