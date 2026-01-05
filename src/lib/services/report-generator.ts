/**
 * Report Generator
 * 健康报告生成服务
 *
 * 生成周报和月报，包含健康数据汇总、趋势分析和个性化建议
 */

import { analyticsService } from "./analytics-service";
import { healthScoreCalculator } from "./health-score-calculator";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { prisma } from "@/lib/db";

export interface WeeklyReport {
  period: {
    start: Date;
    end: Date;
  };
  memberName: string;
  summary: {
    weightChange: number;
    weightChangePercent: number;
    currentWeight: number | null;
    targetWeight: number | null;
    healthScore: number;
    dataCompletenessRate: number;
  };
  weightTrend: {
    min: number;
    max: number;
    average: number;
    dataPoints: number;
  };
  nutritionSummary: {
    targetCalories: number | null;
    adherenceRate: number;
  };
  goalProgress: Array<{
    goalType: string;
    currentProgress: number;
    onTrack: boolean;
  }>;
  insights: string[];
  recommendations: string[];
}

export interface MonthlyReport extends WeeklyReport {
  weeklyBreakdown: Array<{
    week: string;
    averageWeight: number;
    dataCompletenessRate: number;
  }>;
}

export class ReportGenerator {
  /**
   * 生成周报
   */
  async generateWeeklyReport(
    memberId: string,
    memberName: string,
  ): Promise<WeeklyReport> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 获取过去7天的数据
    const [weightTrend, nutritionSummary, goalProgress, healthScore] =
      await Promise.all([
        analyticsService.analyzeWeightTrend(memberId, 7),
        analyticsService.summarizeNutrition(memberId, "weekly"),
        analyticsService.calculateGoalProgress(memberId),
        healthScoreCalculator.calculateHealthScore(memberId),
      ]);

    // 生成洞察
    const insights = this.generateInsights(
      weightTrend,
      nutritionSummary,
      goalProgress,
      healthScore,
    );

    return {
      period: {
        start: weekStart,
        end: weekEnd,
      },
      memberName,
      summary: {
        weightChange: weightTrend.change,
        weightChangePercent: weightTrend.changePercent,
        currentWeight: weightTrend.currentWeight,
        targetWeight: weightTrend.targetWeight,
        healthScore: healthScore.totalScore,
        dataCompletenessRate: healthScore.details.dataCompletenessRate,
      },
      weightTrend: {
        min: weightTrend.min,
        max: weightTrend.max,
        average: weightTrend.average,
        dataPoints: weightTrend.data.length,
      },
      nutritionSummary: {
        targetCalories: nutritionSummary.targetCalories,
        adherenceRate: nutritionSummary.adherenceRate,
      },
      goalProgress: goalProgress.map((g) => ({
        goalType: g.goalType,
        currentProgress: g.currentProgress,
        onTrack: g.onTrack,
      })),
      insights,
      recommendations: healthScore.recommendations,
    };
  }

  /**
   * 生成月报
   */
  async generateMonthlyReport(
    memberId: string,
    memberName: string,
  ): Promise<MonthlyReport> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 获取过去30天的数据
    const [weightTrend, nutritionSummary, goalProgress, healthScore] =
      await Promise.all([
        analyticsService.analyzeWeightTrend(memberId, 30),
        analyticsService.summarizeNutrition(memberId, "monthly"),
        analyticsService.calculateGoalProgress(memberId),
        healthScoreCalculator.calculateHealthScore(memberId),
      ]);

    // 生成周度分解
    const weeklyBreakdown = await this.generateWeeklyBreakdown(memberId);

    // 生成洞察
    const insights = this.generateInsights(
      weightTrend,
      nutritionSummary,
      goalProgress,
      healthScore,
    );

    return {
      period: {
        start: monthStart,
        end: monthEnd,
      },
      memberName,
      summary: {
        weightChange: weightTrend.change,
        weightChangePercent: weightTrend.changePercent,
        currentWeight: weightTrend.currentWeight,
        targetWeight: weightTrend.targetWeight,
        healthScore: healthScore.totalScore,
        dataCompletenessRate: healthScore.details.dataCompletenessRate,
      },
      weightTrend: {
        min: weightTrend.min,
        max: weightTrend.max,
        average: weightTrend.average,
        dataPoints: weightTrend.data.length,
      },
      nutritionSummary: {
        targetCalories: nutritionSummary.targetCalories,
        adherenceRate: nutritionSummary.adherenceRate,
      },
      goalProgress: goalProgress.map((g) => ({
        goalType: g.goalType,
        currentProgress: g.currentProgress,
        onTrack: g.onTrack,
      })),
      insights,
      recommendations: healthScore.recommendations,
      weeklyBreakdown,
    };
  }

  /**
   * 生成周度分解数据
   * 将月度数据按周分解，用于月度报告中的周对比
   */
  private async generateWeeklyBreakdown(
    memberId: string,
  ): Promise<
    Array<{ week: string; averageWeight: number; dataCompletenessRate: number }>
  > {
    // 获取过去30天的数据
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // 查询该时间段内的健康数据
      const healthData = await prisma.healthData.findMany({
        where: {
          memberId,
          measuredAt: {
            gte: thirtyDaysAgo,
            lte: now,
          },
        },
        orderBy: { measuredAt: "asc" },
      });

      if (healthData.length === 0) {
        return [];
      }

      // 按周分组
      const weeklyData = new Map<
        string,
        { weights: number[]; totalDays: Set<string> }
      >();

      healthData.forEach((data) => {
        const date = new Date(data.measuredAt);
        const weekNum = Math.ceil(date.getDate() / 7); // 第几周
        const weekKey = `第${weekNum}周`;

        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, { weights: [], totalDays: new Set() });
        }

        const week = weeklyData.get(weekKey)!;
        if (data.weight !== null) {
          week.weights.push(data.weight);
        }
        week.totalDays.add(date.toISOString().split("T")[0]);
      });

      // 计算每周的平均值
      const breakdown: Array<{
        week: string;
        averageWeight: number;
        dataCompletenessRate: number;
      }> = [];

      weeklyData.forEach((data, week) => {
        const averageWeight =
          data.weights.length > 0
            ? data.weights.reduce((sum, w) => sum + w, 0) / data.weights.length
            : 0;

        // 数据完整性：记录天数 / 7天
        const dataCompletenessRate = Math.min(
          100,
          (data.totalDays.size / 7) * 100,
        );

        breakdown.push({
          week,
          averageWeight: Math.round(averageWeight * 10) / 10,
          dataCompletenessRate: Math.round(dataCompletenessRate),
        });
      });

      return breakdown;
    } catch (error) {
      console.error("生成周度分解数据失败:", error);
      return [];
    }
  }

  /**
   * 生成洞察
   */
  private generateInsights(
    weightTrend: any,
    nutritionSummary: any,
    goalProgress: any[],
    healthScore: any,
  ): string[] {
    const insights: string[] = [];

    // 体重变化洞察
    if (Math.abs(weightTrend.changePercent) > 3) {
      insights.push(
        `本周体重${weightTrend.change >= 0 ? "增加" : "减少"}了${Math.abs(weightTrend.changePercent).toFixed(1)}%，${weightTrend.change >= 0 ? "建议关注饮食控制" : "继续保持良好习惯"}`,
      );
    }

    // 目标进度洞察
    const activeGoals = goalProgress.filter((g) => g.onTrack);
    if (activeGoals.length > 0) {
      insights.push(
        `您有${activeGoals.length}个健康目标正在按计划进行中，继续保持！`,
      );
    } else if (goalProgress.length > 0) {
      const offTrackGoals = goalProgress.filter((g) => !g.onTrack);
      if (offTrackGoals.length > 0) {
        insights.push(
          `有${offTrackGoals.length}个目标进度滞后，建议调整计划或咨询专业人士`,
        );
      }
    }

    // 数据完整性洞察
    if (healthScore.details.dataCompletenessRate < 50) {
      insights.push(
        `数据完整性较低（${Math.round(healthScore.details.dataCompletenessRate)}%），建议每天记录健康数据以获得更准确的洞察`,
      );
    }

    // 健康评分洞察
    if (healthScore.totalScore >= 80) {
      insights.push("您的健康评分表现优秀，继续保持当前的健康习惯！");
    } else if (healthScore.totalScore < 60) {
      insights.push(
        `健康评分为${healthScore.totalScore}分，建议根据系统建议改进健康习惯`,
      );
    }

    return insights;
  }

  /**
   * 格式化报告为文本（用于导出）
   */
  formatReportAsText(report: WeeklyReport | MonthlyReport): string {
    const isMonthly = "weeklyBreakdown" in report;
    const periodLabel = isMonthly ? "月度" : "周度";
    const periodRange = `${format(report.period.start, "yyyy年MM月dd日")} - ${format(report.period.end, "yyyy年MM月dd日")}`;

    let text = `# ${periodLabel}健康报告\n\n`;
    text += `**成员**: ${report.memberName}\n`;
    text += `**报告期间**: ${periodRange}\n\n`;

    text += "## 数据摘要\n\n";
    text += `- 当前体重: ${report.summary.currentWeight?.toFixed(1) || "--"} kg\n`;
    if (report.summary.targetWeight) {
      text += `- 目标体重: ${report.summary.targetWeight.toFixed(1)} kg\n`;
    }
    text += `- 体重变化: ${report.summary.weightChange >= 0 ? "+" : ""}${report.summary.weightChange.toFixed(1)} kg (${report.summary.weightChangePercent >= 0 ? "+" : ""}${report.summary.weightChangePercent.toFixed(1)}%)\n`;
    text += `- 健康评分: ${report.summary.healthScore} 分\n`;
    text += `- 数据完整性: ${Math.round(report.summary.dataCompletenessRate)}%\n\n`;

    text += "## 体重趋势\n\n";
    text += `- 最高: ${report.weightTrend.max.toFixed(1)} kg\n`;
    text += `- 最低: ${report.weightTrend.min.toFixed(1)} kg\n`;
    text += `- 平均: ${report.weightTrend.average.toFixed(1)} kg\n`;
    text += `- 记录次数: ${report.weightTrend.dataPoints} 次\n\n`;

    if (report.nutritionSummary.targetCalories) {
      text += "## 营养摄入\n\n";
      text += `- 目标热量: ${report.nutritionSummary.targetCalories} kcal\n`;
      text += `- 达标率: ${report.nutritionSummary.adherenceRate.toFixed(0)}%\n\n`;
    }

    if (report.goalProgress.length > 0) {
      text += "## 目标进度\n\n";
      report.goalProgress.forEach((goal) => {
        const goalTypeLabel =
          goal.goalType === "LOSE_WEIGHT"
            ? "减重"
            : goal.goalType === "GAIN_MUSCLE"
              ? "增肌"
              : goal.goalType === "MAINTAIN"
                ? "维持"
                : "改善健康";
        text += `- ${goalTypeLabel}: ${Math.round(goal.currentProgress)}% ${goal.onTrack ? "✓" : "⚠"}\n`;
      });
      text += "\n";
    }

    if (report.insights.length > 0) {
      text += "## 数据洞察\n\n";
      report.insights.forEach((insight) => {
        text += `- ${insight}\n`;
      });
      text += "\n";
    }

    if (report.recommendations.length > 0) {
      text += "## 改进建议\n\n";
      report.recommendations.forEach((rec) => {
        text += `- ${rec}\n`;
      });
      text += "\n";
    }

    return text;
  }
}

// 导出单例
export const reportGenerator = new ReportGenerator();
