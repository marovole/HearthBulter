import { NextRequest, NextResponse } from "next/server";
import { notificationRepository } from "@/lib/repositories/notification-repository-singleton";
import type {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  CreateNotificationDTO,
} from "@/lib/repositories/types/notification";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * Utility functions for notifications
 */
const NotificationFormatters = {
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString("zh-CN");
  },

  getTypeIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      CHECK_IN_REMINDER: "📝",
      TASK_NOTIFICATION: "📋",
      EXPIRY_ALERT: "⏰",
      BUDGET_WARNING: "💰",
      HEALTH_ALERT: "⚠️",
      GOAL_ACHIEVEMENT: "🎉",
      FAMILY_ACTIVITY: "👨‍👩‍👧‍👦",
      SYSTEM_ANNOUNCEMENT: "📢",
      MARKETING: "🎯",
      OTHER: "📄",
    };
    return iconMap[type] || "📄";
  },

  getTypeName(type: NotificationType): string {
    const nameMap: Record<NotificationType, string> = {
      CHECK_IN_REMINDER: "打卡提醒",
      TASK_NOTIFICATION: "任务通知",
      EXPIRY_ALERT: "过期提醒",
      BUDGET_WARNING: "预算预警",
      HEALTH_ALERT: "健康异常提醒",
      GOAL_ACHIEVEMENT: "目标达成",
      FAMILY_ACTIVITY: "家庭活动",
      SYSTEM_ANNOUNCEMENT: "系统公告",
      MARKETING: "营销通知",
      OTHER: "其他",
    };
    return nameMap[type] || "其他";
  },

  getPriorityColor(priority: NotificationPriority): string {
    const colorMap: Record<NotificationPriority, string> = {
      LOW: "#6c757d",
      MEDIUM: "#28a745",
      HIGH: "#ffc107",
      URGENT: "#dc3545",
    };
    return colorMap[priority] || "#6c757d";
  },

  formatContent(content: string, maxLength: number = 100): string {
    if (!content) return "";
    const formatted = content.replace(/\s+/g, " ").trim();
    if (formatted.length > maxLength) {
      return `${formatted.substring(0, maxLength)}...`;
    }
    return formatted;
  },

  validateNotificationContent(
    title: string,
    content: string,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!title || title.trim().length === 0) {
      errors.push("标题不能为空");
    } else if (title.length > 200) {
      errors.push("标题长度不能超过200字符");
    }

    if (!content || content.trim().length === 0) {
      errors.push("内容不能为空");
    } else if (content.length > 2000) {
      errors.push("内容长度不能超过2000字符");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

/**
 * GET /api/notifications
 * 获取用户通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const type = searchParams.get("type") as NotificationType | null;
    const status = searchParams.get("status") as any;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const includeRead = searchParams.get("includeRead") === "true";

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    // 查询通知列表
    const result = await notificationRepository.listMemberNotifications(
      {
        memberId,
        type: type ?? undefined,
        status: status ?? undefined,
        includeRead,
      },
      {
        limit,
        offset,
      },
    );

    // 格式化通知列表
    const formattedNotifications = result.items.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      status: notification.status,
      priority: notification.priority,
      channels: notification.channels,
      metadata: notification.metadata,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
      formattedTime: NotificationFormatters.formatTime(notification.createdAt),
      typeIcon: NotificationFormatters.getTypeIcon(notification.type),
      typeName: NotificationFormatters.getTypeName(notification.type),
      priorityColor: NotificationFormatters.getPriorityColor(
        notification.priority,
      ),
      formattedContent: NotificationFormatters.formatContent(
        notification.content,
      ),
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: result.total,
        hasMore: result.hasMore ?? false,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications
 * 创建通知
 *
 * Note: This simplified version only creates notification records in the database.
 * For full notification delivery (Email, SMS, WeChat, Push), use NotificationManager service.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      type,
      title,
      content,
      priority = "MEDIUM" as NotificationPriority,
      channels = ["IN_APP"] as NotificationChannel[],
      metadata,
      actionUrl,
      actionText,
      dedupKey,
      batchId,
    } = body;

    // 验证必需字段
    if (!memberId || !type) {
      return NextResponse.json(
        { error: "Member ID and type are required" },
        { status: 400 },
      );
    }

    // 验证通知类型
    const validTypes: NotificationType[] = [
      "CHECK_IN_REMINDER",
      "TASK_NOTIFICATION",
      "EXPIRY_ALERT",
      "BUDGET_WARNING",
      "HEALTH_ALERT",
      "GOAL_ACHIEVEMENT",
      "FAMILY_ACTIVITY",
      "SYSTEM_ANNOUNCEMENT",
      "MARKETING",
      "OTHER",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 },
      );
    }

    // 验证渠道
    if (channels && !Array.isArray(channels)) {
      return NextResponse.json(
        { error: "Channels must be an array" },
        { status: 400 },
      );
    }

    // 验证通知内容
    if (title || content) {
      const validation = NotificationFormatters.validateNotificationContent(
        title || "",
        content || "",
      );
      if (!validation.isValid) {
        return NextResponse.json(
          { error: "Invalid content", details: validation.errors },
          { status: 400 },
        );
      }
    }

    // 准备通知数据
    const notificationPayload: CreateNotificationDTO = {
      memberId,
      type,
      title: title || "",
      content: content || "",
      priority,
      channels: Array.isArray(channels) ? channels : ["IN_APP"],
      metadata,
      actionUrl,
      actionText,
      dedupKey,
      batchId,
    };

    // 创建通知
    const notification =
      await notificationRepository.createNotification(notificationPayload);

    return NextResponse.json({
      success: true,
      data: {
        notificationId: notification.id,
        notification: {
          id: notification.id,
          memberId: notification.memberId,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          priority: notification.priority,
          channels: notification.channels,
          metadata: notification.metadata,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          status: notification.status,
          createdAt: notification.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 },
    );
  }
}
