import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByUserAndConsent = query({
  args: {
    userId: v.id("users"),
    consentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userConsents")
      .withIndex("by_user_consent", (q) =>
        q.eq("userId", args.userId).eq("consentId", args.consentId),
      )
      .unique();
  },
});

export const upsert = mutation({
  args: {
    userId: v.id("users"),
    consentId: v.string(),
    granted: v.boolean(),
    context: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userConsents")
      .withIndex("by_user_consent", (q) =>
        q.eq("userId", args.userId).eq("consentId", args.consentId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        granted: args.granted,
        context: args.context,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
        grantedAt: args.grantedAt,
        expiresAt: args.expiresAt,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userConsents", {
      userId: args.userId,
      consentId: args.consentId,
      granted: args.granted,
      context: args.context,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      grantedAt: args.grantedAt,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteConsent = mutation({
  args: {
    userId: v.id("users"),
    consentId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userConsents")
      .withIndex("by_user_consent", (q) =>
        q.eq("userId", args.userId).eq("consentId", args.consentId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
