import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  vBudgetPeriod,
  vBudgetStatus,
  vFoodCategory,
  vAlertType,
  vAlertStatus,
  vSavingsType,
  vRecommendationStatus,
} from "./schema";

/**
 * Get budgets for a member
 */
export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(vBudgetStatus),
    period: v.optional(vBudgetPeriod),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.period) {
      const budgets = await ctx.db
        .query("budgets")
        .withIndex("by_memberId_period", (q) =>
          q.eq("memberId", args.memberId).eq("period", args.period!)
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(args.limit ?? 50);

      if (args.status) {
        return budgets.filter((b) => b.status === args.status);
      }
      return budgets;
    }

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(args.limit ?? 50);

    if (args.status) {
      return budgets.filter((b) => b.status === args.status);
    }
    return budgets;
  },
});

/**
 * Get active budget
 */
export const getActive = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "ACTIVE"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .first();

    return budgets;
  },
});

/**
 * Get budget by ID with spendings
 */
export const getById = query({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const budget = await ctx.db.get(args.id);
    if (!budget || budget.deletedAt) return null;

    // Get spendings
    const spendings = await ctx.db
      .query("spendings")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get alerts
    const alerts = await ctx.db
      .query("budgetAlerts")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.id))
      .collect();

    // Calculate spending by category
    const spendingByCategory = spendings.reduce(
      (acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + s.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      ...budget,
      spendings,
      alerts,
      spendingByCategory,
    };
  },
});

/**
 * Create budget
 */
export const create = mutation({
  args: {
    memberId: v.id("familyMembers"),
    name: v.string(),
    period: vBudgetPeriod,
    startDate: v.number(),
    endDate: v.number(),
    totalAmount: v.float64(),
    vegetableBudget: v.optional(v.float64()),
    meatBudget: v.optional(v.float64()),
    fruitBudget: v.optional(v.float64()),
    grainBudget: v.optional(v.float64()),
    dairyBudget: v.optional(v.float64()),
    seafoodBudget: v.optional(v.float64()),
    oilsBudget: v.optional(v.float64()),
    snacksBudget: v.optional(v.float64()),
    beveragesBudget: v.optional(v.float64()),
    otherBudget: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Deactivate existing active budgets
    const existingBudgets = await ctx.db
      .query("budgets")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();

    for (const budget of existingBudgets) {
      await ctx.db.patch(budget._id, { status: "COMPLETED" });
    }

    return await ctx.db.insert("budgets", {
      memberId: args.memberId,
      name: args.name,
      period: args.period,
      startDate: args.startDate,
      endDate: args.endDate,
      totalAmount: args.totalAmount,
      vegetableBudget: args.vegetableBudget,
      meatBudget: args.meatBudget,
      fruitBudget: args.fruitBudget,
      grainBudget: args.grainBudget,
      dairyBudget: args.dairyBudget,
      seafoodBudget: args.seafoodBudget,
      oilsBudget: args.oilsBudget,
      snacksBudget: args.snacksBudget,
      beveragesBudget: args.beveragesBudget,
      otherBudget: args.otherBudget,
      status: "ACTIVE",
      usedAmount: 0,
      remainingAmount: args.totalAmount,
      usagePercentage: 0,
      alertThreshold80: false,
      alertThreshold100: false,
      alertThreshold110: false,
    });
  },
});

/**
 * Update budget
 */
export const update = mutation({
  args: {
    id: v.id("budgets"),
    name: v.optional(v.string()),
    totalAmount: v.optional(v.float64()),
    status: v.optional(vBudgetStatus),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const budget = await ctx.db.get(args.id);
    if (!budget) throw new Error("Budget not found");

    const { id, totalAmount, ...updates } = args;
    const updateData: Record<string, unknown> = { ...updates };

    if (totalAmount !== undefined) {
      updateData.totalAmount = totalAmount;
      updateData.remainingAmount = totalAmount - budget.usedAmount;
      updateData.usagePercentage = (budget.usedAmount / totalAmount) * 100;
    }

    await ctx.db.patch(id, updateData);
    return id;
  },
});

/**
 * Add spending
 */
export const addSpending = mutation({
  args: {
    budgetId: v.id("budgets"),
    amount: v.float64(),
    category: vFoodCategory,
    description: v.string(),
    transactionId: v.optional(v.string()),
    platform: v.optional(v.string()),
    items: v.optional(v.any()),
    purchaseDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const budget = await ctx.db.get(args.budgetId);
    if (!budget) throw new Error("Budget not found");

    const spendingId = await ctx.db.insert("spendings", {
      budgetId: args.budgetId,
      amount: args.amount,
      category: args.category,
      description: args.description,
      transactionId: args.transactionId,
      platform: args.platform,
      items: args.items,
      purchaseDate: args.purchaseDate ?? Date.now(),
    });

    // Update budget totals
    const newUsedAmount = budget.usedAmount + args.amount;
    const newRemainingAmount = budget.totalAmount - newUsedAmount;
    const newUsagePercentage = (newUsedAmount / budget.totalAmount) * 100;

    await ctx.db.patch(args.budgetId, {
      usedAmount: newUsedAmount,
      remainingAmount: newRemainingAmount,
      usagePercentage: newUsagePercentage,
    });

    // Check for alerts
    if (newUsagePercentage >= 80 && !budget.alertThreshold80) {
      await ctx.db.insert("budgetAlerts", {
        budgetId: args.budgetId,
        type: "WARNING_80",
        threshold: 80,
        currentValue: newUsagePercentage,
        message: `预算已使用 ${Math.round(newUsagePercentage)}%`,
        status: "ACTIVE",
        notified: false,
      });
      await ctx.db.patch(args.budgetId, { alertThreshold80: true });
    }

    if (newUsagePercentage >= 100 && !budget.alertThreshold100) {
      await ctx.db.insert("budgetAlerts", {
        budgetId: args.budgetId,
        type: "WARNING_100",
        threshold: 100,
        currentValue: newUsagePercentage,
        message: `预算已用完！当前使用 ${Math.round(newUsagePercentage)}%`,
        status: "ACTIVE",
        notified: false,
      });
      await ctx.db.patch(args.budgetId, { alertThreshold100: true });
    }

    if (newUsagePercentage >= 110 && !budget.alertThreshold110) {
      await ctx.db.insert("budgetAlerts", {
        budgetId: args.budgetId,
        type: "OVER_BUDGET_110",
        threshold: 110,
        currentValue: newUsagePercentage,
        message: `预算已超支 ${Math.round(newUsagePercentage - 100)}%！`,
        status: "ACTIVE",
        notified: false,
      });
      await ctx.db.patch(args.budgetId, { alertThreshold110: true });
    }

    return spendingId;
  },
});

/**
 * Get spending history
 */
export const getSpendingHistory = query({
  args: {
    budgetId: v.id("budgets"),
    category: v.optional(vFoodCategory),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.category) {
      return await ctx.db
        .query("spendings")
        .withIndex("by_budgetId_category", (q) =>
          q.eq("budgetId", args.budgetId).eq("category", args.category!)
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(args.limit ?? 100);
    }

    return await ctx.db
      .query("spendings")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(args.limit ?? 100);
  },
});

/**
 * Get alerts
 */
export const getAlerts = query({
  args: {
    budgetId: v.id("budgets"),
    status: v.optional(vAlertStatus),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const alerts = await ctx.db
      .query("budgetAlerts")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect();

    if (args.status) {
      return alerts.filter((a) => a.status === args.status);
    }

    return alerts;
  },
});

/**
 * Acknowledge alert
 */
export const acknowledgeAlert = mutation({
  args: { id: v.id("budgetAlerts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      status: "ACKNOWLEDGED",
      acknowledgedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Get savings recommendations
 */
export const getSavingsRecommendations = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(vRecommendationStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const recommendations = await ctx.db
      .query("savingsRecommendations")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(args.limit ?? 20);

    if (args.status) {
      return recommendations.filter((r) => r.status === args.status);
    }

    return recommendations;
  },
});

/**
 * Create savings recommendation
 */
export const createRecommendation = mutation({
  args: {
    memberId: v.id("familyMembers"),
    type: vSavingsType,
    title: v.string(),
    description: v.string(),
    savings: v.float64(),
    originalPrice: v.optional(v.float64()),
    discountedPrice: v.optional(v.float64()),
    platform: v.optional(v.string()),
    foodItems: v.optional(v.any()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("savingsRecommendations", {
      memberId: args.memberId,
      type: args.type,
      title: args.title,
      description: args.description,
      savings: args.savings,
      originalPrice: args.originalPrice,
      discountedPrice: args.discountedPrice,
      platform: args.platform,
      foodItems: args.foodItems,
      validUntil: args.validUntil,
      status: "PENDING",
      viewed: false,
      acted: false,
    });
  },
});

/**
 * Update recommendation status
 */
export const updateRecommendationStatus = mutation({
  args: {
    id: v.id("savingsRecommendations"),
    status: vRecommendationStatus,
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      status: args.status,
      viewed: true,
      acted: args.status === "ACCEPTED",
      feedback: args.feedback,
    });

    return args.id;
  },
});

/**
 * Delete budget (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("budgets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});

/**
 * Delete spending (soft delete)
 */
export const removeSpending = mutation({
  args: { id: v.id("spendings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const spending = await ctx.db.get(args.id);
    if (!spending) throw new Error("Spending not found");

    // Update budget totals
    const budget = await ctx.db.get(spending.budgetId);
    if (budget) {
      const newUsedAmount = budget.usedAmount - spending.amount;
      await ctx.db.patch(budget._id, {
        usedAmount: newUsedAmount,
        remainingAmount: budget.totalAmount - newUsedAmount,
        usagePercentage: (newUsedAmount / budget.totalAmount) * 100,
      });
    }

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});
