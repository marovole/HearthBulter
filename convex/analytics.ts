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
      .filter((a) => a.detectedAt >= args.startDate && a.detectedAt <= args.endDate)
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
      if (args.severities && args.severities.length > 0 && !args.severities.includes(a.severity)) {
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
      .withIndex("by_member_date", (q) => q.eq("memberId", args.memberId).eq("date", args.date))
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
        q.eq("memberId", args.memberId).gte("date", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data.filter((t) => t.date <= args.endDate).sort((a, b) => a.date - b.date);
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
      .withIndex("by_member_date", (q) => q.eq("memberId", args.memberId).eq("date", args.date))
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
      .withIndex("by_member_date", (q) => q.eq("memberId", args.memberId).eq("date", args.date))
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
        q.eq("memberId", args.memberId).gte("date", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data.filter((t) => t.date <= args.endDate).sort((a, b) => a.date - b.date);
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
    waterTarget: v.optional(v.number()),
    steps: v.optional(v.number()),
    standingHours: v.optional(v.number()),
    caloriesBurned: v.optional(v.number()),
    exerciseType: v.optional(v.string()),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("auxiliaryTrackings")
      .withIndex("by_member_date", (q) => q.eq("memberId", args.memberId).eq("date", args.date))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        exerciseMinutes: args.exerciseMinutes,
        sleepHours: args.sleepHours,
        sleepQuality: args.sleepQuality,
        waterIntake: args.waterIntake,
        waterTarget: args.waterTarget,
        steps: args.steps,
        standingHours: args.standingHours,
        caloriesBurned: args.caloriesBurned,
        exerciseType: args.exerciseType,
        weight: args.weight,
        bodyFat: args.bodyFat,
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
      .withIndex("by_member_date", (q) => q.eq("memberId", args.memberId).eq("date", args.date))
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
        q.eq("memberId", args.memberId).gte("date", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data.filter((s) => s.date <= args.endDate).sort((a, b) => a.date - b.date);
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
      .withIndex("by_member_date", (q) => q.eq("memberId", args.memberId).eq("date", args.date))
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
        q.eq("memberId", args.memberId).gte("date", args.startDate)
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
        q.eq("memberId", args.memberId).gte("date", args.startDate)
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

// ============================================================================
// 趋势分析相关查询
// ============================================================================

export const getMemberProfile = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.deletedAt) {
      return null;
    }
    return {
      id: member._id,
      familyId: member.familyId,
      name: member.name,
      gender: member.gender ?? null,
      birthDate: member.birthDate,
      height: member.height ?? null,
      weight: member.weight ?? null,
      avatar: member.avatar ?? null,
    };
  },
});

export const aggregateMealLogs = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const filtered = data.filter((m) => m.date <= args.endDate);
    const uniqueDays = new Set(filtered.map((m) => m.date)).size;

    const totalDays = Math.ceil((args.endDate - args.startDate) / (1000 * 60 * 60 * 24));

    return {
      totalDays: Math.max(totalDays, 1),
      dataCompleteDays: uniqueDays,
    };
  },
});

export const fetchNutritionTrend = query({
  args: {
    memberId: v.id("familyMembers"),
    metric: v.string(), // CALORIES, PROTEIN, CARBS, FAT
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const filtered = data.filter((m) => m.date <= args.endDate);

    const fieldMap: Record<string, string> = {
      CALORIES: "totalCalories",
      PROTEIN: "totalProtein",
      CARBS: "totalCarbs",
      FAT: "totalFat",
    };

    const field = fieldMap[args.metric];
    if (!field) return [];

    const dailyMap = new Map<number, number>();
    for (const row of filtered) {
      const value = (row as unknown as Record<string, number>)[field] ?? 0;
      dailyMap.set(row.date, (dailyMap.get(row.date) ?? 0) + value);
    }

    return Array.from(dailyMap.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  },
});

export const fetchHealthMetricTrend = query({
  args: {
    memberId: v.id("familyMembers"),
    metric: v.string(), // WEIGHT, BODY_FAT, MUSCLE_MASS, BLOOD_PRESSURE, HEART_RATE
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthData")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const fieldMap: Record<string, string> = {
      WEIGHT: "weight",
      BODY_FAT: "bodyFat",
      MUSCLE_MASS: "muscleMass",
      BLOOD_PRESSURE: "bloodPressureSystolic",
      HEART_RATE: "heartRate",
    };

    const field = fieldMap[args.metric];
    if (!field) return [];

    return data
      .filter(
        (row) =>
          row.measuredAt >= args.startDate &&
          row.measuredAt <= args.endDate &&
          (row as unknown as Record<string, number | undefined>)[field] !== undefined
      )
      .map((row) => ({
        date: row.measuredAt,
        value: (row as unknown as Record<string, number>)[field] ?? 0,
      }))
      .sort((a, b) => a.date - b.date);
  },
});

export const fetchScoreTrend = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthScores")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("date", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return data
      .filter((s) => s.date <= args.endDate)
      .map((row) => ({
        date: row.date,
        value: row.overallScore,
      }))
      .sort((a, b) => a.date - b.date);
  },
});

// ============================================================================
// 报告相关查询
// ============================================================================

export const saveReportSnapshot = mutation({
  args: {
    id: v.string(),
    memberId: v.id("familyMembers"),
    period: v.object({
      startDate: v.number(),
      endDate: v.number(),
      label: v.string(),
    }),
    payload: v.record(v.string(), v.any()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("healthReports", {
      memberId: args.memberId,
      reportType: "SNAPSHOT",
      startDate: args.period.startDate,
      endDate: args.period.endDate,
      title: args.period.label,
      summary: JSON.stringify(args.payload),
      htmlContent: "",
      dataSnapshot: JSON.stringify(args.payload),
      insights: "",
      overallScore: 0,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listReportSnapshots = query({
  args: {
    memberId: v.id("familyMembers"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthReports")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;
    const items = sorted.slice(offset, offset + limit);

    return {
      items: items.map((row) => ({
        id: row._id,
        memberId: row.memberId,
        period: {
          startDate: row.startDate,
          endDate: row.endDate,
          label: row.title,
        },
        payload: JSON.parse(row.dataSnapshot || "{}"),
        status: row.status,
        createdAt: row.createdAt,
      })),
      total: sorted.length,
      hasMore: offset + items.length < sorted.length,
    };
  },
});
