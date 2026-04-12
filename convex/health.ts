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
    const q = ctx.db
      .query("healthData")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
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
    muscleMass: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    bloodSugar: v.optional(v.number()),
    sleep: v.optional(v.number()),
    exercise: v.optional(v.number()),
    steps: v.optional(v.number()),
    source: v.string(),
    measuredAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    deviceConnectionId: v.optional(v.id("deviceConnections")),
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

export const listGoals = query({
  args: { memberId: v.id("familyMembers"), includeInactive: v.boolean() },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("healthGoals")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc");

    if (!args.includeInactive) {
      q = q.filter((q) => q.eq(q.field("status"), "ACTIVE"));
    }

    return await q.collect();
  },
});

export const getGoalById = query({
  args: { goalId: v.id("healthGoals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.deletedAt) {
      return null;
    }
    return goal;
  },
});

export const createGoal = mutation({
  args: {
    memberId: v.id("familyMembers"),
    goalType: v.string(),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    status: v.string(),
    tdee: v.optional(v.number()),
    bmr: v.optional(v.number()),
    activityFactor: v.optional(v.number()),
    carbRatio: v.number(),
    proteinRatio: v.number(),
    fatRatio: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("healthGoals", {
      ...args,
      targetValue: args.targetValue ?? 0,
      currentValue: args.currentValue ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateGoal = mutation({
  args: {
    goalId: v.id("healthGoals"),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
    carbRatio: v.optional(v.number()),
    proteinRatio: v.optional(v.number()),
    fatRatio: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.goalId, {
      targetValue: args.targetValue,
      currentValue: args.currentValue,
      endDate: args.endDate,
      status: args.status,
      carbRatio: args.carbRatio,
      proteinRatio: args.proteinRatio,
      fatRatio: args.fatRatio,
      updatedAt: now,
    });
    return args.goalId;
  },
});

export const listAllergies = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("allergies")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();
  },
});

export const getAllergyById = query({
  args: { allergyId: v.id("allergies") },
  handler: async (ctx, args) => {
    const allergy = await ctx.db.get(args.allergyId);
    if (!allergy || allergy.deletedAt) {
      return null;
    }
    return allergy;
  },
});

export const createAllergy = mutation({
  args: {
    memberId: v.id("familyMembers"),
    allergenType: v.string(),
    allergenName: v.string(),
    severity: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("allergies", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAllergy = mutation({
  args: {
    allergyId: v.id("allergies"),
    allergenType: v.optional(v.string()),
    allergenName: v.optional(v.string()),
    severity: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.allergyId, {
      allergenType: args.allergenType,
      allergenName: args.allergenName,
      severity: args.severity,
      description: args.description,
      updatedAt: now,
    });
    return args.allergyId;
  },
});

export const listHealthData = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    page: v.number(),
    limit: v.number(),
    sortOrder: v.string(),
  },
  handler: async (ctx, args) => {
    const startDate = args.startDate ?? 0;

    let q = ctx.db
      .query("healthData")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("measuredAt", startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const endDate = args.endDate;
    if (endDate !== undefined) {
      q = q.filter((q) => q.lte(q.field("measuredAt"), endDate));
    }

    const ordered = args.sortOrder === "asc" ? q.order("asc") : q.order("desc");
    const data = await ordered.collect();
    const total = data.length;
    const offset = (args.page - 1) * args.limit;

    return {
      data: data.slice(offset, offset + args.limit),
      total,
    };
  },
});

export const listByDeviceConnection = query({
  args: {
    deviceConnectionId: v.id("deviceConnections"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("healthData")
      .withIndex("by_device", (q) => q.eq("deviceConnectionId", args.deviceConnectionId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    return data.slice(0, args.limit);
  },
});

export const listByMembers = query({
  args: {
    memberIds: v.array(v.id("familyMembers")),
    sources: v.optional(v.array(v.string())),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const memberSet = new Set(args.memberIds);
    let data = await ctx.db.query("healthData").collect();

    data = data.filter((record) => memberSet.has(record.memberId));

    if (args.sources && args.sources.length > 0) {
      const sourceSet = new Set(args.sources);
      data = data.filter((record) => sourceSet.has(record.source));
    }

    data.sort((a, b) => b.createdAt - a.createdAt);

    const total = data.length;
    return {
      data: data.slice(args.offset, args.offset + args.limit),
      total,
    };
  },
});

export const listByMemberDateRange = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    source: v.optional(v.string()),
    notesContains: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("healthData")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).gte("measuredAt", args.startDate)
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const endDate = args.endDate;
    if (endDate !== undefined) {
      q = q.filter((q) => q.lte(q.field("measuredAt"), endDate));
    }

    let data = await q.collect();

    if (args.source) {
      data = data.filter((record) => record.source === args.source);
    }

    const notesContains = args.notesContains;
    if (notesContains) {
      data = data.filter((record) => Boolean(record.notes && record.notes.includes(notesContains)));
    }

    return data;
  },
});

export const getRecordById = query({
  args: { recordId: v.id("healthData") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record || record.deletedAt) {
      return null;
    }
    return record;
  },
});

export const updateRecord = mutation({
  args: {
    recordId: v.id("healthData"),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    muscleMass: v.optional(v.number()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    bloodSugar: v.optional(v.number()),
    sleep: v.optional(v.number()),
    exercise: v.optional(v.number()),
    steps: v.optional(v.number()),
    measuredAt: v.optional(v.number()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.recordId, {
      weight: args.weight,
      bodyFat: args.bodyFat,
      muscleMass: args.muscleMass,
      bloodPressureSystolic: args.bloodPressureSystolic,
      bloodPressureDiastolic: args.bloodPressureDiastolic,
      heartRate: args.heartRate,
      bloodSugar: args.bloodSugar,
      sleep: args.sleep,
      exercise: args.exercise,
      steps: args.steps,
      measuredAt: args.measuredAt,
      source: args.source,
      notes: args.notes,
      updatedAt: now,
    });
    return args.recordId;
  },
});

export const deleteRecord = mutation({
  args: { recordId: v.id("healthData") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.recordId, {
      deletedAt: now,
      updatedAt: now,
    });
  },
});

export const deleteRecords = mutation({
  args: { recordIds: v.array(v.id("healthData")) },
  handler: async (ctx, args) => {
    const now = Date.now();
    await Promise.all(
      args.recordIds.map((recordId) => ctx.db.patch(recordId, { deletedAt: now, updatedAt: now }))
    );
  },
});

export const deleteGoal = mutation({
  args: { goalId: v.id("healthGoals") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.goalId, { deletedAt: now, updatedAt: now });
  },
});

export const deleteAllergy = mutation({
  args: { allergyId: v.id("allergies") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.allergyId, { deletedAt: now, updatedAt: now });
  },
});

// === Medical Reports & Indicators =============================================

export const listMedicalReportsByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("medicalReports")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .collect();

    return reports.slice(0, args.limit ?? 50);
  },
});

export const listIndicatorsByReport = query({
  args: { reportId: v.id("medicalReports") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("medicalIndicators")
      .withIndex("by_report", (q) => q.eq("reportId", args.reportId))
      .collect();
  },
});
