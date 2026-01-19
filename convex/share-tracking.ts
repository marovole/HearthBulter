import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { format } from "date-fns";

const getDateKey = (timestamp: number) =>
  format(new Date(timestamp), "yyyy-MM-dd");

export const trackEvent = mutation({
  args: {
    shareToken: v.string(),
    eventType: v.string(),
    platform: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    referrer: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const shareContent = await ctx.db
      .query("sharedContents")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!shareContent) {
      throw new Error("分享内容不存在");
    }

    if (shareContent.expiresAt && shareContent.expiresAt < Date.now()) {
      throw new Error("分享链接已过期");
    }

    const now = Date.now();
    const trackingId = await ctx.db.insert("shareTracking", {
      shareToken: args.shareToken,
      eventType: args.eventType,
      platform: args.platform,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      referrer: args.referrer,
      metadata: args.metadata,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const patch: Record<string, number | string> = {};
    switch (args.eventType) {
      case "VIEW":
        patch.viewCount = shareContent.viewCount + 1;
        break;
      case "CLICK":
        patch.clickCount = shareContent.clickCount + 1;
        break;
      case "SHARE":
        patch.shareCount = shareContent.shareCount + 1;
        break;
      case "DOWNLOAD":
        patch.downloadCount = shareContent.downloadCount + 1;
        break;
      case "CONVERSION":
        patch.conversionCount = shareContent.conversionCount + 1;
        break;
      default:
        break;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(shareContent._id, {
        ...patch,
        updatedAt: now,
      });
    }

    const tracking = await ctx.db.get(trackingId);
    if (!tracking) {
      throw new Error("分享追踪记录创建失败");
    }

    return tracking;
  },
});

export const getStatistics = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const shareContent = await ctx.db
      .query("sharedContents")
      .withIndex("by_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();

    if (!shareContent) {
      throw new Error("分享内容不存在");
    }

    const events = await ctx.db
      .query("shareTracking")
      .withIndex("by_token_occurred", (q) =>
        q.eq("shareToken", args.shareToken),
      )
      .order("desc")
      .take(1000);

    const conversionRate =
      shareContent.clickCount > 0
        ? (shareContent.conversionCount / shareContent.clickCount) * 100
        : 0;

    return {
      shareToken: args.shareToken,
      totalShares: shareContent.shareCount,
      totalViews: shareContent.viewCount,
      totalClicks: shareContent.clickCount,
      totalLikes: shareContent.likeCount,
      totalComments: shareContent.commentCount,
      totalDownloads: shareContent.downloadCount,
      totalConversions: shareContent.conversionCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      events: events.map((event) => ({
        shareToken: event.shareToken,
        eventType: event.eventType,
        platform: event.platform ?? undefined,
        userAgent: event.userAgent ?? undefined,
        ipAddress: event.ipAddress ?? undefined,
        referrer: event.referrer ?? undefined,
        metadata: event.metadata ?? undefined,
      })),
      lastUpdated: shareContent.updatedAt,
    };
  },
});

export const getUserAnalytics = query({
  args: { memberId: v.id("familyMembers"), period: v.string() },
  handler: async (ctx, args) => {
    const { startDate, periodLabel } = getPeriodDates(args.period);
    const endDate = Date.now();

    const sharedContents = await ctx.db
      .query("sharedContents")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect();

    const shareTokens = new Set(
      sharedContents.map((content) => content.shareToken),
    );

    let events = await ctx.db
      .query("shareTracking")
      .withIndex("by_occurred", (q) => q.gte("occurredAt", startDate))
      .collect();

    events = events.filter((event) => shareTokens.has(event.shareToken));

    const totalShares = sharedContents.reduce(
      (sum, content) => sum + content.shareCount,
      0,
    );
    const totalViews = sharedContents.reduce(
      (sum, content) => sum + content.viewCount,
      0,
    );
    const totalClicks = sharedContents.reduce(
      (sum, content) => sum + content.clickCount,
      0,
    );
    const totalConversions = sharedContents.reduce(
      (sum, content) => sum + content.conversionCount,
      0,
    );
    const conversionRate =
      totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const topPerformingContent = sharedContents
      .map((content) => ({
        shareToken: content.shareToken,
        title: content.title ?? "",
        views: content.viewCount,
        clicks: content.clickCount,
        conversions: content.conversionCount,
        conversionRate:
          content.clickCount > 0
            ? (content.conversionCount / content.clickCount) * 100
            : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10);

    const platformBreakdown: Record<
      string,
      { shares: number; clicks: number; conversions: number }
    > = {};

    events.forEach((event) => {
      const platform = event.platform || "unknown";
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { shares: 0, clicks: 0, conversions: 0 };
      }

      if (event.eventType === "SHARE") {
        platformBreakdown[platform].shares += 1;
      } else if (event.eventType === "CLICK") {
        platformBreakdown[platform].clicks += 1;
      } else if (event.eventType === "CONVERSION") {
        platformBreakdown[platform].conversions += 1;
      }
    });

    const dailyTrends = calculateDailyTrends(events, startDate, endDate);

    return {
      period: periodLabel,
      totalShares,
      totalViews,
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPerformingContent,
      platformBreakdown,
      dailyTrends,
    };
  },
});

export const getGlobalAnalytics = query({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const { startDate, periodLabel } = getPeriodDates(args.period);
    const endDate = Date.now();

    const sharedContents = await ctx.db
      .query("sharedContents")
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect();

    const shareTokens = new Set(
      sharedContents.map((content) => content.shareToken),
    );

    let events = await ctx.db
      .query("shareTracking")
      .withIndex("by_occurred", (q) => q.gte("occurredAt", startDate))
      .collect();

    events = events.filter((event) => shareTokens.has(event.shareToken));

    const totalShares = sharedContents.reduce(
      (sum, content) => sum + content.shareCount,
      0,
    );
    const totalViews = sharedContents.reduce(
      (sum, content) => sum + content.viewCount,
      0,
    );
    const totalClicks = sharedContents.reduce(
      (sum, content) => sum + content.clickCount,
      0,
    );
    const totalConversions = sharedContents.reduce(
      (sum, content) => sum + content.conversionCount,
      0,
    );
    const conversionRate =
      totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const topPerformingContent = sharedContents
      .map((content) => ({
        shareToken: content.shareToken,
        title: content.title ?? "",
        views: content.viewCount,
        clicks: content.clickCount,
        conversions: content.conversionCount,
        conversionRate:
          content.clickCount > 0
            ? (content.conversionCount / content.clickCount) * 100
            : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10);

    const platformBreakdown: Record<
      string,
      { shares: number; clicks: number; conversions: number }
    > = {};

    events.forEach((event) => {
      const platform = event.platform || "unknown";
      if (!platformBreakdown[platform]) {
        platformBreakdown[platform] = { shares: 0, clicks: 0, conversions: 0 };
      }

      if (event.eventType === "SHARE") {
        platformBreakdown[platform].shares += 1;
      } else if (event.eventType === "CLICK") {
        platformBreakdown[platform].clicks += 1;
      } else if (event.eventType === "CONVERSION") {
        platformBreakdown[platform].conversions += 1;
      }
    });

    const dailyTrends = calculateDailyTrends(events, startDate, endDate);

    return {
      period: periodLabel,
      totalShares,
      totalViews,
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPerformingContent,
      platformBreakdown,
      dailyTrends,
    };
  },
});

export const getEventsBeforeDate = query({
  args: { cutoffDate: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shareTracking")
      .withIndex("by_occurred", (q) => q.lt("occurredAt", args.cutoffDate))
      .collect();
  },
});

export const deleteEvents = mutation({
  args: { ids: v.array(v.id("shareTracking")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});

const calculateDailyTrends = (
  events: Array<{ eventType: string; occurredAt: number }>,
  startDate: number,
  endDate: number,
) => {
  const dailyStats = new Map<
    string,
    { shares: number; views: number; clicks: number; conversions: number }
  >();

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dailyStats.set(getDateKey(current.getTime()), {
      shares: 0,
      views: 0,
      clicks: 0,
      conversions: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  events.forEach((event) => {
    const dateKey = getDateKey(event.occurredAt);
    const stats = dailyStats.get(dateKey);

    if (!stats) {
      return;
    }

    switch (event.eventType) {
      case "VIEW":
        stats.views += 1;
        break;
      case "CLICK":
        stats.clicks += 1;
        break;
      case "SHARE":
        stats.shares += 1;
        break;
      case "CONVERSION":
        stats.conversions += 1;
        break;
      default:
        break;
    }
  });

  return Array.from(dailyStats.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));
};

const getPeriodDates = (period: string) => {
  const endDate = Date.now();
  let startDate: number;
  let periodLabel: string;

  switch (period) {
    case "7d":
      startDate = endDate - 7 * 24 * 60 * 60 * 1000;
      periodLabel = "最近7天";
      break;
    case "30d":
      startDate = endDate - 30 * 24 * 60 * 60 * 1000;
      periodLabel = "最近30天";
      break;
    case "90d":
      startDate = endDate - 90 * 24 * 60 * 60 * 1000;
      periodLabel = "最近90天";
      break;
    case "1y":
      startDate = endDate - 365 * 24 * 60 * 60 * 1000;
      periodLabel = "最近1年";
      break;
    default:
      startDate = endDate - 30 * 24 * 60 * 60 * 1000;
      periodLabel = "最近30天";
  }

  return { startDate, periodLabel };
};
