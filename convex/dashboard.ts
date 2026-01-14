import { query } from "./_generated/server";
import { v } from "convex/values";
import { verifyMemberAccess } from "./lib/auth";

/**
 * Get dashboard overview data for a member
 */
export const getOverview = query({
  args: { memberId: v.id("familyMembers"), userEmail: v.string() },
  handler: async (ctx, args) => {
    const { hasAccess, member } = await verifyMemberAccess(
      ctx,
      args.memberId,
      args.userEmail,
    );

    if (!hasAccess || !member) {
      return null;
    }

    // 1. Fetch latest health data records for trend
    const healthRecords = await ctx.db
      .query("healthData")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(10);

    const latestHealth = healthRecords[0];
    const previousHealth = healthRecords[1];

    const currentWeight = latestHealth?.weight || null;
    const previousWeight = previousHealth?.weight || null;
    const weightChange =
      currentWeight && previousWeight ? currentWeight - previousWeight : 0;
    const weightChangePercent = previousWeight
      ? (weightChange / previousWeight) * 100
      : 0;

    // 2. Fetch inventory status
    const inventoryItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const expiringCount = inventoryItems.filter(
      (i) => i.status === "EXPIRING",
    ).length;
    const freshCount = inventoryItems.filter(
      (i) => i.status === "FRESH",
    ).length;

    // 3. Fetch goals
    const goals = await ctx.db
      .query("healthGoals")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    // 4. Mock health score (until calculator is migrated)
    const healthScore = {
      totalScore: 85,
      breakdown: {
        bmiScore: 20,
        nutritionScore: 25,
        activityScore: 20,
        dataCompletenessScore: 20,
      },
      details: {
        bmi: 22.5,
        bmiCategory: "normal",
        nutritionAdherenceRate: 90,
        activityFrequency: 3,
        dataCompletenessRate: 100,
      },
      recommendations: ["继续保持良好的饮食习惯", "建议增加有氧运动"],
    };

    return {
      member: {
        id: member._id,
        name: member.name,
        role: member.role,
      },
      weightTrend: {
        currentWeight,
        change: weightChange,
        changePercent: weightChangePercent,
        targetWeight: 70.0, // Mock target
      },
      nutritionSummary: {
        targetCalories: 2200,
        actualCalories: 1950,
        adherenceRate: 88,
      },
      inventory: {
        total: inventoryItems.length,
        expiring: expiringCount,
        fresh: freshCount,
      },
      goalProgress: goals.map((g) => ({
        goalId: g._id,
        goalType: g.goalType,
        currentProgress: (g.currentValue / g.targetValue) * 100,
        targetWeight: g.targetValue,
        currentWeight: g.currentValue,
        startWeight: 80.0,
        onTrack: true,
        weeksRemaining: 4,
      })),
      healthScore,
    };
  },
});
