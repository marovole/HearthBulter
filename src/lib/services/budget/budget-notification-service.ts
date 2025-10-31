import { PrismaClient } from '@prisma/client';
import { NotificationManager } from '@/lib/services/notification';
import { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * 预算系统集成通知服务
 */
export class BudgetNotificationService {
  private notificationManager: NotificationManager;

  constructor(prisma: PrismaClient) {
    this.notificationManager = new NotificationManager(prisma);
  }

  /**
   * 发送预算预警通知
   */
  async sendBudgetAlert(memberId: string, alertData: {
    budgetName: string;
    usagePercentage: number;
    threshold: number;
    remainingBudget?: number;
    totalBudget: number;
  }): Promise<void> {
    try {
      const priority = this.getAlertPriority(alertData.threshold);
      const channels = this.getAlertChannels(alertData.threshold);

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.BUDGET_WARNING,
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
  async sendBudgetOverspend(memberId: string, overspendData: {
    budgetName: string;
    overspendAmount: number;
    totalSpent: number;
    budgetLimit: number;
  }): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.BUDGET_WARNING,
        title: '预算超支提醒',
        content: `您的预算"${overspendData.budgetName}"已超支¥${overspendData.overspendAmount.toFixed(2)}，当前总支出¥${overspendData.totalSpent.toFixed(2)}，预算限额¥${overspendData.budgetLimit.toFixed(2)}。`,
        priority: NotificationPriority.HIGH,
        channels: ['IN_APP', 'EMAIL', 'SMS'],
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
  async sendBudgetOptimizationTip(memberId: string, tipData: {
    budgetName: string;
    tip: string;
    potentialSavings: number;
    category?: string;
  }): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.BUDGET_WARNING,
        title: '预算优化建议',
        content: `${tipData.tip}，预计可节省¥${tipData.potentialSavings.toFixed(2)}。`,
        priority: NotificationPriority.MEDIUM,
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
  async sendBudgetPeriodSummary(memberId: string, summaryData: {
    budgetName: string;
    period: string;
    totalSpent: number;
    budgetLimit: number;
    savings: number;
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
  }): Promise<void> {
    try {
      const isUnderBudget = summaryData.totalSpent <= summaryData.budgetLimit;
      const priority = isUnderBudget ? NotificationPriority.MEDIUM : NotificationPriority.HIGH;

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.GOAL_ACHIEVEMENT,
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
  async sendCategoryBudgetAlert(memberId: string, alertData: {
    budgetName: string;
    category: string;
    spent: number;
    budget: number;
    percentage: number;
  }): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.BUDGET_WARNING,
        templateData: {
          userName: await this.getUserName(memberId),
          budgetName: alertData.budgetName,
          category: alertData.category,
          spent: alertData.spent.toFixed(2),
          budget: alertData.budget.toFixed(2),
          percentage: alertData.percentage.toFixed(1),
        },
        priority: NotificationPriority.MEDIUM,
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
  async sendFamilyBudgetAlerts(familyId: string, alertData: {
    budgetName: string;
    usagePercentage: number;
    threshold: number;
  }): Promise<void> {
    try {
      const familyMembers = await this.getFamilyMembers(familyId);
      
      const notifications = familyMembers.map(memberId => ({
        memberId,
        type: NotificationType.BUDGET_WARNING,
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
      }));

      await this.notificationManager.createBulkNotifications(notifications);
    } catch (error) {
      console.error('Failed to send family budget alerts:', error);
    }
  }

  /**
   * 根据阈值获取通知优先级
   */
  private getAlertPriority(threshold: number): NotificationPriority {
    if (threshold >= 110) return NotificationPriority.URGENT;
    if (threshold >= 100) return NotificationPriority.HIGH;
    if (threshold >= 80) return NotificationPriority.MEDIUM;
    return NotificationPriority.LOW;
  }

  /**
   * 根据阈值获取通知渠道
   */
  private getAlertChannels(threshold: number): string[] {
    if (threshold >= 110) return ['IN_APP', 'EMAIL', 'SMS'];
    if (threshold >= 100) return ['IN_APP', 'EMAIL'];
    return ['IN_APP', 'EMAIL'];
  }

  /**
   * 获取用户名称
   */
  private async getUserName(memberId: string): Promise<string> {
    const prisma = (this.notificationManager as any).prisma;
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: {
        name: true,
      },
    });
    return member?.name || '用户';
  }

  /**
   * 获取家庭成员列表
   */
  private async getFamilyMembers(familyId: string): Promise<string[]> {
    const prisma = (this.notificationManager as any).prisma;
    const members = await prisma.familyMember.findMany({
      where: { familyId },
      select: { id: true },
    });
    return members.map(member => member.id);
  }
}

// 使用示例
export async function exampleUsage() {
  const prisma = new PrismaClient();
  const budgetNotificationService = new BudgetNotificationService(prisma);

  // 示例1: 发送80%预算预警
  await budgetNotificationService.sendBudgetAlert('member-123', {
    budgetName: '10月食品预算',
    usagePercentage: 85.5,
    threshold: 80,
    remainingBudget: 500,
    totalBudget: 3000,
  });

  // 示例2: 发送预算超支通知
  await budgetNotificationService.sendBudgetOverspend('member-123', {
    budgetName: '10月食品预算',
    overspendAmount: 200,
    totalSpent: 3200,
    budgetLimit: 3000,
  });

  // 示例3: 发送预算优化建议
  await budgetNotificationService.sendBudgetOptimizationTip('member-123', {
    budgetName: '10月食品预算',
    tip: '建议购买当季蔬菜，价格更优惠',
    potentialSavings: 150,
    category: '蔬菜',
  });

  // 示例4: 发送预算周期总结
  await budgetNotificationService.sendBudgetPeriodSummary('member-123', {
    budgetName: '10月食品预算',
    period: '10月',
    totalSpent: 2800,
    budgetLimit: 3000,
    savings: 200,
    topCategories: [
      { category: '蔬菜', amount: 800, percentage: 28.6 },
      { category: '肉类', amount: 1000, percentage: 35.7 },
    ],
  });

  // 示例5: 发送分类预算预警
  await budgetNotificationService.sendCategoryBudgetAlert('member-123', {
    budgetName: '10月食品预算',
    category: '肉类',
    spent: 1200,
    budget: 1000,
    percentage: 120,
  });

  await prisma.$disconnect();
}
