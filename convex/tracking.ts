import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const softDelete = {
  deletedAt: v.optional(v.number()),
};

const timestamps = {
  createdAt: v.number(),
  updatedAt: v.number(),
};

export const getReminderConfigs = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query("healthReminders")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    return reminders;
  },
});

export const upsertReminderConfig = mutation({
  args: {
    memberId: v.id("familyMembers"),
    reminderType: v.string(),
    enabled: v.boolean(),
    hour: v.number(),
    minute: v.number(),
    daysOfWeek: v.array(v.number()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("healthReminders")
      .withIndex("by_member_type", (q) =>
        q.eq("memberId", args.memberId).eq("reminderType", args.reminderType),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        hour: args.hour,
        minute: args.minute,
        daysOfWeek: args.daysOfWeek,
        message: args.message,
        updatedAt: now,
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
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteReminderConfig = mutation({
  args: { memberId: v.id("familyMembers"), reminderType: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("healthReminders")
      .withIndex("by_member_type", (q) =>
        q.eq("memberId", args.memberId).eq("reminderType", args.reminderType),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    if (existing) {
      const now = Date.now();
      await ctx.db.patch(existing._id, { deletedAt: now, updatedAt: now });
    }
  },
});

export const getActiveReminders = query({
  args: {},
  handler: async (ctx) => {
    const reminders = await ctx.db
      .query("healthReminders")
      .filter((q) => q.eq(q.field("enabled"), true))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    return reminders;
  },
});

export const updateReminderLastTriggered = mutation({
  args: { id: v.id("healthReminders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastTriggeredAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const createMealLog = mutation({
  args: {
    memberId: v.id("familyMembers"),
    date: v.number(),
    mealType: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    sodium: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const mealLogId = await ctx.db.insert("mealLogs", {
      ...args,
      checkedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return mealLogId;
  },
});

export const addMealLogFood = mutation({
  args: {
    mealLogId: v.id("mealLogs"),
    foodId: v.id("foods"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("mealLogFoods", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getTodayMealLogs = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const mealLogs = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_date", (q) =>
        q
          .eq("memberId", args.memberId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const logsWithFoods = await Promise.all(
      mealLogs.map(async (log) => {
        const foods = await ctx.db
          .query("mealLogFoods")
          .withIndex("by_meal_log", (q) => q.eq("mealLogId", log._id))
          .collect();
        return { ...log, foods };
      }),
    );

    return logsWithFoods;
  },
});

export const getMealLogHistory = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    mealType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    if (args.startDate) {
      logs = logs.filter((log) => log.date >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((log) => log.date <= args.endDate!);
    }
    if (args.mealType) {
      logs = logs.filter((log) => log.mealType === args.mealType);
    }

    logs.sort((a, b) => b.date - a.date);

    const limit = args.limit ?? 50;
    const paginatedLogs = logs.slice(0, limit);

    const logsWithFoods = await Promise.all(
      paginatedLogs.map(async (log) => {
        const foods = await ctx.db
          .query("mealLogFoods")
          .withIndex("by_meal_log", (q) => q.eq("mealLogId", log._id))
          .collect();
        return { ...log, foods };
      }),
    );

    return { logs: logsWithFoods, total: logs.length };
  },
});

export const updateMealLog = mutation({
  args: {
    id: v.id("mealLogs"),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    sodium: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
  },
});

export const deleteMealLogFoods = mutation({
  args: { mealLogId: v.id("mealLogs") },
  handler: async (ctx, args) => {
    const foods = await ctx.db
      .query("mealLogFoods")
      .withIndex("by_meal_log", (q) => q.eq("mealLogId", args.mealLogId))
      .collect();

    for (const food of foods) {
      await ctx.db.delete(food._id);
    }
  },
});

export const searchFoods = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const keyword = args.query.trim();
    if (!keyword) {
      return [];
    }

    const foods = await ctx.db.query("foods").collect();
    const matched = foods.filter((food) => {
      if (!food.verified) {
        return false;
      }
      const nameMatch = food.name.includes(keyword);
      const aliasMatch =
        Array.isArray(food.aliases) &&
        food.aliases.some((alias) => alias.includes(keyword));
      return nameMatch || aliasMatch;
    });

    return matched.slice(0, args.limit ?? 5);
  },
});

export const softDeleteMealLog = mutation({
  args: { id: v.id("mealLogs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getMealLogById = query({
  args: { id: v.id("mealLogs") },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.id);
    if (!log || log.deletedAt) return null;

    const foods = await ctx.db
      .query("mealLogFoods")
      .withIndex("by_meal_log", (q) => q.eq("mealLogId", log._id))
      .collect();

    return { ...log, foods };
  },
});

export const getDailyNutritionTarget = query({
  args: { memberId: v.id("familyMembers"), date: v.number() },
  handler: async (ctx, args) => {
    const target = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .unique();
    return target;
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
    caloriesDeviation: v.number(),
    proteinDeviation: v.number(),
    carbsDeviation: v.number(),
    fatDeviation: v.number(),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q.eq("memberId", args.memberId).eq("date", args.date),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("dailyNutritionTargets", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getTrackingStreak = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const streak = await ctx.db
      .query("trackingStreaks")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();
    return streak;
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
    const now = Date.now();
    const existing = await ctx.db
      .query("trackingStreaks")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("trackingStreaks", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createQuickTemplate = mutation({
  args: {
    memberId: v.id("familyMembers"),
    name: v.string(),
    description: v.optional(v.string()),
    mealType: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    score: v.number(),
    useCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const templateId = await ctx.db.insert("quickTemplates", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return templateId;
  },
});

export const addTemplateFood = mutation({
  args: {
    templateId: v.id("quickTemplates"),
    foodId: v.id("foods"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("templateFoods", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getQuickTemplates = query({
  args: { memberId: v.id("familyMembers"), mealType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let templates = await ctx.db
      .query("quickTemplates")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    if (args.mealType) {
      templates = templates.filter((t) => t.mealType === args.mealType);
    }

    templates.sort((a, b) => b.score - a.score);

    const templatesWithFoods = await Promise.all(
      templates.map(async (template) => {
        const foods = await ctx.db
          .query("templateFoods")
          .withIndex("by_template", (q) => q.eq("templateId", template._id))
          .collect();
        return { ...template, foods };
      }),
    );

    return templatesWithFoods;
  },
});

export const getTemplateById = query({
  args: { id: v.id("quickTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (!template || template.deletedAt) return null;

    const foods = await ctx.db
      .query("templateFoods")
      .withIndex("by_template", (q) => q.eq("templateId", template._id))
      .collect();

    return { ...template, foods };
  },
});

export const updateTemplateScore = mutation({
  args: { id: v.id("quickTemplates"), score: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      score: args.score,
      updatedAt: Date.now(),
    });
  },
});

export const incrementTemplateUseCount = mutation({
  args: { id: v.id("quickTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.id);
    if (template) {
      await ctx.db.patch(args.id, {
        useCount: template.useCount + 1,
        lastUsed: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateQuickTemplate = mutation({
  args: {
    id: v.id("quickTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
  },
});

export const softDeleteQuickTemplate = mutation({
  args: { id: v.id("quickTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteTemplateFoods = mutation({
  args: { templateId: v.id("quickTemplates") },
  handler: async (ctx, args) => {
    const foods = await ctx.db
      .query("templateFoods")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    for (const food of foods) {
      await ctx.db.delete(food._id);
    }
  },
});

export const createFoodPhoto = mutation({
  args: {
    mealLogId: v.id("mealLogs"),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    recognitionStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("foodPhotos", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFoodPhoto = mutation({
  args: {
    id: v.id("foodPhotos"),
    recognitionStatus: v.optional(v.string()),
    recognitionResult: v.optional(v.string()),
    confidence: v.optional(v.number()),
    recognitionError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
  },
});

export const getFoodPhotoById = query({
  args: { id: v.id("foodPhotos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (!photo || photo.deletedAt) return null;
    return photo;
  },
});

export const getMealLogPhotos = query({
  args: { mealLogId: v.id("mealLogs") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("foodPhotos")
      .withIndex("by_meal_log", (q) => q.eq("mealLogId", args.mealLogId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
    return photos;
  },
});

export const deleteFoodPhoto = mutation({
  args: { id: v.id("foodPhotos") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getFoodsByIds = query({
  args: { foodIds: v.array(v.id("foods")) },
  handler: async (ctx, args) => {
    const foods = await Promise.all(
      args.foodIds.map(async (id) => {
        const food = await ctx.db.get(id);
        return food;
      }),
    );
    return foods.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

export const getMealLogsForPeriod = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const mealLogs = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_date", (q) =>
        q
          .eq("memberId", args.memberId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return mealLogs;
  },
});

export const getDailyNutritionTargetsForPeriod = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const targets = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q
          .eq("memberId", args.memberId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    return targets;
  },
});

export const getPreviousWeekTargets = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const targets = await ctx.db
      .query("dailyNutritionTargets")
      .withIndex("by_member_date", (q) =>
        q
          .eq("memberId", args.memberId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    return targets;
  },
});

export const findMealLogByTypeAndDate = query({
  args: {
    memberId: v.id("familyMembers"),
    mealType: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const endDate = args.date + 24 * 60 * 60 * 1000;
    const logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_member_type", (q) =>
        q.eq("memberId", args.memberId).eq("mealType", args.mealType),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return (
      logs.find((log) => log.date >= args.date && log.date < endDate) || null
    );
  },
});
