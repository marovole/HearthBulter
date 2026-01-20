import { NotificationType } from "@prisma/client";
import type { InventoryRepository } from "@/lib/repositories/interfaces/inventory-repository";
import type { NotificationRepository } from "@/lib/repositories/interfaces/notification-repository";
import { inventoryRepository } from "@/lib/repositories/inventory-repository-singleton";
import { notificationRepository } from "@/lib/repositories/notification-repository-singleton";

export interface NotificationConfig {
  expiryAlerts: {
    enabled: boolean;
    advanceDays: number[];
    frequency: "DAILY" | "WEEKLY" | "IMMEDIATE";
  };
  lowStockAlerts: {
    enabled: boolean;
    threshold: number;
    frequency: "DAILY" | "WEEKLY" | "IMMEDIATE";
  };
  wasteReports: {
    enabled: boolean;
    frequency: "WEEKLY" | "MONTHLY";
  };
  usageReminders: {
    enabled: boolean;
    frequency: "DAILY" | "WEEKLY";
  };
  purchaseSuggestions: {
    enabled: boolean;
    frequency: "WEEKLY" | "MONTHLY";
  };
}

export type InventoryNotificationData = Record<string, unknown>;

export interface InventoryNotification {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW" | "URGENT";
  data?: InventoryNotificationData;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface NotificationSummary {
  memberId: string;
  totalNotifications: number;
  unreadCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  notifications: InventoryNotification[];
}

export interface InventoryNotificationServiceDeps {
  inventoryRepo: InventoryRepository;
  notificationRepo: NotificationRepository;
}

const DEFAULT_CONFIG: NotificationConfig = {
  expiryAlerts: {
    enabled: true,
    advanceDays: [3, 7],
    frequency: "DAILY",
  },
  lowStockAlerts: {
    enabled: true,
    threshold: 1,
    frequency: "IMMEDIATE",
  },
  wasteReports: {
    enabled: true,
    frequency: "WEEKLY",
  },
  usageReminders: {
    enabled: false,
    frequency: "DAILY",
  },
  purchaseSuggestions: {
    enabled: true,
    frequency: "WEEKLY",
  },
};

export class InventoryNotificationService {
  private readonly inventoryRepo: InventoryRepository;
  private readonly notificationRepo: NotificationRepository;

  constructor({
    inventoryRepo,
    notificationRepo,
  }: InventoryNotificationServiceDeps) {
    this.inventoryRepo = inventoryRepo;
    this.notificationRepo = notificationRepo;
  }

  async getNotificationConfig(_memberId: string): Promise<NotificationConfig> {
    return DEFAULT_CONFIG;
  }

  async updateNotificationConfig(
    _memberId: string,
    _config: Partial<NotificationConfig>,
  ): Promise<boolean> {
    return true;
  }

  async generateExpiryNotifications(
    _memberId: string,
  ): Promise<InventoryNotification[]> {
    return [];
  }

  async generateLowStockNotifications(
    memberId: string,
  ): Promise<InventoryNotification[]> {
    const lowStockItems = await this.inventoryRepo.getLowStockItems(memberId);

    if (lowStockItems.length === 0) {
      return [];
    }

    const itemsText = lowStockItems
      .slice(0, 5)
      .map((item) => `${item.food.name}`)
      .join("、");

    return [
      {
        id: "",
        memberId,
        type: NotificationType.OTHER,
        title: "库存不足提醒",
        message: `您有 ${lowStockItems.length} 种食材库存不足：${itemsText}${
          lowStockItems.length > 5 ? "等" : ""
        }，建议及时补货`,
        priority: "MEDIUM",
        data: {
          lowStockItems: lowStockItems.slice(0, 10).map((item) => ({
            foodId: item.foodId,
            foodName: item.food.name,
            currentQuantity: item.quantity,
            unit: item.unit,
          })),
        },
        isRead: false,
        createdAt: new Date(),
      },
    ];
  }

  async generateWasteReportNotifications(): Promise<InventoryNotification[]> {
    return [];
  }

  async generatePurchaseSuggestionNotifications(): Promise<
    InventoryNotification[]
  > {
    return [];
  }

  async createNotifications(
    notifications: Omit<InventoryNotification, "id">[],
  ): Promise<boolean> {
    try {
      for (const notification of notifications) {
        await this.notificationRepo.createNotification({
          memberId: notification.memberId,
          type: notification.type,
          title: notification.title,
          content: notification.message,
          priority: notification.priority,
          channels: ["IN_APP"],
          metadata: notification.data,
          actionUrl: undefined,
          actionText: undefined,
        });
      }
      return true;
    } catch (error) {
      console.error("创建通知失败:", error);
      return false;
    }
  }

  async getUserNotifications(
    memberId: string,
    filters?: {
      type?: NotificationType;
      priority?: "HIGH" | "MEDIUM" | "LOW";
      isRead?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<NotificationSummary> {
    const result = await this.notificationRepo.listMemberNotifications(
      {
        memberId,
        type: filters?.type,
        status: undefined,
        channel: undefined,
        includeRead: filters?.isRead ? true : undefined,
      },
      {
        limit: filters?.limit,
        offset: filters?.offset,
      },
    );

    const notifications = result.items.map((notification) => ({
      id: notification.id,
      memberId: notification.memberId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.content,
      priority: notification.priority,
      data: notification.metadata as InventoryNotificationData,
      isRead: notification.readAt != null,
      createdAt: notification.createdAt,
      scheduledFor: undefined,
      expiresAt: undefined,
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    const highPriorityCount = notifications.filter(
      (n) => n.priority === "HIGH" && !n.isRead,
    ).length;
    const mediumPriorityCount = notifications.filter(
      (n) => n.priority === "MEDIUM" && !n.isRead,
    ).length;
    const lowPriorityCount = notifications.filter(
      (n) => n.priority === "LOW" && !n.isRead,
    ).length;

    return {
      memberId,
      totalNotifications: result.total ?? notifications.length,
      unreadCount,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      notifications,
    };
  }

  async markNotificationAsRead(
    notificationId: string,
    memberId: string,
  ): Promise<boolean> {
    try {
      await this.notificationRepo.markAsRead(notificationId, memberId);
      return true;
    } catch (error) {
      console.error("标记通知已读失败:", error);
      return false;
    }
  }

  async markAllNotificationsAsRead(memberId: string): Promise<boolean> {
    try {
      await this.notificationRepo.markAllAsRead(memberId);
      return true;
    } catch (error) {
      console.error("批量标记通知已读失败:", error);
      return false;
    }
  }

  async deleteNotification(
    notificationId: string,
    memberId: string,
  ): Promise<boolean> {
    try {
      await this.notificationRepo.deleteNotification(notificationId, memberId);
      return true;
    } catch (error) {
      console.error("删除通知失败:", error);
      return false;
    }
  }

  async generateScheduledNotifications(): Promise<void> {}

  async cleanupExpiredNotifications(): Promise<void> {}
}

let inventoryNotificationServiceInstance: InventoryNotificationService | null =
  null;

function getInventoryNotificationServiceSingleton(): InventoryNotificationService {
  if (!inventoryNotificationServiceInstance) {
    inventoryNotificationServiceInstance = new InventoryNotificationService({
      inventoryRepo: inventoryRepository,
      notificationRepo: notificationRepository,
    });
  }

  return inventoryNotificationServiceInstance;
}

export const inventoryNotificationService =
  getInventoryNotificationServiceSingleton();
