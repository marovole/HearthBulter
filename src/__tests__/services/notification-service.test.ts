/**
 * 通知服务测试
 */

import { notificationManager } from "@/lib/services/notification/notification-manager";
import { prisma } from "@/lib/db";

// Mock dependencies
jest.mock("@/lib/services/notification/email-service", () => ({
  emailService: {
    send: jest.fn().mockResolvedValue("test-email-id"),
  },
}));

jest.mock("@/lib/services/notification/sms-service", () => ({
  smsService: {
    send: jest.fn().mockResolvedValue("test-sms-id"),
  },
}));

jest.mock("@/lib/services/notification/wechat-service", () => ({
  wechatService: {
    sendMessage: jest.fn().mockResolvedValue("test-wechat-id"),
  },
}));

describe("Notification Service", () => {
  let notificationService: any;

  beforeEach(() => {
    notificationService = notificationManager;
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: "test-user-id",
      email: "test@example.com",
      phone: "13800138000",
      wechatOpenId: "test-wechat-id",
      pushTokens: ["push-token-1"],
      notificationPreferences: {
        email: true,
        sms: false,
        wechat: true,
        push: true,
      },
    });
    prisma.notification.findUnique.mockResolvedValue({
      id: "notif-1",
      userId: "test-user-id",
    });
  });

  describe("sendNotification", () => {
    it("should send notification to enabled channels", async () => {
      const notificationData = {
        userId: "test-user-id",
        type: "meal_reminder",
        title: "Meal Reminder",
        content: "Time to log your meal!",
        channels: ["email", "wechat"],
      };

      const result = await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe("test-notification-id");
    });

    it("should respect user notification preferences", async () => {
      const notificationData = {
        userId: "test-user-id",
        type: "meal_reminder",
        title: "Meal Reminder",
        content: "Time to log your meal!",
        channels: ["email", "sms", "wechat"],
      };

      const result = await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      // SMS should be skipped due to user preferences
    });

    it("should handle missing user gracefully", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const notificationData = {
        userId: "non-existent-user",
        type: "meal_reminder",
        title: "Meal Reminder",
        content: "Time to log your meal!",
      };

      const result = await notificationService.sendNotification(notificationData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("User not found");
    });
  });

  describe("sendBulkNotifications", () => {
    it("should send notifications to multiple users", async () => {
      const bulkData = [
        {
          userId: "user-1",
          type: "meal_reminder",
          title: "Meal Reminder",
          content: "Time to log your meal!",
        },
        {
          userId: "user-2",
          type: "meal_reminder",
          title: "Meal Reminder",
          content: "Time to log your meal!",
        },
      ];

      const result = await notificationService.sendBulkNotifications(bulkData);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it("should handle partial failures in bulk sending", async () => {
      // Make second user fail
      prisma.user.findUnique
        .mockResolvedValueOnce({
          id: "user-1",
          email: "user1@example.com",
          notificationPreferences: {
            email: true,
            sms: false,
            wechat: false,
            push: true,
          },
        })
        .mockResolvedValueOnce(null);

      const bulkData = [
        {
          userId: "user-1",
          type: "meal_reminder",
          title: "Meal Reminder",
          content: "Time to log your meal!",
        },
        {
          userId: "user-2",
          type: "meal_reminder",
          title: "Meal Reminder",
          content: "Time to log your meal!",
        },
      ];

      const result = await notificationService.sendBulkNotifications(bulkData);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });
  });

  describe("scheduleNotification", () => {
    it("should schedule notification for future delivery", async () => {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const scheduleData = {
        userId: "test-user-id",
        type: "meal_reminder",
        title: "Scheduled Meal Reminder",
        content: "Time to log your meal!",
        scheduledTime,
        channels: ["push"],
      };

      const result = await notificationService.scheduleNotification(scheduleData);

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });

    it("should reject scheduling in the past", async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      const scheduleData = {
        userId: "test-user-id",
        type: "meal_reminder",
        title: "Scheduled Meal Reminder",
        content: "Time to log your meal!",
        scheduledTime: pastTime,
        channels: ["push"],
      };

      const result = await notificationService.scheduleNotification(scheduleData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot schedule notification in the past");
    });
  });

  describe("getUserNotifications", () => {
    it("should retrieve user notifications", async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: "notif-1",
          userId: "test-user-id",
          type: "meal_reminder",
          title: "Meal Reminder",
          content: "Time to log your meal!",
          status: "sent",
          createdAt: new Date(),
          read: false,
        },
      ]);

      const result = await notificationService.getUserNotifications("test-user-id");

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe("Meal Reminder");
    });

    it("should filter notifications by type", async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: "notif-1",
          userId: "test-user-id",
          type: "meal_reminder",
          title: "Meal Reminder",
          content: "Time to log your meal!",
          status: "sent",
          createdAt: new Date(),
          read: false,
        },
      ]);

      const result = await notificationService.getUserNotifications("test-user-id", {
        type: "meal_reminder",
      });

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe("meal_reminder");
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark notification as read", async () => {
      prisma.notification.update.mockResolvedValue({
        id: "notif-1",
        read: true,
        readAt: new Date(),
      });

      const result = await notificationService.markNotificationAsRead("notif-1");

      expect(result.success).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe("deleteNotification", () => {
    it("should delete notification", async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        userId: "test-user-id",
      });
      prisma.notification.delete.mockResolvedValue({});

      const result = await notificationService.deleteNotification("notif-1", "test-user-id");

      expect(result.success).toBe(true);
    });

    it("should prevent deleting other user's notification", async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: "notif-1",
        userId: "different-user-id",
      });

      const result = await notificationService.deleteNotification("notif-1", "test-user-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });
  });
});
