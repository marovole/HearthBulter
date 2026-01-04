import { PrismaClient } from "@prisma/client";
import { NotificationManager } from "@/lib/services/notification";
import { NotificationType, NotificationPriority } from "@prisma/client";

/**
 * 任务系统集成通知的示例
 */
export class TaskNotificationService {
  private notificationManager: NotificationManager;

  constructor(prisma: PrismaClient) {
    this.notificationManager = new NotificationManager(prisma);
  }

  /**
   * 发送任务分配通知
   */
  async sendTaskAssignment(
    memberId: string,
    taskData: {
      taskTitle: string;
      description: string;
      dueDate: string;
      assignerName: string;
    },
  ): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.TASK_NOTIFICATION,
        templateData: {
          userName: await this.getUserName(memberId),
          taskTitle: taskData.taskTitle,
          dueDate: taskData.dueDate,
        },
        priority: NotificationPriority.MEDIUM,
        channels: ["IN_APP", "EMAIL"],
        metadata: {
          taskId: taskData.taskTitle,
          taskType: "ASSIGNMENT",
          assignerName: taskData.assignerName,
        },
        actionUrl: "/tasks",
        actionText: "查看任务",
      });
    } catch (error) {
      console.error("Failed to send task assignment:", error);
    }
  }

  /**
   * 发送任务截止提醒
   */
  async sendTaskDueReminder(
    memberId: string,
    taskData: {
      taskTitle: string;
      dueDate: string;
      hoursRemaining: number;
    },
  ): Promise<void> {
    try {
      const priority =
        taskData.hoursRemaining <= 24
          ? NotificationPriority.HIGH
          : NotificationPriority.MEDIUM;

      const channels =
        taskData.hoursRemaining <= 24
          ? ["IN_APP", "EMAIL", "SMS"]
          : ["IN_APP", "EMAIL"];

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.TASK_NOTIFICATION,
        title: "任务即将到期",
        content: `您的任务"${taskData.taskTitle}"将在${taskData.hoursRemaining}小时后到期，请及时完成。`,
        priority,
        channels,
        metadata: {
          taskId: taskData.taskTitle,
          taskType: "DUE_REMINDER",
          hoursRemaining: taskData.hoursRemaining,
        },
        actionUrl: "/tasks",
        actionText: "立即处理",
      });
    } catch (error) {
      console.error("Failed to send task due reminder:", error);
    }
  }

  /**
   * 发送任务完成通知
   */
  async sendTaskCompletion(
    memberId: string,
    taskData: {
      taskTitle: string;
      completedAt: string;
      pointsEarned?: number;
    },
  ): Promise<void> {
    try {
      let content = `恭喜！您已完成任务"${taskData.taskTitle}"。`;
      if (taskData.pointsEarned) {
        content += ` 获得${taskData.pointsEarned}积分。`;
      }

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.GOAL_ACHIEVEMENT,
        title: "任务完成",
        content,
        priority: NotificationPriority.MEDIUM,
        channels: ["IN_APP"],
        metadata: {
          taskId: taskData.taskTitle,
          taskType: "COMPLETION",
          pointsEarned: taskData.pointsEarned,
        },
        actionUrl: "/tasks/completed",
        actionText: "查看完成记录",
      });
    } catch (error) {
      console.error("Failed to send task completion:", error);
    }
  }

  /**
   * 批量发送团队任务通知
   */
  async sendTeamTaskNotification(
    familyId: string,
    taskData: {
      taskTitle: string;
      description: string;
      dueDate: string;
      creatorName: string;
    },
  ): Promise<void> {
    try {
      const familyMembers = await this.getFamilyMembers(familyId);

      const notifications = familyMembers.map((memberId) => ({
        memberId,
        type: NotificationType.TASK_NOTIFICATION,
        templateData: {
          userName: await this.getUserName(memberId),
          taskTitle: taskData.taskTitle,
          dueDate: taskData.dueDate,
        },
        priority: NotificationPriority.MEDIUM,
        channels: ["IN_APP", "EMAIL"],
        metadata: {
          taskId: taskData.taskTitle,
          taskType: "TEAM_TASK",
          creatorName: taskData.creatorName,
        },
        actionUrl: "/tasks",
        actionText: "查看团队任务",
      }));

      await this.notificationManager.createBulkNotifications(notifications);
    } catch (error) {
      console.error("Failed to send team task notification:", error);
    }
  }

  /**
   * 发送任务超期通知
   */
  async sendTaskOverdueNotification(
    memberId: string,
    taskData: {
      taskTitle: string;
      overdueDays: number;
    },
  ): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.TASK_NOTIFICATION,
        title: "任务已超期",
        content: `您的任务"${taskData.taskTitle}"已超期${taskData.overdueDays}天，请尽快处理。`,
        priority: NotificationPriority.HIGH,
        channels: ["IN_APP", "EMAIL", "SMS"],
        metadata: {
          taskId: taskData.taskTitle,
          taskType: "OVERDUE",
          overdueDays: taskData.overdueDays,
        },
        actionUrl: "/tasks/overdue",
        actionText: "立即处理",
      });
    } catch (error) {
      console.error("Failed to send task overdue notification:", error);
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
    return member?.name || "用户";
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
  const taskService = new TaskNotificationService(prisma);

  // 示例1: 发送任务分配通知
  await taskService.sendTaskAssignment("member-123", {
    taskTitle: "购买健康食材",
    description: "购买本周所需的健康食材",
    dueDate: "2025-11-02 18:00",
    assignerName: "妈妈",
  });

  // 示例2: 发送任务截止提醒
  await taskService.sendTaskDueReminder("member-123", {
    taskTitle: "完成体检报告上传",
    dueDate: "2025-11-01 12:00",
    hoursRemaining: 6,
  });

  // 示例3: 发送任务完成通知
  await taskService.sendTaskCompletion("member-123", {
    taskTitle: "制定下周饮食计划",
    completedAt: "2025-10-31 10:30",
    pointsEarned: 50,
  });

  // 示例4: 发送团队任务通知
  await taskService.sendTeamTaskNotification("family-456", {
    taskTitle: "家庭健康日准备",
    description: "准备本周末的家庭健康日活动",
    dueDate: "2025-11-03 09:00",
    creatorName: "爸爸",
  });

  // 示例5: 发送任务超期通知
  await taskService.sendTaskOverdueNotification("member-123", {
    taskTitle: "更新健康数据",
    overdueDays: 2,
  });

  await prisma.$disconnect();
}
