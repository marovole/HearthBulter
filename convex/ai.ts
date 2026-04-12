// ============================================================================
// AI & Dietary — Convex CRUD functions
// Tables: aiAdvice, aiConversations, promptTemplates, dietaryPreferences
// ============================================================================

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// === AI Advice =================================================================

export const getAdviceById = query({
  args: { id: v.id("aiAdvice") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listAdviceByMember = query({
  args: {
    memberId: v.string(),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("aiAdvice")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId));
    const advice = await q.collect();
    let filtered = advice;
    if (args.type) {
      filtered = filtered.filter((a) => a.type === args.type);
    }
    filtered.sort((a, b) => b.generatedAt - a.generatedAt);
    return args.limit ? filtered.slice(0, args.limit) : filtered;
  },
});

export const createAdvice = mutation({
  args: {
    memberId: v.string(),
    type: v.string(),
    content: v.any(),
    prompt: v.string(),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiAdvice", {
      ...args,
      feedback: undefined,
      generatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const updateAdviceFeedback = mutation({
  args: {
    id: v.id("aiAdvice"),
    feedback: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Advice not found");
    const mergedFeedback = { ...(existing.feedback || {}), ...args.feedback };
    await ctx.db.patch(args.id, { feedback: mergedFeedback });
    return await ctx.db.get(args.id);
  },
});

// === AI Conversations ===========================================================

export const getConversationById = query({
  args: { id: v.id("aiConversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listConversationsByMember = query({
  args: {
    memberId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("aiConversations")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    if (args.status) {
      return conversations.filter((c) => c.status === args.status);
    }
    return conversations.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  },
});

export const createConversation = mutation({
  args: {
    memberId: v.string(),
    title: v.string(),
    messages: v.any(),
    status: v.string(),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiConversations", {
      ...args,
      lastMessageAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const updateConversation = mutation({
  args: {
    id: v.id("aiConversations"),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return await ctx.db.get(args.id);
  },
});

// === Prompt Templates ==========================================================

export const getPromptTemplateById = query({
  args: { id: v.id("promptTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listPromptTemplatesByType = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.type) {
      return await ctx.db
        .query("promptTemplates")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    }
    return await ctx.db.query("promptTemplates").collect();
  },
});

export const createPromptTemplate = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    template: v.string(),
    version: v.number(),
    parameters: v.optional(v.any()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("promptTemplates", args);
    return await ctx.db.get(id);
  },
});

export const updatePromptTemplate = mutation({
  args: {
    id: v.id("promptTemplates"),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.patch);
    return await ctx.db.get(args.id);
  },
});

// === Dietary Preferences =======================================================

export const listDietaryPreferences = query({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dietaryPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

export const upsertDietaryPreference = mutation({
  args: {
    memberId: v.string(),
    type: v.string(),
    strictness: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dietaryPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
    const match = existing.find((p) => p.type === args.type);
    if (match) {
      await ctx.db.patch(match._id, { strictness: args.strictness });
      return await ctx.db.get(match._id);
    }
    const id = await ctx.db.insert("dietaryPreferences", args);
    return await ctx.db.get(id);
  },
});

// === Feedback Stats (replicates sp_ai_feedback_stats) ==========================

export const getFeedbackStats = query({
  args: {
    memberId: v.string(),
    adviceType: v.optional(v.string()),
    daysAgo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = args.daysAgo ? Date.now() - args.daysAgo * 24 * 60 * 60 * 1000 : 0;

    let advice = await ctx.db
      .query("aiAdvice")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    if (args.adviceType) {
      advice = advice.filter((a) => a.type === args.adviceType);
    }
    if (cutoff > 0) {
      advice = advice.filter((a) => a.generatedAt >= cutoff);
    }

    const total = advice.length;
    const withFeedback = advice.filter((a) => a.feedback);
    const positive = withFeedback.filter(
      (a) => a.feedback?.rating === "positive" || a.feedback?.rating === "up"
    ).length;
    const negative = withFeedback.filter(
      (a) => a.feedback?.rating === "negative" || a.feedback?.rating === "down"
    ).length;

    return {
      total,
      withFeedback: withFeedback.length,
      positive,
      negative,
      neutral: withFeedback.length - positive - negative,
      feedbackRate: total > 0 ? withFeedback.length / total : 0,
      positiveRate: withFeedback.length > 0 ? positive / withFeedback.length : 0,
    };
  },
});
