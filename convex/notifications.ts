import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    priority: v.string(),
    channels: v.array(v.string()),
    metadata: v.optional(v.any()),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    dedupKey: v.optional(v.string()),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("notifications", {
      memberId: args.memberId,
      type: args.type,
      title: args.title,
      content: args.content,
      priority: args.priority,
      channels: args.channels,
      metadata: args.metadata,
      actionUrl: args.actionUrl,
      actionText: args.actionText,
      dedupKey: args.dedupKey,
      batchId: args.batchId,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getById = query({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification || notification.deletedAt) {
      return null;
    }
    return notification;
  },
});

export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    type: v.optional(v.string()),
    status: v.optional(v.string()),
    channel: v.optional(v.string()),
    includeRead: v.boolean(),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("notifications")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    if (args.type) {
      items = items.filter((item) => item.type === args.type);
    }
    if (args.status) {
      items = items.filter((item) => item.status === args.status);
    }
    if (args.channel) {
      items = items.filter((item) => item.channels?.includes(args.channel!));
    }
    if (!args.includeRead) {
      items = items.filter((item) => !item.readAt);
    }

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;

    return {
      data: items.slice(offset, offset + limit),
      total: items.length,
    };
  },
});

export const updateStatus = mutation({
  args: { id: v.id("notifications"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      readAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markAllAsRead = mutation({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const now = Date.now();
    let count = 0;

    for (const item of items) {
      if (!item.readAt) {
        await ctx.db.patch(item._id, { readAt: now, updatedAt: now });
        count += 1;
      }
    }

    return count;
  },
});

export const appendLog = mutation({
  args: {
    notificationId: v.id("notifications"),
    channel: v.string(),
    status: v.string(),
    detail: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.deletedAt) {
      return;
    }

    const now = Date.now();
    await ctx.db.insert("notificationLogs", {
      notificationId: args.notificationId,
      memberId: notification.memberId,
      channel: args.channel,
      status: args.status,
      detail: args.detail,
      sentAt: args.sentAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listPending = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    return pending.slice(0, args.limit);
  },
});

export const createSchedule = mutation({
  args: {
    memberId: v.id("familyMembers"),
    notificationId: v.optional(v.id("notifications")),
    payload: v.any(),
    scheduledTime: v.number(),
    status: v.string(),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("scheduledNotifications", {
      memberId: args.memberId,
      notificationId: args.notificationId,
      payload: args.payload,
      scheduledTime: args.scheduledTime,
      status: args.status,
      retryCount: args.retryCount,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listDueSchedules = query({
  args: { before: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("scheduledNotifications")
      .filter((q) => q.lte(q.field("scheduledTime"), args.before))
      .collect();

    return items.slice(0, args.limit);
  },
});

export const updateScheduleStatus = mutation({
  args: { scheduleId: v.id("scheduledNotifications"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scheduleId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const getPreferences = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();
  },
});

export const upsertPreferences = mutation({
  args: {
    memberId: v.id("familyMembers"),
    channelPreferences: v.optional(v.any()),
    quietHours: v.optional(v.any()),
    mutedTypes: v.optional(v.array(v.string())),
    lastUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        channelPreferences: args.channelPreferences,
        quietHours: args.quietHours,
        mutedTypes: args.mutedTypes,
        lastUpdatedAt: args.lastUpdatedAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("notificationPreferences", {
      memberId: args.memberId,
      channelPreferences: args.channelPreferences,
      quietHours: args.quietHours,
      mutedTypes: args.mutedTypes,
      lastUpdatedAt: args.lastUpdatedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertPushSubscriptions = mutation({
  args: {
    memberId: v.id("familyMembers"),
    pushToken: v.optional(v.any()),
    pushEnabled: v.boolean(),
    lastUpdatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        pushToken: args.pushToken,
        pushEnabled: args.pushEnabled,
        lastUpdatedAt: args.lastUpdatedAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("notificationPreferences", {
      memberId: args.memberId,
      pushToken: args.pushToken,
      pushEnabled: args.pushEnabled,
      lastUpdatedAt: args.lastUpdatedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getStats = query({
  args: {
    memberId: v.id("familyMembers"),
    days: v.number(),
    dailyDays: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = now - args.days * 24 * 60 * 60 * 1000;
    const dailyStartDate = now - args.dailyDays * 24 * 60 * 60 * 1000;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect();

    const summary = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      pending: 0,
      read: 0,
      unread: 0,
    };

    for (const notif of notifications) {
      switch (notif.status) {
        case "SENT":
          summary.sent += 1;
          break;
        case "FAILED":
          summary.failed += 1;
          break;
        case "PENDING":
        case "SENDING":
          summary.pending += 1;
          break;
      }

      if (notif.readAt) {
        summary.read += 1;
      } else {
        summary.unread += 1;
      }
    }

    const dailyStatsMap: Record<
      string,
      {
        date: string;
        total: number;
        sent: number;
        failed: number;
        pending: number;
      }
    > = {};

    for (let i = 0; i < args.dailyDays; i += 1) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0] ?? date.toISOString();
      dailyStatsMap[dateKey] = {
        date: dateKey,
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      };
    }

    for (const notif of notifications) {
      if (notif.createdAt < dailyStartDate) {
        continue;
      }

      const dateKey =
        new Date(notif.createdAt).toISOString().split("T")[0] ??
        new Date(notif.createdAt).toISOString();
      const stats = dailyStatsMap[dateKey];
      if (!stats) {
        continue;
      }

      stats.total += 1;
      switch (notif.status) {
        case "SENT":
          stats.sent += 1;
          break;
        case "FAILED":
          stats.failed += 1;
          break;
        case "PENDING":
        case "SENDING":
          stats.pending += 1;
          break;
      }
    }

    const logs = await ctx.db
      .query("notificationLogs")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const channelStats: Record<
      string,
      { total: number; sent: number; failed: number; successRate: number }
    > = {};

    for (const log of logs) {
      const sentAt = log.sentAt ?? log.createdAt;
      if (sentAt < startDate) {
        continue;
      }

      const stats =
        channelStats[log.channel] ??
        (channelStats[log.channel] = {
          total: 0,
          sent: 0,
          failed: 0,
          successRate: 0,
        });
      stats.total += 1;
      if (log.status === "SENT") {
        stats.sent += 1;
      } else if (log.status === "FAILED") {
        stats.failed += 1;
      }
    }

    for (const stats of Object.values(channelStats)) {
      stats.successRate =
        stats.total > 0
          ? Math.round((stats.sent / stats.total) * 100 * 100) / 100
          : 0;
    }

    return {
      summary,
      dailyStats: Object.values(dailyStatsMap).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      channelStats,
    };
  },
});

export const deleteNotification = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.id, { deletedAt: now, updatedAt: now });
  },
});

export const getUnreadCount = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return items.filter(
      (item) =>
        !item.readAt && (item.status === "SENT" || item.status === "SENDING"),
    ).length;
  },
});

export const updateDeliveryResults = mutation({
  args: { id: v.id("notifications"), results: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deliveryResults: args.results,
      updatedAt: Date.now(),
    });
  },
});

export const scheduleRetry = mutation({
  args: { id: v.id("notifications"), nextRetryAt: v.number() },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (notification) {
      await ctx.db.patch(args.id, {
        retryCount: (notification.retryCount ?? 0) + 1,
        nextRetryAt: args.nextRetryAt,
        status: "PENDING",
        updatedAt: Date.now(),
      });
    }
  },
});

export const listPendingRetry = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const items = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("status"), "FAILED"))
      .collect();

    const maxRetries = 3;
    return items
      .filter(
        (item) =>
          (item.retryCount ?? 0) < maxRetries && (item.nextRetryAt ?? 0) <= now,
      )
      .sort((a, b) => (a.nextRetryAt ?? 0) - (b.nextRetryAt ?? 0))
      .slice(0, args.limit);
  },
});

export const cleanupOld = mutation({
  args: { cutoffTime: v.number() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("notifications")
      .filter((q) => q.lte(q.field("createdAt"), args.cutoffTime))
      .collect();

    const now = Date.now();
    let deletedCount = 0;

    for (const item of items) {
      if (
        item.status === "SENT" ||
        item.status === "FAILED" ||
        item.status === "CANCELLED"
      ) {
        await ctx.db.patch(item._id, { deletedAt: now, updatedAt: now });
        deletedCount += 1;
      }
    }

    return deletedCount;
  },
});

export const batchUpdateStatus = mutation({
  args: { ids: v.array(v.id("notifications")), status: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    let count = 0;

    for (const id of args.ids) {
      const notification = await ctx.db.get(id);
      if (notification && !notification.deletedAt) {
        const data: Record<string, unknown> = {
          status: args.status,
          updatedAt: now,
        };
        if (args.status === "SENT") {
          data.sentAt = now;
        }
        await ctx.db.patch(id, data);
        count += 1;
      }
    }

    return count;
  },
});

export const searchNotifications = query({
  args: {
    memberId: v.id("familyMembers"),
    query: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("notifications")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const lowerQuery = args.query.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery),
    );

    if (args.dateFrom) {
      items = items.filter((item) => item.createdAt >= args.dateFrom!);
    }
    if (args.dateTo) {
      items = items.filter((item) => item.createdAt <= args.dateTo!);
    }

    items.sort((a, b) => b.createdAt - a.createdAt);

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;

    return {
      data: items.slice(offset, offset + limit),
      total: items.length,
    };
  },
});
