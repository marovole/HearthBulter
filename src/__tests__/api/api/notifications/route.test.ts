/**
 * api/notifications/route.ts API 测试
 * 通知系统API测试
 */

import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { GET, POST } from "@/app/api/notifications/route";
import { mockNotificationManager } from "@/lib/container/service-container";
import { NotificationUtils } from "@/lib/services/notification";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@prisma/client";

// Use global mocked service-container from moduleNameMapper
// mockNotificationManager is imported from the mocked service-container

jest.mock("@/lib/services/notification", () => ({
  NotificationUtils: {
    formatTime: jest.fn((date) => "刚刚"),
    getTypeIcon: jest.fn((type) => "📢"),
    getTypeName: jest.fn((type) => "提醒通知"),
    getPriorityColor: jest.fn((priority) => "#10b981"),
    formatContent: jest.fn((content) => content),
    validateNotificationContent: jest.fn(),
  },
}));

const mockNotifications = [
  {
    id: "notification-1",
    memberId: "member-1",
    type: NotificationType.HEALTH_ALERT,
    title: "健康提醒",
    content: "记得测量今日血压",
    priority: NotificationPriority.HIGH,
    channels: [NotificationChannel.IN_APP],
    isRead: false,
    createdAt: new Date("2024-01-15T10:00:00"),
    metadata: { relatedId: "health-check-1" },
    actionUrl: "/health/measurements",
    actionText: "立即测量",
  },
  {
    id: "notification-2",
    memberId: "member-1",
    type: NotificationType.GOAL_ACHIEVEMENT,
    title: "成就解锁",
    content: "恭喜获得\"健康达人\"成就",
    priority: NotificationPriority.MEDIUM,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    isRead: false,
    createdAt: new Date("2024-01-14T15:30:00"),
    metadata: { achievementType: "HEALTH_SCORE_90" },
    actionUrl: "/achievements",
    actionText: "查看详情",
  },
  {
    id: "notification-3",
    memberId: "member-1",
    type: NotificationType.FAMILY_ACTIVITY,
    title: "分享成功",
    content: "您的健康报告已分享给家人",
    priority: NotificationPriority.LOW,
    channels: [NotificationChannel.IN_APP],
    isRead: true,
    createdAt: new Date("2024-01-13T09:00:00"),
    metadata: { shareToken: "share-123" },
  },
];

describe("/api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_CODES = "ADMIN123";
  });

  describe("GET - Get User Notifications", () => {
    beforeEach(() => {
      (
        mockNotificationManager.getUserNotifications as jest.Mock
      ).mockResolvedValue({
        notifications: mockNotifications,
        total: 3,
        hasMore: false,
      });
    });

    it("should return notifications for member", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.notifications).toHaveLength(3);
      expect(data.data.total).toBe(3);
      expect(data.data.hasMore).toBe(false);
      expect(NotificationUtils.formatTime).toHaveBeenCalled();
      expect(NotificationUtils.getTypeIcon).toHaveBeenCalled();
      expect(NotificationUtils.getTypeName).toHaveBeenCalled();
      expect(NotificationUtils.getPriorityColor).toHaveBeenCalled();
      expect(NotificationUtils.formatContent).toHaveBeenCalled();
    });

    it("should filter by notification type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1&type=HEALTH_REMINDER",
      );
      await GET(request);

      expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledWith(
        "member-1",
        expect.objectContaining({
          type: NotificationType.HEALTH_ALERT,
        }),
      );
    });

    it("should filter by status", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1&status=UNREAD",
      );
      await GET(request);

      expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledWith(
        "member-1",
        expect.objectContaining({
          status: "UNREAD",
        }),
      );
    });

    it("should apply pagination", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1&limit=10&offset=20",
      );
      await GET(request);

      expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledWith(
        "member-1",
        expect.objectContaining({
          limit: 10,
          offset: 20,
        }),
      );
    });

    it("should include read notifications when specified", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1&includeRead=true",
      );
      await GET(request);

      expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledWith(
        "member-1",
        expect.objectContaining({
          includeRead: true,
        }),
      );
    });

    it("should use default pagination values", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1",
      );
      await GET(request);

      expect(mockNotificationManager.getUserNotifications).toHaveBeenCalledWith(
        "member-1",
        expect.objectContaining({
          limit: 20,
          offset: 0,
        }),
      );
    });

    it("should format notification data correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1",
      );
      await GET(request);

      const firstNotification = mockNotifications[0];
      expect(NotificationUtils.formatTime).toHaveBeenCalledWith(
        firstNotification.createdAt,
      );
      expect(NotificationUtils.getTypeIcon).toHaveBeenCalledWith(
        firstNotification.type,
      );
      expect(NotificationUtils.getTypeName).toHaveBeenCalledWith(
        firstNotification.type,
      );
      expect(NotificationUtils.getPriorityColor).toHaveBeenCalledWith(
        firstNotification.priority,
      );
      expect(NotificationUtils.formatContent).toHaveBeenCalledWith(
        firstNotification.content,
      );
    });

    it("should return 400 when memberId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Member ID is required");
    });
  });

  describe("POST - Create Notification", () => {
    const validNotificationData = {
      memberId: "member-1",
      type: NotificationType.HEALTH_ALERT,
      title: "健康提醒",
      content: "记得测量今日血压",
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      metadata: { relatedId: "health-check-1" },
      actionUrl: "/health/measurements",
      actionText: "立即测量",
      dedupKey: "unique-key-123",
      batchId: "batch-456",
      templateData: { name: "张三", medicationName: "降压药" },
    };

    beforeEach(() => {
      (
        mockNotificationManager.createNotification as jest.Mock
      ).mockResolvedValue({
        success: true,
        notification: {
          id: "notification-4",
          ...validNotificationData,
          createdAt: new Date(),
          isRead: false,
        },
      });

      (
        NotificationUtils.validateNotificationContent as jest.Mock
      ).mockReturnValue({
        isValid: true,
        errors: [],
      });
    });

    it("should create notification with required fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.HEALTH_ALERT,
            title: "健康提醒",
            content: "记得测量今日血压",
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.success).toBe(true);
      expect(
        NotificationUtils.validateNotificationContent,
      ).toHaveBeenCalledWith("健康提醒", "记得测量今日血压");
    });

    it("should create notification with all fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({ ...validNotificationData }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockNotificationManager.createNotification).toHaveBeenCalledWith(
        expect.objectContaining(validNotificationData),
      );
    });

    it("should use default priority if not specified", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.FAMILY_ACTIVITY,
            title: "家庭更新",
            content: "家庭成员已更新健康数据",
          }),
        },
      );
      await POST(request);

      expect(mockNotificationManager.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: NotificationPriority.MEDIUM,
        }),
      );
    });

    it("should validate notification type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: "INVALID_TYPE",
            title: "无效通知",
            content: "测试内容",
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid notification type");
    });

    it("should validate channels format", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.HEALTH_ALERT,
            title: "健康提醒",
            content: "测试内容",
            channels: "INVALID_CHANNELS", // Not an array
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Channels must be an array");
    });

    it("should validate notification content", async () => {
      (
        NotificationUtils.validateNotificationContent as jest.Mock
      ).mockReturnValue({
        isValid: false,
        errors: ["Content is too long", "Invalid characters"],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.HEALTH_ALERT,
            title: "健康提醒",
            content: "A".repeat(1001), // Too long
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid content");
      expect(data.details).toContain("Content is too long");
    });

    it("should handle content validation when only title is provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.GOAL_ACHIEVEMENT,
            title: "成就解锁",
          }),
        },
      );
      await POST(request);

      expect(
        NotificationUtils.validateNotificationContent,
      ).toHaveBeenCalledWith("成就解锁", "");
    });

    it("should handle content validation when only content is provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.FAMILY_ACTIVITY,
            content: "分享成功",
          }),
        },
      );
      await POST(request);

      expect(
        NotificationUtils.validateNotificationContent,
      ).toHaveBeenCalledWith("", "分享成功");
    });

    it("should return 400 when memberId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            type: NotificationType.HEALTH_ALERT,
            title: "健康提醒",
            content: "测试内容",
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Member ID and type are required");
    });

    it("should return 400 when type is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            title: "健康提醒",
            content: "测试内容",
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Member ID and type are required");
    });

    it("should handle batch notification creation", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.FAMILY_ACTIVITY,
            title: "批量通知",
            content: "这是批量通知内容",
            batchId: "batch-001",
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockNotificationManager.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: "batch-001",
        }),
      );
    });

    it("should handle template data", async () => {
      const templateData = {
        name: "张三",
        achievementName: "健康达人",
        score: 90,
      };

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.GOAL_ACHIEVEMENT,
            title: "恭喜获得成就",
            content: "您获得了{name} - {achievementName}，当前分数: {score}",
            templateData,
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockNotificationManager.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData,
        }),
      );
    });

    it("should generate deduplication key if not provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.HEALTH_ALERT,
            title: "健康提醒",
            content: "测试内容",
          }),
        },
      );
      await POST(request);

      expect(mockNotificationManager.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: "member-1",
          type: NotificationType.HEALTH_ALERT,
        }),
      );
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      (
        mockNotificationManager.getUserNotifications as jest.Mock
      ).mockRejectedValue(new Error("Database error"));
      (
        mockNotificationManager.createNotification as jest.Mock
      ).mockRejectedValue(new Error("Create failed"));
      (
        NotificationUtils.validateNotificationContent as jest.Mock
      ).mockReturnValue({
        isValid: true,
        errors: [],
      });
    });

    it("GET: should handle database errors gracefully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?memberId=member-1",
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to fetch notifications");
    });

    it("POST: should handle creation errors gracefully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            memberId: "member-1",
            type: NotificationType.HEALTH_ALERT,
            title: "健康提醒",
            content: "测试内容",
          }),
        },
      );
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to create notification");
    });
  });
});
