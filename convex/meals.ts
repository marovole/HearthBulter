import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Get meal plan for a date range
 */
export const getPlan = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), args.startDate),
          q.lte(q.field("endDate"), args.endDate),
        ),
      )
      .collect();

    const plan = plans[0];
    if (!plan) return null;

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();

    return {
      ...plan,
      meals,
      nutritionSummary: {
        totalCalories: meals.reduce((acc, m) => acc + m.calories, 0),
        totalProtein: meals.reduce((acc, m) => acc + m.protein, 0),
        totalCarbs: meals.reduce((acc, m) => acc + m.carbs, 0),
        totalFat: meals.reduce((acc, m) => acc + m.fat, 0),
        averageDailyCalories:
          meals.length > 0
            ? meals.reduce((acc, m) => acc + m.calories, 0) / (meals.length / 3)
            : 0,
        goalAchievementRate: 95,
      },
    };
  },
});

/**
 * Generate a new meal plan
 */
export const generatePlan = mutation({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const endDate = args.startDate + args.days * 24 * 60 * 60 * 1000;

    const planId = await ctx.db.insert("mealPlans", {
      memberId: args.memberId,
      startDate: args.startDate,
      endDate: endDate,
      goalType: "WEIGHT_LOSS",
      targetCalories: 2000,
      status: "ACTIVE",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create some dummy meals
    for (let i = 0; i < args.days; i++) {
      const date = args.startDate + i * 24 * 60 * 60 * 1000;

      await ctx.db.insert("meals", {
        planId,
        date,
        mealType: "BREAKFAST",
        calories: 500,
        protein: 20,
        carbs: 60,
        fat: 15,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("meals", {
        planId,
        date,
        mealType: "LUNCH",
        calories: 700,
        protein: 35,
        carbs: 80,
        fat: 25,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("meals", {
        planId,
        date,
        mealType: "DINNER",
        calories: 600,
        protein: 30,
        carbs: 70,
        fat: 20,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return planId;
  },
});
