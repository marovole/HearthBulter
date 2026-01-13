import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  vNotificationType,
  vNotificationPriority,
  vNotificationStatus,
  vNotificationChannel,
} from "./schema";

/**
 * Get notifications for a member
 */
export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    type: v.optional(vNotificationType),
    status: v.optional(vNotificationStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let notifications;

    if (args.type) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .filter((q) =>
          q.and(
            q.eq(q.field("memberId"), args.memberId),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(args.limit ?? 50);
    } else if (args.status) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .filter((q) =>
          q.and(
            q.eq(q.field("memberId"), args.memberId),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .take(args.limit ?? 50);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .order("desc")
        .take(args.limit ?? 50);
    }

    return notifications;
  },
});

/**
 * Get unread count
 */
export const getUnreadCount = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("readAt"), undefined),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    return notifications.length;
  },
});

/**
 * Create notification
 */
export const create = mutation({
  args: {
    memberId: v.id("familyMembers"),
    type: vNotificationType,
    title: v.string(),
    content: v.string(),
    priority: v.optional(vNotificationPriority),
    channels: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
    dedupKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check for deduplication
    if (args.dedupKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
        .filter((q) =>
          q.and(
            q.eq(q.field("dedupKey"), args.dedupKey),
            q.eq(q.field("deletedAt"), undefined)
          )
        )
        .first();

      if (existing) {
        return existing._id;
      }
    }

    return await ctx.db.insert("notifications", {
      memberId: args.memberId,
      type: args.type,
      title: args.title,
      content: args.content,
      priority: args.priority ?? "MEDIUM",
      channels: args.channels ?? ["IN_APP"],
      status: "PENDING",
      metadata: args.metadata,
      actionUrl: args.actionUrl,
      actionText: args.actionText,
      retryCount: 0,
      maxRetries: 3,
      isDeduped: !!args.dedupKey,
      dedupKey: args.dedupKey,
    });
  },
});

/**
 * Mark as read
 */
export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { readAt: Date.now() });
    return args.id;
  },
});

/**
 * Mark all as read
 */
export const markAllAsRead = mutation({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("readAt"), undefined),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    const now = Date.now();
    for (const notification of unread) {
      await ctx.db.patch(notification._id, { readAt: now });
    }

    return unread.length;
  },
});

/**
 * Delete notification (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});

/**
 * Get notification preferences
 */
export const getPreferences = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("notificationPreferences")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();
  },
});

/**
 * Update notification preferences
 */
export const updatePreferences = mutation({
  args: {
    memberId: v.id("familyMembers"),
    enableNotifications: v.optional(v.boolean()),
    globalQuietHoursStart: v.optional(v.number()),
    globalQuietHoursEnd: v.optional(v.number()),
    dailyMaxNotifications: v.optional(v.number()),
    pushEnabled: v.optional(v.boolean()),
    emailEnabled: v.optional(v.boolean()),
    phoneEnabled: v.optional(v.boolean()),
    enableSmartScheduling: v.optional(v.boolean()),
    enableDeduplication: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();

    const { memberId, ...updates } = args;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("notificationPreferences", {
      memberId: args.memberId,
      enableNotifications: args.enableNotifications ?? true,
      globalQuietHoursStart: args.globalQuietHoursStart,
      globalQuietHoursEnd: args.globalQuietHoursEnd,
      dailyMaxNotifications: args.dailyMaxNotifications ?? 20,
      dailyMaxSMS: 5,
      dailyMaxEmail: 10,
      channelPreferences: "{}",
      typeSettings: "{}",
      wechatSubscribed: false,
      pushEnabled: args.pushEnabled ?? true,
      emailEnabled: args.emailEnabled ?? true,
      phoneEnabled: args.phoneEnabled ?? false,
      enableSmartScheduling: args.enableSmartScheduling ?? true,
      enableDeduplication: args.enableDeduplication ?? true,
    });
  },
});

/**
 * Send notification (updates status)
 */
export const send = mutation({
  args: {
    id: v.id("notifications"),
    channel: vNotificationChannel,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.id);
    if (!notification) throw new Error("Notification not found");

    const now = Date.now();

    // Update notification status
    await ctx.db.patch(args.id, {
      status: "SENT",
      sentAt: now,
    });

    // Log the send
    await ctx.db.insert("notificationLogs", {
      notificationId: args.id,
      channel: args.channel,
      status: "SENT",
      sentAt: now,
      retryCount: 0,
    });

    return args.id;
  },
});

/**
 * Get notification logs
 */
export const getLogs = query({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("notificationLogs")
      .withIndex("by_notificationId", (q) =>
        q.eq("notificationId", args.notificationId)
      )
      .collect();
  },
});

/**
 * Batch create notifications
 */
export const batchCreate = mutation({
  args: {
    notifications: v.array(
      v.object({
        memberId: v.id("familyMembers"),
        type: vNotificationType,
        title: v.string(),
        content: v.string(),
        priority: v.optional(vNotificationPriority),
        channels: v.optional(v.array(v.string())),
        metadata: v.optional(v.any()),
      })
    ),
    batchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const batchId = args.batchId ?? `batch_${Date.now()}`;
    const ids = [];

    for (const notification of args.notifications) {
      const id = await ctx.db.insert("notifications", {
        memberId: notification.memberId,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        priority: notification.priority ?? "MEDIUM",
        channels: notification.channels ?? ["IN_APP"],
        status: "PENDING",
        metadata: notification.metadata,
        retryCount: 0,
        maxRetries: 3,
        isDeduped: false,
        batchId,
      });
      ids.push(id);
    }

    return { batchId, count: ids.length, ids };
  },
});
