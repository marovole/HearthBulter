import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export type ShareTrackingEventType =
  | "VIEW"
  | "CLICK"
  | "SHARE"
  | "CONVERSION"
  | "DOWNLOAD";

export interface ShareTrackingEvent {
  shareToken: string;
  eventType: ShareTrackingEventType;
  platform?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}

export interface ShareTrackingRecord {
  id: string;
  shareToken: string;
  eventType: ShareTrackingEventType;
  platform?: string;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
  occurredAt: number;
}

export interface ShareStatistics {
  shareToken: string;
  totalShares: number;
  totalViews: number;
  totalClicks: number;
  totalLikes: number;
  totalComments: number;
  totalDownloads: number;
  totalConversions: number;
  conversionRate: number;
  events: ShareTrackingEvent[];
  lastUpdated: number;
}

export interface ShareAnalytics {
  period: string;
  totalShares: number;
  totalViews: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  topPerformingContent: Array<{
    shareToken: string;
    title: string;
    views: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  platformBreakdown: Record<
    string,
    {
      shares: number;
      clicks: number;
      conversions: number;
    }
  >;
  dailyTrends: Array<{
    date: string;
    shares: number;
    views: number;
    clicks: number;
    conversions: number;
  }>;
}

export class ShareTrackingService {
  private static instance: ShareTrackingService;

  static getInstance(): ShareTrackingService {
    if (!ShareTrackingService.instance) {
      ShareTrackingService.instance = new ShareTrackingService();
    }
    return ShareTrackingService.instance;
  }

  async trackShareEvent(
    event: ShareTrackingEvent,
  ): Promise<ShareTrackingRecord> {
    const tracking = await convexClient.mutation<Record<string, unknown>>(
      api["share-tracking"].trackEvent,
      {
        shareToken: event.shareToken,
        eventType: event.eventType,
        platform: event.platform,
        userAgent: event.userAgent,
        ipAddress: event.ipAddress,
        referrer: event.referrer,
        metadata: event.metadata ?? undefined,
      },
    );

    return this.normalizeTracking(tracking);
  }

  async trackShareEvents(
    events: ShareTrackingEvent[],
  ): Promise<ShareTrackingRecord[]> {
    const results: ShareTrackingRecord[] = [];

    for (const event of events) {
      try {
        const tracking = await this.trackShareEvent(event);
        results.push(tracking);
      } catch (error) {
        console.error("记录分享事件失败:", error);
      }
    }

    return results;
  }

  async getShareStatistics(shareToken: string): Promise<ShareStatistics> {
    return await convexClient.query<ShareStatistics>(
      api["share-tracking"].getStatistics,
      { shareToken },
    );
  }

  async getUserShareAnalytics(
    memberId: string,
    period: "7d" | "30d" | "90d" | "1y" = "30d",
  ): Promise<ShareAnalytics> {
    return await convexClient.query<ShareAnalytics>(
      api["share-tracking"].getUserAnalytics,
      { memberId: memberId as Id<"familyMembers">, period },
    );
  }

  async getGlobalShareAnalytics(
    period: "7d" | "30d" | "90d" | "1y" = "30d",
  ): Promise<ShareAnalytics> {
    return await convexClient.query<ShareAnalytics>(
      api["share-tracking"].getGlobalAnalytics,
      { period },
    );
  }

  async trackShareConversion(
    shareToken: string,
    convertedUserId: string,
    conversionType: string = "REGISTER",
  ): Promise<void> {
    const shareContent = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.social.getSharedContentByToken, { token: shareToken });

    if (!shareContent) {
      throw new Error("分享内容不存在");
    }

    const member = await convexClient.query<Record<string, unknown> | null>(
      api.members.getById,
      { memberId: shareContent.memberId as Id<"familyMembers"> },
    );

    await this.trackShareEvent({
      shareToken,
      eventType: "CONVERSION",
      metadata: {
        convertedUserId,
        conversionType,
        convertedAt: new Date().toISOString(),
        inviterId: shareContent.memberId,
        inviterName: member?.name,
      },
    });

    await this.grantInvitationReward(
      shareContent.memberId as string,
      convertedUserId,
      conversionType,
    );
  }

  async cleanupExpiredTrackingData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    const events = await convexClient.query<Array<Record<string, unknown>>>(
      api["share-tracking"].getEventsBeforeDate,
      { cutoffDate },
    );

    if (events.length === 0) {
      return 0;
    }

    await convexClient.mutation(api["share-tracking"].deleteEvents, {
      ids: events.map((event) => event._id as Id<"shareTracking">),
    });

    return events.length;
  }

  async generateShareTrackingReport(
    memberId?: string,
    period: "7d" | "30d" | "90d" | "1y" = "30d",
  ): Promise<Record<string, unknown>> {
    const analytics = memberId
      ? await this.getUserShareAnalytics(memberId, period)
      : await this.getGlobalShareAnalytics(period);

    return {
      reportTitle: memberId ? "个人分享数据报告" : "全局分享数据报告",
      period: analytics.period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalShares: analytics.totalShares,
        totalViews: analytics.totalViews,
        totalClicks: analytics.totalClicks,
        totalConversions: analytics.totalConversions,
        conversionRate: `${analytics.conversionRate}%`,
      },
      topContent: analytics.topPerformingContent.slice(0, 5),
      platformAnalysis: analytics.platformBreakdown,
      trends: analytics.dailyTrends.slice(-7),
    };
  }

  private normalizeTracking(
    record: Record<string, unknown>,
  ): ShareTrackingRecord {
    return {
      id: record._id as string,
      shareToken: record.shareToken as string,
      eventType: record.eventType as ShareTrackingEventType,
      platform: record.platform as string | undefined,
      userAgent: record.userAgent as string | undefined,
      ipAddress: record.ipAddress as string | undefined,
      referrer: record.referrer as string | undefined,
      metadata: record.metadata as Record<string, unknown> | undefined,
      occurredAt: record.occurredAt as number,
    };
  }

  private async grantInvitationReward(
    inviterId: string,
    _convertedUserId: string,
    _conversionType: string,
  ): Promise<void> {
    console.log(`用户 ${inviterId} 触发邀请奖励逻辑`);
  }
}

export const shareTrackingService = ShareTrackingService.getInstance();

export async function trackShareEvent(
  event: ShareTrackingEvent,
): Promise<ShareTrackingRecord> {
  const service = ShareTrackingService.getInstance();
  return service.trackShareEvent(event);
}

export async function trackShareConversion(
  shareToken: string,
  convertedUserId: string,
  conversionType?: string,
): Promise<void> {
  const service = ShareTrackingService.getInstance();
  return service.trackShareConversion(
    shareToken,
    convertedUserId,
    conversionType,
  );
}

export async function getShareStatistics(
  shareToken: string,
): Promise<ShareStatistics> {
  const service = ShareTrackingService.getInstance();
  return service.getShareStatistics(shareToken);
}

export async function getUserShareAnalytics(
  memberId: string,
  period?: "7d" | "30d" | "90d" | "1y",
): Promise<ShareAnalytics> {
  const service = ShareTrackingService.getInstance();
  return service.getUserShareAnalytics(memberId, period);
}

export async function getGlobalShareAnalytics(
  period?: "7d" | "30d" | "90d" | "1y",
): Promise<ShareAnalytics> {
  const service = ShareTrackingService.getInstance();
  return service.getGlobalShareAnalytics(period);
}
