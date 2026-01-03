/**
 * Daily Review Service
 * 每日复盘服务
 *
 * 负责生成每日复盘，包括任务执行情况统计、关键成就、偏差分析和明日建议
 *
 * @module daily-review-service
 */

import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

/**
 * 每日复盘数据
 */
export interface DailyReviewData {
  id: string;
  familyId: string;
  memberId: string;
  reviewDate: Date;
  totalTasks: number;
  completedTasks: number;
  skippedTasks: number;
  overdueTasks: number;
  summary: string | null;
  keyAchievements: string | null;
  deviations: DeviationAnalysis | null;
  tomorrowActions: TomorrowActions | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 明日行动建议
 */
interface TomorrowActions {
  actions: string[];
}

/**
 * 任务统计
 */
interface TaskStatistics {
  total: number;
  completed: number;
  skipped: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

/**
 * 偏差分析
 */
interface DeviationAnalysis {
  nutritionDeviations: number;
  missedHealthCheckIns: number;
  tasksCompletedLate: number;
  overallScore: number;
}

/**
 * Daily Review Service 类
 */
export class DailyReviewService {
  /**
   * 生成每日复盘
   *
   * @param familyId 家庭ID
   * @param memberId 成员ID
   * @param date 复盘日期（默认为昨天）
   * @returns 生成的每日复盘
   */
  async generateDailyReview(
    familyId: string,
    memberId: string,
    date: Date = subDays(new Date(), 1),
  ): Promise<DailyReviewData> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // 1. 聚合任务执行情况
    const taskStats = await this.getTaskStatistics(memberId, dayStart, dayEnd);

    // 2. 分析偏差
    const deviations = await this.analyzeDeviations(memberId, dayStart, dayEnd);

    // 3. 生成关键成就
    const keyAchievements = this.generateKeyAchievements(taskStats, deviations);

    // 4. 生成明日建议行动
    const tomorrowActions = this.generateTomorrowActions(taskStats, deviations);

    // 5. 生成摘要
    const summary = this.generateSummary(taskStats, deviations);

    // 6. 检查是否已存在该日期的复盘
    const existingReview = await prisma.dailyReview.findFirst({
      where: {
        memberId,
        reviewDate: dayStart,
      },
    });

    if (existingReview) {
      // 更新已存在的复盘
      return (await prisma.dailyReview.update({
        where: { id: existingReview.id },
        data: {
          totalTasks: taskStats.total,
          completedTasks: taskStats.completed,
          skippedTasks: taskStats.skipped,
          overdueTasks: taskStats.overdue,
          summary,
          keyAchievements,
          deviations: deviations as any,
          tomorrowActions: tomorrowActions as any,
        },
      })) as DailyReviewData;
    }

    // 创建新的复盘
    const review = await prisma.dailyReview.create({
      data: {
        familyId,
        memberId,
        reviewDate: dayStart,
        totalTasks: taskStats.total,
        completedTasks: taskStats.completed,
        skippedTasks: taskStats.skipped,
        overdueTasks: taskStats.overdue,
        summary,
        keyAchievements,
        deviations: deviations as any,
        tomorrowActions: tomorrowActions as any,
      },
    });

    return review as DailyReviewData;
  }

  /**
   * 获取最新复盘
   *
   * @param memberId 成员ID
   * @returns 最新的每日复盘，如果不存在则返回 null
   */
  async getLatestReview(memberId: string): Promise<DailyReviewData | null> {
    const review = await prisma.dailyReview.findFirst({
      where: { memberId },
      orderBy: { reviewDate: 'desc' },
    });

    return review as DailyReviewData | null;
  }

  /**
   * 获取复盘历史
   *
   * @param memberId 成员ID
   * @param days 天数
   * @returns 复盘历史列表
   */
  async getReviewHistory(
    memberId: string,
    days: number = 7,
  ): Promise<DailyReviewData[]> {
    const startDate = startOfDay(subDays(new Date(), days));

    const reviews = await prisma.dailyReview.findMany({
      where: {
        memberId,
        reviewDate: {
          gte: startDate,
        },
      },
      orderBy: { reviewDate: 'desc' },
    });

    return reviews as DailyReviewData[];
  }

  /**
   * 获取任务统计
   *
   * @param memberId 成员ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 任务统计数据
   */
  private async getTaskStatistics(
    memberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TaskStatistics> {
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: memberId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const skipped = tasks.filter((t) => t.skipReason !== null).length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'COMPLETED' || t.status === 'CANCELLED') {
        return false;
      }
      return new Date(t.dueDate) < endDate;
    }).length;

    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      skipped,
      inProgress,
      overdue,
      completionRate,
    };
  }

  /**
   * 分析偏差
   *
   * @param memberId 成员ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 偏差分析结果
   */
  private async analyzeDeviations(
    memberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DeviationAnalysis> {
    // 1. 检查营养偏差（简化版，实际需要更复杂的逻辑）
    const nutritionDeviations = 0; // TODO: 实现营养偏差检查

    // 2. 检查是否错过了健康打卡
    const missedHealthCheckIns = await this.countMissedHealthCheckIns(
      memberId,
      startDate,
      endDate,
    );

    // 3. 统计任务完成延迟情况
    const tasksCompletedLate = await this.countTasksCompletedLate(
      memberId,
      startDate,
      endDate,
    );

    // 4. 计算总体评分（0-100）
    const overallScore = this.calculateOverallScore({
      nutritionDeviations,
      missedHealthCheckIns,
      tasksCompletedLate,
    });

    return {
      nutritionDeviations,
      missedHealthCheckIns,
      tasksCompletedLate,
      overallScore,
    };
  }

  /**
   * 生成关键成就
   *
   * @param stats 任务统计
   * @param deviations 偏差分析
   * @returns 关键成就描述
   */
  private generateKeyAchievements(
    stats: TaskStatistics,
    deviations: DeviationAnalysis,
  ): string {
    const achievements: string[] = [];

    if (stats.completionRate >= 80) {
      achievements.push(`🎯 完成率达到 ${stats.completionRate}%，表现出色！`);
    }

    if (stats.completed >= 5) {
      achievements.push(`✅ 完成了 ${stats.completed} 个任务，保持良好势头！`);
    }

    if (deviations.overallScore >= 80) {
      achievements.push(
        `⭐ 健康管理评分 ${deviations.overallScore} 分，继续保持！`,
      );
    }

    if (stats.overdue === 0 && stats.total > 0) {
      achievements.push('⏰ 所有任务按时完成，时间管理很棒！');
    }

    return achievements.length > 0
      ? achievements.join('\n')
      : '今天完成了一些基础任务，明天继续加油！';
  }

  /**
   * 生成明日建议行动
   *
   * @param stats 任务统计
   * @param deviations 偏差分析
   * @returns 明日建议行动
   */
  private generateTomorrowActions(
    stats: TaskStatistics,
    deviations: DeviationAnalysis,
  ): any {
    const actions: string[] = [];

    // 根据完成率给出建议
    if (stats.completionRate < 50) {
      actions.push('📌 建议明天优先完成最重要的 2-3 个任务');
      actions.push('💡 如果任务太多，可以考虑调整优先级');
    } else if (stats.completionRate >= 80) {
      actions.push('🚀 今天表现很好，明天可以尝试挑战更难的任务');
    }

    // 根据偏差给出建议
    if (deviations.missedHealthCheckIns > 0) {
      actions.push(
        `📊 别忘了记录健康数据（今天错过了 ${deviations.missedHealthCheckIns} 次）`,
      );
    }

    if (deviations.tasksCompletedLate > 2) {
      actions.push('⏰ 建议明天早点开始处理任务，避免截止时间紧张');
    }

    return {
      actions,
      priority: actions.length > 0 ? 'NORMAL' : 'LOW',
    };
  }

  /**
   * 生成摘要
   *
   * @param stats 任务统计
   * @param deviations 偏差分析
   * @returns 摘要文本
   */
  private generateSummary(
    stats: TaskStatistics,
    deviations: DeviationAnalysis,
  ): string {
    const date = format(new Date(), 'yyyy年MM月dd日');
    const emoji = this.getSummaryEmoji(stats.completionRate);

    return (
      `${emoji} ${date} 的健康管理回顾\n\n` +
      `今天共处理了 ${stats.total} 个任务，完成了 ${stats.completed} 个，` +
      `完成率 ${stats.completionRate}%。\n\n${
        stats.overdue > 0
          ? `⚠️ 有 ${stats.overdue} 个任务逾期，明天需要优先处理。\n\n`
          : ''
      }整体评分：${deviations.overallScore} 分`
    );
  }

  /**
   * 获取摘要表情
   *
   * @param completionRate 完成率
   * @returns 表情符号
   */
  private getSummaryEmoji(completionRate: number): string {
    if (completionRate >= 80) return '🎉';
    if (completionRate >= 60) return '👍';
    if (completionRate >= 40) return '😊';
    return '💪';
  }

  /**
   * 统计错过的健康打卡次数
   *
   * @param memberId 成员ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 错过次数
   */
  private async countMissedHealthCheckIns(
    memberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // TODO: 实现健康打卡检查逻辑
    // 这里简化为返回 0，实际应该查询健康数据记录
    return 0;
  }

  /**
   * 统计延迟完成的任务数量
   *
   * @param memberId 成员ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 延迟完成数量
   */
  private async countTasksCompletedLate(
    memberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const lateTasks = await prisma.task.findMany({
      where: {
        assigneeId: memberId,
        status: 'COMPLETED',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
        dueDate: {
          not: null,
        },
      },
    });

    // 统计完成时间晚于截止时间的任务
    return lateTasks.filter((task) => {
      if (!task.dueDate || !task.completedAt) return false;
      return new Date(task.completedAt) > new Date(task.dueDate);
    }).length;
  }

  /**
   * 计算总体评分
   *
   * @param deviations 偏差数据
   * @returns 评分（0-100）
   */
  private calculateOverallScore(deviations: {
    nutritionDeviations: number;
    missedHealthCheckIns: number;
    tasksCompletedLate: number;
  }): number {
    let score = 100;

    // 每个营养偏差扣 5 分
    score -= deviations.nutritionDeviations * 5;

    // 每次错过健康打卡扣 10 分
    score -= deviations.missedHealthCheckIns * 10;

    // 每个延迟完成的任务扣 3 分
    score -= deviations.tasksCompletedLate * 3;

    return Math.max(0, Math.min(100, score));
  }
}

// 导出单例实例
export const dailyReviewService = new DailyReviewService();
