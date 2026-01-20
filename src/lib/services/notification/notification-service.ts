import { convexClient, api } from "@/lib/convex-client";
import type { Id, Doc } from "@/../convex/_generated/dataModel";

export type NotificationType =
  | "CHECK_IN_REMINDER"
  | "TASK_NOTIFICATION"
  | "EXPIRY_ALERT"
  | "BUDGET_WARNING"
  | "HEALTH_ALERT"
  | "GOAL_ACHIEVEMENT"
  | "FAMILY_ACTIVITY"
  | "SYSTEM_ANNOUNCEMENT"
  | "MARKETING"
  | "OTHER";

export type NotificationStatus = "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";

interface Notification {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: string;
  channels: string[];
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  actionText?: string;
  dedupKey?: string;
  batchId?: string;
  status: NotificationStatus;
  readAt: number | null;
  sentAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export class NotificationService {
  private constructor() {}

  static async create(data: {
    memberId: string;
    type: NotificationType;
    title: string;
    content: string;
    priority?: any;
    channels: string;
    metadata?: any;
    actionUrl?: string;
    actionText?: string;
    dedupKey?: string;
    batchId?: string;
  }): Promise<Notification> {
    const id = await convexClient.mutation(api.notifications.create, {
      memberId: data.memberId as Id<"familyMembers">,
      type: data.type,
      title: data.title,
      content: data.content,
      priority: data.priority ?? "MEDIUM",
      channels:
        typeof data.channels === "string"
          ? JSON.parse(data.channels)
          : (data.channels ?? ["IN_APP"]),
      metadata: data.metadata,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      dedupKey: data.dedupKey,
      batchId: data.batchId,
    });

    const result = await convexClient.query<Doc<"notifications"> | null>(
      api.notifications.getById,
      { id: id as Id<"notifications"> }
    );

    return this.mapNotification(result!);
  }

  static async findById(id: string): Promise<Notification | null> {
    const notification = await convexClient.query<Doc<"notifications"> | null>(
      api.notifications.getById,
      { id: id as Id<"notifications"> }
    );

    return notification ? this.mapNotification(notification) : null;
  }

  static async getUserNotifications(
    memberId: string,
    options: {
      type?: NotificationType;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
      includeRead?: boolean;
    } = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await convexClient.query<{
      data: Doc<"notifications">[];
      total: number;
    }>(api.notifications.list, {
      memberId: memberId as Id<"familyMembers">,
      type: options.type,
      status: options.status,
      includeRead: options.includeRead ?? false,
      offset: options.offset,
      limit: options.limit ?? 20,
    });

    return {
      notifications: result.data.map(this.mapNotification),
      total: result.total,
      hasMore: (options.offset ?? 0) + result.data.length < result.total,
    };
  }

  static async markAsRead(notificationId: string, memberId: string): Promise<void> {
    const notification = await convexClient.query<Doc<"notifications"> | null>(
      api.notifications.getById,
      { id: notificationId as Id<"notifications"> }
    );

    if (!notification) {
      throw new Error("Notification not found or access denied");
    }

    await convexClient.mutation(api.notifications.markAsRead, {
      id: notificationId as Id<"notifications">,
    });
  }

  static async markAllAsRead(memberId: string): Promise<void> {
    await convexClient.mutation(api.notifications.markAllAsRead, {
      memberId: memberId as Id<"familyMembers">,
    });
  }

  static async delete(notificationId: string, memberId: string): Promise<void> {
    const notification = await convexClient.query<Doc<"notifications"> | null>(
      api.notifications.getById,
      { id: notificationId as Id<"notifications"> }
    );

    if (!notification) {
      throw new Error("Notification not found or access denied");
    }

    await convexClient.mutation(api.notifications.deleteNotification, {
      id: notificationId as Id<"notifications">,
    });
  }

  static async getUnreadCount(memberId: string): Promise<number> {
    return await convexClient.query<number>(api.notifications.getUnreadCount, {
      memberId: memberId as Id<"familyMembers">,
    });
  }

  static async updateStatus(id: string, status: NotificationStatus): Promise<void> {
    await convexClient.mutation(api.notifications.updateStatus, {
      id: id as Id<"notifications">,
      status,
    });
  }

  static async updateDeliveryResults(id: string, results: string): Promise<void> {
    await convexClient.mutation(api.notifications.updateDeliveryResults, {
      id: id as Id<"notifications">,
      results,
    });
  }

  static async scheduleRetry(id: string, nextRetryAt: Date): Promise<void> {
    await convexClient.mutation(api.notifications.scheduleRetry, {
      id: id as Id<"notifications">,
      nextRetryAt: nextRetryAt.getTime(),
    });
  }

  static async getPendingRetryNotifications(): Promise<Notification[]> {
    const items = await convexClient.query<Doc<"notifications">[]>(
      api.notifications.listPendingRetry,
      { limit: 50 }
    );

    return items.map(this.mapNotification);
  }

  static async getPendingNotifications(limit: number = 50): Promise<Notification[]> {
    const items = await convexClient.query<Doc<"notifications">[]>(api.notifications.listPending, {
      limit,
    });

    return items.map(this.mapNotification);
  }

  static async getUserNotificationStats(
    memberId: string,
    days: number = 30
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<string, { total: number; sent: number; failed: number; pending: number }>;
  }> {
    const stats = await convexClient.query<{
      summary: {
        total: number;
        sent: number;
        failed: number;
        pending: number;
      };
      dailyStats: Array<{
        date: string;
        total: number;
        sent: number;
        failed: number;
        pending: number;
      }>;
      channelStats: Record<
        string,
        { total: number; sent: number; failed: number; successRate: number }
      >;
    }>(api.notifications.getStats, {
      memberId: memberId as Id<"familyMembers">,
      days,
      dailyDays: days,
    });

    return {
      total: stats.summary.total,
      sent: stats.summary.sent,
      failed: stats.summary.failed,
      pending: stats.summary.pending,
      byType: {},
    };
  }

  static async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return await convexClient.mutation(api.notifications.cleanupOld, {
      cutoffTime: cutoffDate.getTime(),
    });
  }

  static async batchUpdateStatus(
    notificationIds: string[],
    status: NotificationStatus
  ): Promise<number> {
    return await convexClient.mutation(api.notifications.batchUpdateStatus, {
      ids: notificationIds.map((id) => id as Id<"notifications">),
      status,
    });
  }

  static async searchNotifications(
    memberId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await convexClient.query<{
      data: Doc<"notifications">[];
      total: number;
    }>(api.notifications.searchNotifications, {
      memberId: memberId as Id<"familyMembers">,
      query,
      limit: options.limit ?? 20,
      offset: options.offset,
      dateFrom: options.dateFrom?.getTime(),
      dateTo: options.dateTo?.getTime(),
    });

    return {
      notifications: result.data.map(this.mapNotification),
      total: result.total,
      hasMore: (options.offset ?? 0) + result.data.length < result.total,
    };
  }

  private static mapNotification(doc: Doc<"notifications">): Notification {
    return {
      id: doc._id,
      memberId: doc.memberId,
      type: doc.type as NotificationType,
      title: doc.title,
      content: doc.content,
      priority: doc.priority,
      channels: doc.channels ?? [],
      metadata: doc.metadata as Record<string, unknown> | undefined,
      actionUrl: doc.actionUrl ?? undefined,
      actionText: doc.actionText ?? undefined,
      dedupKey: doc.dedupKey ?? undefined,
      batchId: doc.batchId ?? undefined,
      status: doc.status as NotificationStatus,
      readAt: doc.readAt ?? null,
      sentAt: doc.sentAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
