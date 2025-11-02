import { PrismaClient, CheckInType, InventoryStatus } from '@prisma/client';
import { inventoryTracker } from './inventory-tracker';

const prisma = new PrismaClient();

export interface InventoryCheckInStats {
  memberId: string
  period: {
    startDate: Date
    endDate: Date
  }
  inventoryStats: {
    totalItems: number
    freshItems: number
    expiringItems: number
    expiredItems: number
    wasteRate: number
    usageRate: number
  }
  checkInImpact: {
    totalCheckIns: number
    inventoryRelatedCheckIns: number
    wasteReductionRate: number
    improvedTracking: boolean
  }
  achievements: Array<{
    type: 'LOW_WASTE' | 'EFFICIENT_USAGE' | 'GOOD_PLANNING' | 'FRESH_KEEPING'
    title: string
    description: string
    points: number
    unlockedAt: Date
  }>
  suggestions: Array<{
    type: 'IMPROVE_TRACKING' | 'REDUCE_WASTE' | 'BETTER_PLANNING' | 'EXPIRY_MANAGEMENT'
    title: string
    description: string
    actionItems: string[]
  }>
}

export interface CheckInInventoryData {
  usedItems: Array<{
    foodId: string
    quantity: number
    unit: string
    mealType?: string
  }>
  wastedItems: Array<{
    foodId: string
    quantity: number
    unit: string
    reason: string
  }>
  purchasedItems: Array<{
    foodId: string
    quantity: number
    unit: string
    purchasePrice?: number
    purchaseSource?: string
  }>
  inventoryNotes?: string
}

export class InventoryCheckInIntegration {
  /**
   * 基于库存状态生成打卡建议
   */
  async generateCheckInSuggestions(memberId: string): Promise<{
    suggestedActions: Array<{
      type: 'USE_EXPIRING' | 'CHECK_STOCK' | 'PLAN_PURCHASE' | 'REDUCE_WASTE'
      priority: 'HIGH' | 'MEDIUM' | 'LOW'
      title: string
      description: string
      estimatedPoints: number
    }>
    currentInventoryStatus: {
      expiringSoonCount: number
      expiredCount: number
      lowStockCount: number
      totalValue: number
    }
  }> {
    // 获取当前库存状态
    const currentInventory = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      include: {
        food: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    const expiringSoonCount = currentInventory.filter(item => 
      item.status === InventoryStatus.EXPIRING
    ).length;

    const expiredCount = currentInventory.filter(item => 
      item.status === InventoryStatus.EXPIRED
    ).length;

    const lowStockCount = currentInventory.filter(item => 
      item.isLowStock
    ).length;

    const totalValue = currentInventory.reduce((sum, item) => 
      sum + (item.purchasePrice || 0), 0
    );

    const suggestedActions = [];

    // 基于过期物品的建议
    if (expiredCount > 0) {
      suggestedActions.push({
        type: 'REDUCE_WASTE' as const,
        priority: 'HIGH' as const,
        title: '处理过期物品',
        description: `您有 ${expiredCount} 件过期物品，建议立即处理并记录浪费情况`,
        estimatedPoints: 20,
      });
    }

    // 基于临期物品的建议
    if (expiringSoonCount > 0) {
      suggestedActions.push({
        type: 'USE_EXPIRING' as const,
        priority: 'HIGH' as const,
        priority: expiringSoonCount > 5 ? 'HIGH' as const : 'MEDIUM' as const,
        title: '优先使用临期食材',
        description: `您有 ${expiringSoonCount} 件即将过期的食材，建议在打卡中记录使用情况`,
        estimatedPoints: 15,
      });
    }

    // 基于库存不足的建议
    if (lowStockCount > 0) {
      suggestedActions.push({
        type: 'PLAN_PURCHASE' as const,
        priority: 'MEDIUM' as const,
        title: '规划采购',
        description: `您有 ${lowStockCount} 种食材库存不足，建议制定采购计划`,
        estimatedPoints: 10,
      });
    }

    // 基于库存价值的建议
    if (totalValue > 1000) {
      suggestedActions.push({
        type: 'CHECK_STOCK' as const,
        priority: 'MEDIUM' as const,
        title: '检查高价值库存',
        description: '您的库存价值较高，建议定期检查并合理使用',
        estimatedPoints: 10,
      });
    }

    // 通用建议
    if (suggestedActions.length === 0) {
      suggestedActions.push({
        type: 'CHECK_STOCK' as const,
        priority: 'LOW' as const,
        title: '记录库存状态',
        description: '记录今天的库存使用情况，保持良好的库存管理习惯',
        estimatedPoints: 5,
      });
    }

    return {
      suggestedActions: suggestedActions.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      currentInventoryStatus: {
        expiringSoonCount,
        expiredCount,
        lowStockCount,
        totalValue,
      },
    };
  }

  /**
   * 处理包含库存数据的打卡
   */
  async processInventoryCheckIn(
    memberId: string,
    checkInType: CheckInType,
    inventoryData: CheckInInventoryData
  ): Promise<{
    success: boolean
    processedActions: {
      usedItems: number
      wastedItems: number
      addedItems: number
    }
    earnedPoints: number
    achievements: string[]
    errors: string[]
  }> {
    const result = {
      success: true,
      processedActions: {
        usedItems: 0,
        wastedItems: 0,
        addedItems: 0,
      },
      earnedPoints: 0,
      achievements: [] as string[],
      errors: [] as string[],
    };

    try {
      // 处理使用的物品
      for (const usedItem of inventoryData.usedItems) {
        try {
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: {
              memberId,
              foodId: usedItem.foodId,
              quantity: { gte: usedItem.quantity },
              deletedAt: null,
            },
            include: {
              food: true,
            },
            orderBy: [
              { expiryDate: 'asc' },
              { createdAt: 'asc' },
            ],
          });

          if (inventoryItem) {
            await inventoryTracker.useInventory(
              inventoryItem.id,
              usedItem.quantity,
              'MEAL_LOG',
              memberId,
              {
                notes: `打卡记录: ${usedItem.mealType || '日常'}`,
                relatedType: 'CHECK_IN',
              }
            );
            result.processedActions.usedItems++;
            result.earnedPoints += 2;
          } else {
            result.errors.push(`库存中没有足够的食材 ID: ${usedItem.foodId}`);
          }
        } catch (error) {
          result.errors.push(`处理使用物品时出错: ${error}`);
        }
      }

      // 处理浪费的物品
      for (const wastedItem of inventoryData.wastedItems) {
        try {
          const inventoryItem = await prisma.inventoryItem.findFirst({
            where: {
              memberId,
              foodId: wastedItem.foodId,
              quantity: { gte: wastedItem.quantity },
              deletedAt: null,
            },
            include: {
              food: true,
            },
            orderBy: [
              { expiryDate: 'asc' },
              { createdAt: 'asc' },
            ],
          });

          if (inventoryItem) {
            await inventoryTracker.useInventory(
              inventoryItem.id,
              wastedItem.quantity,
              'WASTE',
              memberId,
              {
                notes: `打卡记录浪费: ${wastedItem.reason}`,
                relatedType: 'CHECK_IN',
              }
            );

            // 创建浪费记录
            await prisma.wasteLog.create({
              data: {
                inventoryItemId: inventoryItem.id,
                memberId,
                wastedQuantity: wastedItem.quantity,
                wasteReason: wastedItem.reason as any,
                estimatedCost: (inventoryItem.purchasePrice || 0) * (wastedItem.quantity / inventoryItem.quantity),
              },
            });

            result.processedActions.wastedItems++;
            result.earnedPoints += 1; // 记录浪费也有少量积分
          } else {
            result.errors.push(`库存中没有足够的食材 ID: ${wastedItem.foodId}`);
          }
        } catch (error) {
          result.errors.push(`处理浪费物品时出错: ${error}`);
        }
      }

      // 处理新购买的物品
      for (const purchasedItem of inventoryData.purchasedItems) {
        try {
          await inventoryTracker.createInventoryItem({
            memberId,
            foodId: purchasedItem.foodId,
            quantity: purchasedItem.quantity,
            unit: purchasedItem.unit,
            purchasePrice: purchasedItem.purchasePrice,
            purchaseSource: purchasedItem.purchaseSource || '打卡记录',
            expiryDate: this.estimateExpiryDate(purchasedItem.foodId),
          });
          result.processedActions.addedItems++;
          result.earnedPoints += 3;
        } catch (error) {
          result.errors.push(`添加购买物品时出错: ${error}`);
        }
      }

      // 检查成就
      const achievements = await this.checkInventoryAchievements(memberId, result.processedActions);
      result.achievements = achievements.map(a => a.title);
      result.earnedPoints += achievements.reduce((sum, a) => sum + a.points, 0);

      // 创建库存相关的打卡记录
      if (inventoryData.inventoryNotes) {
        await prisma.checkIn.create({
          data: {
            memberId,
            type: checkInType,
            notes: inventoryData.inventoryNotes,
            points: result.earnedPoints,
            inventoryData: JSON.stringify(inventoryData),
            createdAt: new Date(),
          },
        });
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`处理库存打卡失败: ${error}`);
    }

    return result;
  }

  /**
   * 获取库存相关的打卡统计
   */
  async getInventoryCheckInStats(memberId: string): Promise<InventoryCheckInStats> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 获取库存统计
    const currentInventory = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
    });

    const freshItems = currentInventory.filter(item => item.status === InventoryStatus.FRESH).length;
    const expiringItems = currentInventory.filter(item => item.status === InventoryStatus.EXPIRING).length;
    const expiredItems = currentInventory.filter(item => item.status === InventoryStatus.EXPIRED).length;

    // 获取使用和浪费记录
    const [usageRecords, wasteRecords] = await Promise.all([
      prisma.inventoryUsage.findMany({
        where: {
          memberId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.wasteLog.findMany({
        where: {
          memberId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const totalUsage = usageRecords.reduce((sum, record) => sum + record.usedQuantity, 0);
    const totalWaste = wasteRecords.reduce((sum, record) => sum + record.wastedQuantity, 0);
    const totalInitial = currentInventory.reduce((sum, item) => sum + item.originalQuantity, 0);

    // 获取打卡统计
    const checkIns = await prisma.checkIn.findMany({
      where: {
        memberId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const inventoryRelatedCheckIns = checkIns.filter(checkIn => 
      checkIn.inventoryData || checkIn.type === CheckInType.MEAL
    ).length;

    // 获取成就
    const achievements = await this.getInventoryAchievements(memberId);

    // 生成建议
    const suggestions = this.generateInventorySuggestions({
      wasteRate: totalInitial > 0 ? (totalWaste / totalInitial) * 100 : 0,
      usageRate: totalInitial > 0 ? (totalUsage / totalInitial) * 100 : 0,
      expiredCount: expiredItems,
      expiringCount: expiringItems,
      checkInFrequency: checkIns.length,
    });

    return {
      memberId,
      period: {
        startDate: thirtyDaysAgo,
        endDate: new Date(),
      },
      inventoryStats: {
        totalItems: currentInventory.length,
        freshItems,
        expiringItems,
        expiredItems,
        wasteRate: totalInitial > 0 ? (totalWaste / totalInitial) * 100 : 0,
        usageRate: totalInitial > 0 ? (totalUsage / totalInitial) * 100 : 0,
      },
      checkInImpact: {
        totalCheckIns: checkIns.length,
        inventoryRelatedCheckIns,
        wasteReductionRate: inventoryRelatedCheckIns > 0 ? 
          Math.max(0, 100 - (totalWaste / Math.max(1, totalUsage)) * 100) : 0,
        improvedTracking: inventoryRelatedCheckIns >= 10,
      },
      achievements,
      suggestions,
    };
  }

  /**
   * 生成库存优化建议
   */
  private generateInventorySuggestions(stats: {
    wasteRate: number
    usageRate: number
    expiredCount: number
    expiringCount: number
    checkInFrequency: number
  }): Array<{
    type: 'IMPROVE_TRACKING' | 'REDUCE_WASTE' | 'BETTER_PLANNING' | 'EXPIRY_MANAGEMENT'
    title: string
    description: string
    actionItems: string[]
  }> {
    const suggestions = [];

    if (stats.wasteRate > 20) {
      suggestions.push({
        type: 'REDUCE_WASTE' as const,
        title: '减少食物浪费',
        description: `您的浪费率为 ${stats.wasteRate.toFixed(1)}%，高于建议水平`,
        actionItems: [
          '在打卡中记录每次的食物使用情况',
          '优先使用即将过期的食材',
          '制定更合理的采购计划',
        ],
      });
    }

    if (stats.expiredCount > 0) {
      suggestions.push({
        type: 'EXPIRY_MANAGEMENT' as const,
        title: '改善保质期管理',
        description: `您有 ${stats.expiredCount} 件过期物品`,
        actionItems: [
          '定期检查库存保质期',
          '设置过期提醒',
          '改善存储条件',
        ],
      });
    }

    if (stats.expiringCount > 5) {
      suggestions.push({
        type: 'BETTER_PLANNING' as const,
        title: '优化采购规划',
        description: `您有 ${stats.expiringCount} 件即将过期的物品`,
        actionItems: [
          '减少单次采购量',
          '制定周度用餐计划',
          '优先使用现有库存',
        ],
      });
    }

    if (stats.checkInFrequency < 10) {
      suggestions.push({
        type: 'IMPROVE_TRACKING' as const,
        title: '提高打卡频率',
        description: '建议增加打卡频率以更好地追踪库存使用',
        actionItems: [
          '每天记录饮食情况',
          '定期更新库存状态',
          '使用打卡提醒功能',
        ],
      });
    }

    return suggestions;
  }

  /**
   * 检查库存相关成就
   */
  private async checkInventoryAchievements(
    memberId: string, 
    actions: { usedItems: number; wastedItems: number; addedItems: number }
  ): Promise<Array<{ type: string; title: string; description: string; points: number }>> {
    const achievements = [];

    // 低浪费成就
    if (actions.wastedItems === 0 && actions.usedItems > 0) {
      achievements.push({
        type: 'LOW_WASTE',
        title: '零浪费达人',
        description: '本次打卡无浪费记录',
        points: 10,
      });
    }

    // 高效使用成就
    if (actions.usedItems >= 5) {
      achievements.push({
        type: 'EFFICIENT_USAGE',
        title: '食材利用高手',
        description: '单次打卡使用5种以上食材',
        points: 15,
      });
    }

    // 良好规划成就
    if (actions.addedItems >= 3) {
      achievements.push({
        type: 'GOOD_PLANNING',
        title: '采购规划师',
        description: '单次打卡添加3种以上新食材',
        points: 10,
      });
    }

    return achievements;
  }

  /**
   * 获取用户已获得的库存成就
   */
  private async getInventoryAchievements(memberId: string): Promise<Array<{
    type: 'LOW_WASTE' | 'EFFICIENT_USAGE' | 'GOOD_PLANNING' | 'FRESH_KEEPING'
    title: string
    description: string
    points: number
    unlockedAt: Date
  }>> {
    // 这里应该从成就表中查询，暂时返回模拟数据
    return [];
  }

  private estimateExpiryDate(foodId: string): Date {
    const now = new Date();
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 默认7天后过期
  }
}

export const inventoryCheckInIntegration = new InventoryCheckInIntegration();
