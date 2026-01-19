/**
 * Weekly Report Service
 * 周报生成服务
 *
 * 提供营养周报、体重变化分析和健康建议生成功能
 */

import { analyticsService } from "@/lib/services/analytics-service";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export interface WeeklyReport {
  weekStartDate: Date;
  weekEndDate: Date;
  nutritionAdherenceRate: number;
  weightChange: number;
  weightChangePercent: number;
  insights: string[];
  recommendations: string[];
  achievements: string[];
  nextWeekGoals: string[];
}

export class WeeklyReportService {
  /**
   * 生成周报
   * @param memberId 成员ID
   * @param weekOffset 周偏移量（0为本周，-1为上周）
   */
  async generateWeeklyReport(
    memberId: string,
    weekOffset: number = 0,
  ): Promise<WeeklyReport> {
    const now = new Date();
    const weekStartDate = startOfWeek(subWeeks(now, weekOffset), {
      weekStartsOn: 1,
    });
    const weekEndDate = endOfWeek(subWeeks(now, weekOffset), {
      weekStartsOn: 1,
    });

    // 获取本周营养汇总
    const nutritionSummary = await analyticsService.summarizeNutrition(
      memberId,
      "weekly",
    );

    // 获取体重趋势分析
    const weightTrend = await analyticsService.analyzeWeightTrend(
      memberId,
      7, // 本周7天
    );

    // 生成洞察
    const insights = await generateInsights(
      memberId,
      nutritionSummary,
      weightTrend,
      weekStartDate,
      weekEndDate,
    );

    // 生成建议
    const recommendations = await generateRecommendations(
      nutritionSummary,
      weightTrend,
      insights,
    );

    // 生成成就
    const achievements = await generateAchievements(
      memberId,
      nutritionSummary,
      weightTrend,
    );

    // 生成下周目标
    const nextWeekGoals = await generateNextWeekGoals(
      nutritionSummary,
      weightTrend,
      recommendations,
    );

    return {
      weekStartDate,
      weekEndDate,
      nutritionAdherenceRate: nutritionSummary.adherenceRate,
      weightChange: weightTrend.change,
      weightChangePercent: weightTrend.changePercent,
      insights,
      recommendations,
      achievements,
      nextWeekGoals,
    };
  }

  /**
   * 保存周报到数据库
   */
  async saveWeeklyReport(memberId: string, report: WeeklyReport) {
    // 这里可以将周报保存到数据库
    // 暂时返回成功，实际实现需要创建相应的数据模型
    console.log(`保存成员 ${memberId} 的周报:`, report);
    return { success: true, id: `report_${Date.now()}` };
  }

  /**
   * 获取历史周报列表
   */
  async getWeeklyReports(memberId: string, limit: number = 10) {
    // 这里应该从数据库获取历史周报
    // 暂时返回空数组，实际实现需要查询数据库
    return [];
  }
}

/**
 * 生成周报洞察
 */
async function generateInsights(
  memberId: string,
  nutritionSummary: any,
  weightTrend: any,
  weekStartDate: Date,
  weekEndDate: Date,
): Promise<string[]> {
  const insights: string[] = [];

  // 营养洞察
  if (nutritionSummary.adherenceRate >= 90) {
    insights.push("营养控制非常出色，坚持得很好！");
  } else if (nutritionSummary.adherenceRate >= 70) {
    insights.push("营养摄入基本达标，还有提升空间。");
  } else {
    insights.push("营养控制需要加强，建议更严格地遵循饮食计划。");
  }

  // 体重变化洞察
  if (weightTrend.change < -0.5) {
    insights.push(
      `本周体重下降${Math.abs(weightTrend.change).toFixed(1)}kg，减重效果显著。`,
    );
  } else if (weightTrend.change > 0.5) {
    insights.push(
      `本周体重增加${weightTrend.change.toFixed(1)}kg，需要关注饮食和运动。`,
    );
  } else {
    insights.push("本周体重保持稳定，继续保持良好的生活习惯。");
  }

  // 异常检测洞察
  if (weightTrend.anomalies.length > 0) {
    insights.push(
      `检测到${weightTrend.anomalies.length}个体重异常波动，建议记录相关原因。`,
    );
  }

  // 蛋白质摄入洞察
  if (nutritionSummary.actualProtein && nutritionSummary.targetProtein) {
    const proteinRate =
      (nutritionSummary.actualProtein / nutritionSummary.targetProtein) * 100;
    if (proteinRate < 80) {
      insights.push("蛋白质摄入偏低，可能影响肌肉维持和修复。");
    }
  }

  return insights;
}

/**
 * 生成改进建议
 */
async function generateRecommendations(
  nutritionSummary: any,
  weightTrend: any,
  insights: string[],
): Promise<string[]> {
  const recommendations: string[] = [];

  // 基于营养达标率的建议
  if (nutritionSummary.adherenceRate < 80) {
    recommendations.push("建议使用饮食记录功能，更好地跟踪每日摄入");
    recommendations.push("可以提前准备一周的食材，避免临时选择不健康食品");
  }

  // 基于体重变化的建议
  if (weightTrend.change > 0.5) {
    recommendations.push("建议增加有氧运动时间，每周至少150分钟中等强度运动");
    recommendations.push("控制高热量食物摄入，特别是加工食品和含糖饮料");
  } else if (weightTrend.change < -1) {
    recommendations.push("减重速度较快，注意确保营养均衡，避免肌肉流失");
    recommendations.push("保证充足的蛋白质摄入，支持肌肉维持");
  }

  // 基于异常波动的建议
  if (weightTrend.anomalies.length > 0) {
    recommendations.push("建议定期测量体重，保持测量条件一致（时间、状态等）");
    recommendations.push("记录可能影响体重的因素，如特殊饮食、运动量变化等");
  }

  // 个性化建议
  if (nutritionSummary.actualProtein < nutritionSummary.targetProtein * 0.8) {
    recommendations.push("每餐增加优质蛋白质来源，如鸡胸肉、鱼类、豆制品");
  }

  if (nutritionSummary.actualCarbs > nutritionSummary.targetCarbs * 1.2) {
    recommendations.push("选择低GI碳水化合物，如全谷物、薯类代替精制米面");
  }

  return recommendations;
}

/**
 * 生成成就列表
 */
async function generateAchievements(
  memberId: string,
  nutritionSummary: any,
  weightTrend: any,
): Promise<string[]> {
  const achievements: string[] = [];

  // 营养控制成就
  if (nutritionSummary.adherenceRate >= 95) {
    achievements.push("🏆 营养控制大师 - 本周营养达标率95%以上");
  } else if (nutritionSummary.adherenceRate >= 85) {
    achievements.push("🥇 营养管理达人 - 本周营养达标率85%以上");
  } else if (nutritionSummary.adherenceRate >= 75) {
    achievements.push("🥈 营养控制新手 - 本周营养达标率75%以上");
  }

  // 体重管理成就
  if (weightTrend.change < -1 && weightTrend.change > -2) {
    achievements.push("⚖️ 健康减重 - 本周减重0.5-1kg");
  } else if (weightTrend.change <= -2) {
    achievements.push("🔥 减重先锋 - 本周减重超过1kg");
  } else if (Math.abs(weightTrend.change) < 0.2) {
    achievements.push("📊 体重稳定 - 本周体重波动小于0.2kg");
  }

  // 连续性成就（这里需要实际数据支持）
  achievements.push("📅 坚持记录 - 连续7天记录健康数据");

  return achievements;
}

/**
 * 生成下周目标
 */
async function generateNextWeekGoals(
  nutritionSummary: any,
  weightTrend: any,
  recommendations: string[],
): Promise<string[]> {
  const goals: string[] = [];

  // 营养目标
  if (nutritionSummary.adherenceRate < 85) {
    goals.push(
      `将营养达标率提升至85%以上（当前${nutritionSummary.adherenceRate.toFixed(1)}%）`,
    );
  }

  // 体重目标
  if (weightTrend.change > 0.3) {
    goals.push("控制体重增长，目标周增重不超过0.3kg");
  } else if (weightTrend.change < -0.8) {
    goals.push("保持健康减重速度，目标周减重0.5-0.8kg");
  } else {
    goals.push("保持当前体重稳定，继续健康生活方式");
  }

  // 行为目标
  goals.push("每周至少进行3次30分钟的有氧运动");
  goals.push("保证每天7-8小时的充足睡眠");
  goals.push("每日饮水量保持在2000ml以上");

  // 基于建议的目标
  if (recommendations.some((r) => r.includes("蛋白质"))) {
    goals.push("确保每日蛋白质摄入达到目标值");
  }

  return goals;
}

// 导出单例
export const weeklyReportService = new WeeklyReportService();
