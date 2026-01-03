import type { NotificationRepository } from '@/lib/repositories/interfaces/notification-repository';
import type { BudgetRepository } from '@/lib/repositories/interfaces/budget-repository';
import type { FamilyRepository } from '@/lib/repositories/interfaces/family-repository';
import type { NotificationPriority } from '@/lib/repositories/types/notification';
import {
  BUDGET_NOTIFICATION_PRIORITY,
  BUDGET_NOTIFICATION_CHANNELS,
} from '@/lib/constants/budget';

/**
 * 通知数据接口
 */
interface NotificationData {
  userId: string;
  type: string;
  templateData: Record<string, string | number>;
  priority: NotificationPriority;
  channels: string[];
}

/**
 * 通知管理器接口（避免循环依赖）
 */
interface INotificationManager {
  sendNotification(data: NotificationData): Promise<void>;
  sendBulkNotifications(notifications: NotificationData[]): Promise<void>;
}

/**
 * 预算系统集成通知服务
 *
 * 使用扁平的依赖注入架构：
 * - NotificationManager 通过构造函数注入（由 container 创建）
 * - 使用接口类型避免编译时循环依赖
 */
export class BudgetNotificationService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly budgetRepo: BudgetRepository,
    private readonly familyRepo: FamilyRepository,
    private readonly notificationManager: INotificationManager,
  ) {}

  /**
   * 发送预算预警通知
   */
  async sendBudgetAlert(
    memberId: string,
    alertData: {
      budgetName: string;
      usagePercentage: number;
      threshold: number;
      remainingBudget?: number;
      totalBudget: number;
    },
  ): Promise<void> {
    try {
      const priority = this.getAlertPriority(alertData.threshold);
      const channels = this.getAlertChannels(alertData.threshold);
      // 使用注入的 notificationManager

      await this.notificationManager.sendNotification({
        userId: memberId,
        type: 'BUDGET_WARNING',
        templateData: {
          userName: await this.getUserName(memberId),
          budgetName: alertData.budgetName,
          usagePercentage: alertData.usagePercentage.toFixed(1),
          remainingBudget: alertData.remainingBudget?.toFixed(2) || '0',
          totalBudget: alertData.totalBudget.toFixed(2),
        },
        priority,
        channels,
        metadata: {
          budgetName: alertData.budgetName,
          usagePercentage: alertData.usagePercentage,
          threshold: alertData.threshold,
          alertType: 'BUDGET_WARNING',
        },
        actionUrl: '/budget/details',
        actionText: '查看预算',
        dedupKey: `budget_alert_${memberId}_${alertData.budgetName}`,
      });
    } catch (error) {
      console.error('Failed to send budget alert:', error);
    }
  }

  /**
   * 发送预算超支通知
   */
  async sendBudgetOverspend(
    memberId: string,
    overspendData: {
      budgetName: string;
      overspendAmount: number;
      totalSpent: number;
      budgetLimit: number;
    },
  ): Promise<void> {
    try {
      // 使用注入的 notificationManager
      await this.notificationManager.sendNotification({
        userId: memberId,
        type: 'BUDGET_WARNING',
        title: '预算超支提醒',
        content: `您的预算"${overspendData.budgetName}"已超支¥${overspendData.overspendAmount.toFixed(2)}，当前总支出¥${overspendData.totalSpent.toFixed(2)}，预算限额¥${overspendData.budgetLimit.toFixed(2)}。`,
        priority: 'high',
        channels: ['in_app', 'email', 'sms'],
        metadata: {
          budgetName: overspendData.budgetName,
          overspendAmount: overspendData.overspendAmount,
          alertType: 'BUDGET_OVERSPEND',
        },
        actionUrl: '/budget/analysis',
        actionText: '查看分析',
        dedupKey: `budget_overspend_${memberId}_${overspendData.budgetName}`,
      });
    } catch (error) {
      console.error('Failed to send budget overspend notification:', error);
    }
  }

  /**
   * 发送预算优化建议
   */
  async sendBudgetOptimizationTip(
    memberId: string,
    tipData: {
      budgetName: string;
      tip: string;
      potentialSavings: number;
      category?: string;
    },
  ): Promise<void> {
    try {
      // 使用注入的 notificationManager
      await this.notificationManager.sendNotification({
        userId: memberId,
        type: 'BUDGET_WARNING',
        title: '预算优化建议',
        content: `${tipData.tip}，预计可节省¥${tipData.potentialSavings.toFixed(2)}。`,
        priority: 'medium',
        channels: ['IN_APP', 'EMAIL'],
        metadata: {
          budgetName: tipData.budgetName,
          potentialSavings: tipData.potentialSavings,
          category: tipData.category,
          alertType: 'BUDGET_OPTIMIZATION',
        },
        actionUrl: '/budget/recommendations',
        actionText: '查看建议',
      });
    } catch (error) {
      console.error('Failed to send budget optimization tip:', error);
    }
  }

  /**
   * 发送预算周期结束通知
   */
  async sendBudgetPeriodSummary(
    memberId: string,
    summaryData: {
      budgetName: string;
      period: string;
      totalSpent: number;
      budgetLimit: number;
      savings: number;
      topCategories: Array<{
        category: string;
        amount: number;
        percentage: number;
      }>;
    },
  ): Promise<void> {
    try {
      const isUnderBudget = summaryData.totalSpent <= summaryData.budgetLimit;
      const priority = isUnderBudget ? 'medium' : 'high';

      // 使用注入的 notificationManager
      await this.notificationManager.sendNotification({
        userId: memberId,
        type: 'GOAL_ACHIEVEMENT',
        title: `预算${isUnderBudget ? '执行良好' : '超支'}总结`,
        content: `您的${summaryData.period}预算"${summaryData.budgetName}"已结束。总支出¥${summaryData.totalSpent.toFixed(2)}，${isUnderBudget ? '节省' : '超支'}¥${Math.abs(summaryData.savings).toFixed(2)}。`,
        priority,
        channels: ['IN_APP', 'EMAIL'],
        metadata: {
          budgetName: summaryData.budgetName,
          period: summaryData.period,
          totalSpent: summaryData.totalSpent,
          savings: summaryData.savings,
          topCategories: summaryData.topCategories,
          alertType: 'BUDGET_SUMMARY',
        },
        actionUrl: '/budget/reports',
        actionText: '查看详细报告',
      });
    } catch (error) {
      console.error('Failed to send budget period summary:', error);
    }
  }

  /**
   * 发送分类预算预警
   */
  async sendCategoryBudgetAlert(
    memberId: string,
    alertData: {
      budgetName: string;
      category: string;
      spent: number;
      budget: number;
      percentage: number;
    },
  ): Promise<void> {
    try {
      // 使用注入的 notificationManager
      await this.notificationManager.sendNotification({
        userId: memberId,
        type: 'BUDGET_WARNING',
        templateData: {
          userName: await this.getUserName(memberId),
          budgetName: alertData.budgetName,
          category: alertData.category,
          spent: alertData.spent.toFixed(2),
          budget: alertData.budget.toFixed(2),
          percentage: alertData.percentage.toFixed(1),
        },
        priority: 'medium',
        channels: ['IN_APP', 'EMAIL'],
        metadata: {
          budgetName: alertData.budgetName,
          category: alertData.category,
          spent: alertData.spent,
          budget: alertData.budget,
          alertType: 'CATEGORY_BUDGET_ALERT',
        },
        actionUrl: '/budget/category-analysis',
        actionText: '查看分类',
        dedupKey: `category_alert_${memberId}_${alertData.budgetName}_${alertData.category}`,
      });
    } catch (error) {
      console.error('Failed to send category budget alert:', error);
    }
  }

  /**
   * 批量发送预算预警（家庭所有成员）
   */
  async sendFamilyBudgetAlerts(
    familyId: string,
    alertData: {
      budgetName: string;
      usagePercentage: number;
      threshold: number;
    },
  ): Promise<void> {
    try {
      const familyMembers = await this.getFamilyMembers(familyId);

      const notifications = await Promise.all(
        familyMembers.map(async (memberId) => ({
          userId: memberId,
          type: 'BUDGET_WARNING',
          templateData: {
            userName: await this.getUserName(memberId),
            budgetName: alertData.budgetName,
            usagePercentage: alertData.usagePercentage.toFixed(1),
          },
          priority: this.getAlertPriority(alertData.threshold),
          channels: ['IN_APP'],
          metadata: {
            budgetName: alertData.budgetName,
            usagePercentage: alertData.usagePercentage,
            alertType: 'FAMILY_BUDGET_ALERT',
          },
          actionUrl: '/family/budget',
          actionText: '查看家庭预算',
        })),
      );

      // 使用注入的 notificationManager
      await this.notificationManager.sendBulkNotifications(notifications);
    } catch (error) {
      console.error('Failed to send family budget alerts:', error);
    }
  }

  /**
   * 根据阈值获取通知优先级
   */
  private getAlertPriority(
    threshold: number,
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (threshold >= BUDGET_NOTIFICATION_PRIORITY.URGENT_THRESHOLD)
      return 'urgent';
    if (threshold >= BUDGET_NOTIFICATION_PRIORITY.HIGH_THRESHOLD) return 'high';
    if (threshold >= BUDGET_NOTIFICATION_PRIORITY.MEDIUM_THRESHOLD)
      return 'medium';
    return 'low';
  }

  /**
   * 根据阈值获取通知渠道
   */
  private getAlertChannels(threshold: number): string[] {
    if (threshold >= BUDGET_NOTIFICATION_PRIORITY.URGENT_THRESHOLD)
      return [...BUDGET_NOTIFICATION_CHANNELS.URGENT];
    if (threshold >= BUDGET_NOTIFICATION_PRIORITY.HIGH_THRESHOLD)
      return [...BUDGET_NOTIFICATION_CHANNELS.HIGH];
    return [...BUDGET_NOTIFICATION_CHANNELS.NORMAL];
  }

  /**
   * 获取用户名称
   */
  private async getUserName(memberId: string): Promise<string> {
    try {
      const member = await this.familyRepo.getFamilyMemberById(memberId);
      if (member?.name?.trim()) {
        return member.name.trim();
      }
    } catch (error) {
      console.error(
        'Failed to resolve member name for budget notification:',
        error,
      );
    }
    return '用户';
  }

  /**
   * 获取家庭成员列表
   */
  private async getFamilyMembers(familyId: string): Promise<string[]> {
    try {
      const members = await this.familyRepo.listFamilyMembers(familyId, false);
      return members.map((member) => member.id);
    } catch (error) {
      console.error(
        'Failed to resolve family members for budget notification:',
        error,
      );
      return [];
    }
  }
}
