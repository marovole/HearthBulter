import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const checkAndIncrement = mutation({
  args: {
    key: v.string(),
    windowMs: v.number(),
    maxRequests: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!existing || now > existing.resetAt) {
      const resetAt = now + args.windowMs;
      const count = 1;

      if (existing) {
        await ctx.db.patch(existing._id, {
          count,
          resetAt,
          windowMs: args.windowMs,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("rateLimits", {
          key: args.key,
          count,
          resetAt,
          windowMs: args.windowMs,
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        allowed: true,
        limit: args.maxRequests,
        remaining: args.maxRequests - 1,
        resetTime: resetAt,
      };
    }

    if (existing.count >= args.maxRequests) {
      return {
        allowed: false,
        limit: args.maxRequests,
        remaining: 0,
        resetTime: existing.resetAt,
        retryAfter: Math.ceil((existing.resetAt - now) / 1000),
      };
    }

    const nextCount = existing.count + 1;
    await ctx.db.patch(existing._id, {
      count: nextCount,
      updatedAt: now,
    });

    return {
      allowed: true,
      limit: args.maxRequests,
      remaining: Math.max(0, args.maxRequests - nextCount),
      resetTime: existing.resetAt,
    };
  },
});
