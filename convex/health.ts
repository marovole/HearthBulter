import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess } from "./lib/response";

/**
 * Get health metrics for a member
 */
export const getMetrics = query({
  args: {
    memberId: v.id("familyMembers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("healthData")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc");

    if (args.limit) {
      return await q.take(args.limit);
    }

    return await q.collect();
  },
});

/**
 * Add a health record
 */
export const addRecord = mutation({
  args: {
    memberId: v.id("familyMembers"),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    source: v.string(),
    measuredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recordId = await ctx.db.insert("healthData", {
      ...args,
      measuredAt: args.measuredAt || Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return apiSuccess({ recordId });
  },
});
