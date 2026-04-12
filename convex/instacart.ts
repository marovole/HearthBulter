import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ==================== OAuth States ====================

/** 按 state 查找 OAuth 记录（一次性消费） */
export const getOAuthState = query({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
  },
});

/** 创建 OAuth state 记录 */
export const createOAuthState = mutation({
  args: {
    state: v.string(),
    userId: v.string(),
    platform: v.string(),
    redirectUri: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("oAuthStates", args);
    return await ctx.db.get(id);
  },
});

/** 删除已消费的 OAuth state */
export const deleteOAuthState = mutation({
  args: { id: v.id("oAuthStates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ==================== Instacart Carts ====================

/** 查询用户购物车，可按 status 过滤 */
export const getInstacartCart = query({
  args: { userId: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const carts = await ctx.db
      .query("instacartCarts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    if (args.status) return carts.filter((c) => c.status === args.status);
    return carts;
  },
});

/** 创建 Instacart 购物车 */
export const createInstacartCart = mutation({
  args: {
    userId: v.string(),
    cartId: v.string(),
    retailerId: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    deepLink: v.optional(v.string()),
    items: v.optional(v.any()),
    mealPlanId: v.optional(v.string()),
    status: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("instacartCarts", args);
    return await ctx.db.get(id);
  },
});

/** 更新 Instacart 购物车 */
export const updateInstacartCart = mutation({
  args: { id: v.id("instacartCarts"), patch: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return await ctx.db.get(args.id);
  },
});
