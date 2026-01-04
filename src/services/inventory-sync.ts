import {
  PrismaClient,
  Order,
  OrderStatus,
  MealLog,
  StorageLocation,
} from "@prisma/client";
import { inventoryTracker } from "./inventory-tracker";

const prisma = new PrismaClient();

export interface OrderItem {
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  category?: string;
}

export interface ParsedOrderItem {
  name?: string;
  productName?: string;
  quantity?: number;
  amount?: number;
  unit?: string;
  price?: number;
  unitPrice?: number;
  category?: string;
}

export interface SyncResult {
  success: boolean;
  processedItems: number;
  addedItems: number;
  updatedItems: number;
  errors: string[];
  warnings: string[];
}

export interface MealSyncResult {
  success: boolean;
  usedItems: number;
  errors: string[];
}

export class InventorySync {
  /**
   * 从电商订单同步库存
   */
  async syncFromOrder(orderId: string, memberId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      processedItems: 0,
      addedItems: 0,
      updatedItems: 0,
      errors: [],
      warnings: [],
    };

    try {
      // 获取订单信息
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          account: true,
        },
      });

      if (!order) {
        result.success = false;
        result.errors.push("订单不存在");
        return result;
      }

      if (order.status !== OrderStatus.DELIVERED) {
        result.success = false;
        result.errors.push("订单未完成配送，无法同步库存");
        return result;
      }

      // 解析订单商品
      const orderItems = this.parseOrderItems(order);

      for (const orderItem of orderItems) {
        try {
          result.processedItems++;

          // 查找匹配的食物
          const food = await this.findMatchingFood(orderItem);

          if (!food) {
            result.warnings.push(`未找到匹配的食物：${orderItem.name}`);
            continue;
          }

          // 检查是否已存在相同食材的库存
          const existingItem = await prisma.inventoryItem.findFirst({
            where: {
              memberId,
              foodId: food.id,
              deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
          });

          if (existingItem) {
            // 更新现有库存数量
            const newQuantity = existingItem.quantity + orderItem.quantity;
            await inventoryTracker.updateInventoryItem(existingItem.id, {
              quantity: newQuantity,
            });
            result.updatedItems++;
          } else {
            // 创建新的库存条目
            await inventoryTracker.createInventoryItem({
              memberId,
              foodId: food.id,
              quantity: orderItem.quantity,
              unit: orderItem.unit,
              purchasePrice: orderItem.price,
              purchaseSource: `${order.account.platform} - 订单${order.platformOrderId}`,
              expiryDate: this.estimateExpiryDate(
                food.category,
                orderItem.name,
              ),
              storageLocation: this.getDefaultStorageLocation(food.category),
            });
            result.addedItems++;
          }
        } catch (error) {
          result.errors.push(`处理商品 ${orderItem.name} 时出错：${error}`);
        }
      }

      // 更新订单同步状态
      await prisma.order.update({
        where: { id: orderId },
        data: {
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      result.success = false;
      result.errors.push(`同步失败：${error}`);
    }

    return result;
  }

  /**
   * 从餐食记录同步使用量
   */
  async syncFromMealLog(
    mealLogId: string,
    memberId: string,
  ): Promise<MealSyncResult> {
    const result: MealSyncResult = {
      success: true,
      usedItems: 0,
      errors: [],
    };

    try {
      // 获取餐食记录
      const mealLog = await prisma.mealLog.findUnique({
        where: { id: mealLogId },
        include: {
          mealLogFoods: {
            include: {
              food: true,
            },
          },
        },
      });

      if (!mealLog) {
        result.success = false;
        result.errors.push("餐食记录不存在");
        return result;
      }

      // 检查是否已经同步过
      const existingUsage = await prisma.inventoryUsage.findFirst({
        where: {
          memberId,
          relatedId: mealLogId,
          relatedType: "MEAL_LOG",
        },
      });

      if (existingUsage) {
        result.errors.push("该餐食记录已同步过库存使用量");
        return result;
      }

      // 处理每个食材的使用
      for (const mealFood of mealLog.mealLogFoods) {
        try {
          // 查找匹配的库存条目（优先使用临期食材）
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: {
              memberId,
              foodId: mealFood.foodId,
              quantity: { gte: mealFood.amount },
              deletedAt: null,
            },
            include: {
              food: true,
            },
            orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
          });

          if (inventoryItem) {
            await inventoryTracker.useInventory(
              inventoryItem.id,
              mealFood.amount,
              "MEAL_LOG",
              memberId,
              {
                relatedId: mealLogId,
                relatedType: "MEAL_LOG",
                notes: `${mealLog.mealType} - ${mealLog.date.toISOString().split("T")[0]}`,
              },
            );
            result.usedItems++;
          } else {
            result.errors.push(`库存中没有足够的 ${mealFood.food.name}`);
          }
        } catch (error) {
          result.errors.push(`处理食材 ${mealFood.food.name} 时出错：${error}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`同步失败：${error}`);
    }

    return result;
  }

  /**
   * 批量同步多个订单
   */
  async syncMultipleOrders(
    orderIds: string[],
    memberId: string,
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    for (const orderId of orderIds) {
      const result = await this.syncFromOrder(orderId, memberId);
      results.push(result);
    }

    return results;
  }

  /**
   * 自动同步待处理的订单
   */
  async autoSyncPendingOrders(memberId: string): Promise<SyncResult[]> {
    // 获取用户的所有平台账号
    const platformAccounts = await prisma.platformAccount.findMany({
      where: {
        userId: memberId,
        status: "ACTIVE",
        isActive: true,
      },
    });

    const results: SyncResult[] = [];

    for (const account of platformAccounts) {
      // 获取已配送但未同步的订单
      const pendingOrders = await prisma.order.findMany({
        where: {
          accountId: account.id,
          status: OrderStatus.DELIVERED,
          OR: [
            { lastSyncAt: null },
            {
              lastSyncAt: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前同步过
              },
            },
          ],
        },
        orderBy: { deliveryDate: "desc" },
        take: 10, // 最多处理10个订单
      });

      for (const order of pendingOrders) {
        const result = await this.syncFromOrder(order.id, memberId);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 智能推荐保质期
   */
  private estimateExpiryDate(category: string, foodName: string): Date {
    const now = new Date();
    let daysToAdd = 7; // 默认7天

    // 根据食物分类估算保质期
    const expiryMap: { [key: string]: number } = {
      VEGETABLES: 5,
      FRUITS: 7,
      PROTEIN: 3,
      SEAFOOD: 2,
      DAIRY: 10,
      GRAINS: 30,
      OILS: 180,
      SNACKS: 90,
      BEVERAGES: 60,
    };

    daysToAdd = expiryMap[category] || 7;

    // 特殊食物的处理
    const specialItems: { [key: string]: number } = {
      牛奶: 7,
      鸡蛋: 21,
      面包: 3,
      酸奶: 14,
      奶酪: 30,
    };

    if (specialItems[foodName]) {
      daysToAdd = specialItems[foodName];
    }

    const expiryDate = new Date(
      now.getTime() + daysToAdd * 24 * 60 * 60 * 1000,
    );
    return expiryDate;
  }

  /**
   * 获取默认存储位置
   */
  private getDefaultStorageLocation(category: string): StorageLocation {
    const storageMap: { [key: string]: StorageLocation } = {
      VEGETABLES: StorageLocation.REFRIGERATOR,
      FRUITS: StorageLocation.REFRIGERATOR,
      PROTEIN: StorageLocation.REFRIGERATOR,
      SEAFOOD: StorageLocation.REFRIGERATOR,
      DAIRY: StorageLocation.REFRIGERATOR,
      GRAINS: StorageLocation.PANTRY,
      OILS: StorageLocation.PANTRY,
      SNACKS: StorageLocation.PANTRY,
      BEVERAGES: StorageLocation.PANTRY,
    };

    return storageMap[category] || StorageLocation.PANTRY;
  }

  /**
   * 解析订单商品
   */
  private parseOrderItems(order: Order): OrderItem[] {
    try {
      // 假设订单商品信息存储在items字段中，格式为JSON
      const items = JSON.parse(order.items as string);

      return items.map((item: ParsedOrderItem) => ({
        name: item.name || item.productName,
        quantity: item.quantity || item.amount || 1,
        unit: item.unit || "个",
        price: item.price || item.unitPrice,
        category: item.category,
      }));
    } catch (error) {
      console.error("解析订单商品失败:", error);
      return [];
    }
  }

  /**
   * 查找匹配的食物
   */
  private async findMatchingFood(orderItem: OrderItem) {
    // 首先尝试精确匹配
    let food = await prisma.food.findFirst({
      where: {
        name: orderItem.name,
      },
    });

    if (!food) {
      // 尝试模糊匹配
      food = await prisma.food.findFirst({
        where: {
          OR: [
            { name: { contains: orderItem.name } },
            { nameEn: { contains: orderItem.name } },
            { aliases: { contains: orderItem.name } },
          ],
        },
      });
    }

    if (!food) {
      // 如果还是找不到，创建一个新的食物条目
      food = await prisma.food.create({
        data: {
          name: orderItem.name,
          calories: 100, // 默认值，用户可以后续更新
          protein: 10,
          carbs: 20,
          fat: 5,
          category: (orderItem.category as string) || "OTHER",
          source: "USER_SUBMITTED",
          verified: false,
        },
      });
    }

    return food;
  }

  /**
   * 手动添加库存（用于用户手动录入）
   */
  async manualAddInventory(
    memberId: string,
    items: Array<{
      foodName: string;
      quantity: number;
      unit: string;
      purchasePrice?: number;
      purchaseSource?: string;
      expiryDate?: Date;
      storageLocation?: StorageLocation;
    }>,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      processedItems: 0,
      addedItems: 0,
      updatedItems: 0,
      errors: [],
      warnings: [],
    };

    for (const item of items) {
      try {
        result.processedItems++;

        // 查找或创建食物
        let food = await prisma.food.findFirst({
          where: {
            OR: [
              { name: item.foodName },
              { nameEn: { contains: item.foodName } },
            ],
          },
        });

        if (!food) {
          food = await prisma.food.create({
            data: {
              name: item.foodName,
              calories: 100,
              protein: 10,
              carbs: 20,
              fat: 5,
              category: "OTHER",
              source: "USER_SUBMITTED",
              verified: false,
            },
          });
        }

        // 检查现有库存
        const existingItem = await prisma.inventoryItem.findFirst({
          where: {
            memberId,
            foodId: food.id,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingItem) {
          const newQuantity = existingItem.quantity + item.quantity;
          await inventoryTracker.updateInventoryItem(existingItem.id, {
            quantity: newQuantity,
            purchasePrice: item.purchasePrice,
            purchaseSource: item.purchaseSource || "手动录入",
          });
          result.updatedItems++;
        } else {
          await inventoryTracker.createInventoryItem({
            memberId,
            foodId: food.id,
            quantity: item.quantity,
            unit: item.unit,
            purchasePrice: item.purchasePrice,
            purchaseSource: item.purchaseSource || "手动录入",
            expiryDate: item.expiryDate,
            storageLocation: item.storageLocation || StorageLocation.PANTRY,
          });
          result.addedItems++;
        }
      } catch (error) {
        result.errors.push(`处理 ${item.foodName} 时出错：${error}`);
      }
    }

    return result;
  }

  /**
   * 获取同步历史
   */
  async getSyncHistory(memberId: string, limit: number = 50) {
    const [orderHistory, mealHistory] = await Promise.all([
      prisma.order.findMany({
        where: {
          account: { userId: memberId },
          lastSyncAt: { not: null },
        },
        include: {
          account: {
            select: { platform: true },
          },
        },
        orderBy: { lastSyncAt: "desc" },
        take: limit,
      }),
      prisma.inventoryUsage.findMany({
        where: {
          memberId,
          relatedType: "MEAL_LOG",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return {
      orderSyncs: orderHistory.map((order) => ({
        id: order.id,
        platformOrderId: order.platformOrderId,
        platform: order.account.platform,
        syncTime: order.lastSyncAt,
        status: order.status,
      })),
      mealSyncs: mealHistory.map((usage) => ({
        id: usage.id,
        relatedId: usage.relatedId,
        syncTime: usage.createdAt,
        usageType: usage.usageType,
        usedQuantity: usage.usedQuantity,
      })),
    };
  }
}

export const inventorySync = new InventorySync();
