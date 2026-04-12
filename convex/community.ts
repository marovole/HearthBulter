import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ==================== Community Posts ====================

/** 列出帖子，可按 status 过滤 */
export const listPosts = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const posts = await ctx.db.query("communityPosts").collect();
    if (args.status) return posts.filter((p) => p.status === args.status);
    return posts;
  },
});

/** 获取单个帖子及其评论 */
export const getPostById = query({
  args: { id: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return null;
    const comments = await ctx.db
      .query("communityComments")
      .withIndex("by_post", (q) => q.eq("postId", args.id))
      .collect();
    return { ...post, comments };
  },
});

/** 创建社区帖子 */
export const createPost = mutation({
  args: {
    memberId: v.string(),
    title: v.string(),
    content: v.string(),
    type: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("communityPosts", { ...args, likes: 0 });
    return await ctx.db.get(id);
  },
});

/** 添加评论 */
export const addComment = mutation({
  args: {
    postId: v.id("communityPosts"),
    memberId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("communityComments", args);
    return await ctx.db.get(id);
  },
});

// ==================== Family Goals ====================

/** 列出家庭目标，可按 status 过滤 */
export const listFamilyGoals = query({
  args: { familyId: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const goals = await ctx.db
      .query("familyGoals")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
    if (args.status) return goals.filter((g) => g.status === args.status);
    return goals;
  },
});

/** 创建家庭目标 */
export const createFamilyGoal = mutation({
  args: {
    familyId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    targetDate: v.optional(v.number()),
    createdBy: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("familyGoals", args);
    return await ctx.db.get(id);
  },
});

// ==================== Trend Data ====================

/** 查询趋势数据（自动排除过期） */
export const getTrendData = query({
  args: { memberId: v.string(), dataType: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const trends = await ctx.db
      .query("trendData")
      .withIndex("by_member_type", (q) =>
        q.eq("memberId", args.memberId).eq("dataType", args.dataType)
      )
      .collect();
    return trends.filter((t) => !t.expiresAt || t.expiresAt > now);
  },
});

/** 创建或更新趋势数据（按 memberId + dataType + 日期范围 upsert） */
export const upsertTrendData = mutation({
  args: {
    memberId: v.string(),
    dataType: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    aggregatedData: v.any(),
    mean: v.optional(v.number()),
    median: v.optional(v.number()),
    min: v.optional(v.number()),
    max: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trendData")
      .withIndex("by_member_type", (q) =>
        q.eq("memberId", args.memberId).eq("dataType", args.dataType)
      )
      .collect();
    const match = existing.find(
      (t) => t.startDate === args.startDate && t.endDate === args.endDate
    );
    if (match) {
      await ctx.db.patch(match._id, args);
      return await ctx.db.get(match._id);
    }
    const id = await ctx.db.insert("trendData", args);
    return await ctx.db.get(id);
  },
});
