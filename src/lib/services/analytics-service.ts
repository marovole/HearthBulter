/**
 * Analytics Service
 * 健康数据分析服务
 * 
 * 提供体重趋势分析、营养摄入汇总、目标进度计算和异常检测功能
 */

import { prisma } from '@/lib/db';
import { calculateBMI, calculateProgress } from '@/lib/health-calculations';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface WeightTrendAnalysis {
  data: Array<{ date: Date; weight: number }>
  min: number
  max: number
  average: number
  change: number // 变化值（正数表示增加，负数表示减少）
  changePercent: number // 变化百分比
  currentWeight: number | null
  targetWeight: number | null
  anomalies: Array<{
    date: Date
    weight: number
    reason: string
    severity: 'low' | 'medium' | 'high'
  }>
}

export interface NutritionSummary {
  period: 'daily' | 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  targetCalories: number | null
  targetCarbs: number | null
  targetProtein: number | null
  targetFat: number | null
  actualCalories: number | null // 暂时为null，meal-planning完成后填充
  actualCarbs: number | null
  actualProtein: number | null
  actualFat: number | null
  adherenceRate: number // 达标率 0-100
}

export interface GoalProgress {
  goalId: string
  goalType: string
  currentProgress: number // 0-100
  startWeight: number | null
  currentWeight: number | null
  targetWeight: number | null
  startDate: Date
  targetDate: Date | null
  estimatedCompletionDate: Date | null
  weeksRemaining: number | null
  onTrack: boolean
}

export class AnalyticsService {
  /**
   * 分析体重趋势
   * @param memberId 成员ID
   * @param days 分析天数（默认30天）
   */
  async analyzeWeightTrend(
    memberId: string,
    days: number = 30
  ): Promise<WeightTrendAnalysis> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // 获取成员信息和健康目标
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        healthGoals: {
          where: {
            status: 'ACTIVE',
            goalType: { in: ['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new Error('成员不存在');
    }

    // 查询健康数据
    const healthData = await prisma.healthData.findMany({
      where: {
        memberId,
        weight: { not: null },
        measuredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { measuredAt: 'asc' },
    });

    const weightData = healthData.map((d) => ({
      date: d.measuredAt,
      weight: d.weight!,
    }));

    if (weightData.length === 0) {
      const activeGoal = member.healthGoals[0];
      return {
        data: [],
        min: 0,
        max: 0,
        average: 0,
        change: 0,
        changePercent: 0,
        currentWeight: member.weight,
        targetWeight: activeGoal?.targetWeight || null,
        anomalies: [],
      };
    }

    const weights = weightData.map((d) => d.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const average = weights.reduce((a, b) => a + b, 0) / weights.length;

    const firstWeight = weightData[0].weight;
    const lastWeight = weightData[weightData.length - 1].weight;
    const change = lastWeight - firstWeight;
    const changePercent = firstWeight > 0 ? (change / firstWeight) * 100 : 0;

    // 异常检测：检测突增/突降
    const anomalies = this.detectWeightAnomalies(weightData);

    const activeGoal = member.healthGoals[0];

    return {
      data: weightData,
      min,
      max,
      average,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
      currentWeight: lastWeight,
      targetWeight: activeGoal?.targetWeight || null,
      anomalies,
    };
  }

  /**
   * 检测体重异常
   */
  private detectWeightAnomalies(
    weightData: Array<{ date: Date; weight: number }>
  ): Array<{
    date: Date
    weight: number
    reason: string
    severity: 'low' | 'medium' | 'high'
  }> {
    if (weightData.length < 2) return [];

    const anomalies: Array<{
      date: Date
      weight: number
      reason: string
      severity: 'low' | 'medium' | 'high'
    }> = [];

    // 计算移动平均（3天窗口）
    const windowSize = Math.min(3, weightData.length);
    for (let i = windowSize; i < weightData.length; i++) {
      const current = weightData[i];
      const previous = weightData[i - 1];

      // 计算前几天的平均
      const window = weightData.slice(
        Math.max(0, i - windowSize),
        i
      );
      const avgWeight =
        window.reduce((sum, d) => sum + d.weight, 0) / window.length;

      // 检测异常：变化超过平均值的10%
      const changePercent = Math.abs(
        ((current.weight - previous.weight) / previous.weight) * 100
      );

      if (changePercent > 5) {
        const severity =
          changePercent > 10 ? 'high' : changePercent > 7 ? 'medium' : 'low';
        const reason =
          current.weight > previous.weight
            ? `体重突增 ${changePercent.toFixed(1)}%`
            : `体重突降 ${changePercent.toFixed(1)}%`;

        anomalies.push({
          date: current.date,
          weight: current.weight,
          reason,
          severity,
        });
      }
    }

    return anomalies;
  }

  /**
   * 汇总营养摄入
   * @param memberId 成员ID
   * @param period 汇总周期
   */
  async summarizeNutrition(
    memberId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<NutritionSummary> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
    case 'daily':
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case 'weekly':
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'monthly':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    }

    // 获取成员的健康目标
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        healthGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new Error('成员不存在');
    }

    const activeGoal = member.healthGoals[0];

    // 暂时基于目标计算，meal-planning完成后可整合实际营养数据
    const targetCalories = activeGoal?.tdee || null;
    const targetCarbs = activeGoal?.carbRatio
      ? targetCalories
        ? Math.round((targetCalories * activeGoal.carbRatio) / 4)
        : null
      : null;
    const targetProtein = activeGoal?.proteinRatio
      ? targetCalories
        ? Math.round((targetCalories * activeGoal.proteinRatio) / 4)
        : null
      : null;
    const targetFat = activeGoal?.fatRatio
      ? targetCalories
        ? Math.round((targetCalories * activeGoal.fatRatio) / 9)
        : null
      : null;

    // TODO: 实际营养摄入数据（meal-planning完成后填充）
    const actualCalories = null;
    const actualCarbs = null;
    const actualProtein = null;
    const actualFat = null;

    // 计算达标率（暂时返回0，实际数据到位后计算）
    const adherenceRate = 0;

    return {
      period,
      startDate,
      endDate,
      targetCalories,
      targetCarbs,
      targetProtein,
      targetFat,
      actualCalories,
      actualCarbs,
      actualProtein,
      actualFat,
      adherenceRate,
    };
  }

  /**
   * 计算目标进度
   * @param memberId 成员ID
   */
  async calculateGoalProgress(memberId: string): Promise<GoalProgress[]> {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        healthGoals: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      throw new Error('成员不存在');
    }

    // 获取最新的体重数据
    const latestHealthData = await prisma.healthData.findFirst({
      where: {
        memberId,
        weight: { not: null },
      },
      orderBy: { measuredAt: 'desc' },
    });

    const currentWeight = latestHealthData?.weight || member.weight;

    const progress: GoalProgress[] = [];

    for (const goal of member.healthGoals) {
      if (
        !goal.targetWeight ||
        !goal.startWeight ||
        goal.goalType === 'IMPROVE_HEALTH'
      ) {
        continue;
      }

      const goalProgress = calculateProgress(
        goal.startWeight,
        currentWeight,
        goal.targetWeight
      );

      // 计算预计完成时间
      const startDate = goal.startDate;
      const targetDate = goal.targetDate;
      const now = new Date();

      let estimatedCompletionDate: Date | null = null;
      let weeksRemaining: number | null = null;

      if (currentWeight && goal.targetWeight && goal.startWeight) {
        const weightDiff = Math.abs(goal.targetWeight - currentWeight);
        const totalDiff = Math.abs(goal.targetWeight - goal.startWeight);
        const elapsedWeeks =
          (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000);

        if (goalProgress > 0 && elapsedWeeks > 0) {
          const weeklyRate = Math.abs(
            (currentWeight - goal.startWeight) / elapsedWeeks
          );
          if (weeklyRate > 0) {
            weeksRemaining = weightDiff / weeklyRate;
            estimatedCompletionDate = new Date(
              now.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000
            );
          }
        }
      }

      // 判断是否在正轨上
      const onTrack =
        targetDate && estimatedCompletionDate
          ? estimatedCompletionDate <= targetDate
          : true;

      progress.push({
        goalId: goal.id,
        goalType: goal.goalType,
        currentProgress: Math.max(0, Math.min(100, goalProgress)),
        startWeight: goal.startWeight,
        currentWeight,
        targetWeight: goal.targetWeight,
        startDate: goal.startDate,
        targetDate: goal.targetDate || null,
        estimatedCompletionDate,
        weeksRemaining: weeksRemaining ? Math.ceil(weeksRemaining) : null,
        onTrack,
      });
    }

    return progress;
  }

  /**
   * 获取仪表盘概览数据
   */
  async getDashboardOverview(memberId: string) {
    const [weightTrend, nutritionSummary, goalProgress] = await Promise.all([
      this.analyzeWeightTrend(memberId, 30),
      this.summarizeNutrition(memberId, 'daily'),
      this.calculateGoalProgress(memberId),
    ]);

    return {
      weightTrend,
      nutritionSummary,
      goalProgress,
    };
  }
}

// 导出单例
export const analyticsService = new AnalyticsService();

