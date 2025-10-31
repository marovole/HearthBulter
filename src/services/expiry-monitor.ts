import { PrismaClient, InventoryItem, InventoryStatus, NotificationType } from '@prisma/client'
import { inventoryTracker } from './inventory-tracker'

const prisma = new PrismaClient()

export interface ExpiryAlert {
  id: string
  itemId: string
  foodName: string
  expiryDate: Date
  daysToExpiry: number
  status: InventoryStatus
  quantity: number
  unit: string
  storageLocation: string
}

export interface ExpirySummary {
  memberId: string
  expiredItems: ExpiryAlert[]
  expiringItems: ExpiryAlert[]
  totalExpiredValue: number
  totalExpiringValue: number
  recommendations: string[]
}

export class ExpiryMonitor {
  /**
   * 检查并更新所有库存条目的保质期状态
   */
  async updateAllExpiryStatuses(): Promise<void> {
    const items = await prisma.inventoryItem.findMany({
      where: {
        expiryDate: { not: null },
        deletedAt: null
      }
    })

    for (const item of items) {
      await this.updateItemExpiryStatus(item.id)
    }
  }

  /**
   * 更新单个库存条目的保质期状态
   */
  async updateItemExpiryStatus(itemId: string): Promise<InventoryItem> {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId }
    })

    if (!item || !item.expiryDate) {
      return item!
    }

    const daysToExpiry = this.calculateDaysToExpiry(item.expiryDate)
    const newStatus = this.calculateInventoryStatus(item.quantity, item.expiryDate, item.minStockThreshold)

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        daysToExpiry,
        status: newStatus,
        isLowStock: item.minStockThreshold ? item.quantity <= item.minStockThreshold : false
      }
    })

    return updatedItem
  }

  /**
   * 获取用户的临期和过期物品清单
   */
  async getExpiryAlerts(memberId: string): Promise<ExpirySummary> {
    const items = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        expiryDate: { not: null },
        deletedAt: null,
        OR: [
          { status: InventoryStatus.EXPIRED },
          { status: InventoryStatus.EXPIRING }
        ]
      },
      include: {
        food: {
          select: {
            name: true,
            nameEn: true
          }
        }
      },
      orderBy: {
        expiryDate: 'asc'
      }
    })

    const expiredItems: ExpiryAlert[] = []
    const expiringItems: ExpiryAlert[] = []

    for (const item of items) {
      const alert: ExpiryAlert = {
        id: item.id,
        itemId: item.id,
        foodName: item.food.nameEn ? `${item.food.name} (${item.food.nameEn})` : item.food.name,
        expiryDate: item.expiryDate!,
        daysToExpiry: item.daysToExpiry || 0,
        status: item.status,
        quantity: item.quantity,
        unit: item.unit,
        storageLocation: item.storageLocation
      }

      if (item.status === InventoryStatus.EXPIRED) {
        expiredItems.push(alert)
      } else if (item.status === InventoryStatus.EXPIRING) {
        expiringItems.push(alert)
      }
    }

    const totalExpiredValue = expiredItems.reduce((sum, item) => {
      return sum + (this.estimateItemValue(item) || 0)
    }, 0)

    const totalExpiringValue = expiringItems.reduce((sum, item) => {
      return sum + (this.estimateItemValue(item) || 0)
    }, 0)

    const recommendations = this.generateRecommendations(expiredItems, expiringItems)

    return {
      memberId,
      expiredItems,
      expiringItems,
      totalExpiredValue,
      totalExpiringValue,
      recommendations
    }
  }

  /**
   * 生成保质期提醒通知
   */
  async generateExpiryNotifications(memberId: string): Promise<void> {
    const summary = await this.getExpiryAlerts(memberId)

    // 过期物品通知
    if (summary.expiredItems.length > 0) {
      await this.createExpiryNotification(
        memberId,
        'expired',
        `您有 ${summary.expiredItems.length} 件食材已过期`,
        this.buildExpiryMessage(summary.expiredItems, '已过期'),
        summary.expiredItems
      )
    }

    // 临期物品通知（3天内过期）
    const criticalExpiring = summary.expiringItems.filter(item => item.daysToExpiry <= 3)
    if (criticalExpiring.length > 0) {
      await this.createExpiryNotification(
        memberId,
        'expiring',
        `您有 ${criticalExpiring.length} 件食材即将过期`,
        this.buildExpiryMessage(criticalExpiring, '即将过期'),
        criticalExpiring
      )
    }
  }

  /**
   * 批量处理过期物品
   */
  async handleExpiredItems(memberId: string, itemIds: string[], wasteReason: string = 'EXPIRED'): Promise<void> {
    for (const itemId of itemIds) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId }
      })

      if (!item || item.memberId !== memberId) {
        continue
      }

      // 创建浪费记录
      await prisma.wasteLog.create({
        data: {
          inventoryItemId: itemId,
          memberId,
          wastedQuantity: item.quantity,
          wasteReason: wasteReason as any,
          estimatedCost: this.estimateItemValue({
            ...item,
            food: { name: 'Unknown' }
          }),
          notes: '自动处理过期物品',
          preventable: true,
          preventionTip: this.generatePreventionTip(item)
        }
      })

      // 将库存数量设为0
      await prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: 0,
          status: InventoryStatus.OUT_OF_STOCK
        }
      })
    }
  }

  /**
   * 获取保质期趋势分析
   */
  async getExpiryTrends(memberId: string, days: number = 30): Promise<{
    dailyExpiredCounts: Array<{ date: string; count: number }>
    dailyExpiringCounts: Array<{ date: string; count: number }>
    topWasteCategories: Array<{ category: string; count: number; value: number }>
    wasteRate: number
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 获取浪费记录
    const wasteLogs = await prisma.wasteLog.findMany({
      where: {
        memberId,
        createdAt: { gte: startDate }
      },
      include: {
        inventoryItem: {
          include: {
            food: {
              select: { category: true }
            }
          }
        }
      }
    })

    // 按日期分组统计
    const dailyExpiredCounts: { [key: string]: number } = {}
    const dailyExpiringCounts: { [key: string]: number } = {}

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dailyExpiredCounts[dateStr] = 0
      dailyExpiringCounts[dateStr] = 0
    }

    wasteLogs.forEach(log => {
      const dateStr = log.createdAt.toISOString().split('T')[0]
      if (log.wasteReason === 'EXPIRED') {
        dailyExpiredCounts[dateStr] = (dailyExpiredCounts[dateStr] || 0) + 1
      }
      dailyExpiringCounts[dateStr] = (dailyExpiringCounts[dateStr] || 0) + 1
    })

    // 统计浪费最多的分类
    const categoryStats: { [key: string]: { count: number; value: number } } = {}
    wasteLogs.forEach(log => {
      const category = log.inventoryItem.food.category
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, value: 0 }
      }
      categoryStats[category].count += 1
      categoryStats[category].value += log.estimatedCost || 0
    })

    const topWasteCategories = Object.entries(categoryStats)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 计算浪费率
    const totalItems = await prisma.inventoryItem.count({
      where: { memberId, deletedAt: null }
    })
    const wasteRate = totalItems > 0 ? (wasteLogs.length / totalItems) * 100 : 0

    return {
      dailyExpiredCounts: Object.entries(dailyExpiredCounts).map(([date, count]) => ({ date, count })),
      dailyExpiringCounts: Object.entries(dailyExpiringCounts).map(([date, count]) => ({ date, count })),
      topWasteCategories,
      wasteRate
    }
  }

  /**
   * 计算剩余保质期天数
   */
  private calculateDaysToExpiry(expiryDate: Date): number {
    const now = new Date()
    const diffTime = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  /**
   * 计算库存状态
   */
  private calculateInventoryStatus(
    quantity: number,
    expiryDate: Date,
    minStockThreshold?: number
  ): InventoryStatus {
    if (quantity <= 0) {
      return InventoryStatus.OUT_OF_STOCK
    }

    if (minStockThreshold && quantity <= minStockThreshold) {
      return InventoryStatus.LOW_STOCK
    }

    const daysToExpiry = this.calculateDaysToExpiry(expiryDate)

    if (daysToExpiry < 0) {
      return InventoryStatus.EXPIRED
    } else if (daysToExpiry <= 3) {
      return InventoryStatus.EXPIRING
    }

    return InventoryStatus.FRESH
  }

  /**
   * 估算物品价值
   */
  private estimateItemValue(item: any): number {
    // 这里可以根据物品的购买价格、数量等信息估算
    // 简单实现：如果有购买价格就使用购买价格，否则返回默认值
    return item.purchasePrice || 0
  }

  /**
   * 生成建议
   */
  private generateRecommendations(expiredItems: ExpiryAlert[], expiringItems: ExpiryAlert[]): string[] {
    const recommendations: string[] = []

    if (expiredItems.length > 0) {
      recommendations.push('立即处理过期物品，避免健康风险')
      recommendations.push('检查存储条件，确保适当温度和湿度')
    }

    if (expiringItems.length > 0) {
      recommendations.push('优先使用临期食材，减少浪费')
      recommendations.push('考虑制作相关食谱，集中使用临期食材')
    }

    // 根据存储位置给出建议
    const storageLocations = new Set([
      ...expiredItems.map(item => item.storageLocation),
      ...expiringItems.map(item => item.storageLocation)
    ])

    if (storageLocations.has('REFRIGERATOR')) {
      recommendations.push('检查冰箱温度设置，确保在4°C以下')
    }

    if (storageLocations.has('PANTRY')) {
      recommendations.push('定期检查常温储存的食材，避免过期')
    }

    return recommendations
  }

  /**
   * 构建过期提醒消息
   */
  private buildExpiryMessage(items: ExpiryAlert[], type: string): string {
    const itemList = items.slice(0, 5).map(item => 
      `• ${item.foodName} (${item.quantity}${item.unit}) - ${item.daysToExpiry}天`
    ).join('\n')

    let message = `以下食材${type}：\n\n${itemList}`

    if (items.length > 5) {
      message += `\n\n还有 ${items.length - 5} 件食材${type}...`
    }

    message += '\n\n建议及时处理以避免浪费。'

    return message
  }

  /**
   * 创建过期通知
   */
  private async createExpiryNotification(
    memberId: string,
    type: 'expired' | 'expiring',
    title: string,
    content: string,
    items: ExpiryAlert[]
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        memberId,
        type: type === 'expired' ? NotificationType.EXPIRY_ALERT : NotificationType.EXPIRY_ALERT,
        title,
        content,
        priority: type === 'expired' ? 'HIGH' : 'MEDIUM' as any,
        metadata: {
          type,
          itemCount: items.length,
          items: items.map(item => ({
            itemId: item.itemId,
            foodName: item.foodName,
            expiryDate: item.expiryDate
          }))
        }
      }
    })
  }

  /**
   * 生成预防建议
   */
  private generatePreventionTip(item: InventoryItem): string {
    const tips = [
      '购买前检查保质期',
      '遵循先进先出原则',
      '适当存储延长保质期',
      '定期检查库存状态'
    ]

    // 根据存储位置给出特定建议
    switch (item.storageLocation) {
      case 'REFRIGERATOR':
        tips.push('确保冰箱温度在4°C以下')
        break
      case 'FREEZER':
        tips.push('冷冻可大幅延长保质期')
        break
      case 'PANTRY':
        tips.push('保持干燥通风环境')
        break
    }

    return tips[Math.floor(Math.random() * tips.length)]
  }
}

export const expiryMonitor = new ExpiryMonitor()
