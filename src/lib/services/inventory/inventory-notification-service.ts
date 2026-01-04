import { PrismaClient } from "@prisma/client";
import { NotificationManager } from "@/lib/services/notification";
import { NotificationType, NotificationPriority } from "@prisma/client";

/**
 * 库存系统集成通知的示例
 */
export class InventoryNotificationService {
  private notificationManager: NotificationManager;

  constructor(prisma: PrismaClient) {
    this.notificationManager = new NotificationManager(prisma);
  }

  /**
   * 发送食材过期提醒
   */
  async sendExpiryAlert(
    memberId: string,
    itemData: {
      foodName: string;
      expiryDate: string;
      daysUntilExpiry: number;
      location: string;
    },
  ): Promise<void> {
    try {
      const priority =
        itemData.daysUntilExpiry <= 1
          ? NotificationPriority.URGENT
          : itemData.daysUntilExpiry <= 3
            ? NotificationPriority.HIGH
            : NotificationPriority.MEDIUM;

      const channels =
        itemData.daysUntilExpiry <= 1
          ? ["IN_APP", "EMAIL", "SMS"]
          : ["IN_APP", "EMAIL"];

      let urgencyText = "";
      if (itemData.daysUntilExpiry <= 1) {
        urgencyText = "明天即将过期，请立即使用！";
      } else if (itemData.daysUntilExpiry <= 3) {
        urgencyText = `${itemData.daysUntilExpiry}天后即将过期，请尽快使用！`;
      } else {
        urgencyText = `${itemData.daysUntilExpiry}天后即将过期，请合理安排使用。`;
      }

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.EXPIRY_ALERT,
        templateData: {
          userName: await this.getUserName(memberId),
          foodName: itemData.foodName,
          expiryDate: itemData.expiryDate,
        },
        priority,
        channels,
        metadata: {
          itemId: itemData.foodName,
          itemType: "EXPIRY_ALERT",
          daysUntilExpiry: itemData.daysUntilExpiry,
          location: itemData.location,
        },
        actionUrl: "/inventory/expiring",
        actionText: "查看库存",
      });
    } catch (error) {
      console.error("Failed to send expiry alert:", error);
    }
  }

  /**
   * 发送库存不足提醒
   */
  async sendLowStockAlert(
    memberId: string,
    itemData: {
      foodName: string;
      currentStock: number;
      minStock: number;
      unit: string;
    },
  ): Promise<void> {
    try {
      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.EXPIRY_ALERT,
        title: "库存不足提醒",
        content: `您的食材"${itemData.foodName}"库存仅剩${itemData.currentStock}${itemData.unit}，低于最低库存${itemData.minStock}${itemData.unit}，建议及时补充。`,
        priority: NotificationPriority.MEDIUM,
        channels: ["IN_APP", "EMAIL"],
        metadata: {
          itemId: itemData.foodName,
          itemType: "LOW_STOCK",
          currentStock: itemData.currentStock,
          minStock: itemData.minStock,
        },
        actionUrl: "/inventory/low-stock",
        actionText: "补充库存",
      });
    } catch (error) {
      console.error("Failed to send low stock alert:", error);
    }
  }

  /**
   * 发送采购建议通知
   */
  async sendPurchaseRecommendation(
    memberId: string,
    recommendations: Array<{
      foodName: string;
      suggestedQuantity: number;
      unit: string;
      estimatedPrice: number;
      reason: string;
    }>,
  ): Promise<void> {
    try {
      const recommendationText = recommendations
        .map(
          (rec) =>
            `${rec.foodName}: ${rec.suggestedQuantity}${rec.unit} (约¥${rec.estimatedPrice})`,
        )
        .join("、");

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.TASK_NOTIFICATION,
        title: "智能采购建议",
        content: `基于您的库存和饮食习惯，建议采购：${recommendationText}。`,
        priority: NotificationPriority.MEDIUM,
        channels: ["IN_APP", "EMAIL"],
        metadata: {
          itemType: "PURCHASE_RECOMMENDATION",
          recommendations,
        },
        actionUrl: "/shopping/recommendations",
        actionText: "查看详情",
      });
    } catch (error) {
      console.error("Failed to send purchase recommendation:", error);
    }
  }

  /**
   * 发送浪费分析报告
   */
  async sendWasteAnalysisReport(
    memberId: string,
    reportData: {
      totalWastedItems: number;
      totalWastedValue: number;
      topWastedItems: Array<{
        foodName: string;
        wastedQuantity: number;
        estimatedValue: number;
      }>;
      period: string;
    },
  ): Promise<void> {
    try {
      const topWastedText = reportData.topWastedItems
        .slice(0, 3)
        .map((item) => `${item.foodName}(¥${item.estimatedValue})`)
        .join("、");

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.BUDGET_WARNING,
        title: "食材浪费分析报告",
        content: `${reportData.period}期间，您浪费了${reportData.totalWastedItems}件食材，价值约¥${reportData.totalWastedValue}。主要浪费食材：${topWastedText}。`,
        priority: NotificationPriority.MEDIUM,
        channels: ["IN_APP", "EMAIL"],
        metadata: {
          itemType: "WASTE_ANALYSIS",
          reportData,
        },
        actionUrl: "/inventory/waste-analysis",
        actionText: "查看报告",
      });
    } catch (error) {
      console.error("Failed to send waste analysis report:", error);
    }
  }

  /**
   * 发送库存更新通知
   */
  async sendInventoryUpdateNotification(
    memberId: string,
    updateData: {
      operation: "added" | "consumed" | "removed";
      foodName: string;
      quantity: number;
      unit: string;
      newStock: number;
    },
  ): Promise<void> {
    try {
      let operationText = "";
      switch (updateData.operation) {
      case "added":
        operationText = `新增了${updateData.quantity}${updateData.unit}`;
        break;
      case "consumed":
        operationText = `消耗了${updateData.quantity}${updateData.unit}`;
        break;
      case "removed":
        operationText = `移除了${updateData.quantity}${updateData.unit}`;
        break;
      }

      await this.notificationManager.createNotification({
        memberId,
        type: NotificationType.FAMILY_ACTIVITY,
        title: "库存更新",
        content: `您的食材"${updateData.foodName}"${operationText}，当前库存：${updateData.newStock}${updateData.unit}。`,
        priority: NotificationPriority.LOW,
        channels: ["IN_APP"],
        metadata: {
          itemType: "INVENTORY_UPDATE",
          updateData,
        },
        actionUrl: "/inventory",
        actionText: "查看库存",
      });
    } catch (error) {
      console.error("Failed to send inventory update notification:", error);
    }
  }

  /**
   * 批量发送家庭库存通知
   */
  async sendFamilyInventoryNotification(
    familyId: string,
    notificationData: {
      type: "EXPIRY_ALERT" | "LOW_STOCK" | "PURCHASE_RECOMMENDATION";
      title: string;
      content: string;
      priority: NotificationPriority;
    },
  ): Promise<void> {
    try {
      const familyMembers = await this.getFamilyMembers(familyId);

      const notifications = familyMembers.map((memberId) => ({
        memberId,
        type: NotificationType.FAMILY_ACTIVITY,
        title: notificationData.title,
        content: notificationData.content,
        priority: notificationData.priority,
        channels: ["IN_APP", "EMAIL"],
        metadata: {
          itemType: "FAMILY_INVENTORY",
          notificationType: notificationData.type,
        },
        actionUrl: "/inventory",
        actionText: "查看家庭库存",
      }));

      await this.notificationManager.createBulkNotifications(notifications);
    } catch (error) {
      console.error("Failed to send family inventory notification:", error);
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
  const inventoryService = new InventoryNotificationService(prisma);

  // 示例1: 发送食材过期提醒
  await inventoryService.sendExpiryAlert("member-123", {
    foodName: "牛奶",
    expiryDate: "2025-11-01",
    daysUntilExpiry: 1,
    location: "冷藏室",
  });

  // 示例2: 发送库存不足提醒
  await inventoryService.sendLowStockAlert("member-123", {
    foodName: "鸡蛋",
    currentStock: 2,
    minStock: 6,
    unit: "个",
  });

  // 示例3: 发送采购建议
  await inventoryService.sendPurchaseRecommendation("member-123", [
    {
      foodName: "西红柿",
      suggestedQuantity: 500,
      unit: "克",
      estimatedPrice: 8.5,
      reason: "库存不足且常用",
    },
    {
      foodName: "鸡胸肉",
      suggestedQuantity: 300,
      unit: "克",
      estimatedPrice: 15.0,
      reason: "蛋白质需求",
    },
  ]);

  // 示例4: 发送浪费分析报告
  await inventoryService.sendWasteAnalysisReport("member-123", {
    totalWastedItems: 5,
    totalWastedValue: 23.5,
    topWastedItems: [
      { foodName: "青菜", wastedQuantity: 200, estimatedValue: 6.0 },
      { foodName: "面包", wastedQuantity: 300, estimatedValue: 8.5 },
      { foodName: "酸奶", wastedQuantity: 150, estimatedValue: 9.0 },
    ],
    period: "本周",
  });

  // 示例5: 发送库存更新通知
  await inventoryService.sendInventoryUpdateNotification("member-123", {
    operation: "added",
    foodName: "苹果",
    quantity: 6,
    unit: "个",
    newStock: 8,
  });

  await prisma.$disconnect();
}
