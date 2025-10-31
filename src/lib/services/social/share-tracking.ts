/**
 * 分享追踪服务
 * 负责追踪分享链接的点击、浏览、转化等行为
 */

import { ShareTrackingEventType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface ShareTrackingEvent {
  id: string;
  shareToken: string;
  eventType: ShareTrackingEventType;
  platform?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  occurredAt: Date;
  metadata?: Record<string, any>;
}

export interface ShareAnalytics {
  shareToken: string;
  totalViews: number;
  totalClicks: number;
  totalShares: number;
  totalConversions: number;
  totalDownloads: number;
  uniqueViewers: number;
  conversionRate: number;
  topPlatforms: Array<{
    platform: string;
    count: number;
    percentage: number;
  }>;
  hourlyStats: Array<{
    hour: number;
    views: number;
    clicks: number;
  }>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
    shares: number;
  }>;
}

/**
 * 记录分享追踪事件
 */
export async function trackShareEvent(
  shareToken: string,
  eventType: ShareTrackingEventType,
  data: {
    platform?: string;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<boolean> {
  try {
    // 验证分享是否存在
    const share = await prisma.sharedContent.findUnique({
      where: { shareToken }
    });

    if (!share) {
      console.warn('分享不存在:', shareToken);
      return false;
    }

    // 记录追踪事件
    await prisma.shareTracking.create({
      data: {
        shareToken,
        eventType,
        platform: data.platform,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        referrer: data.referrer,
        metadata: data.metadata || {}
      }
    });

    // 更新分享统计
    await updateShareStats(shareToken, eventType);

    return true;
  } catch (error) {
    console.error('记录分享追踪事件失败:', error);
    return false;
  }
}

/**
 * 更新分享统计
 */
async function updateShareStats(shareToken: string, eventType: ShareTrackingEventType): Promise<void> {
  try {
    const updateData: any = {};

    switch (eventType) {
      case ShareTrackingEventType.VIEW:
        updateData.viewCount = { increment: 1 };
        break;
      case ShareTrackingEventType.CLICK:
        updateData.clickCount = { increment: 1 };
        break;
      case ShareTrackingEventType.SHARE:
        updateData.shareCount = { increment: 1 };
        break;
      case ShareTrackingEventType.CONVERSION:
        updateData.conversionCount = { increment: 1 };
        break;
      case ShareTrackingEventType.DOWNLOAD:
        updateData.downloadCount = { increment: 1 };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.sharedContent.update({
        where: { shareToken },
        data: updateData
      });
    }
  } catch (error) {
    console.error('更新分享统计失败:', error);
  }
}

/**
 * 获取分享分析数据
 */
export async function getShareAnalytics(
  shareToken: string,
  dateRange?: {
    startDate: Date;
    endDate: Date;
  }
): Promise<ShareAnalytics | null> {
  try {
    // 获取基本信息
    const share = await prisma.sharedContent.findUnique({
      where: { shareToken }
    });

    if (!share) {
      return null;
    }

    // 构建查询条件
    const whereCondition: Prisma.ShareTrackingWhereInput = { shareToken };
    if (dateRange) {
      whereCondition.occurredAt = {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      };
    }

    // 获取事件统计
    const events = await prisma.shareTracking.findMany({
      where: whereCondition,
      orderBy: { occurredAt: 'desc' }
    });

    // 计算基础统计
    const stats = events.reduce(
      (acc, event) => {
        switch (event.eventType) {
          case ShareTrackingEventType.VIEW:
            acc.totalViews++;
            break;
          case ShareTrackingEventType.CLICK:
            acc.totalClicks++;
            break;
          case ShareTrackingEventType.SHARE:
            acc.totalShares++;
            break;
          case ShareTrackingEventType.CONVERSION:
            acc.totalConversions++;
            break;
          case ShareTrackingEventType.DOWNLOAD:
            acc.totalDownloads++;
            break;
        }
        return acc;
      },
      {
        totalViews: 0,
        totalClicks: 0,
        totalShares: 0,
        totalConversions: 0,
        totalDownloads: 0
      }
    );

    // 计算独立访客数
    const uniqueIPs = new Set(
      events
        .filter(e => e.eventType === ShareTrackingEventType.VIEW)
        .map(e => e.ipAddress)
        .filter(Boolean)
    );
    const uniqueViewers = uniqueIPs.size;

    // 计算转化率
    const conversionRate = stats.totalViews > 0 
      ? (stats.totalConversions / stats.totalViews) * 100 
      : 0;

    // 统计平台分布
    const platformCounts = events.reduce<Record<string, number>>((acc, event) => {
      if (event.platform) {
        acc[event.platform] = (acc[event.platform] || 0) + 1;
      }
      return acc;
    }, {});

    const topPlatforms = Object.entries(platformCounts)
      .map(([platform, count]) => ({
        platform,
        count,
        percentage: events.length > 0 ? (count / events.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 按小时统计
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
      const hourEvents = events.filter(event => new Date(event.occurredAt).getHours() === hour);

      return {
        hour,
        views: hourEvents.filter(event => event.eventType === ShareTrackingEventType.VIEW).length,
        clicks: hourEvents.filter(event => event.eventType === ShareTrackingEventType.CLICK).length
      };
    });

    // 按天统计
    const dailyStatsMap = events.reduce<Record<string, { date: string; views: number; clicks: number; shares: number }>>(
      (acc, event) => {
        const date = new Date(event.occurredAt).toISOString().split('T')[0];

        if (!acc[date]) {
          acc[date] = { date, views: 0, clicks: 0, shares: 0 };
        }

        switch (event.eventType) {
          case ShareTrackingEventType.VIEW:
            acc[date].views++;
            break;
          case ShareTrackingEventType.CLICK:
            acc[date].clicks++;
            break;
          case ShareTrackingEventType.SHARE:
            acc[date].shares++;
            break;
        }

        return acc;
      },
      {}
    );

    return {
      shareToken,
      totalViews: stats.totalViews,
      totalClicks: stats.totalClicks,
      totalShares: stats.totalShares,
      totalConversions: stats.totalConversions,
      totalDownloads: stats.totalDownloads,
      uniqueViewers,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPlatforms,
      hourlyStats,
      dailyStats: Object.values(dailyStatsMap).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    };
  } catch (error) {
    console.error('获取分享分析数据失败:', error);
    return null;
  }
}

/**
 * 获取用户的分享追踪概览
 */
export async function getUserShareTrackingOverview(
  memberId: string,
  limit: number = 10
): Promise<Array<{
  shareToken: string;
  title: string;
  totalViews: number;
  totalClicks: number;
  totalShares: number;
  conversionRate: number;
  createdAt: Date;
}>> {
  try {
    const shares = await prisma.sharedContent.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        shareToken: true,
        title: true,
        viewCount: true,
        clickCount: true,
        shareCount: true,
        conversionCount: true,
        createdAt: true
      }
    });

    return shares.map(share => ({
      shareToken: share.shareToken,
      title: share.title,
      totalViews: share.viewCount,
      totalClicks: share.clickCount,
      totalShares: share.shareCount,
      conversionRate: share.viewCount > 0 
        ? Math.round((share.conversionCount / share.viewCount) * 10000) / 100 
        : 0,
      createdAt: share.createdAt
    }));
  } catch (error) {
    console.error('获取用户分享追踪概览失败:', error);
    return [];
  }
}

/**
 * 获取热门分享排行
 */
export async function getPopularShares(
  period: 'daily' | 'weekly' | 'monthly' = 'weekly',
  limit: number = 20
): Promise<Array<{
  shareToken: string;
  title: string;
  memberName: string;
  totalViews: number;
  totalShares: number;
  score: number;
}>> {
  try {
    // 计算时间范围
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // 获取热门分享
    const shares = await prisma.sharedContent.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'ACTIVE'
      },
      include: {
        member: {
          select: { name: true }
        }
      },
      orderBy: [
        { viewCount: 'desc' },
        { shareCount: 'desc' }
      ],
      take: limit
    });

    // 计算热度分数
    return shares.map(share => ({
      shareToken: share.shareToken,
      title: share.title,
      memberName: share.member.name,
      totalViews: share.viewCount,
      totalShares: share.shareCount,
      score: calculateShareScore(share)
    }));
  } catch (error) {
    console.error('获取热门分享失败:', error);
    return [];
  }
}

/**
 * 计算分享热度分数
 */
function calculateShareScore(share: {
  viewCount: number;
  clickCount: number;
  shareCount: number;
  conversionCount: number;
  createdAt: Date;
}): number {
  const now = new Date();
  const daysSinceCreation = (now.getTime() - share.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // 基础分数
  let score = 0;
  
  // 浏览量权重
  score += share.viewCount * 1;
  
  // 点击量权重（更高）
  score += share.clickCount * 3;
  
  // 分享次数权重（最高）
  score += share.shareCount * 5;
  
  // 转化权重（最高）
  score += share.conversionCount * 10;
  
  // 时间衰减（越新的内容分数越高）
  const timeDecay = Math.exp(-daysSinceCreation / 7); // 7天半衰期
  score *= timeDecay;
  
  return Math.round(score);
}

/**
 * 批量清理旧的追踪数据
 */
export async function cleanupOldTrackingData(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.shareTracking.deleteMany({
      where: {
        occurredAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  } catch (error) {
    console.error('清理旧追踪数据失败:', error);
    return 0;
  }
}

/**
 * 导出分享追踪数据
 */
export async function exportShareTrackingData(
  shareToken: string,
  format: 'json' | 'csv' = 'json'
): Promise<string | null> {
  try {
    const analytics = await getShareAnalytics(shareToken);
    if (!analytics) {
      return null;
    }

    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    }

    if (format === 'csv') {
      // 生成CSV格式
      const headers = ['Date', 'Views', 'Clicks', 'Shares', 'Conversions'];
      const rows = analytics.dailyStats.map(day => [
        day.date,
        day.views.toString(),
        day.clicks.toString(),
        day.shares.toString(),
        analytics.totalConversions.toString()
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return null;
  } catch (error) {
    console.error('导出分享追踪数据失败:', error);
    return null;
  }
}

/**
 * 实时追踪中间件
 */
export function createTrackingMiddleware() {
  return async (req: any, res: any, next: any) => {
    const { shareToken } = req.params;
    
    if (shareToken) {
      // 异步记录浏览事件
      trackShareEvent(shareToken, ShareTrackingEventType.VIEW, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer
      }).catch(error => {
        console.error('记录浏览事件失败:', error);
      });
    }
    
    next();
  };
}
