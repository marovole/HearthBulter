import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserPreference = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();
  },
});

export const upsertUserPreference = mutation({
  args: {
    memberId: v.id("familyMembers"),
    preferredIngredients: v.optional(v.array(v.string())),
    avoidedIngredients: v.optional(v.array(v.string())),
    maxCookTime: v.optional(v.number()),
    costLevel: v.optional(v.string()),
    preferredCuisines: v.optional(v.array(v.string())),
    recommendationWeights: v.optional(v.any()),
    learnedPreferences: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        preferredIngredients:
          args.preferredIngredients ?? existing.preferredIngredients,
        avoidedIngredients:
          args.avoidedIngredients ?? existing.avoidedIngredients,
        maxCookTime: args.maxCookTime ?? existing.maxCookTime,
        costLevel: args.costLevel ?? existing.costLevel,
        preferredCuisines: args.preferredCuisines ?? existing.preferredCuisines,
        recommendationWeights:
          args.recommendationWeights ?? existing.recommendationWeights,
        learnedPreferences:
          args.learnedPreferences ?? existing.learnedPreferences,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userPreferences", {
      memberId: args.memberId,
      preferredIngredients: args.preferredIngredients ?? [],
      avoidedIngredients: args.avoidedIngredients ?? [],
      maxCookTime: args.maxCookTime,
      costLevel: args.costLevel ?? "MEDIUM",
      preferredCuisines: args.preferredCuisines ?? [],
      recommendationWeights: args.recommendationWeights,
      learnedPreferences: args.learnedPreferences,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveRecommendationLog = mutation({
  args: {
    memberId: v.id("familyMembers"),
    recipeId: v.id("recipes"),
    rank: v.number(),
    score: v.number(),
    reasons: v.array(v.string()),
    metadata: v.optional(v.any()),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("recommendationLogs", {
      memberId: args.memberId,
      recipeId: args.recipeId,
      rank: args.rank,
      score: args.score,
      reasons: args.reasons,
      metadata: args.metadata,
      generatedAt: args.generatedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});
