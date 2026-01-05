/**
 * 报告生成服务
 * 生成周报、月报、季报等健康分析报告
 */

import { PrismaClient, ReportType, FamilyMember } from "@prisma/client";
import { analyzeTrend, TimeSeriesPoint } from "./trend-analyzer";
import { calculateHealthScore, getAverageScore } from "./health-scorer";
import { getPendingAnomalies } from "./anomaly-detector";
import {
  generateSecureShareToken,
  verifyShareToken,
} from "@/lib/security/token-generator";
import { logger } from "@/lib/logger";

const prisma = new PrismaClient();

export interface ReportData {
  member: FamilyMember;
  period: {
    startDate: Date;
    endDate: Date;
    type: ReportType;
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

/**
 * 生成报告数据
 */
export async function generateReportData(
  memberId: string,
  reportType: ReportType,
  startDate?: Date,
  endDate?: Date,
): Promise<ReportData> {
  // 确定时间范围
  const period = calculatePeriod(reportType, startDate, endDate);

  // 获取成员信息
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  // 计算总天数和数据完整天数
  const totalDays = Math.ceil(
    (period.endDate.getTime() - period.startDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const mealLogsCount = await prisma.mealLog.count({
    where: {
      memberId,
      date: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
  });

  const dataCompleteDays = Math.min(mealLogsCount, totalDays);

  // 计算平均健康评分
  const averageScore = await getAverageScore(
    memberId,
    period.startDate,
    period.endDate,
  );

  // 获取趋势数据
  const trends = await getTrendsForReport(
    memberId,
    period.startDate,
    period.endDate,
  );

  // 生成成就、关注点和建议
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

  // 获取异常记录
  const anomalies = await prisma.healthAnomaly.findMany({
    where: {
      memberId,
      detectedAt: {
        gte: period.startDate,
        lte: period.endDate,
      },
    },
    orderBy: { detectedAt: "desc" },
    take: 5,
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

/**
 * 生成HTML报告
 */
export function generateHTMLReport(data: ReportData): string {
  const periodName = {
    WEEKLY: "周报",
    MONTHLY: "月报",
    QUARTERLY: "季报",
    CUSTOM: "健康报告",
  }[data.period.type];

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
      <!-- 概览 -->
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

      <!-- 成就 -->
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

      <!-- 关注点 -->
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

      <!-- 异常记录 -->
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

      <!-- 改进建议 -->
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

/**
 * 创建并保存报告
 */
export async function createReport(
  memberId: string,
  reportType: ReportType,
  startDate?: Date,
  endDate?: Date,
) {
  // 生成报告数据
  const data = await generateReportData(
    memberId,
    reportType,
    startDate,
    endDate,
  );

  // 生成HTML内容
  const htmlContent = generateHTMLReport(data);

  // 确定报告标题
  const periodName = {
    WEEKLY: "周报",
    MONTHLY: "月报",
    QUARTERLY: "季报",
    CUSTOM: "健康报告",
  }[reportType];

  const title = `${data.member.name}的健康${periodName} - ${data.period.startDate.toLocaleDateString()}`;

  // 生成摘要
  const summary = `统计${data.summary.totalDays}天，记录${data.summary.dataCompleteDays}天，平均健康评分${data.summary.averageScore.toFixed(1)}分`;

  // 保存到数据库
  const report = await prisma.healthReport.create({
    data: {
      memberId,
      reportType,
      startDate: data.period.startDate,
      endDate: data.period.endDate,
      title,
      summary,
      dataSnapshot: JSON.stringify(data),
      insights: JSON.stringify({
        achievements: data.achievements,
        concerns: data.concerns,
        recommendations: data.recommendations,
      }),
      overallScore: data.summary.averageScore,
      htmlContent,
      status: "COMPLETED",
    },
  });

  return report;
}

/**
 * 生成分享token
 * 使用安全的 JWT Token 替代不安全的 Math.random()
 */
export async function generateShareToken(
  reportId: string,
  expiryDays: number = 7,
) {
  // 获取报告信息以确认存在并获取所有者 ID
  const report = await prisma.healthReport.findUnique({
    where: { id: reportId },
    select: { id: true, memberId: true },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  // 生成安全的 JWT Token
  const token = await generateSecureShareToken(
    reportId,
    "health_report",
    report.memberId,
    expiryDays,
    ["read"],
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  // 更新数据库记录
  await prisma.healthReport.update({
    where: { id: reportId },
    data: {
      shareToken: token,
      shareExpiresAt: expiresAt,
    },
  });

  logger.info("生成报告分享Token", {
    reportId,
    expiryDays,
  });

  return token;
}

/**
 * 通过分享token获取报告
 * 使用 JWT 验证替代简单的数据库查询
 */
export async function getReportByShareToken(token: string) {
  // 首先验证 Token 的有效性
  const verificationResult = await verifyShareToken(token);

  if (!verificationResult.valid) {
    logger.warn("无效的分享Token", {
      error: verificationResult.error,
    });
    return null;
  }

  const payload = verificationResult.payload;

  // 验证资源类型
  if (payload?.resourceType !== "health_report") {
    logger.warn("Token资源类型不匹配", {
      expected: "health_report",
      actual: payload?.resourceType,
    });
    return null;
  }

  // 从 Token 中获取报告 ID
  const reportId = payload.resourceId;

  // 查询报告
  const report = await prisma.healthReport.findUnique({
    where: { id: reportId },
    include: { member: true },
  });

  if (!report) {
    logger.warn("Token对应的报告不存在", { reportId });
    return null;
  }

  // 验证所有权（Token 中的 ownerId 应该与报告的 memberId 匹配）
  if (payload.ownerId !== report.memberId) {
    logger.warn("Token所有权验证失败", {
      tokenOwnerId: payload.ownerId,
      reportMemberId: report.memberId,
    });
    return null;
  }

  return report;
}

// ==================== 私有辅助函数 ====================

/**
 * 计算报告时间范围
 */
function calculatePeriod(
  reportType: ReportType,
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

/**
 * 获取趋势数据
 */
async function getTrendsForReport(
  memberId: string,
  startDate: Date,
  endDate: Date,
) {
  const trends: any = {};

  // 体重趋势
  const weightTrend = await analyzeTrend(
    memberId,
    "WEIGHT",
    startDate,
    endDate,
  );
  if (weightTrend.dataPoints.length > 0) {
    trends.weight = weightTrend.dataPoints;
  }

  // 卡路里趋势
  const caloriesTrend = await analyzeTrend(
    memberId,
    "CALORIES",
    startDate,
    endDate,
  );
  if (caloriesTrend.dataPoints.length > 0) {
    trends.calories = caloriesTrend.dataPoints;
  }

  // 运动趋势
  const exerciseTrend = await analyzeTrend(
    memberId,
    "EXERCISE",
    startDate,
    endDate,
  );
  if (exerciseTrend.dataPoints.length > 0) {
    trends.exercise = exerciseTrend.dataPoints;
  }

  // 睡眠趋势
  const sleepTrend = await analyzeTrend(memberId, "SLEEP", startDate, endDate);
  if (sleepTrend.dataPoints.length > 0) {
    trends.sleep = sleepTrend.dataPoints;
  }

  return trends;
}

/**
 * 生成成就列表
 */
async function generateAchievements(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  const achievements: string[] = [];

  // 检查连续打卡
  const streak = await prisma.trackingStreak.findUnique({
    where: { memberId },
  });

  if (streak && streak.currentStreak >= 7) {
    achievements.push(`连续打卡${streak.currentStreak}天，坚持不懈！`);
  }

  // 检查健康评分
  const avgScore = await getAverageScore(memberId, startDate, endDate);
  if (avgScore >= 90) {
    achievements.push(`平均健康评分达到${avgScore.toFixed(1)}分，表现优秀！`);
  }

  // 检查体重目标
  const goal = await prisma.healthGoal.findFirst({
    where: {
      memberId,
      status: "ACTIVE",
      goalType: { in: ["LOSE_WEIGHT", "GAIN_MUSCLE"] },
    },
  });

  if (goal) {
    const latestWeight = await prisma.healthData.findFirst({
      where: {
        memberId,
        weight: { not: null },
        measuredAt: { lte: endDate },
      },
      orderBy: { measuredAt: "desc" },
    });

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

/**
 * 生成关注点列表
 */
async function generateConcerns(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  const concerns: string[] = [];

  // 检查异常记录
  const highSeverityAnomalies = await prisma.healthAnomaly.count({
    where: {
      memberId,
      detectedAt: {
        gte: startDate,
        lte: endDate,
      },
      severity: { in: ["HIGH", "CRITICAL"] },
      status: "PENDING",
    },
  });

  if (highSeverityAnomalies > 0) {
    concerns.push(`发现${highSeverityAnomalies}个需要关注的健康异常`);
  }

  // 检查数据记录完整度
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recordedDays = await prisma.mealLog.groupBy({
    by: ["date"],
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const completeness = (recordedDays.length / totalDays) * 100;
  if (completeness < 50) {
    concerns.push(
      `数据记录完整度仅${completeness.toFixed(0)}%，建议提高记录频率`,
    );
  }

  return concerns;
}

/**
 * 生成改进建议
 */
async function generateRecommendations(
  memberId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> {
  const recommendations: string[] = [];

  // 基于平均评分给出建议
  const avgScore = await getAverageScore(memberId, startDate, endDate);

  if (avgScore < 70) {
    // 获取最近的评分详情
    const recentScores = await prisma.healthScore.findMany({
      where: {
        memberId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
      take: 7,
    });

    if (recentScores.length > 0) {
      const avgNutrition =
        recentScores.reduce((sum, s) => sum + (s.nutritionScore || 0), 0) /
        recentScores.length;
      const avgExercise =
        recentScores.reduce((sum, s) => sum + (s.exerciseScore || 0), 0) /
        recentScores.length;
      const avgSleep =
        recentScores.reduce((sum, s) => sum + (s.sleepScore || 0), 0) /
        recentScores.length;

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

  // 添加通用建议
  recommendations.push("定期记录健康数据，帮助系统提供更准确的分析");
  recommendations.push("遇到异常情况请及时咨询专业医生");

  return recommendations;
}
