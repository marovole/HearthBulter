/**
 * 分享追踪服务
 * 记录分享链接的点击、转化等数据
 */

import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type {
  SharedContent,
  ShareTracking,
  ShareTrackingEventType,
  FamilyMember
} from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * 追踪事件接口
 */
export interface ShareTrackingEvent {
  shareToken: string
  eventType: ShareTrackingEventType
  platform?: string
  userAgent?: string
  ipAddress?: string
  referrer?: string
  metadata?: Record<string, any>
}

/**
 * 分享统计接口
 */
export interface ShareStatistics {
  shareToken: string
  totalShares: number
  totalViews: number
  totalClicks: number
  totalLikes: number
  totalComments: number
  totalDownloads: number
  totalConversions: number
  conversionRate: number
  events: ShareTrackingEvent[]
  lastUpdated: Date
}

/**
 * 追踪分析接口
 */
export interface ShareAnalytics {
  period: string
  totalShares: number
  totalViews: number
  totalClicks: number
  totalConversions: number
  conversionRate: number
  topPerformingContent: Array<{
    shareToken: string
    title: string
    views: number
    clicks: number
    conversions: number
    conversionRate: number
  }>
  platformBreakdown: Record<string, {
    shares: number
    clicks: number
    conversions: number
  }>
  dailyTrends: Array<{
    date: string
    shares: number
    views: number
    clicks: number
    conversions: number
  }>
}

/**
 * 分享追踪服务类
 */
export class ShareTrackingService {
  private static instance: ShareTrackingService

  static getInstance(): ShareTrackingService {
    if (!ShareTrackingService.instance) {
      ShareTrackingService.instance = new ShareTrackingService()
    }
    return ShareTrackingService.instance
  }

  /**
   * 记录分享事件
   */
  async trackShareEvent(event: ShareTrackingEvent): Promise<ShareTracking> {
    // 检查分享内容是否存在
    const shareContent = await prisma.sharedContent.findUnique({
      where: { shareToken: event.shareToken }
    })

    if (!shareContent) {
      throw new Error('分享内容不存在')
    }

    // 检查是否过期
    if (shareContent.expiresAt && shareContent.expiresAt < new Date()) {
      throw new Error('分享链接已过期')
    }

    // 创建追踪记录
    const tracking = await prisma.shareTracking.create({
      data: {
        shareToken: event.shareToken,
        eventType: event.eventType,
        platform: event.platform,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        referrer: event.referrer,
        metadata: event.metadata || {},
        createdAt: new Date()
      }
    })

    // 更新分享内容统计
    await this.updateShareStatistics(event.shareToken, event.eventType)

    return tracking
  }

  /**
   * 批量记录分享事件
   */
  async trackShareEvents(events: ShareTrackingEvent[]): Promise<ShareTracking[]> {
    const results: ShareTracking[] = []

    for (const event of events) {
      try {
        const tracking = await this.trackShareEvent(event)
        results.push(tracking)
      } catch (error) {
        console.error(`记录分享事件失败:`, error)
        // 继续处理其他事件
      }
    }

    return results
  }

  /**
   * 获取分享统计
   */
  async getShareStatistics(shareToken: string): Promise<ShareStatistics> {
    const shareContent = await prisma.sharedContent.findUnique({
      where: { shareToken },
      select: {
        title: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        clickCount: true,
        downloadCount: true,
        conversionCount: true,
        updatedAt: true
      }
    })

    if (!shareContent) {
      throw new Error('分享内容不存在')
    }

    const events = await prisma.shareTracking.findMany({
      where: { shareToken },
      orderBy: { createdAt: 'desc' },
      take: 1000 // 最近1000条事件
    })

    const conversionRate = shareContent.clickCount > 0 
      ? (shareContent.conversionCount / shareContent.clickCount) * 100 
      : 0

    return {
      shareToken,
      totalShares: shareContent.shareCount,
      totalViews: shareContent.viewCount,
      totalClicks: shareContent.clickCount,
      totalLikes: shareContent.likeCount,
      totalComments: shareContent.commentCount,
      totalDownloads: shareContent.downloadCount,
      totalConversions: shareContent.conversionCount,
      conversionRate: Math.round(conversionRate * 100) / 100, // 保留两位小数
      events: events.map(event => ({
        shareToken: event.shareToken,
        eventType: event.eventType,
        platform: event.platform || undefined,
        userAgent: event.userAgent || undefined,
        ipAddress: event.ipAddress || undefined,
        referrer: event.referrer || undefined,
        metadata: event.metadata as Record<string, any>
      })),
      lastUpdated: shareContent.updatedAt
    }
  }

  /**
   * 获取用户分享分析
   */
  async getUserShareAnalytics(
    memberId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<ShareAnalytics> {
    const { startDate, periodLabel } = this.getPeriodDates(period)
    const endDate = new Date()

    // 获取用户的分享内容
    const sharedContents = await prisma.sharedContent.findMany({
      where: {
        memberId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        shareToken: true,
        title: true,
        viewCount: true,
        clickCount: true,
        conversionCount: true,
        shareCount: true,
        createdAt: true
      }
    })

    const shareTokens = sharedContents.map(content => content.shareToken)

    // 获取分享事件
    const events = await prisma.shareTracking.findMany({
      where: {
        shareToken: {
          in: shareTokens
        },
        createdAt: {
          gte: startDate
        }
      }
    })

    // 计算总体统计
    const totalShares = sharedContents.reduce((sum, content) => sum + content.shareCount, 0)
    const totalViews = sharedContents.reduce((sum, content) => sum + content.viewCount, 0)
    const totalClicks = sharedContents.reduce((sum, content) => sum + content.clickCount, 0)
    const totalConversions = sharedContents.reduce((sum, content) => sum + content.conversionCount, 0)
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

    // 计算最佳表现内容
    const topPerformingContent = sharedContents
      .map(content => ({
        shareToken: content.shareToken,
        title: content.title,
        views: content.viewCount,
        clicks: content.clickCount,
        conversions: content.conversionCount,
        conversionRate: content.clicks > 0 ? (content.conversionsCount / content.clicks) * 100 : 0
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10)

    // 平台分析
    const platformBreakdown: Record<string, { shares: number; clicks: number; conversions: number }> = {}
    events.forEach(event => {
      const platform = event.platform || 'unknown'
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { shares: 0, clicks: 0, conversions: 0 }
      }

      if (event.eventType === 'SHARE') {
        platformBreakdown[platform].shares++
      } else if (event.eventType === 'CLICK') {
        platformBreakdown[platform].clicks++
      } else if (event.eventType === 'CONVERSION') {
        platformBreakdown[platform].conversions++
      }
    })

    // 每日趋势
    const dailyTrends = await this.calculateDailyTrends(shareTokens, startDate, endDate)

    return {
      period: periodLabel,
      totalShares,
      totalViews,
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPerformingContent,
      platformBreakdown,
      dailyTrends
    }
  }

  /**
   * 记录分享转化（新用户注册）
   */
  async trackShareConversion(
    shareToken: string,
    convertedUserId: string,
    conversionType: string = 'REGISTER'
  ): Promise<void> {
    // 检查分享内容
    const shareContent = await prisma.sharedContent.findUnique({
      where: { shareToken },
      include: {
        member: {
          select: { id: true, name: true }
        }
      }
    })

    if (!shareContent) {
      throw new Error('分享内容不存在')
    }

    // 记录转化事件
    await this.trackShareEvent({
      shareToken,
      eventType: 'CONVERSION',
      metadata: {
        convertedUserId,
        conversionType,
        convertedAt: new Date().toISOString(),
        inviterId: shareContent.memberId,
        inviterName: shareContent.member.name
      }
    })

    // 更新转化计数
    await prisma.sharedContent.update({
      where: { shareToken },
      data: {
        conversionCount: {
          increment: 1
        }
      }
    })

    // 可以在这里添加邀请奖励逻辑
    await this.grantInvitationReward(shareContent.memberId, convertedUserId, conversionType)
  }

  /**
   * 更新分享统计
   */
  private async updateShareStatistics(shareToken: string, eventType: ShareTrackingEventType): Promise<void> {
    const updateData: any = {}

    switch (eventType) {
      case 'VIEW':
        updateData.viewCount = { increment: 1 }
        break
      case 'CLICK':
        updateData.clickCount = { increment: 1 }
        break
      case 'LIKE':
        updateData.likeCount = { increment: 1 }
        break
      case 'COMMENT':
        updateData.commentCount = { increment: 1 }
        break
      case 'SHARE':
        updateData.shareCount = { increment: 1 }
        break
      case 'DOWNLOAD':
        updateData.downloadCount = { increment: 1 }
        break
      case 'CONVERSION':
        updateData.conversionCount = { increment: 1 }
        break
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.sharedContent.update({
        where: { shareToken },
        data: updateData
      })
    }
  }

  /**
   * 获取时间范围
   */
  private getPeriodDates(period: string): { startDate: Date; periodLabel: string } {
    const endDate = new Date()
    let startDate: Date
    let periodLabel: string

    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        periodLabel = '最近7天'
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        periodLabel = '最近30天'
        break
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        periodLabel = '最近90天'
        break
      case '1y':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000)
        periodLabel = '最近1年'
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        periodLabel = '最近30天'
    }

    return { startDate, periodLabel }
  }

  /**
   * 计算每日趋势
   */
  private async calculateDailyTrends(
    shareTokens: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; shares: number; views: number; clicks: number; conversions: number }>> {
    // 获取该时间范围内的所有事件
    const events = await prisma.shareTracking.findMany({
      where: {
        shareToken: {
          in: shareTokens
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    // 按日期分组统计
    const dailyStats = new Map<string, { shares: number; views: number; clicks: number; conversions: number }>()

    // 初始化日期范围
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd')
      dailyStats.set(dateKey, { shares: 0, views: 0, clicks: 0, conversions: 0 })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // 统计事件
    events.forEach(event => {
      const dateKey = format(event.createdAt, 'yyyy-MM-dd')
      const stats = dailyStats.get(dateKey)
      
      if (stats) {
        switch (event.eventType) {
          case 'VIEW':
            stats.views++
            break
          case 'CLICK':
            stats.clicks++
            break
          case 'SHARE':
            stats.shares++
            break
          case 'CONVERSION':
            stats.conversions++
            break
        }
      }
    })

    // 转换为数组格式
    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      ...stats
    }))
  }

  /**
   * 发放邀请奖励
   */
  private async grantInvitationReward(
    inviterId: string,
    convertedUserId: string,
    conversionType: string
  ): Promise<void> {
    // 检查是否已经发放过奖励
    const existingReward = await prisma.invitationReward.findFirst({
      where: {
        inviterId,
        invitedUserId: convertedUserId
      }
    })

    if (existingReward) {
      return // 已经发放过奖励
    }

    // 创建奖励记录
    const vipDays = 7 // 邀请奖励7天VIP
    const points = 100 // 邀请奖励100积分

    await prisma.invitationReward.create({
      data: {
        inviterId,
        invitedUserId,
        rewardType: 'VIP_DAYS',
        rewardValue: vipDays,
        status: 'GRANTED',
        grantedAt: new Date()
      }
    })

    await prisma.invitationReward.create({
      data: {
        inviterId,
        invitedUserId,
        rewardType: 'POINTS',
        rewardValue: points,
        status: 'GRANTED',
        grantedAt: new Date()
      }
    })

    // 可以在这里集成到积分系统和VIP系统
    console.log(`用户 ${inviterId} 邀请奖励发放: ${vipDays}天VIP + ${points}积分`)
  }

  /**
   * 获取全局分享统计
   */
  async getGlobalShareAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<ShareAnalytics> {
    const { startDate, periodLabel } = this.getPeriodDates(period)
    const endDate = new Date()

    // 获取所有分享内容
    const sharedContents = await prisma.sharedContent.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        shareToken: true,
        title: true,
        viewCount: true,
        clickCount: true,
        conversionCount: true,
        shareCount: true,
        createdAt: true
      }
    })

    const shareTokens = sharedContents.map(content => content.shareToken)

    // 计算总体统计
    const totalShares = sharedContents.reduce((sum, content) => sum + content.shareCount, 0)
    const totalViews = sharedContents.reduce((sum, content) => sum + content.viewCount, 0)
    const totalClicks = sharedContents.reduce((sum, content) => sum + content.clickCount, 0)
    const totalConversions = sharedContents.reduce((sum, content) => sum + content.conversionCount, 0)
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

    // 计算最佳表现内容
    const topPerformingContent = sharedContents
      .map(content => ({
        shareToken: content.shareToken,
        title: content.title,
        views: content.viewCount,
        clicks: content.clickCount,
        conversions: content.conversionCount,
        conversionRate: content.clicks > 0 ? (content.conversionCount / content.clickCount) * 100 : 0
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10)

    // 平台分析和每日趋势
    const events = await prisma.shareTracking.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    })

    const platformBreakdown: Record<string, { shares: number; clicks: number; conversions: number }> = {}
    events.forEach(event => {
      const platform = event.platform || 'unknown'
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { shares: 0, clicks: 0, conversions: 0 }
      }

      if (event.eventType === 'SHARE') {
        platformBreakdown[platform].shares++
      } else if (event.eventType === 'CLICK') {
        platformBreakdown[platform].clicks++
      } else if (event.eventType === 'CONVERSION') {
        platformBreakdown[platform].conversions++
      }
    })

    const dailyTrends = await this.calculateDailyTrends(shareTokens, startDate, endDate)

    return {
      period: periodLabel,
      totalShares,
      totalViews,
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPerformingContent,
      platformBreakdown,
      dailyTrends
    }
  }

  /**
   * 清理过期的追踪数据
   */
  async cleanupExpiredTrackingData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.shareTracking.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    console.log(`清理了 ${result.count} 条过期的分享追踪数据`)
    return result.count
  }

  /**
   * 生成分享追踪报告
   */
  async generateShareTrackingReport(
    memberId?: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<any> {
    const analytics = memberId
      ? await this.getUserShareAnalytics(memberId, period)
      : await this.getGlobalShareAnalytics(period)

    return {
      reportTitle: memberId ? '个人分享数据报告' : '全局分享数据报告',
      period: analytics.period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalShares: analytics.totalShares,
        totalViews: analytics.totalViews,
        totalClicks: analytics.totalClicks,
        totalConversions: analytics.totalConversions,
        conversionRate: `${analytics.conversionRate}%`
      },
      topContent: analytics.topPerformingContent.slice(0, 5),
      platformAnalysis: analytics.platformBreakdown,
      trends: analytics.dailyTrends.slice(-7) // 最近7天的趋势
    }
  }
}

// 导出单例实例
export const shareTrackingService = ShareTrackingService.getInstance()

// 导出工具函数
export async function trackShareEvent(event: ShareTrackingEvent): Promise<ShareTracking> {
  const service = ShareTrackingService.getInstance()
  return service.trackShareEvent(event)
}

export async function trackShareConversion(
  shareToken: string,
  convertedUserId: string,
  conversionType?: string
): Promise<void> {
  const service = ShareTrackingService.getInstance()
  return service.trackShareConversion(shareToken, convertedUserId, conversionType)
}

export async function getShareStatistics(shareToken: string): Promise<ShareStatistics> {
  const service = ShareTrackingService.getInstance()
  return service.getShareStatistics(shareToken)
}

export async function getUserShareAnalytics(
  memberId: string,
  period?: '7d' | '30d' | '90d' | '1y'
): Promise<ShareAnalytics> {
  const service = ShareTrackingService.getInstance()
  return service.getUserShareAnalytics(memberId, period)
}

export async function getGlobalShareAnalytics(
  period?: '7d' | '30d' | '90d' | '1y'
): Promise<ShareAnalytics> {
  const service = ShareTrackingService.getInstance()
  return service.getGlobalShareAnalytics(period)
}
