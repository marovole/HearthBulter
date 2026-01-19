import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const isPublishedRecipe = (recipe: {
  status?: string | null;
  isPublic?: boolean;
  deletedAt?: number | null;
}) => {
  if (recipe.deletedAt) return false;
  if (recipe.isPublic === false) return false;
  if (!recipe.status) return true;
  return recipe.status === "PUBLISHED";
};

const normalizeRecipe = (recipe: any) => ({
  ...recipe,
  averageRating: recipe.averageRating ?? 0,
  ratingCount: recipe.ratingCount ?? 0,
  favoriteCount: recipe.favoriteCount ?? 0,
  viewCount: recipe.viewCount ?? 0,
  mealTypes: recipe.mealTypes ?? [],
  tags: recipe.tags ?? [],
  seasons: recipe.seasons ?? [],
});

const loadRecipeIngredients = async (ctx: { db: any }, recipeIds: string[]) => {
  if (recipeIds.length === 0) return new Map<string, any[]>();
  const idSet = new Set(recipeIds);
  const ingredients = await ctx.db.query("recipeIngredients").collect();

  const foods = new Map<
    string,
    {
      _id: string;
      name: string;
      nameEn?: string | null;
      calories?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      category?: string | null;
    }
  >();

  const foodRecords = await ctx.db
    .query("foods")
    .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
    .collect();

  foodRecords.forEach((food: any) => {
    foods.set(food._id, food);
  });

  const grouped = new Map<string, any[]>();
  ingredients.forEach((ingredient: any) => {
    if (!idSet.has(ingredient.recipeId)) return;
    const food = foods.get(ingredient.foodId);
    if (!grouped.has(ingredient.recipeId)) {
      grouped.set(ingredient.recipeId, []);
    }
    grouped.get(ingredient.recipeId)!.push({
      id: ingredient._id,
      recipeId: ingredient.recipeId,
      foodId: ingredient.foodId,
      amount: ingredient.amount,
      unit: ingredient.unit,
      notes: ingredient.notes,
      optional: ingredient.optional ?? false,
      food: food
        ? {
            id: food._id,
            name: food.name,
            nameEn: food.nameEn ?? null,
            calories: food.calories ?? null,
            protein: food.protein ?? null,
            carbs: food.carbs ?? null,
            fat: food.fat ?? null,
            category: food.category ?? null,
          }
        : null,
    });
  });

  return grouped;
};

const loadRecipeInstructions = async (
  ctx: { db: any },
  recipeIds: string[],
) => {
  if (recipeIds.length === 0) return new Map<string, any[]>();
  const idSet = new Set(recipeIds);
  const instructions = await ctx.db.query("recipeInstructions").collect();
  const grouped = new Map<string, any[]>();

  instructions.forEach((instruction: any) => {
    if (!idSet.has(instruction.recipeId)) return;
    if (!grouped.has(instruction.recipeId)) {
      grouped.set(instruction.recipeId, []);
    }
    grouped.get(instruction.recipeId)!.push({
      id: instruction._id,
      recipeId: instruction.recipeId,
      stepNumber: instruction.stepNumber,
      title: instruction.title,
      content: instruction.content,
      imageUrl: instruction.imageUrl ?? null,
      videoUrl: instruction.videoUrl ?? null,
      timer: instruction.timer ?? null,
      temperature: instruction.temperature ?? null,
    });
  });

  grouped.forEach((steps) => {
    steps.sort((a, b) => a.stepNumber - b.stepNumber);
  });
  return grouped;
};

export const recipeExists = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    return Boolean(recipe && !recipe.deletedAt);
  },
});

export const getById = query({
  args: { recipeId: v.id("recipes") },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.deletedAt) return null;

    const [ingredientsMap, instructionsMap] = await Promise.all([
      loadRecipeIngredients(ctx, [recipe._id]),
      loadRecipeInstructions(ctx, [recipe._id]),
    ]);

    return {
      ...normalizeRecipe(recipe),
      ingredients: ingredientsMap.get(recipe._id) ?? [],
      instructions: instructionsMap.get(recipe._id) ?? [],
    };
  },
});

export const listByIds = query({
  args: { ids: v.array(v.id("recipes")) },
  handler: async (ctx, args) => {
    const idSet = new Set(args.ids);
    const recipes = (await ctx.db.query("recipes").collect()).filter((recipe) =>
      idSet.has(recipe._id),
    );

    const validRecipes = recipes.filter((recipe) => !recipe.deletedAt);
    const recipeIds = validRecipes.map((recipe) => recipe._id);

    const [ingredientsMap, instructionsMap] = await Promise.all([
      loadRecipeIngredients(ctx, recipeIds),
      loadRecipeInstructions(ctx, recipeIds),
    ]);

    return validRecipes.map((recipe) => ({
      ...normalizeRecipe(recipe),
      ingredients: ingredientsMap.get(recipe._id) ?? [],
      instructions: instructionsMap.get(recipe._id) ?? [],
    }));
  },
});

export const listPublicDetailed = query({
  args: {
    mealTypes: v.optional(v.array(v.string())),
    cuisineTypes: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    excludeIds: v.optional(v.array(v.id("recipes"))),
    maxCookTime: v.optional(v.number()),
    budgetLimit: v.optional(v.number()),
    season: v.optional(v.string()),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let recipes = await ctx.db.query("recipes").collect();
    recipes = recipes.filter((recipe) => isPublishedRecipe(recipe));

    if (args.excludeIds && args.excludeIds.length > 0) {
      const excludeSet = new Set(args.excludeIds);
      recipes = recipes.filter((recipe) => !excludeSet.has(recipe._id));
    }

    if (args.mealTypes && args.mealTypes.length > 0) {
      recipes = recipes.filter((recipe) =>
        recipe.mealTypes?.some((meal: string) =>
          args.mealTypes?.includes(meal),
        ),
      );
    }

    if (args.cuisineTypes && args.cuisineTypes.length > 0) {
      recipes = recipes.filter((recipe) =>
        recipe.cuisine ? args.cuisineTypes?.includes(recipe.cuisine) : false,
      );
    }

    if (args.tags && args.tags.length > 0) {
      recipes = recipes.filter((recipe) =>
        recipe.tags?.some((tag: string) => args.tags?.includes(tag)),
      );
    }

    if (args.maxCookTime !== undefined) {
      recipes = recipes.filter(
        (recipe) => recipe.cookTime <= args.maxCookTime!,
      );
    }

    if (args.budgetLimit !== undefined) {
      recipes = recipes.filter(
        (recipe) => (recipe.estimatedCost ?? 0) <= args.budgetLimit!,
      );
    }

    if (args.season) {
      recipes = recipes.filter((recipe) =>
        recipe.seasons?.includes(args.season!),
      );
    }

    recipes.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    const total = recipes.length;
    const pageRecipes = recipes.slice(args.offset, args.offset + args.limit);

    const recipeIds = pageRecipes.map((recipe) => recipe._id);
    const [ingredientsMap, instructionsMap] = await Promise.all([
      loadRecipeIngredients(ctx, recipeIds),
      loadRecipeInstructions(ctx, recipeIds),
    ]);

    return {
      items: pageRecipes.map((recipe) => ({
        ...normalizeRecipe(recipe),
        ingredients: ingredientsMap.get(recipe._id) ?? [],
        instructions: instructionsMap.get(recipe._id) ?? [],
      })),
      total,
    };
  },
});

export const listPopular = query({
  args: {
    limit: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let recipes = await ctx.db.query("recipes").collect();
    recipes = recipes.filter((recipe) => isPublishedRecipe(recipe));

    if (args.category) {
      recipes = recipes.filter((recipe) => recipe.category === args.category);
    }

    recipes.sort((a, b) => {
      const ratingDiff = (b.averageRating ?? 0) - (a.averageRating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
    });

    const limited = recipes.slice(0, args.limit);
    const recipeIds = limited.map((recipe) => recipe._id);
    const ingredientsMap = await loadRecipeIngredients(ctx, recipeIds);

    return limited.map((recipe) => ({
      ...normalizeRecipe(recipe),
      ingredients: ingredientsMap.get(recipe._id) ?? [],
    }));
  },
});

export const updateRecipeCounts = mutation({
  args: {
    recipeId: v.id("recipes"),
    ratingCount: v.optional(v.number()),
    averageRating: v.optional(v.number()),
    favoriteCount: v.optional(v.number()),
    viewCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe) return null;
    await ctx.db.patch(args.recipeId, {
      ratingCount: args.ratingCount ?? recipe.ratingCount ?? 0,
      averageRating: args.averageRating ?? recipe.averageRating ?? 0,
      favoriteCount: args.favoriteCount ?? recipe.favoriteCount ?? 0,
      viewCount: args.viewCount ?? recipe.viewCount ?? 0,
      updatedAt: Date.now(),
    });
    return args.recipeId;
  },
});

export const createIngredientSubstitution = mutation({
  args: {
    originalIngredientId: v.id("recipeIngredients"),
    substituteFoodId: v.id("foods"),
    substitutionType: v.string(),
    reason: v.optional(v.string()),
    nutritionDelta: v.optional(v.any()),
    costDelta: v.optional(v.number()),
    tasteSimilarity: v.optional(v.number()),
    conditions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("ingredientSubstitutions", {
      originalIngredientId: args.originalIngredientId,
      substituteFoodId: args.substituteFoodId,
      substitutionType: args.substitutionType,
      reason: args.reason,
      nutritionDelta: args.nutritionDelta,
      costDelta: args.costDelta,
      tasteSimilarity: args.tasteSimilarity,
      conditions: args.conditions ?? [],
      isValid: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listIngredientSubstitutions = query({
  args: {
    originalIngredientId: v.id("recipeIngredients"),
    substitutionType: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let substitutions = await ctx.db
      .query("ingredientSubstitutions")
      .withIndex("by_original", (q) =>
        q.eq("originalIngredientId", args.originalIngredientId),
      )
      .collect();

    substitutions = substitutions.filter((sub) => sub.isValid !== false);

    if (args.substitutionType) {
      substitutions = substitutions.filter(
        (sub) => sub.substitutionType === args.substitutionType,
      );
    }

    substitutions.sort((a, b) => {
      const tasteDiff = (b.tasteSimilarity ?? 0) - (a.tasteSimilarity ?? 0);
      if (tasteDiff !== 0) return tasteDiff;
      return (a.costDelta ?? 0) - (b.costDelta ?? 0);
    });

    const limited = substitutions.slice(0, args.limit);

    const foods = new Map<
      string,
      {
        _id: string;
        name: string;
        nameEn?: string | null;
        calories?: number | null;
        protein?: number | null;
        carbs?: number | null;
        fat?: number | null;
        category?: string | null;
      }
    >();

    const foodRecords = await ctx.db
      .query("foods")
      .filter((q: any) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    foodRecords.forEach((food: any) => {
      foods.set(food._id, food);
    });

    const ingredients = new Map<
      string,
      {
        _id: string;
        recipeId: string;
        foodId: string;
        amount: number;
        unit: string;
        notes?: string | null;
        optional?: boolean;
      }
    >();

    const ingredientRecords = await ctx.db.query("recipeIngredients").collect();

    ingredientRecords.forEach((ingredient: any) => {
      ingredients.set(ingredient._id, ingredient);
    });

    return limited.map((sub) => ({
      ...sub,
      substituteFood: foods.get(sub.substituteFoodId) ?? null,
      originalIngredient: ingredients.get(sub.originalIngredientId) ?? null,
    }));
  },
});

export const getIngredientById = query({
  args: { id: v.id("recipeIngredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) return null;
    const food = await ctx.db.get(ingredient.foodId);
    return {
      ...ingredient,
      food,
    };
  },
});

export const getFoodById = query({
  args: { id: v.id("foods") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
