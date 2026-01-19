import type { NotificationRepository } from "@/lib/repositories/interfaces/notification-repository";
import type { NotificationChannel } from "@/lib/repositories/types/notification";
import { ConvexNotificationRepository } from "@/lib/repositories/implementations/convex-notification-repository";
import { NotificationManager } from "@/lib/services/notification";
import type { NotificationData } from "@/lib/services/notification/notification-manager";
import type { Id } from "../../../../convex/_generated/dataModel";

interface FamilyMemberDoc {
  _id: Id<"familyMembers">;
  name: string;
  userId: string;
}

export class CheckInNotificationService {
  private readonly notificationManager: NotificationManager;
  private readonly notificationRepository: NotificationRepository;

  constructor() {
    this.notificationRepository = new ConvexNotificationRepository();
    this.notificationManager = new NotificationManager(
      this.notificationRepository,
    );
  }

  async sendCheckInReminder(memberId: string, mealType: string): Promise<void> {
    try {
      const channels: NotificationChannel[] = ["IN_APP", "EMAIL"];

      await this.notificationManager.sendNotification({
        userId: memberId,
        type: "CHECK_IN_REMINDER",
        title: "打卡提醒",
        content: `别忘了${mealType}打卡，记录今日饮食情况。`,
        priority: "medium",
        channels,
        actionUrl: "/tracking/check-in",
        actionText: "立即打卡",
      });
    } catch (error) {
      console.error("Failed to send check-in reminder:", error);
    }
  }

  async sendStreakAchievement(
    memberId: string,
    streakDays: number,
  ): Promise<void> {
    try {
      const channels: NotificationChannel[] = ["IN_APP", "EMAIL", "SMS"];

      await this.notificationManager.sendNotification({
        userId: memberId,
        type: "GOAL_ACHIEVEMENT",
        title: "连续打卡成就达成！",
        content: `恭喜！您已连续打卡${streakDays}天，继续保持健康的饮食习惯！`,
        priority: "high",
        channels,
        metadata: {
          streakDays,
          achievementType: "CHECK_IN_STREAK",
        },
        actionUrl: "/achievements",
        actionText: "查看成就",
      });
    } catch (error) {
      console.error("Failed to send streak achievement:", error);
    }
  }

  async sendNutritionAlert(
    memberId: string,
    alertData: {
      metric: string;
      value: string;
      recommendation: string;
    },
  ): Promise<void> {
    try {
      const channels: NotificationChannel[] = ["IN_APP", "EMAIL"];

      await this.notificationManager.sendNotification({
        userId: memberId,
        type: "HEALTH_ALERT",
        title: "营养异常提醒",
        content: `${alertData.metric}异常：${alertData.value}。建议：${alertData.recommendation}`,
        priority: "high",
        channels,
        metadata: {
          alertType: "NUTRITION",
          metric: alertData.metric,
          value: alertData.value,
        },
        actionUrl: "/health/analysis",
        actionText: "查看详情",
      });
    } catch (error) {
      console.error("Failed to send nutrition alert:", error);
    }
  }

  async sendGoalCompletion(
    memberId: string,
    goalData: {
      goalTitle: string;
      completedValue: string;
      targetValue: string;
    },
  ): Promise<void> {
    try {
      const channels: NotificationChannel[] = ["IN_APP", "EMAIL", "SMS"];

      await this.notificationManager.sendNotification({
        userId: memberId,
        type: "GOAL_ACHIEVEMENT",
        title: "目标达成提醒",
        content: `目标"${goalData.goalTitle}"已完成：${goalData.completedValue}/${goalData.targetValue}`,
        priority: "high",
        channels,
        metadata: {
          goalType: "NUTRITION_GOAL",
          goalData,
        },
        actionUrl: "/goals",
        actionText: "查看目标",
      });
    } catch (error) {
      console.error("Failed to send goal completion:", error);
    }
  }

  async sendFamilyActivityNotifications(
    familyId: string,
    activityData: {
      memberName: string;
      activity: string;
      mealType?: string;
    },
  ): Promise<void> {
    try {
      const { convexClient, api } = await import("@/lib/convex-client");
      const members = await convexClient.query<FamilyMemberDoc[]>(
        api.families.listMembers,
        {
          familyId,
        },
      );

      const channels: NotificationChannel[] = ["IN_APP"];

      const notifications: NotificationData[] = members
        .filter((m) => m._id !== familyId)
        .map((member) => ({
          userId: member._id,
          type: "FAMILY_ACTIVITY",
          title: "家庭活动",
          content: `${activityData.memberName}${activityData.activity}${activityData.mealType ? `（${activityData.mealType}）` : ""}`,
          priority: "medium",
          channels,
        }));

      await this.notificationManager.sendBulkNotifications(notifications);
    } catch (error) {
      console.error("Failed to send family activity notifications:", error);
    }
  }
}

export const checkInNotificationService = new CheckInNotificationService();
