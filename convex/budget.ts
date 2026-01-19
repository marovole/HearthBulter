import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getBudgets = query({
  args: {
    memberId: v.id("familyMembers"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let budgets = await ctx.db
      .query("budgets")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    if (!args.includeDeleted) {
      budgets = budgets.filter((b) => !b.deletedAt);
    }

    return budgets;
  },
});

export const getActiveBudgets = query({
  args: {
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_member_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE"),
      )
      .collect();

    return budgets.filter((b) => !b.deletedAt && b.endDate >= Date.now());
  },
});

export const getBudgetById = query({
  args: {
    budgetId: v.id("budgets"),
  },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.deletedAt) {
      return null;
    }
    return budget;
  },
});

export const createBudget = mutation({
  args: {
    memberId: v.id("familyMembers"),
    name: v.string(),
    totalAmount: v.number(),
    period: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    alertThreshold80: v.optional(v.boolean()),
    alertThreshold100: v.optional(v.boolean()),
    alertThreshold110: v.optional(v.boolean()),
    vegetableBudget: v.optional(v.number()),
    meatBudget: v.optional(v.number()),
    fruitBudget: v.optional(v.number()),
    grainBudget: v.optional(v.number()),
    seafoodBudget: v.optional(v.number()),
    dairyBudget: v.optional(v.number()),
    oilsBudget: v.optional(v.number()),
    snacksBudget: v.optional(v.number()),
    beveragesBudget: v.optional(v.number()),
    otherBudget: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("budgets", {
      memberId: args.memberId,
      name: args.name,
      totalAmount: args.totalAmount,
      usedAmount: 0,
      period: args.period,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "ACTIVE",
      alertThreshold80: args.alertThreshold80 ?? true,
      alertThreshold100: args.alertThreshold100 ?? true,
      alertThreshold110: args.alertThreshold110 ?? true,
      vegetableBudget: args.vegetableBudget,
      meatBudget: args.meatBudget,
      fruitBudget: args.fruitBudget,
      grainBudget: args.grainBudget,
      seafoodBudget: args.seafoodBudget,
      dairyBudget: args.dairyBudget,
      oilsBudget: args.oilsBudget,
      snacksBudget: args.snacksBudget,
      beveragesBudget: args.beveragesBudget,
      otherBudget: args.otherBudget,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBudget = mutation({
  args: {
    budgetId: v.id("budgets"),
    name: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.deletedAt) {
      throw new Error("Budget not found");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.totalAmount !== undefined) patch.totalAmount = args.totalAmount;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.budgetId, patch);
    return args.budgetId;
  },
});

export const deleteBudget = mutation({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.deletedAt) {
      return;
    }

    await ctx.db.patch(args.budgetId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getSpendings = query({
  args: {
    budgetId: v.id("budgets"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let spendings = await ctx.db
      .query("spendings")
      .withIndex("by_budget", (q) => q.eq("budgetId", args.budgetId))
      .collect();

    spendings = spendings.filter((s) => !s.deletedAt);

    if (args.startDate && args.endDate) {
      spendings = spendings.filter(
        (s) =>
          s.purchaseDate >= args.startDate! && s.purchaseDate <= args.endDate!,
      );
    }

    return spendings.sort((a, b) => b.purchaseDate - a.purchaseDate);
  },
});

export const getSpendingById = query({
  args: { spendingId: v.id("spendings") },
  handler: async (ctx, args) => {
    const spending = await ctx.db.get(args.spendingId);
    if (!spending || spending.deletedAt) {
      return null;
    }
    return spending;
  },
});

export const getSpendingsByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const activeBudgets = budgets.filter(
      (b) => !b.deletedAt && b.endDate >= args.startDate,
    );

    const budgetIds = activeBudgets.map((b) => b._id);

    const allSpendings: Array<{
      _id: string;
      budgetId: string;
      amount: number;
      description?: string;
      category: string;
      purchaseDate: number;
      items?: unknown;
      deletedAt?: number;
      createdAt: number;
      updatedAt: number;
    }> = [];
    for (const budgetId of budgetIds) {
      const spendings = await ctx.db
        .query("spendings")
        .withIndex("by_budget", (q) => q.eq("budgetId", budgetId))
        .collect();
      allSpendings.push(...spendings);
    }

    return allSpendings
      .filter(
        (s) =>
          !s.deletedAt &&
          s.purchaseDate >= args.startDate &&
          s.purchaseDate <= args.endDate,
      )
      .sort((a, b) => b.purchaseDate - a.purchaseDate);
  },
});

export const createSpending = mutation({
  args: {
    budgetId: v.id("budgets"),
    amount: v.number(),
    description: v.optional(v.string()),
    category: v.string(),
    transactionId: v.optional(v.string()),
    platform: v.optional(v.string()),
    purchaseDate: v.number(),
    items: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.deletedAt) {
      throw new Error("BUDGET_NOT_FOUND");
    }

    if (budget.status && budget.status !== "ACTIVE") {
      throw new Error("BUDGET_INACTIVE");
    }

    if (
      args.purchaseDate < budget.startDate ||
      args.purchaseDate > budget.endDate
    ) {
      throw new Error("DATE_OUT_OF_RANGE");
    }

    const existingSpendings = await ctx.db
      .query("spendings")
      .withIndex("by_budget", (q) => q.eq("budgetId", args.budgetId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const usedAmount = existingSpendings.reduce(
      (sum, spending) => sum + spending.amount,
      0,
    );

    const categorySpent = existingSpendings
      .filter((spending) => spending.category === args.category)
      .reduce((sum, spending) => sum + spending.amount, 0);

    const categoryBudgets: Record<string, number | undefined> = {
      VEGETABLES: budget.vegetableBudget,
      FRUITS: budget.fruitBudget,
      GRAINS: budget.grainBudget,
      PROTEIN: budget.meatBudget,
      SEAFOOD: budget.seafoodBudget,
      DAIRY: budget.dairyBudget,
      OILS: budget.oilsBudget,
      SNACKS: budget.snacksBudget,
      BEVERAGES: budget.beveragesBudget,
      OTHER: budget.otherBudget,
    };

    const categoryBudget = categoryBudgets[args.category];
    if (
      categoryBudget !== undefined &&
      categoryBudget > 0 &&
      categorySpent + args.amount > categoryBudget
    ) {
      throw new Error("CATEGORY_LIMIT_EXCEEDED");
    }

    const newUsedAmount = usedAmount + args.amount;
    if (newUsedAmount > budget.totalAmount) {
      throw new Error("BUDGET_EXCEEDED");
    }

    const now = Date.now();
    const spendingId = await ctx.db.insert("spendings", {
      budgetId: args.budgetId,
      amount: args.amount,
      description: args.description,
      category: args.category,
      transactionId: args.transactionId,
      platform: args.platform,
      purchaseDate: args.purchaseDate,
      items: args.items,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.budgetId, {
      usedAmount: newUsedAmount,
      updatedAt: now,
    });

    const usagePercentage =
      budget.totalAmount > 0 ? (newUsedAmount / budget.totalAmount) * 100 : 0;

    const existingAlerts = await ctx.db
      .query("budgetAlerts")
      .withIndex("by_budget_status", (q) =>
        q.eq("budgetId", args.budgetId).eq("status", "ACTIVE"),
      )
      .collect();

    const hasAlert = (type: string) =>
      existingAlerts.some((alert) => alert.type === type);

    const createAlert = async (
      type: string,
      threshold: number,
      message: string,
    ) => {
      if (hasAlert(type)) return;
      await ctx.db.insert("budgetAlerts", {
        budgetId: args.budgetId,
        type,
        threshold,
        currentValue: newUsedAmount,
        message,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
    };

    if ((budget.alertThreshold80 ?? true) && usagePercentage >= 80) {
      await createAlert("WARNING_80", 80, "Budget usage has reached 80%");
    }
    if ((budget.alertThreshold100 ?? true) && usagePercentage >= 100) {
      await createAlert("WARNING_100", 100, "Budget usage has reached 100%");
    }
    if ((budget.alertThreshold110 ?? true) && usagePercentage >= 110) {
      await createAlert(
        "OVER_BUDGET_110",
        110,
        "Budget usage has exceeded 110%",
      );
    }

    return {
      id: spendingId,
    };
  },
});

export const createBudgetAlert = mutation({
  args: {
    budgetId: v.id("budgets"),
    type: v.string(),
    threshold: v.number(),
    currentValue: v.number(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("budgetAlerts")
      .collect()
      .then((alerts) =>
        alerts.find(
          (a) =>
            a.budgetId === args.budgetId &&
            a.type === args.type &&
            a.status === "ACTIVE",
        ),
      );

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("budgetAlerts", {
      budgetId: args.budgetId,
      type: args.type,
      threshold: args.threshold,
      currentValue: args.currentValue,
      message: args.message,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listActiveBudgetAlerts = query({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("budgetAlerts")
      .withIndex("by_budget_status", (q) =>
        q.eq("budgetId", args.budgetId).eq("status", "ACTIVE"),
      )
      .collect();
  },
});

export const deleteSpending = mutation({
  args: { spendingId: v.id("spendings") },
  handler: async (ctx, args) => {
    const spending = await ctx.db.get(args.spendingId);
    if (!spending || spending.deletedAt) {
      return;
    }

    const budget = await ctx.db.get(spending.budgetId);
    if (budget && !budget.deletedAt) {
      await ctx.db.patch(spending.budgetId, {
        usedAmount: Math.max(0, budget.usedAmount - spending.amount),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.spendingId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getFoods = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let foods = await ctx.db.query("foods").collect();

    if (args.category) {
      foods = foods.filter((f) => f.category === args.category);
    }

    foods = foods.slice(0, args.limit ?? 100);

    return foods;
  },
});

export const getFoodById = query({
  args: { foodId: v.id("foods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.foodId);
  },
});

export const getFoodsByIds = query({
  args: { foodIds: v.array(v.id("foods")) },
  handler: async (ctx, args) => {
    const foods = await Promise.all(args.foodIds.map((id) => ctx.db.get(id)));
    return foods.filter((f) => f !== null);
  },
});

export const getFoodsByCategory = query({
  args: {
    category: v.string(),
    excludeIds: v.optional(v.array(v.id("foods"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let foods = await ctx.db
      .query("foods")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    if (args.excludeIds && args.excludeIds.length > 0) {
      const excludeSet = new Set(args.excludeIds);
      foods = foods.filter((f) => !excludeSet.has(f._id));
    }

    return foods.slice(0, args.limit ?? 50);
  },
});

export const getPriceHistories = query({
  args: {
    foodId: v.id("foods"),
    isValid: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let histories = await ctx.db
      .query("priceHistories")
      .withIndex("by_food", (q) => q.eq("foodId", args.foodId))
      .collect();

    if (args.isValid !== undefined) {
      histories = histories.filter((h) => h.isValid === args.isValid);
    }

    if (args.startDate && args.endDate) {
      histories = histories.filter(
        (h) => h.recordedAt >= args.startDate! && h.recordedAt <= args.endDate!,
      );
    }

    histories = histories.sort((a, b) => b.recordedAt - a.recordedAt);

    return histories.slice(0, args.limit ?? 100);
  },
});

export const getLatestPrice = query({
  args: { foodId: v.id("foods") },
  handler: async (ctx, args) => {
    const histories = await ctx.db
      .query("priceHistories")
      .withIndex("by_food_recorded", (q) => q.eq("foodId", args.foodId))
      .collect();

    const valid = histories.filter((h) => h.isValid);
    if (valid.length === 0) return null;

    return valid.sort((a, b) => b.recordedAt - a.recordedAt)[0];
  },
});

export const getAffordableFoods = query({
  args: {
    maxUnitPrice: v.number(),
    categories: v.optional(v.array(v.string())),
    excludeIds: v.optional(v.array(v.id("foods"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const histories = await ctx.db.query("priceHistories").collect();

    const validHistories = histories.filter((h) => h.isValid);
    const foodMap = new Map<string, (typeof histories)[0]>();

    for (const history of validHistories) {
      const existing = foodMap.get(history.foodId);
      if (!existing || history.recordedAt > existing.recordedAt) {
        foodMap.set(history.foodId, history);
      }
    }

    const affordable: Array<{
      priceHistory: (typeof histories)[0];
      foodId: string;
    }> = [];

    for (const [foodId, history] of foodMap) {
      if (history.unitPrice <= args.maxUnitPrice) {
        affordable.push({ priceHistory: history, foodId });
      }
    }

    affordable.sort(
      (a, b) => a.priceHistory.unitPrice - b.priceHistory.unitPrice,
    );

    const result: Array<{
      id: string;
      name: string;
      category: string;
      unitPrice: number;
      platform: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }> = [];

    for (const item of affordable.slice(0, args.limit ?? 100)) {
      try {
        const food = await ctx.db.get(item.foodId as any);
        if (food && typeof food === "object" && "name" in food) {
          const foodData = food as {
            name: string;
            category: string;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          };
          result.push({
            id: item.foodId,
            name: foodData.name,
            category: foodData.category,
            unitPrice: item.priceHistory.unitPrice,
            platform: item.priceHistory.platform,
            calories: foodData.calories,
            protein: foodData.protein,
            carbs: foodData.carbs,
            fat: foodData.fat,
          });
        }
      } catch {
        // ignore errors
      }
    }

    if (args.categories && args.categories.length > 0) {
      return result.filter((f) => args.categories!.includes(f.category));
    }

    return result;
  },
});

export const createPriceHistory = mutation({
  args: {
    foodId: v.id("foods"),
    price: v.number(),
    unitPrice: v.number(),
    unit: v.string(),
    platform: v.string(),
    source: v.optional(v.string()),
    isValid: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("priceHistories", {
      foodId: args.foodId,
      price: args.price,
      unitPrice: args.unitPrice,
      unit: args.unit,
      platform: args.platform,
      source: args.source ?? "USER_REPORT",
      isValid: args.isValid ?? true,
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createManyPriceHistories = mutation({
  args: {
    updates: v.array(
      v.object({
        foodId: v.id("foods"),
        price: v.number(),
        unitPrice: v.number(),
        unit: v.string(),
        platform: v.string(),
        source: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: string[] = [];

    for (const update of args.updates) {
      const id = await ctx.db.insert("priceHistories", {
        foodId: update.foodId,
        price: update.price,
        unitPrice: update.unitPrice,
        unit: update.unit,
        platform: update.platform,
        source: update.source ?? "USER_REPORT",
        isValid: true,
        recordedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id.toString());
    }

    return ids;
  },
});

export const getBudgetAlerts = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const activeBudgetIds = budgets
      .filter((b) => !b.deletedAt)
      .map((b) => b._id);

    const budgetAlerts: Array<{
      _id: string;
      budgetId: string;
      type: string;
      threshold: number;
      currentValue: number;
      message: string;
      status: string;
      createdAt: number;
      updatedAt: number;
    }> = [];
    for (const budgetId of activeBudgetIds) {
      const alerts = await ctx.db
        .query("budgetAlerts")
        .withIndex("by_budget_status", (q) =>
          q.eq("budgetId", budgetId).eq("status", args.status ?? "ACTIVE"),
        )
        .collect();
      budgetAlerts.push(...alerts);
    }

    return budgetAlerts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateBudgetAlert = mutation({
  args: {
    alertId: v.id("budgetAlerts"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return args.alertId;
  },
});

export const getSavingsRecommendations = query({
  args: {
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const recommendations = await ctx.db
      .query("savingsRecommendations")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    return recommendations.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createSavingsRecommendation = mutation({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    savings: v.number(),
    originalPrice: v.optional(v.number()),
    discountedPrice: v.optional(v.number()),
    platform: v.optional(v.string()),
    foodItems: v.optional(v.any()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
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
      validUntil: args.validUntil ?? now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getRecentPurchases = query({
  args: {
    memberId: v.id("familyMembers"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const startDate = Date.now() - args.days * 24 * 60 * 60 * 1000;
    const foodIds = new Set<string>();

    for (const budget of budgets) {
      if (budget.deletedAt) continue;

      const spendings = await ctx.db
        .query("spendings")
        .withIndex("by_budget", (q) => q.eq("budgetId", budget._id))
        .collect();

      for (const spending of spendings) {
        if (
          !spending.deletedAt &&
          spending.purchaseDate >= startDate &&
          spending.items
        ) {
          const items = spending.items as Array<{ foodId?: string }>;
          for (const item of items) {
            if (item.foodId) {
              foodIds.add(item.foodId);
            }
          }
        }
      }
    }

    return Array.from(foodIds);
  },
});

export const getPopularFoods = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const priceHistories = await ctx.db.query("priceHistories").collect();

    const foodCount = new Map<string, number>();
    for (const history of priceHistories) {
      if (history.isValid) {
        foodCount.set(history.foodId, (foodCount.get(history.foodId) ?? 0) + 1);
      }
    }

    const sortedFoods = Array.from(foodCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, args.limit ?? 20)
      .map(([foodId]) => foodId);

    const foods: Array<Record<string, unknown> | null> = [];
    for (const id of sortedFoods) {
      try {
        const food = await ctx.db.get(id as any);
        foods.push(food);
      } catch {
        foods.push(null);
      }
    }
    return foods.filter((f) => f !== null);
  },
});
