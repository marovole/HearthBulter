import { PrismaClient } from '@prisma/client';
import { NotificationManager } from '@/lib/services/notification';
import { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * 打卡系统集成通知的示例
 */
export class CheckInNotificationService {
  private notificationManager: NotificationManager;

  constructor(prisma: PrismaClient) {
    this.notificationManager = new NotificationManager(prisma);
  }

  /**
   * 发送打卡提醒
   */
  async sendCheckInReminder(memberId: string, mealType: string): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.CHECK_IN_REMINDER,
        templateData: {
          userName: await this.getUserName(memberId),
          mealType,
        },
        priority: NotificationPriority.MEDIUM,
        channels: ['IN_APP', 'EMAIL'], // 可以根据用户偏好调整
        actionUrl: '/tracking/check-in',
        actionText: '立即打卡',
      });
    } catch (error) {
      console.error('Failed to send check-in reminder:', error);
    }
  }

  /**
   * 发送连续打卡成就通知
   */
  async sendStreakAchievement(
    memberId: string,
    streakDays: number,
  ): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.GOAL_ACHIEVEMENT,
        title: '连续打卡成就达成！',
        content: `恭喜！您已连续打卡${streakDays}天，继续保持健康的饮食习惯！`,
        priority: NotificationPriority.HIGH,
        channels: ['IN_APP', 'EMAIL', 'SMS'], // 高优先级使用多渠道
        metadata: {
          streakDays,
          achievementType: 'CHECK_IN_STREAK',
        },
        actionUrl: '/achievements',
        actionText: '查看成就',
      });
    } catch (error) {
      console.error('Failed to send streak achievement:', error);
    }
  }

  /**
   * 发送营养异常提醒
   */
  async sendNutritionAlert(
    memberId: string,
    alertData: {
      metric: string;
      value: string;
      recommendation: string;
    },
  ): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.HEALTH_ALERT,
        templateData: {
          userName: await this.getUserName(memberId),
          healthMetric: alertData.metric,
          value: alertData.value,
          recommendation: alertData.recommendation,
        },
        priority: NotificationPriority.HIGH,
        channels: ['IN_APP', 'EMAIL'],
        metadata: {
          alertType: 'NUTRITION',
          metric: alertData.metric,
          value: alertData.value,
        },
        actionUrl: '/health/analysis',
        actionText: '查看详情',
      });
    } catch (error) {
      console.error('Failed to send nutrition alert:', error);
    }
  }

  /**
   * 发送目标达成通知
   */
  async sendGoalCompletion(
    memberId: string,
    goalData: {
      goalTitle: string;
      completedValue: string;
      targetValue: string;
    },
  ): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.GOAL_ACHIEVEMENT,
        templateData: {
          userName: await this.getUserName(memberId),
          goalTitle: goalData.goalTitle,
          completedValue: goalData.completedValue,
          targetValue: goalData.targetValue,
        },
        priority: NotificationPriority.HIGH,
        channels: ['IN_APP', 'EMAIL', 'SMS'],
        metadata: {
          goalType: 'NUTRITION_GOAL',
          goalData,
        },
        actionUrl: '/goals',
        actionText: '查看目标',
      });
    } catch (error) {
      console.error('Failed to send goal completion:', error);
    }
  }

  /**
   * 批量发送家庭成员活动通知
   */
  async sendFamilyActivityNotifications(
    familyId: string,
    activityData: {
      memberName: string;
      activity: string;
      mealType?: string;
    },
  ): Promise<void> {
    try {
      // 获取家庭成员列表
      const familyMembers = await this.getFamilyMembers(familyId);

      const notifications = familyMembers.map((memberId) => ({
        memberId,
        type: NotificationType.FAMILY_ACTIVITY,
        templateData: {
          memberName: activityData.memberName,
          activityDescription: activityData.activity,
          mealType: activityData.mealType || '',
        },
        priority: NotificationPriority.MEDIUM,
        channels: ['IN_APP'],
      }));

      await this.notificationManager.createBulkNotifications(notifications);
    } catch (error) {
      console.error('Failed to send family activity notifications:', error);
    }
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
    return members.map((member) => member.id);
  }
}

// 使用示例
export async function exampleUsage() {
  const prisma = new PrismaClient();
  const checkInService = new CheckInNotificationService(prisma);

  // 示例1: 发送早餐打卡提醒
  await checkInService.sendCheckInReminder('member-123', '早餐');

  // 示例2: 发送连续打卡成就
  await checkInService.sendStreakAchievement('member-123', 7);

  // 示例3: 发送营养异常提醒
  await checkInService.sendNutritionAlert('member-123', {
    metric: '钠摄入量',
    value: '2500mg',
    recommendation: '建议减少高盐食物摄入',
  });

  // 示例4: 发送目标达成通知
  await checkInService.sendGoalCompletion('member-123', {
    goalTitle: '每日卡路里控制',
    completedValue: '1850卡',
    targetValue: '2000卡',
  });

  // 示例5: 发送家庭活动通知
  await checkInService.sendFamilyActivityNotifications('family-456', {
    memberName: '小明',
    activity: '完成了午餐打卡',
    mealType: '午餐',
  });

  await prisma.$disconnect();
}
