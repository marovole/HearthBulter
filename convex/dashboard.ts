import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get dashboard overview for a member
 */
export const overview = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const member = await ctx.db.get(args.memberId);
    if (!member || member.deletedAt) return null;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get active health goal
    const activeGoal = await ctx.db
      .query("healthGoals")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .first();

    // Get latest health data
    const latestHealth = await ctx.db
      .query("healthData")
      .withIndex("by_memberId_measuredAt", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .first();

    // Get today's meal logs
    const todayMeals = await ctx.db
      .query("mealLogs")
      .withIndex("by_memberId_date", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), today.getTime()),
          q.lt(q.field("date"), tomorrow.getTime()),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Calculate today's nutrition
    const todayNutrition = todayMeals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories;
        acc.protein += meal.protein;
        acc.carbs += meal.carbs;
        acc.fat += meal.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Get tracking streak
    const streak = await ctx.db
      .query("trackingStreaks")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();

    // Get active budget
    const activeBudget = await ctx.db
      .query("budgets")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "ACTIVE"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .first();

    // Get unread notifications count
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("readAt"), undefined),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Get expiring inventory items
    const now = Date.now();
    const threeDaysLater = now + 3 * 24 * 60 * 60 * 1000;
    const expiringItems = await ctx.db
      .query("inventoryItems")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.neq(q.field("expiryDate"), undefined)
        )
      )
      .collect();

    const soonExpiring = expiringItems.filter(
      (item) => item.expiryDate && item.expiryDate <= threeDaysLater && item.expiryDate > now
    );

    // Get active meal plan
    const activePlan = await ctx.db
      .query("mealPlans")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .first();

    return {
      member: {
        name: member.name,
        weight: member.weight,
        bmi: member.bmi,
        ageGroup: member.ageGroup,
      },
      healthGoal: activeGoal
        ? {
            goalType: activeGoal.goalType,
            targetWeight: activeGoal.targetWeight,
            currentWeight: activeGoal.currentWeight,
            progress: activeGoal.progress,
            startDate: activeGoal.startDate,
            targetDate: activeGoal.targetDate,
          }
        : null,
      latestHealth: latestHealth
        ? {
            weight: latestHealth.weight,
            bodyFat: latestHealth.bodyFat,
            heartRate: latestHealth.heartRate,
            bloodPressure:
              latestHealth.bloodPressureSystolic && latestHealth.bloodPressureDiastolic
                ? `${latestHealth.bloodPressureSystolic}/${latestHealth.bloodPressureDiastolic}`
                : null,
            measuredAt: latestHealth.measuredAt,
          }
        : null,
      todayNutrition: {
        calories: Math.round(todayNutrition.calories),
        protein: Math.round(todayNutrition.protein),
        carbs: Math.round(todayNutrition.carbs),
        fat: Math.round(todayNutrition.fat),
        mealCount: todayMeals.length,
        target: activePlan
          ? {
              calories: activePlan.targetCalories,
              protein: activePlan.targetProtein,
              carbs: activePlan.targetCarbs,
              fat: activePlan.targetFat,
            }
          : null,
      },
      streak: streak
        ? {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            totalDays: streak.totalDays,
            badges: streak.badges,
          }
        : null,
      budget: activeBudget
        ? {
            name: activeBudget.name,
            totalAmount: activeBudget.totalAmount,
            usedAmount: activeBudget.usedAmount,
            remainingAmount: activeBudget.remainingAmount,
            usagePercentage: activeBudget.usagePercentage,
          }
        : null,
      alerts: {
        unreadNotifications: unreadNotifications.length,
        expiringItems: soonExpiring.length,
        lowStockItems: expiringItems.filter((i) => i.isLowStock).length,
      },
    };
  },
});

/**
 * Get weekly summary
 */
export const weeklySummary = query({
  args: {
    memberId: v.id("familyMembers"),
    weekStartDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Calculate week start/end
    const weekStart = args.weekStartDate
      ? new Date(args.weekStartDate)
      : new Date();
    if (!args.weekStartDate) {
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    }
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get meal logs for the week
    const mealLogs = await ctx.db
      .query("mealLogs")
      .withIndex("by_memberId_date", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), weekStart.getTime()),
          q.lt(q.field("date"), weekEnd.getTime()),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    // Calculate daily averages
    const dailyTotals: Record<
      string,
      { calories: number; protein: number; carbs: number; fat: number; count: number }
    > = {};

    for (const log of mealLogs) {
      const dateKey = new Date(log.date).toISOString().split("T")[0];
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      }
      dailyTotals[dateKey].calories += log.calories;
      dailyTotals[dateKey].protein += log.protein;
      dailyTotals[dateKey].carbs += log.carbs;
      dailyTotals[dateKey].fat += log.fat;
      dailyTotals[dateKey].count += 1;
    }

    const daysWithData = Object.keys(dailyTotals).length;
    const totals = Object.values(dailyTotals).reduce(
      (acc, day) => {
        acc.calories += day.calories;
        acc.protein += day.protein;
        acc.carbs += day.carbs;
        acc.fat += day.fat;
        acc.meals += day.count;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    );

    // Get health data for the week
    const healthData = await ctx.db
      .query("healthData")
      .withIndex("by_memberId_measuredAt", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.gte(q.field("measuredAt"), weekStart.getTime()),
          q.lt(q.field("measuredAt"), weekEnd.getTime())
        )
      )
      .collect();

    const weights = healthData.filter((h) => h.weight).map((h) => h.weight!);
    const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null;
    const weightChange =
      weights.length >= 2 ? weights[weights.length - 1] - weights[0] : null;

    return {
      weekStart: weekStart.getTime(),
      weekEnd: weekEnd.getTime(),
      daysWithData,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein),
        carbs: Math.round(totals.carbs),
        fat: Math.round(totals.fat),
        meals: totals.meals,
      },
      dailyAverages: {
        calories: daysWithData > 0 ? Math.round(totals.calories / daysWithData) : 0,
        protein: daysWithData > 0 ? Math.round(totals.protein / daysWithData) : 0,
        carbs: daysWithData > 0 ? Math.round(totals.carbs / daysWithData) : 0,
        fat: daysWithData > 0 ? Math.round(totals.fat / daysWithData) : 0,
        meals: daysWithData > 0 ? Math.round((totals.meals / daysWithData) * 10) / 10 : 0,
      },
      dailyBreakdown: dailyTotals,
      health: {
        measurementCount: healthData.length,
        avgWeight: avgWeight ? Math.round(avgWeight * 10) / 10 : null,
        weightChange: weightChange ? Math.round(weightChange * 10) / 10 : null,
      },
    };
  },
});

/**
 * Get family dashboard
 */
export const familyOverview = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const family = await ctx.db.get(args.familyId);
    if (!family || family.deletedAt) return null;

    // Get all members
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get member stats
    const memberStats = await Promise.all(
      members.map(async (member) => {
        const streak = await ctx.db
          .query("trackingStreaks")
          .withIndex("by_memberId", (q) => q.eq("memberId", member._id))
          .first();

        const latestHealth = await ctx.db
          .query("healthData")
          .withIndex("by_memberId_measuredAt", (q) => q.eq("memberId", member._id))
          .order("desc")
          .first();

        return {
          id: member._id,
          name: member.name,
          role: member.role,
          streak: streak?.currentStreak ?? 0,
          lastCheckIn: streak?.lastCheckIn,
          latestWeight: latestHealth?.weight,
        };
      })
    );

    // Get pending tasks
    const pendingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_familyId", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("status"), "TODO"))
      .collect();

    // Get recent activities
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_familyId", (q) => q.eq("familyId", args.familyId))
      .order("desc")
      .take(10);

    // Get family goals
    const familyGoals = await ctx.db
      .query("familyGoals")
      .withIndex("by_familyId", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    return {
      family: {
        name: family.name,
        memberCount: members.length,
        inviteCode: family.inviteCode,
      },
      members: memberStats,
      pendingTasks: pendingTasks.length,
      recentActivities: activities.map((a) => ({
        id: a._id,
        type: a.activityType,
        title: a.title,
        description: a.description,
        createdAt: a._creationTime,
      })),
      familyGoals: familyGoals.map((g) => ({
        id: g._id,
        title: g.title,
        category: g.category,
        progress: g.progress,
        targetDate: g.targetDate,
      })),
    };
  },
});
