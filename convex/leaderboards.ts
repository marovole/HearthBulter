import { query, mutation, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { differenceInDays, startOfDay } from "date-fns";

const loadActiveMembers = async (ctx: QueryCtx) => {
  return await ctx.db
    .query("familyMembers")
    .filter((q) => q.eq(q.field("deletedAt"), undefined))
    .collect();
};

export const getHealthScoreCandidates = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const members = await loadActiveMembers(ctx);
    const results: Array<{
      memberId: string;
      memberName: string;
      avatar?: string;
      avgWeight: number;
      avgHeartRate: number;
      avgBloodPressureSystolic: number;
      avgBloodPressureDiastolic: number;
      dataCount: number;
    }> = [];

    for (const member of members) {
      const healthData = await ctx.db
        .query("healthData")
        .withIndex("by_member_date", (q) =>
          q
            .eq("memberId", member._id)
            .gte("measuredAt", args.startDate)
            .lte("measuredAt", args.endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      if (healthData.length === 0) {
        continue;
      }

      const sums = healthData.reduce(
        (acc, item) => {
          acc.weight += item.weight ?? 0;
          acc.heartRate += item.heartRate ?? 0;
          acc.systolic += item.bloodPressureSystolic ?? 0;
          acc.diastolic += item.bloodPressureDiastolic ?? 0;
          acc.count += 1;
          return acc;
        },
        { weight: 0, heartRate: 0, systolic: 0, diastolic: 0, count: 0 },
      );

      results.push({
        memberId: member._id,
        memberName: member.name,
        avatar: member.avatar ?? undefined,
        avgWeight: sums.count > 0 ? sums.weight / sums.count : 0,
        avgHeartRate: sums.count > 0 ? sums.heartRate / sums.count : 0,
        avgBloodPressureSystolic:
          sums.count > 0 ? sums.systolic / sums.count : 0,
        avgBloodPressureDiastolic:
          sums.count > 0 ? sums.diastolic / sums.count : 0,
        dataCount: sums.count,
      });
    }

    return results;
  },
});

export const getCheckinStreakCandidates = query({
  args: { startDate: v.number() },
  handler: async (ctx, args) => {
    const members = await loadActiveMembers(ctx);
    const results: Array<{
      memberId: string;
      memberName: string;
      avatar?: string;
      streakDays: number;
      dataCount: number;
    }> = [];

    for (const member of members) {
      const healthData = await ctx.db
        .query("healthData")
        .withIndex("by_member_date", (q) =>
          q.eq("memberId", member._id).gte("measuredAt", args.startDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .order("desc")
        .collect();

      if (healthData.length === 0) {
        continue;
      }

      const streakDays = calculateStreakDays(healthData);
      results.push({
        memberId: member._id,
        memberName: member.name,
        avatar: member.avatar ?? undefined,
        streakDays,
        dataCount: healthData.length,
      });
    }

    return results;
  },
});

export const getWeightLossCandidates = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const members = await loadActiveMembers(ctx);
    const results: Array<{
      memberId: string;
      memberName: string;
      avatar?: string;
      weightLoss: number;
      initialWeight: number | null;
      currentWeight: number | null;
      dataPoints: number;
    }> = [];

    for (const member of members) {
      const healthData = await ctx.db
        .query("healthData")
        .withIndex("by_member_date", (q) =>
          q
            .eq("memberId", member._id)
            .gte("measuredAt", args.startDate)
            .lte("measuredAt", args.endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .order("asc")
        .collect();

      const weights = healthData
        .map((entry) => entry.weight)
        .filter(
          (weight): weight is number =>
            typeof weight === "number" && weight > 0,
        );

      const initialWeight = weights.at(0) ?? null;
      const currentWeight = weights.at(-1) ?? null;
      const weightLoss =
        initialWeight !== null && currentWeight !== null
          ? Math.round((initialWeight - currentWeight) * 10) / 10
          : 0;

      results.push({
        memberId: member._id,
        memberName: member.name,
        avatar: member.avatar ?? undefined,
        weightLoss,
        initialWeight,
        currentWeight,
        dataPoints: weights.length,
      });
    }

    return results;
  },
});

export const getExerciseMinutesCandidates = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const members = await loadActiveMembers(ctx);
    const results: Array<{
      memberId: string;
      memberName: string;
      avatar?: string;
      exerciseMinutes: number;
      exerciseCount: number;
    }> = [];

    for (const member of members) {
      const healthData = await ctx.db
        .query("healthData")
        .withIndex("by_member_date", (q) =>
          q
            .eq("memberId", member._id)
            .gte("measuredAt", args.startDate)
            .lte("measuredAt", args.endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      const exerciseCount = healthData.filter((entry) =>
        Boolean(entry.notes && entry.notes.includes("运动")),
      ).length;

      results.push({
        memberId: member._id,
        memberName: member.name,
        avatar: member.avatar ?? undefined,
        exerciseMinutes: exerciseCount * 30,
        exerciseCount,
      });
    }

    return results;
  },
});

export const getNutritionScoreCandidates = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const members = await loadActiveMembers(ctx);
    const results: Array<{
      memberId: string;
      memberName: string;
      avatar?: string;
      accuracy: number;
      calorieGoal: number;
      dataDays: number;
      accurateDays: number;
    }> = [];

    for (const member of members) {
      const goals = await ctx.db
        .query("healthGoals")
        .withIndex("by_member", (q) => q.eq("memberId", member._id))
        .filter((q) => q.eq(q.field("status"), "ACTIVE"))
        .collect();

      const calorieGoal = goals.find((goal) => goal.goalType === "CALORIES");
      const targetCalories = calorieGoal?.targetValue ?? 2000;

      const healthData = await ctx.db
        .query("healthData")
        .withIndex("by_member_date", (q) =>
          q
            .eq("memberId", member._id)
            .gte("measuredAt", args.startDate)
            .lte("measuredAt", args.endDate),
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      const manualData = healthData.filter(
        (entry) => entry.source === "MANUAL" && entry.notes?.includes("卡路里"),
      );

      if (manualData.length === 0) {
        results.push({
          memberId: member._id,
          memberName: member.name,
          avatar: member.avatar ?? undefined,
          accuracy: 0,
          calorieGoal: targetCalories,
          dataDays: 0,
          accurateDays: 0,
        });
        continue;
      }

      const accurateDays = manualData.filter((entry) => {
        const calories = entry.notes ? extractCalories(entry.notes) : null;
        return (
          calories !== null &&
          Math.abs(calories - targetCalories) <= targetCalories * 0.2
        );
      }).length;

      const accuracy = (accurateDays / manualData.length) * 100;

      results.push({
        memberId: member._id,
        memberName: member.name,
        avatar: member.avatar ?? undefined,
        accuracy: Math.round(accuracy * 10) / 10,
        calorieGoal: targetCalories,
        dataDays: manualData.length,
        accurateDays,
      });
    }

    return results;
  },
});

export const getLatestEntry = query({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    sinceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_member_type_created", (q) =>
        q.eq("memberId", args.memberId).eq("leaderboardType", args.type),
      )
      .order("desc")
      .collect();

    return entries.find((entry) => entry.createdAt >= args.sinceDate) ?? null;
  },
});

export const listRankingHistory = query({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    sinceDate: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_member_type_created", (q) =>
        q.eq("memberId", args.memberId).eq("leaderboardType", args.type),
      )
      .order("desc")
      .collect();

    return entries
      .filter((entry) => entry.createdAt >= args.sinceDate)
      .slice(0, args.limit);
  },
});

export const createEntry = mutation({
  args: {
    memberId: v.id("familyMembers"),
    leaderboardType: v.string(),
    period: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    score: v.number(),
    rank: v.number(),
    previousRank: v.optional(v.number()),
    rankChange: v.optional(v.number()),
    totalParticipants: v.number(),
    percentile: v.optional(v.number()),
    isAnonymous: v.boolean(),
    showRank: v.boolean(),
    metadata: v.optional(v.any()),
    calculatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("leaderboardEntries", {
      memberId: args.memberId,
      leaderboardType: args.leaderboardType,
      period: args.period,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      score: args.score,
      rank: args.rank,
      previousRank: args.previousRank,
      rankChange: args.rankChange,
      totalParticipants: args.totalParticipants,
      percentile: args.percentile,
      isAnonymous: args.isAnonymous,
      showRank: args.showRank,
      metadata: args.metadata,
      calculatedAt: args.calculatedAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getEntryById = query({
  args: { id: v.id("leaderboardEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

const calculateStreakDays = (healthData: Array<{ measuredAt: number }>) => {
  if (healthData.length === 0) return 0;
  const sorted = [...healthData].sort((a, b) => b.measuredAt - a.measuredAt);
  let streak = 0;
  const today = startOfDay(new Date());

  for (const entry of sorted) {
    const dataDate = startOfDay(new Date(entry.measuredAt));
    const daysDiff = differenceInDays(today, dataDate);
    if (daysDiff === streak) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const extractCalories = (notes: string) => {
  const match = notes.match(/(\d+)\s*[卡卡路里]/);
  const value = match?.[1];
  return value ? parseInt(value, 10) : null;
};
