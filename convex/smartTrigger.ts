import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ==================== Smart Trigger Logs ====================

/** 查询触发日志，可按 triggerType 过滤，按创建时间倒序 */
export const getTriggerLogs = query({
  args: { userId: v.string(), triggerType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("smartTriggerLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    if (args.triggerType) return logs.filter((l) => l.triggerType === args.triggerType);
    return logs.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** 创建触发日志 */
export const createTriggerLog = mutation({
  args: {
    userId: v.string(),
    triggerType: v.string(),
    triggerScore: v.number(),
    factors: v.any(),
    triggered: v.boolean(),
    mealPlanId: v.optional(v.string()),
    emailSent: v.optional(v.boolean()),
    cooldownUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("smartTriggerLogs", {
      ...args,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

/** 更新触发日志 */
export const updateTriggerLog = mutation({
  args: { id: v.id("smartTriggerLogs"), patch: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return await ctx.db.get(args.id);
  },
});

// ==================== User Behavior Patterns ====================

/** 获取用户行为模式 */
export const getBehaviorPattern = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBehaviorPatterns")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/** 创建或更新行为模式（upsert） */
export const upsertBehaviorPattern = mutation({
  args: { userId: v.string(), patch: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userBehaviorPatterns")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args.patch);
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert("userBehaviorPatterns", {
      userId: args.userId,
      ...args.patch,
    });
    return await ctx.db.get(id);
  },
});
