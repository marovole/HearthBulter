import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vDifficulty, vRecipeCategory, vRecipeStatus, vCostLevel } from "./schema";

/**
 * Search recipes with full-text search
 */
export const search = query({
  args: {
    query: v.string(),
    category: v.optional(vRecipeCategory),
    difficulty: v.optional(vDifficulty),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];

    const results = await ctx.db
      .query("recipes")
      .withSearchIndex("search_recipes", (q) => {
        let search = q.search("name", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        if (args.difficulty) {
          search = search.eq("difficulty", args.difficulty);
        }
        return search.eq("status", "PUBLISHED");
      })
      .take(args.limit ?? 20);

    return results;
  },
});

/**
 * Get recipe by ID with ingredients and instructions
 */
export const getById = query({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.id);
    if (!recipe || recipe.deletedAt) return null;

    // Get ingredients with food details
    const ingredients = await ctx.db
      .query("recipeIngredients")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.id))
      .collect();

    const ingredientsWithFoods = await Promise.all(
      ingredients.map(async (ing) => {
        const food = await ctx.db.get(ing.foodId);
        return { ...ing, food };
      })
    );

    // Get instructions
    const instructions = await ctx.db
      .query("recipeInstructions")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.id))
      .collect();

    return {
      ...recipe,
      ingredients: ingredientsWithFoods,
      instructions: instructions.sort((a, b) => a.stepNumber - b.stepNumber),
    };
  },
});

/**
 * Get recipes by category
 */
export const getByCategory = query({
  args: {
    category: vRecipeCategory,
    limit: v.optional(v.number()),
    status: v.optional(vRecipeStatus),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("recipes")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const recipes = await query.take(args.limit ?? 50);

    if (args.status) {
      return recipes.filter((r) => r.status === args.status);
    }

    return recipes.filter((r) => r.status === "PUBLISHED");
  },
});

/**
 * Get popular recipes
 */
export const getPopular = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_averageRating")
      .order("desc")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .take(args.limit ?? 20);

    return recipes;
  },
});

/**
 * Get recipes by difficulty
 */
export const getByDifficulty = query({
  args: {
    difficulty: vDifficulty,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recipes = await ctx.db
      .query("recipes")
      .withIndex("by_difficulty", (q) => q.eq("difficulty", args.difficulty))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.eq(q.field("deletedAt"), undefined)
        )
      )
      .take(args.limit ?? 50);

    return recipes;
  },
});

/**
 * Create a new recipe
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    cuisine: v.optional(v.string()),
    difficulty: vDifficulty,
    prepTime: v.number(),
    cookTime: v.number(),
    servings: v.number(),
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
    fiber: v.optional(v.float64()),
    sugar: v.optional(v.float64()),
    sodium: v.optional(v.float64()),
    imageUrl: v.optional(v.string()),
    category: vRecipeCategory,
    tags: v.optional(v.array(v.string())),
    mealTypes: v.optional(v.array(v.string())),
    seasons: v.optional(v.array(v.string())),
    estimatedCost: v.optional(v.float64()),
    costLevel: v.optional(vCostLevel),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("recipes", {
      name: args.name,
      description: args.description,
      cuisine: args.cuisine,
      difficulty: args.difficulty,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
      totalTime: args.prepTime + args.cookTime,
      servings: args.servings,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      sugar: args.sugar,
      sodium: args.sodium,
      imageUrl: args.imageUrl,
      images: [],
      category: args.category,
      tags: args.tags ?? [],
      mealTypes: args.mealTypes ?? [],
      averageRating: 0,
      ratingCount: 0,
      favoriteCount: 0,
      viewCount: 0,
      status: "DRAFT",
      isPublic: args.isPublic ?? false,
      isVerified: false,
      seasons: args.seasons ?? [],
      estimatedCost: args.estimatedCost,
      costLevel: args.costLevel ?? "MEDIUM",
    });
  },
});

/**
 * Update recipe
 */
export const update = mutation({
  args: {
    id: v.id("recipes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    difficulty: v.optional(vDifficulty),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    servings: v.optional(v.number()),
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()),
    carbs: v.optional(v.float64()),
    fat: v.optional(v.float64()),
    category: v.optional(vRecipeCategory),
    tags: v.optional(v.array(v.string())),
    status: v.optional(vRecipeStatus),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, prepTime, cookTime, ...updates } = args;

    const updateData: Record<string, unknown> = { ...updates };
    if (prepTime !== undefined || cookTime !== undefined) {
      const recipe = await ctx.db.get(id);
      if (recipe) {
        const newPrepTime = prepTime ?? recipe.prepTime;
        const newCookTime = cookTime ?? recipe.cookTime;
        updateData.prepTime = newPrepTime;
        updateData.cookTime = newCookTime;
        updateData.totalTime = newPrepTime + newCookTime;
      }
    }

    await ctx.db.patch(id, updateData);
    return id;
  },
});

/**
 * Add ingredient to recipe
 */
export const addIngredient = mutation({
  args: {
    recipeId: v.id("recipes"),
    foodId: v.id("foods"),
    amount: v.float64(),
    unit: v.string(),
    notes: v.optional(v.string()),
    optional: v.optional(v.boolean()),
    isSubstitutable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("recipeIngredients", {
      recipeId: args.recipeId,
      foodId: args.foodId,
      amount: args.amount,
      unit: args.unit,
      notes: args.notes,
      optional: args.optional ?? false,
      isSubstitutable: args.isSubstitutable ?? false,
    });
  },
});

/**
 * Add instruction step to recipe
 */
export const addInstruction = mutation({
  args: {
    recipeId: v.id("recipes"),
    stepNumber: v.number(),
    title: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    timer: v.optional(v.number()),
    temperature: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("recipeInstructions", {
      recipeId: args.recipeId,
      stepNumber: args.stepNumber,
      title: args.title,
      content: args.content,
      imageUrl: args.imageUrl,
      timer: args.timer,
      temperature: args.temperature,
    });
  },
});

/**
 * Rate a recipe
 */
export const rate = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    rating: v.number(),
    comment: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check for existing rating
    const existing = await ctx.db
      .query("recipeRatings")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .filter((q) => q.eq(q.field("memberId"), args.memberId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        comment: args.comment,
        tags: args.tags ?? [],
        ratedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("recipeRatings", {
        recipeId: args.recipeId,
        memberId: args.memberId,
        rating: args.rating,
        comment: args.comment,
        tags: args.tags ?? [],
        ratedAt: Date.now(),
        isPublic: args.isPublic ?? true,
      });
    }

    // Update recipe average rating
    const allRatings = await ctx.db
      .query("recipeRatings")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await ctx.db.patch(args.recipeId, {
      averageRating: Math.round(avgRating * 10) / 10,
      ratingCount: allRatings.length,
    });

    return args.recipeId;
  },
});

/**
 * Favorite a recipe
 */
export const favorite = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check if already favorited
    const existing = await ctx.db
      .query("recipeFavorites")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .filter((q) => q.eq(q.field("memberId"), args.memberId))
      .first();

    if (existing) {
      throw new Error("Already favorited");
    }

    await ctx.db.insert("recipeFavorites", {
      recipeId: args.recipeId,
      memberId: args.memberId,
      favoritedAt: Date.now(),
      notes: args.notes,
    });

    // Update favorite count
    const recipe = await ctx.db.get(args.recipeId);
    if (recipe) {
      await ctx.db.patch(args.recipeId, {
        favoriteCount: recipe.favoriteCount + 1,
      });
    }

    return args.recipeId;
  },
});

/**
 * Unfavorite a recipe
 */
export const unfavorite = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("recipeFavorites")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .filter((q) => q.eq(q.field("memberId"), args.memberId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);

      const recipe = await ctx.db.get(args.recipeId);
      if (recipe && recipe.favoriteCount > 0) {
        await ctx.db.patch(args.recipeId, {
          favoriteCount: recipe.favoriteCount - 1,
        });
      }
    }

    return args.recipeId;
  },
});

/**
 * Get member's favorite recipes
 */
export const getFavorites = query({
  args: {
    memberId: v.id("familyMembers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const favorites = await ctx.db
      .query("recipeFavorites")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .take(args.limit ?? 50);

    const recipes = await Promise.all(
      favorites.map(async (fav) => {
        const recipe = await ctx.db.get(fav.recipeId);
        return recipe && !recipe.deletedAt
          ? { ...recipe, favoritedAt: fav.favoritedAt, notes: fav.notes }
          : null;
      })
    );

    return recipes.filter(Boolean);
  },
});

/**
 * Delete recipe (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("recipes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});
