import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vMealType } from "./schema";

/**
 * Get meal logs for a member
 */
export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_memberId_date", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(args.limit ?? 100);

    let filtered = logs;
    if (args.startDate) {
      filtered = filtered.filter((l) => l.date >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((l) => l.date <= args.endDate!);
    }

    // Get foods for each log
    const logsWithFoods = await Promise.all(
      filtered.map(async (log) => {
        const logFoods = await ctx.db
          .query("mealLogFoods")
          .withIndex("by_mealLogId", (q) => q.eq("mealLogId", log._id))
          .collect();

        const foods = await Promise.all(
          logFoods.map(async (lf) => {
            const food = await ctx.db.get(lf.foodId);
            return { ...lf, food };
          })
        );

        return { ...log, foods };
      })
    );

    return logsWithFoods;
  },
});

/**
 * Get meal logs for a specific date
 */
export const getByDate = query({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get start and end of day
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(args.date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_memberId_date", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startOfDay.getTime()),
          q.lte(q.field("date"), endOfDay.getTime()),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    const logsWithFoods = await Promise.all(
      logs.map(async (log) => {
        const logFoods = await ctx.db
          .query("mealLogFoods")
          .withIndex("by_mealLogId", (q) => q.eq("mealLogId", log._id))
          .collect();

        const foods = await Promise.all(
          logFoods.map(async (lf) => {
            const food = await ctx.db.get(lf.foodId);
            return { ...lf, food };
          })
        );

        return { ...log, foods };
      })
    );

    return logsWithFoods;
  },
});

/**
 * Get daily nutrition summary
 */
export const getDailySummary = query({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get start and end of day
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(args.date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_memberId_date", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startOfDay.getTime()),
          q.lte(q.field("date"), endOfDay.getTime()),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .collect();

    const totals = logs.reduce(
      (acc, log) => {
        acc.calories += log.calories;
        acc.protein += log.protein;
        acc.carbs += log.carbs;
        acc.fat += log.fat;
        acc.fiber += log.fiber ?? 0;
        acc.sugar += log.sugar ?? 0;
        acc.sodium += log.sodium ?? 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
    );

    const byMealType = logs.reduce(
      (acc, log) => {
        if (!acc[log.mealType]) {
          acc[log.mealType] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        }
        acc[log.mealType]!.calories += log.calories;
        acc[log.mealType]!.protein += log.protein;
        acc[log.mealType]!.carbs += log.carbs;
        acc[log.mealType]!.fat += log.fat;
        return acc;
      },
      {} as Record<string, { calories: number; protein: number; carbs: number; fat: number }>
    );

    return {
      date: args.date,
      mealCount: logs.length,
      totals: {
        calories: Math.round(totals.calories * 10) / 10,
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        fiber: Math.round(totals.fiber * 10) / 10,
        sugar: Math.round(totals.sugar * 10) / 10,
        sodium: Math.round(totals.sodium * 10) / 10,
      },
      byMealType,
    };
  },
});

/**
 * Create meal log
 */
export const create = mutation({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
    mealType: vMealType,
    foods: v.array(
      v.object({
        foodId: v.id("foods"),
        amount: v.float64(),
      })
    ),
    notes: v.optional(v.string()),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Calculate nutrition from foods
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSugar = 0;
    let totalSodium = 0;

    for (const item of args.foods) {
      const food = await ctx.db.get(item.foodId);
      if (food) {
        const factor = item.amount / 100;
        totalCalories += food.calories * factor;
        totalProtein += food.protein * factor;
        totalCarbs += food.carbs * factor;
        totalFat += food.fat * factor;
        totalFiber += (food.fiber ?? 0) * factor;
        totalSugar += (food.sugar ?? 0) * factor;
        totalSodium += (food.sodium ?? 0) * factor;
      }
    }

    const logId = await ctx.db.insert("mealLogs", {
      memberId: args.memberId,
      date: args.date,
      mealType: args.mealType,
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
      sugar: Math.round(totalSugar * 10) / 10,
      sodium: Math.round(totalSodium * 10) / 10,
      notes: args.notes,
      checkedAt: Date.now(),
      isTemplate: args.isTemplate ?? false,
    });

    // Add foods to log
    for (const item of args.foods) {
      await ctx.db.insert("mealLogFoods", {
        mealLogId: logId,
        foodId: item.foodId,
        amount: item.amount,
      });
    }

    // Update daily nutrition target if exists
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);

    const dailyTarget = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_memberId_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", startOfDay.getTime())
      )
      .first();

    if (dailyTarget) {
      await ctx.db.patch(dailyTarget._id, {
        actualCalories: dailyTarget.actualCalories + totalCalories,
        actualProtein: dailyTarget.actualProtein + totalProtein,
        actualCarbs: dailyTarget.actualCarbs + totalCarbs,
        actualFat: dailyTarget.actualFat + totalFat,
        caloriesDeviation:
          ((dailyTarget.actualCalories + totalCalories - dailyTarget.targetCalories) /
            dailyTarget.targetCalories) *
          100,
      });
    }

    // Update tracking streak
    const streak = await ctx.db
      .query("trackingStreaks")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();

    if (streak) {
      const lastCheckIn = streak.lastCheckIn;
      const today = new Date(args.date);
      today.setHours(0, 0, 0, 0);

      if (lastCheckIn) {
        const lastDate = new Date(lastCheckIn);
        lastDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor(
          (today.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysDiff === 1) {
          // Consecutive day
          await ctx.db.patch(streak._id, {
            currentStreak: streak.currentStreak + 1,
            longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1),
            totalDays: streak.totalDays + 1,
            lastCheckIn: today.getTime(),
          });
        } else if (daysDiff > 1) {
          // Streak broken
          await ctx.db.patch(streak._id, {
            currentStreak: 1,
            totalDays: streak.totalDays + 1,
            lastCheckIn: today.getTime(),
          });
        }
      } else {
        await ctx.db.patch(streak._id, {
          currentStreak: 1,
          totalDays: 1,
          lastCheckIn: today.getTime(),
        });
      }
    } else {
      const today = new Date(args.date);
      today.setHours(0, 0, 0, 0);
      await ctx.db.insert("trackingStreaks", {
        memberId: args.memberId,
        currentStreak: 1,
        longestStreak: 1,
        totalDays: 1,
        lastCheckIn: today.getTime(),
        badges: [],
      });
    }

    return logId;
  },
});

/**
 * Add food to existing meal log
 */
export const addFood = mutation({
  args: {
    logId: v.id("mealLogs"),
    foodId: v.id("foods"),
    amount: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    const food = await ctx.db.get(args.foodId);
    if (!food) throw new Error("Food not found");

    await ctx.db.insert("mealLogFoods", {
      mealLogId: args.logId,
      foodId: args.foodId,
      amount: args.amount,
    });

    // Update log nutrition
    const factor = args.amount / 100;
    await ctx.db.patch(args.logId, {
      calories: Math.round((log.calories + food.calories * factor) * 10) / 10,
      protein: Math.round((log.protein + food.protein * factor) * 10) / 10,
      carbs: Math.round((log.carbs + food.carbs * factor) * 10) / 10,
      fat: Math.round((log.fat + food.fat * factor) * 10) / 10,
      fiber: Math.round(((log.fiber ?? 0) + (food.fiber ?? 0) * factor) * 10) / 10,
      sugar: Math.round(((log.sugar ?? 0) + (food.sugar ?? 0) * factor) * 10) / 10,
      sodium: Math.round(((log.sodium ?? 0) + (food.sodium ?? 0) * factor) * 10) / 10,
    });

    return args.logId;
  },
});

/**
 * Remove food from meal log
 */
export const removeFood = mutation({
  args: { id: v.id("mealLogFoods") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const logFood = await ctx.db.get(args.id);
    if (!logFood) throw new Error("Not found");

    const log = await ctx.db.get(logFood.mealLogId);
    const food = await ctx.db.get(logFood.foodId);

    if (log && food) {
      const factor = logFood.amount / 100;
      await ctx.db.patch(log._id, {
        calories: Math.round((log.calories - food.calories * factor) * 10) / 10,
        protein: Math.round((log.protein - food.protein * factor) * 10) / 10,
        carbs: Math.round((log.carbs - food.carbs * factor) * 10) / 10,
        fat: Math.round((log.fat - food.fat * factor) * 10) / 10,
        fiber: Math.round(((log.fiber ?? 0) - (food.fiber ?? 0) * factor) * 10) / 10,
        sugar: Math.round(((log.sugar ?? 0) - (food.sugar ?? 0) * factor) * 10) / 10,
        sodium: Math.round(((log.sodium ?? 0) - (food.sodium ?? 0) * factor) * 10) / 10,
      });
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Delete meal log (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("mealLogs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});

/**
 * Get tracking streak
 */
export const getStreak = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("trackingStreaks")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .first();
  },
});
