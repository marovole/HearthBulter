import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const createHealthAnomaly = mutation({
  args: {
    memberId: v.id("familyMembers"),
    anomalyType: v.string(),
    severity: v.string(),
    title: v.string(),
    description: v.string(),
    dataType: v.optional(v.string()),
    value: v.number(),
    expectedMin: v.optional(v.number()),
    expectedMax: v.optional(v.number()),
    deviation: v.optional(v.number()),
    detectedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("healthAnomalies", {
      ...args,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listPendingAnomalies = query({
  args: { memberId: v.id("familyMembers"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthAnomalies")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc");

    const limit = args.limit ?? 10;
    return await data.take(limit);
  },
});

export const listAnomaliesByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthAnomalies")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data
      .filter(
        (a) => a.detectedAt >= args.startDate && a.detectedAt <= args.endDate,
      )
      .sort((a, b) => b.detectedAt - a.detectedAt)
      .slice(0, args.limit ?? 100);
  },
});

export const countAnomaliesByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    severities: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthAnomalies")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data.filter((a) => {
      if (a.detectedAt < args.startDate || a.detectedAt > args.endDate) {
        return false;
      }
      if (
        args.severities &&
        args.severities.length > 0 &&
        !args.severities.includes(a.severity)
      ) {
        return false;
      }
      if (args.status && a.status !== args.status) {
        return false;
      }
      return true;
    }).length;
  },
});

export const updateAnomalyStatus = mutation({
  args: {
    anomalyId: v.id("healthAnomalies"),
    status: v.string(),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.anomalyId, {
      status: args.status,
      resolution: args.resolution,
      resolvedAt: args.status === "RESOLVED" ? now : undefined,
      updatedAt: now,
    });
    return args.anomalyId;
  },
});

export const acknowledgeAnomaly = mutation({
  args: { anomalyId: v.id("healthAnomalies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.anomalyId, {
      status: "ACKNOWLEDGED",
      updatedAt: now,
    });
    return args.anomalyId;
  },
});

export const ignoreAnomaly = mutation({
  args: { anomalyId: v.id("healthAnomalies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.anomalyId, {
      status: "IGNORED",
      updatedAt: now,
    });
    return args.anomalyId;
  },
});

export const getDailyNutritionTarget = query({
  args: { memberId: v.id("familyMembers"), date: v.number() },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    return data ?? null;
  },
});

export const listDailyNutritionTargets = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data
      .filter((t) => t.date <= args.endDate)
      .sort((a, b) => a.date - b.date);
  },
});

export const upsertDailyNutritionTarget = mutation({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
    targetCalories: v.number(),
    targetProtein: v.number(),
    targetCarbs: v.number(),
    targetFat: v.number(),
    actualCalories: v.number(),
    actualProtein: v.number(),
    actualCarbs: v.number(),
    actualFat: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        targetCalories: args.targetCalories,
        targetProtein: args.targetProtein,
        targetCarbs: args.targetCarbs,
        targetFat: args.targetFat,
        actualCalories: args.actualCalories,
        actualProtein: args.actualProtein,
        actualCarbs: args.actualCarbs,
        actualFat: args.actualFat,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("dailyNutritionTargets", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getAuxiliaryTracking = query({
  args: { memberId: v.id("familyMembers"), date: v.number() },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("auxiliaryTrackings")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    return data ?? null;
  },
});

export const listAuxiliaryTrackings = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("auxiliaryTrackings")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data
      .filter((t) => t.date <= args.endDate)
      .sort((a, b) => a.date - b.date);
  },
});

export const upsertAuxiliaryTracking = mutation({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
    exerciseMinutes: v.optional(v.number()),
    sleepHours: v.optional(v.number()),
    sleepQuality: v.optional(v.string()),
    waterIntake: v.optional(v.number()),
    steps: v.optional(v.number()),
    standingHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("auxiliaryTrackings")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        exerciseMinutes: args.exerciseMinutes,
        sleepHours: args.sleepHours,
        sleepQuality: args.sleepQuality,
        waterIntake: args.waterIntake,
        steps: args.steps,
        standingHours: args.standingHours,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("auxiliaryTrackings", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getHealthScore = query({
  args: { memberId: v.id("familyMembers"), date: v.number() },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthScores")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    return data ?? null;
  },
});

export const listHealthScores = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthScores")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data
      .filter((s) => s.date <= args.endDate)
      .sort((a, b) => a.date - b.date);
  },
});

export const upsertHealthScore = mutation({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
    overallScore: v.number(),
    nutritionScore: v.number(),
    exerciseScore: v.number(),
    sleepScore: v.number(),
    medicalScore: v.number(),
    grade: v.string(),
    dataCompleteness: v.number(),
    recommendations: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("healthScores")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        overallScore: args.overallScore,
        nutritionScore: args.nutritionScore,
        exerciseScore: args.exerciseScore,
        sleepScore: args.sleepScore,
        medicalScore: args.medicalScore,
        grade: args.grade,
        dataCompleteness: args.dataCompleteness,
        recommendations: args.recommendations,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("healthScores", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const createHealthReport = mutation({
  args: {
    memberId: v.id("familyMembers"),
    reportType: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    title: v.string(),
    summary: v.string(),
    htmlContent: v.string(),
    dataSnapshot: v.string(),
    insights: v.string(),
    overallScore: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("healthReports", {
      ...args,
      status: "COMPLETED",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getHealthReportById = query({
  args: { reportId: v.id("healthReports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report || report.deletedAt) {
      return null;
    }
    return report;
  },
});

export const getHealthReportsByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthReports")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data
      .filter((r) => r.startDate >= args.startDate && r.endDate <= args.endDate)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 50);
  },
});

export const getHealthReportByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthReports")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
    return data ?? null;
  },
});

export const updateHealthReportShareToken = mutation({
  args: {
    reportId: v.id("healthReports"),
    shareToken: v.string(),
    shareExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      shareToken: args.shareToken,
      shareExpiresAt: args.shareExpiresAt,
    });
    return args.reportId;
  },
});

export const getTrackingStreak = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("trackingStreaks")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();
    return data ?? null;
  },
});

export const upsertTrackingStreak = mutation({
  args: {
    memberId: v.id("familyMembers"),
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalDays: v.number(),
    lastCheckIn: v.optional(v.number()),
    badges: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trackingStreaks")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        currentStreak: args.currentStreak,
        longestStreak: args.longestStreak,
        totalDays: args.totalDays,
        lastCheckIn: args.lastCheckIn,
        badges: args.badges,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("trackingStreaks", {
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const countMealLogs = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data.filter((m) => m.date <= args.endDate).length;
  },
});

export const groupMealLogsByDate = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const filtered = data.filter((m) => m.date <= args.endDate);
    const dateSet = new Set<number>();
    for (const item of filtered) {
      dateSet.add(item.date);
    }
    return dateSet.size;
  },
});
