import { PrismaClient, InventoryStatus, NotificationType } from '@prisma/client'
import { expiryMonitor } from './expiry-monitor'
import { inventoryAnalyzer } from './inventory-analyzer'

const prisma = new PrismaClient()

export interface NotificationConfig {
  expiryAlerts: {
    enabled: boolean
    advanceDays: number[] // [3, 7] 表示提前3天和7天提醒
    frequency: 'DAILY' | 'WEEKLY' | 'IMMEDIATE'
  }
  lowStockAlerts: {
    enabled: boolean
    threshold: number // 低于阈值时提醒
    frequency: 'DAILY' | 'WEEKLY' | 'IMMEDIATE'
  }
  wasteReports: {
    enabled: boolean
    frequency: 'WEEKLY' | 'MONTHLY'
  }
  usageReminders: {
    enabled: boolean
    frequency: 'DAILY' | 'WEEKLY'
  }
  purchaseSuggestions: {
    enabled: boolean
    frequency: 'WEEKLY' | 'MONTHLY'
  }
}

export interface InventoryNotification {
  id: string
  memberId: string
  type: NotificationType
  title: string
  message: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  data?: any
  isRead: boolean
  createdAt: Date
  scheduledFor?: Date
  expiresAt?: Date
}

export interface NotificationSummary {
  memberId: string
  totalNotifications: number
  unreadCount: number
  highPriorityCount: number
  mediumPriorityCount: number
  lowPriorityCount: number
  notifications: InventoryNotification[]
}

export class InventoryNotificationService {
  /**
   * 获取用户的通知配置
   */
  async getNotificationConfig(memberId: string): Promise<NotificationConfig> {
    const config = await prisma.notificationConfig.findUnique({
      where: { memberId }
    })

    if (config) {
      return {
        expiryAlerts: {
          enabled: config.expiryAlerts,
          advanceDays: config.expiryAdvanceDays || [3, 7],
          frequency: config.expiryFrequency as any || 'DAILY'
        },
        lowStockAlerts: {
          enabled: config.lowStockAlerts,
          threshold: config.lowStockThreshold || 1,
          frequency: config.lowStockFrequency as any || 'IMMEDIATE'
        },
        wasteReports: {
          enabled: config.wasteReports,
          frequency: config.wasteFrequency as any || 'WEEKLY'
        },
        usageReminders: {
          enabled: config.usageReminders,
          frequency: config.usageFrequency as any || 'DAILY'
        },
        purchaseSuggestions: {
          enabled: config.purchaseSuggestions,
          frequency: config.purchaseFrequency as any || 'WEEKLY'
        }
      }
    }

    // 返回默认配置
    return {
      expiryAlerts: {
        enabled: true,
        advanceDays: [3, 7],
        frequency: 'DAILY'
      },
      lowStockAlerts: {
        enabled: true,
        threshold: 1,
        frequency: 'IMMEDIATE'
      },
      wasteReports: {
        enabled: true,
        frequency: 'WEEKLY'
      },
      usageReminders: {
        enabled: false,
        frequency: 'DAILY'
      },
      purchaseSuggestions: {
        enabled: true,
        frequency: 'WEEKLY'
      }
    }
  }

  /**
   * 更新用户的通知配置
   */
  async updateNotificationConfig(
    memberId: string, 
    config: Partial<NotificationConfig>
  ): Promise<boolean> {
    try {
      await prisma.notificationConfig.upsert({
        where: { memberId },
        update: {
          expiryAlerts: config.expiryAlerts?.enabled,
          expiryAdvanceDays: config.expiryAlerts?.advanceDays,
          expiryFrequency: config.expiryAlerts?.frequency,
          lowStockAlerts: config.lowStockAlerts?.enabled,
          lowStockThreshold: config.lowStockAlerts?.threshold,
          lowStockFrequency: config.lowStockAlerts?.frequency,
          wasteReports: config.wasteReports?.enabled,
          wasteFrequency: config.wasteReports?.frequency,
          usageReminders: config.usageReminders?.enabled,
          usageFrequency: config.usageReminders?.frequency,
          purchaseSuggestions: config.purchaseSuggestions?.enabled,
          purchaseFrequency: config.purchaseSuggestions?.frequency
        },
        create: {
          memberId,
          expiryAlerts: config.expiryAlerts?.enabled ?? true,
          expiryAdvanceDays: config.expiryAlerts?.advanceDays ?? [3, 7],
          expiryFrequency: config.expiryAlerts?.frequency ?? 'DAILY',
          lowStockAlerts: config.lowStockAlerts?.enabled ?? true,
          lowStockThreshold: config.lowStockAlerts?.threshold ?? 1,
          lowStockFrequency: config.lowStockAlerts?.frequency ?? 'IMMEDIATE',
          wasteReports: config.wasteReports?.enabled ?? true,
          wasteFrequency: config.wasteReports?.frequency ?? 'WEEKLY',
          usageReminders: config.usageReminders?.enabled ?? false,
          usageFrequency: config.usageReminders?.frequency ?? 'DAILY',
          purchaseSuggestions: config.purchaseSuggestions?.enabled ?? true,
          purchaseFrequency: config.purchaseSuggestions?.frequency ?? 'WEEKLY'
        }
      })
      return true
    } catch (error) {
      console.error('更新通知配置失败:', error)
      return false
    }
  }

  /**
   * 生成过期提醒通知
   */
  async generateExpiryNotifications(memberId: string): Promise<InventoryNotification[]> {
    const notifications: InventoryNotification[] = []
    const config = await this.getNotificationConfig(memberId)

    if (!config.expiryAlerts.enabled) {
      return notifications
    }

    const expirySummary = await expiryMonitor.getExpiryAlerts(memberId)

    // 即将过期的物品
    if (expirySummary.expiringItems.length > 0) {
      const itemsText = expirySummary.expiringItems
        .slice(0, 5)
        .map(item => `${item.foodName} (${item.daysToExpiry}天)`)
        .join('、')

      notifications.push({
        id: '', // 将在创建时生成
        memberId,
        type: NotificationType.EXPIRY_ALERT,
        title: '食材即将过期',
        message: `您有 ${expirySummary.expiringItems.length} 件食材即将过期：${itemsText}${expirySummary.expiringItems.length > 5 ? '等' : ''}`,
        priority: 'HIGH',
        data: {
          expiringItems: expirySummary.expiringItems,
          totalValue: expirySummary.totalExpiringValue
        },
        isRead: false,
        createdAt: new Date()
      })
    }

    // 已过期的物品
    if (expirySummary.expiredItems.length > 0) {
      const itemsText = expirySummary.expiredItems
        .slice(0, 5)
        .map(item => `${item.foodName}`)
        .join('、')

      notifications.push({
        id: '',
        memberId,
        type: NotificationType.EXPIRY_ALERT,
        title: '食材已过期',
        message: `您有 ${expirySummary.expiredItems.length} 件食材已过期：${itemsText}${expirySummary.expiredItems.length > 5 ? '等' : ''}，请及时处理`,
        priority: 'HIGH',
        data: {
          expiredItems: expirySummary.expiredItems,
          totalValue: expirySummary.totalExpiredValue
        },
        isRead: false,
        createdAt: new Date()
      })
    }

    return notifications
  }

  /**
   * 生成库存不足提醒
   */
  async generateLowStockNotifications(memberId: string): Promise<InventoryNotification[]> {
    const notifications: InventoryNotification[] = []
    const config = await this.getNotificationConfig(memberId)

    if (!config.lowStockAlerts.enabled) {
      return notifications
    }

    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        memberId,
        isLowStock: true,
        deletedAt: null
      },
      include: {
        food: {
          select: { name: true }
        }
      },
      take: 10
    })

    if (lowStockItems.length > 0) {
      const itemsText = lowStockItems
        .slice(0, 5)
        .map(item => `${item.food.name}`)
        .join('、')

      notifications.push({
        id: '',
        memberId,
        type: NotificationType.LOW_STOCK_ALERT,
        title: '库存不足提醒',
        message: `您有 ${lowStockItems.length} 种食材库存不足：${itemsText}${lowStockItems.length > 5 ? '等' : ''}，建议及时补货`,
        priority: 'MEDIUM',
        data: {
          lowStockItems: lowStockItems.map(item => ({
            foodId: item.foodId,
            foodName: item.food.name,
            currentQuantity: item.quantity,
            unit: item.unit
          }))
        },
        isRead: false,
        createdAt: new Date()
      })
    }

    return notifications
  }

  /**
   * 生成浪费报告
   */
  async generateWasteReportNotifications(memberId: string): Promise<InventoryNotification[]> {
    const notifications: InventoryNotification[] = []
    const config = await this.getNotificationConfig(memberId)

    if (!config.wasteReports.enabled) {
      return notifications
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const wasteRecords = await prisma.wasteLog.findMany({
      where: {
        memberId,
        createdAt: { gte: thirtyDaysAgo }
      },
      include: {
        inventoryItem: {
          include: {
            food: {
              select: { name: true, category: true }
            }
          }
        }
      }
    })

    if (wasteRecords.length > 0) {
      const totalWasteValue = wasteRecords.reduce((sum, record) => 
        sum + (record.estimatedCost || 0), 0
      )

      const topWastedItems = wasteRecords
        .reduce((acc, record) => {
          const foodName = record.inventoryItem.food.name
          acc[foodName] = (acc[foodName] || 0) + record.wastedQuantity
          return acc
        }, {} as Record<string, number>)

      const topItems = Object.entries(topWastedItems)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, quantity]) => `${name}(${quantity})`)
        .join('、')

      notifications.push({
        id: '',
        memberId,
        type: NotificationType.WASTE_REPORT,
        title: '月度浪费报告',
        message: `过去30天您浪费了 ${wasteRecords.length} 件食材，价值约 ¥${totalWasteValue.toFixed(2)}。主要浪费物品：${topItems}`,
        priority: 'MEDIUM',
        data: {
          wasteCount: wasteRecords.length,
          totalValue: totalWasteValue,
          topWastedItems: topWastedItems
        },
        isRead: false,
        createdAt: new Date()
      })
    }

    return notifications
  }

  /**
   * 生成采购建议通知
   */
  async generatePurchaseSuggestionNotifications(memberId: string): Promise<InventoryNotification[]> {
    const notifications: InventoryNotification[] = []
    const config = await this.getNotificationConfig(memberId)

    if (!config.purchaseSuggestions.enabled) {
      return notifications
    }

    const suggestions = await inventoryAnalyzer.generatePurchaseSuggestions(memberId)
    
    if (suggestions.length > 0) {
      const highPrioritySuggestions = suggestions.filter(s => s.priority === 'HIGH').slice(0, 3)
      const suggestionsText = highPrioritySuggestions
        .map(s => `${s.foodName}(${s.suggestedQuantity}${s.unit})`)
        .join('、')

      notifications.push({
        id: '',
        memberId,
        type: NotificationType.PURCHASE_SUGGESTION,
        title: '智能采购建议',
        message: `基于您的库存和使用习惯，建议采购：${suggestionsText}`,
        priority: 'LOW',
        data: {
          suggestions: highPrioritySuggestions,
          totalSuggestions: suggestions.length
        },
        isRead: false,
        createdAt: new Date()
      })
    }

    return notifications
  }

  /**
   * 批量创建通知
   */
  async createNotifications(notifications: Omit<InventoryNotification, 'id'>[]): Promise<boolean> {
    try {
      for (const notification of notifications) {
        await prisma.notification.create({
          data: {
            memberId: notification.memberId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            data: notification.data,
            isRead: false,
            scheduledFor: notification.scheduledFor,
            expiresAt: notification.expiresAt
          }
        })
      }
      return true
    } catch (error) {
      console.error('创建通知失败:', error)
      return false
    }
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    memberId: string,
    filters?: {
      type?: NotificationType
      priority?: 'HIGH' | 'MEDIUM' | 'LOW'
      isRead?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<NotificationSummary> {
    const whereClause: any = { memberId }
    
    if (filters?.type) whereClause.type = filters.type
    if (filters?.priority) whereClause.priority = filters.priority
    if (filters?.isRead !== undefined) whereClause.isRead = filters.isRead

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0
    })

    const unreadCount = await prisma.notification.count({
      where: { memberId, isRead: false }
    })

    const highPriorityCount = await prisma.notification.count({
      where: { memberId, priority: 'HIGH', isRead: false }
    })

    const mediumPriorityCount = await prisma.notification.count({
      where: { memberId, priority: 'MEDIUM', isRead: false }
    })

    const lowPriorityCount = await prisma.notification.count({
      where: { memberId, priority: 'LOW', isRead: false }
    })

    return {
      memberId,
      totalNotifications: notifications.length,
      unreadCount,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      notifications: notifications.map(n => ({
        ...n,
        data: n.data as any
      }))
    }
  }

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(notificationId: string, memberId: string): Promise<boolean> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          memberId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
      return result.count > 0
    } catch (error) {
      console.error('标记通知已读失败:', error)
      return false
    }
  }

  /**
   * 批量标记通知为已读
   */
  async markAllNotificationsAsRead(memberId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: {
          memberId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
      return true
    } catch (error) {
      console.error('批量标记通知已读失败:', error)
      return false
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, memberId: string): Promise<boolean> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          memberId
        }
      })
      return result.count > 0
    } catch (error) {
      console.error('删除通知失败:', error)
      return false
    }
  }

  /**
   * 定时任务：生成所有用户的库存通知
   */
  async generateScheduledNotifications(): Promise<void> {
    try {
      // 获取所有启用了通知的用户
      const users = await prisma.user.findMany({
        where: {
          notificationConfig: {
            isNot: null
          }
        },
        select: { id: true }
      })

      for (const user of users) {
        const allNotifications: Omit<InventoryNotification, 'id'>[] = []

        // 生成各类通知
        const [expiryNotifications, lowStockNotifications, wasteNotifications, purchaseNotifications] = 
          await Promise.all([
            this.generateExpiryNotifications(user.id),
            this.generateLowStockNotifications(user.id),
            this.generateWasteReportNotifications(user.id),
            this.generatePurchaseSuggestionNotifications(user.id)
          ])

        allNotifications.push(
          ...expiryNotifications,
          ...lowStockNotifications,
          ...wasteNotifications,
          ...purchaseNotifications
        )

        // 创建通知
        if (allNotifications.length > 0) {
          await this.createNotifications(allNotifications)
        }
      }
    } catch (error) {
      console.error('生成定时通知失败:', error)
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: thirtyDaysAgo },
          isRead: true
        }
      })
    } catch (error) {
      console.error('清理过期通知失败:', error)
    }
  }
}

export const inventoryNotificationService = new InventoryNotificationService()
