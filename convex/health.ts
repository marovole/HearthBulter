import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  vHealthDataSource,
  vGoalType,
  vGoalStatus,
} from "./schema";

/**
 * Record health data
 */
export const recordHealthData = mutation({
  args: {
    memberId: v.id("familyMembers"),
    weight: v.optional(v.float64()),
    bodyFat: v.optional(v.float64()),
    muscleMass: v.optional(v.float64()),
    bloodPressureSystolic: v.optional(v.number()),
    bloodPressureDiastolic: v.optional(v.number()),
    heartRate: v.optional(v.number()),
    source: v.optional(vHealthDataSource),
    notes: v.optional(v.string()),
    deviceConnectionId: v.optional(v.id("deviceConnections")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify member exists
    const member = await ctx.db.get(args.memberId);
    if (!member || member.deletedAt) throw new Error("Member not found");

    const healthDataId = await ctx.db.insert("healthData", {
      memberId: args.memberId,
      weight: args.weight,
      bodyFat: args.bodyFat,
      muscleMass: args.muscleMass,
      bloodPressureSystolic: args.bloodPressureSystolic,
      bloodPressureDiastolic: args.bloodPressureDiastolic,
      heartRate: args.heartRate,
      measuredAt: Date.now(),
      source: args.source ?? "MANUAL",
      notes: args.notes,
      deviceConnectionId: args.deviceConnectionId,
    });

    // Update member's weight and BMI if weight is provided
    if (args.weight) {
      const updates: { weight: number; bmi?: number } = { weight: args.weight };
      if (member.height && member.height > 0) {
        const heightInMeters = member.height / 100;
        updates.bmi = args.weight / (heightInMeters * heightInMeters);
      }
      await ctx.db.patch(args.memberId, updates);
    }

    // Update health goal progress if exists
    const activeGoal = await ctx.db
      .query("healthGoals")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .first();

    if (activeGoal && args.weight && activeGoal.targetWeight) {
      const startWeight = activeGoal.startWeight ?? args.weight;
      const targetWeight = activeGoal.targetWeight;
      const currentProgress =
        ((startWeight - args.weight) / (startWeight - targetWeight)) * 100;
      await ctx.db.patch(activeGoal._id, {
        currentWeight: args.weight,
        progress: Math.min(Math.max(currentProgress, 0), 100),
      });
    }

    return healthDataId;
  },
});

/**
 * Get health data history for a member
 */
export const getHealthHistory = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("healthData")
      .withIndex("by_memberId_measuredAt", (q) => q.eq("memberId", args.memberId))
      .order("desc");

    const allData = await query.collect();

    // Filter by date range
    let filtered = allData;
    if (args.startDate) {
      filtered = filtered.filter((d) => d.measuredAt >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((d) => d.measuredAt <= args.endDate!);
    }

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered;
  },
});

/**
 * Get latest health data for a member
 */
export const getLatest = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("healthData")
      .withIndex("by_memberId_measuredAt", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .first();
  },
});

/**
 * Delete health data entry
 */
export const deleteHealthData = mutation({
  args: { id: v.id("healthData") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return true;
  },
});

// ==================== HEALTH GOALS ====================

/**
 * Create health goal
 */
export const createGoal = mutation({
  args: {
    memberId: v.id("familyMembers"),
    goalType: vGoalType,
    targetWeight: v.optional(v.float64()),
    targetWeeks: v.optional(v.number()),
    targetDate: v.optional(v.number()),
    tdee: v.optional(v.number()),
    bmr: v.optional(v.number()),
    activityFactor: v.optional(v.float64()),
    carbRatio: v.optional(v.float64()),
    proteinRatio: v.optional(v.float64()),
    fatRatio: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Deactivate any existing active goals
    const existingGoals = await ctx.db
      .query("healthGoals")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .collect();

    for (const goal of existingGoals) {
      await ctx.db.patch(goal._id, { status: "PAUSED" });
    }

    // Get current weight from latest health data or member profile
    const latestHealth = await ctx.db
      .query("healthData")
      .withIndex("by_memberId_measuredAt", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .first();

    const member = await ctx.db.get(args.memberId);
    const currentWeight = latestHealth?.weight ?? member?.weight;

    return await ctx.db.insert("healthGoals", {
      memberId: args.memberId,
      goalType: args.goalType,
      targetWeight: args.targetWeight,
      currentWeight,
      startWeight: currentWeight,
      targetWeeks: args.targetWeeks,
      startDate: Date.now(),
      targetDate: args.targetDate,
      tdee: args.tdee,
      bmr: args.bmr,
      activityFactor: args.activityFactor,
      carbRatio: args.carbRatio ?? 0.5,
      proteinRatio: args.proteinRatio ?? 0.2,
      fatRatio: args.fatRatio ?? 0.3,
      status: "ACTIVE",
      progress: 0,
    });
  },
});

/**
 * Get health goals for a member
 */
export const getGoals = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(vGoalStatus),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("healthGoals")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const goals = await query.collect();

    if (args.status) {
      return goals.filter((g) => g.status === args.status);
    }

    return goals;
  },
});

/**
 * Get active health goal for a member
 */
export const getActiveGoal = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("healthGoals")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .first();
  },
});

/**
 * Update health goal
 */
export const updateGoal = mutation({
  args: {
    id: v.id("healthGoals"),
    targetWeight: v.optional(v.float64()),
    targetDate: v.optional(v.number()),
    status: v.optional(vGoalStatus),
    carbRatio: v.optional(v.float64()),
    proteinRatio: v.optional(v.float64()),
    fatRatio: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    return id;
  },
});

/**
 * Delete health goal (soft delete)
 */
export const deleteGoal = mutation({
  args: { id: v.id("healthGoals") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});

// ==================== HEALTH REMINDERS ====================

/**
 * Get health reminders for a member
 */
export const getReminders = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("healthReminders")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

/**
 * Create or update health reminder
 */
export const upsertReminder = mutation({
  args: {
    memberId: v.id("familyMembers"),
    reminderType: v.union(
      v.literal("WEIGHT"),
      v.literal("BLOOD_PRESSURE"),
      v.literal("HEART_RATE"),
      v.literal("GENERAL")
    ),
    enabled: v.boolean(),
    hour: v.number(),
    minute: v.number(),
    daysOfWeek: v.array(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check if reminder already exists
    const existing = await ctx.db
      .query("healthReminders")
      .withIndex("by_memberId_reminderType", (q) =>
        q.eq("memberId", args.memberId).eq("reminderType", args.reminderType)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        hour: args.hour,
        minute: args.minute,
        daysOfWeek: args.daysOfWeek,
        message: args.message,
      });
      return existing._id;
    }

    return await ctx.db.insert("healthReminders", {
      memberId: args.memberId,
      reminderType: args.reminderType,
      enabled: args.enabled,
      hour: args.hour,
      minute: args.minute,
      daysOfWeek: args.daysOfWeek,
      message: args.message,
      streakDays: 0,
    });
  },
});
