import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vFoodCategory, vDataSource } from "./schema";

/**
 * Search foods with full-text search
 */
export const search = query({
  args: {
    query: v.string(),
    category: v.optional(vFoodCategory),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];

    const results = await ctx.db
      .query("foods")
      .withSearchIndex("search_foods", (q) => {
        let search = q.search("name", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        return search;
      })
      .take(args.limit ?? 20);

    return results;
  },
});

/**
 * Get food by ID
 */
export const getById = query({
  args: { id: v.id("foods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get foods by category
 */
export const getByCategory = query({
  args: {
    category: vFoodCategory,
    limit: v.optional(v.number()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("foods")
      .withIndex("by_category", (q) => q.eq("category", args.category));

    const foods = await query.take(args.limit ?? 50);

    if (args.verified !== undefined) {
      return foods.filter((f) => f.verified === args.verified);
    }

    return foods;
  },
});

/**
 * Get popular/verified foods
 */
export const getPopular = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get verified foods first
    const foods = await ctx.db
      .query("foods")
      .filter((q) => q.eq(q.field("verified"), true))
      .take(args.limit ?? 50);

    return foods;
  },
});

/**
 * Calculate nutrition for a combination of foods
 */
export const calculateNutrition = query({
  args: {
    items: v.array(
      v.object({
        foodId: v.id("foods"),
        amount: v.float64(), // in grams
      })
    ),
  },
  handler: async (ctx, args) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let totalSugar = 0;
    let totalSodium = 0;

    const foodDetails = [];

    for (const item of args.items) {
      const food = await ctx.db.get(item.foodId);
      if (!food) continue;

      const factor = item.amount / 100; // Nutrients are per 100g

      const itemNutrition = {
        id: food._id,
        name: food.name,
        amount: item.amount,
        calories: food.calories * factor,
        protein: food.protein * factor,
        carbs: food.carbs * factor,
        fat: food.fat * factor,
        fiber: (food.fiber ?? 0) * factor,
        sugar: (food.sugar ?? 0) * factor,
        sodium: (food.sodium ?? 0) * factor,
      };

      foodDetails.push(itemNutrition);

      totalCalories += itemNutrition.calories;
      totalProtein += itemNutrition.protein;
      totalCarbs += itemNutrition.carbs;
      totalFat += itemNutrition.fat;
      totalFiber += itemNutrition.fiber;
      totalSugar += itemNutrition.sugar;
      totalSodium += itemNutrition.sodium;
    }

    return {
      totals: {
        calories: Math.round(totalCalories * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        fiber: Math.round(totalFiber * 10) / 10,
        sugar: Math.round(totalSugar * 10) / 10,
        sodium: Math.round(totalSodium * 10) / 10,
      },
      items: foodDetails,
    };
  },
});

/**
 * Create a new food item
 */
export const create = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    fiber: v.optional(v.float64()),
    sugar: v.optional(v.float64()),
    sodium: v.optional(v.float64()),
    vitaminA: v.optional(v.float64()),
    vitaminC: v.optional(v.float64()),
    calcium: v.optional(v.float64()),
    iron: v.optional(v.float64()),
    category: vFoodCategory,
    tags: v.optional(v.array(v.string())),
    source: v.optional(vDataSource),
    usdaId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("foods", {
      name: args.name,
      nameEn: args.nameEn,
      aliases: args.aliases ?? [],
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      sugar: args.sugar,
      sodium: args.sodium,
      vitaminA: args.vitaminA,
      vitaminC: args.vitaminC,
      calcium: args.calcium,
      iron: args.iron,
      category: args.category,
      tags: args.tags ?? [],
      source: args.source ?? "USER_SUBMITTED",
      usdaId: args.usdaId,
      verified: false,
    });
  },
});

/**
 * Update food item
 */
export const update = mutation({
  args: {
    id: v.id("foods"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()),
    carbs: v.optional(v.float64()),
    fat: v.optional(v.float64()),
    fiber: v.optional(v.float64()),
    sugar: v.optional(v.float64()),
    sodium: v.optional(v.float64()),
    category: v.optional(vFoodCategory),
    tags: v.optional(v.array(v.string())),
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
 * Get foods by IDs
 */
export const getByIds = query({
  args: { ids: v.array(v.id("foods")) },
  handler: async (ctx, args) => {
    const foods = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return foods.filter(Boolean);
  },
});

/**
 * List all food categories with counts
 */
export const getCategoryCounts = query({
  args: {},
  handler: async (ctx) => {
    const categories = [
      "VEGETABLES",
      "FRUITS",
      "GRAINS",
      "PROTEIN",
      "SEAFOOD",
      "DAIRY",
      "OILS",
      "SNACKS",
      "BEVERAGES",
      "OTHER",
    ] as const;

    const counts = await Promise.all(
      categories.map(async (category) => {
        const foods = await ctx.db
          .query("foods")
          .withIndex("by_category", (q) => q.eq("category", category))
          .collect();
        return { category, count: foods.length };
      })
    );

    return counts;
  },
});
