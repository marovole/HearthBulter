import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vGoalType, vPlanStatus, vMealType } from "./schema";

/**
 * Get meal plans for a member
 */
export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(vPlanStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.status) {
      const plans = await ctx.db
        .query("mealPlans")
        .withIndex("by_memberId_status", (q) =>
          q.eq("memberId", args.memberId).eq("status", args.status!)
        )
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(args.limit ?? 50);
      return plans;
    }

    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .take(args.limit ?? 50);

    return plans;
  },
});

/**
 * Get active meal plan
 */
export const getActive = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("mealPlans")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .first();
  },
});

/**
 * Get meal plan by ID with meals
 */
export const getById = query({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const plan = await ctx.db.get(args.id);
    if (!plan || plan.deletedAt) return null;

    // Get all meals for this plan
    const meals = await ctx.db
      .query("meals")
      .withIndex("by_planId", (q) => q.eq("planId", args.id))
      .collect();

    // Get ingredients for each meal
    const mealsWithIngredients = await Promise.all(
      meals.map(async (meal) => {
        const ingredients = await ctx.db
          .query("mealIngredients")
          .withIndex("by_mealId", (q) => q.eq("mealId", meal._id))
          .collect();

        const ingredientsWithFood = await Promise.all(
          ingredients.map(async (ing) => {
            const food = await ctx.db.get(ing.foodId);
            return { ...ing, food };
          })
        );

        return { ...meal, ingredients: ingredientsWithFood };
      })
    );

    // Group meals by date
    const mealsByDate = mealsWithIngredients.reduce((acc, meal) => {
      const dateKey = new Date(meal.date).toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meal);
      return acc;
    }, {} as Record<string, typeof mealsWithIngredients>);

    return {
      ...plan,
      meals: mealsWithIngredients,
      mealsByDate,
    };
  },
});

/**
 * Create meal plan
 */
export const create = mutation({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    goalType: vGoalType,
    targetCalories: v.float64(),
    targetProtein: v.float64(),
    targetCarbs: v.float64(),
    targetFat: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Deactivate existing active plans
    const existingPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "ACTIVE")
      )
      .collect();

    for (const plan of existingPlans) {
      await ctx.db.patch(plan._id, { status: "CANCELLED" });
    }

    return await ctx.db.insert("mealPlans", {
      memberId: args.memberId,
      startDate: args.startDate,
      endDate: args.endDate,
      goalType: args.goalType,
      targetCalories: args.targetCalories,
      targetProtein: args.targetProtein,
      targetCarbs: args.targetCarbs,
      targetFat: args.targetFat,
      status: "ACTIVE",
    });
  },
});

/**
 * Update meal plan
 */
export const update = mutation({
  args: {
    id: v.id("mealPlans"),
    targetCalories: v.optional(v.float64()),
    targetProtein: v.optional(v.float64()),
    targetCarbs: v.optional(v.float64()),
    targetFat: v.optional(v.float64()),
    status: v.optional(vPlanStatus),
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
 * Add meal to plan
 */
export const addMeal = mutation({
  args: {
    planId: v.id("mealPlans"),
    date: v.number(),
    mealType: vMealType,
    calories: v.float64(),
    protein: v.float64(),
    carbs: v.float64(),
    fat: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("meals", {
      planId: args.planId,
      date: args.date,
      mealType: args.mealType,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
    });
  },
});

/**
 * Add ingredient to meal
 */
export const addMealIngredient = mutation({
  args: {
    mealId: v.id("meals"),
    foodId: v.id("foods"),
    amount: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const ingredientId = await ctx.db.insert("mealIngredients", {
      mealId: args.mealId,
      foodId: args.foodId,
      amount: args.amount,
    });

    // Recalculate meal nutrition
    const allIngredients = await ctx.db
      .query("mealIngredients")
      .withIndex("by_mealId", (q) => q.eq("mealId", args.mealId))
      .collect();

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const ing of allIngredients) {
      const food = await ctx.db.get(ing.foodId);
      if (food) {
        const factor = ing.amount / 100;
        totalCalories += food.calories * factor;
        totalProtein += food.protein * factor;
        totalCarbs += food.carbs * factor;
        totalFat += food.fat * factor;
      }
    }

    await ctx.db.patch(args.mealId, {
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    });

    return ingredientId;
  },
});

/**
 * Remove meal ingredient
 */
export const removeMealIngredient = mutation({
  args: { id: v.id("mealIngredients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) throw new Error("Ingredient not found");

    await ctx.db.delete(args.id);

    // Recalculate meal nutrition
    const remainingIngredients = await ctx.db
      .query("mealIngredients")
      .withIndex("by_mealId", (q) => q.eq("mealId", ingredient.mealId))
      .collect();

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const ing of remainingIngredients) {
      const food = await ctx.db.get(ing.foodId);
      if (food) {
        const factor = ing.amount / 100;
        totalCalories += food.calories * factor;
        totalProtein += food.protein * factor;
        totalCarbs += food.carbs * factor;
        totalFat += food.fat * factor;
      }
    }

    await ctx.db.patch(ingredient.mealId, {
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    });

    return true;
  },
});

/**
 * Delete meal
 */
export const removeMeal = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Delete all ingredients first
    const ingredients = await ctx.db
      .query("mealIngredients")
      .withIndex("by_mealId", (q) => q.eq("mealId", args.id))
      .collect();

    for (const ing of ingredients) {
      await ctx.db.delete(ing._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Generate shopping list from meal plan
 */
export const generateShoppingList = mutation({
  args: {
    planId: v.id("mealPlans"),
    name: v.optional(v.string()),
    budget: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    // Get all meals in the plan
    const meals = await ctx.db
      .query("meals")
      .withIndex("by_planId", (q) => q.eq("planId", args.planId))
      .collect();

    // Aggregate ingredients
    const ingredientMap = new Map<string, { foodId: string; amount: number }>();

    for (const meal of meals) {
      const ingredients = await ctx.db
        .query("mealIngredients")
        .withIndex("by_mealId", (q) => q.eq("mealId", meal._id))
        .collect();

      for (const ing of ingredients) {
        const existing = ingredientMap.get(ing.foodId as string);
        if (existing) {
          existing.amount += ing.amount;
        } else {
          ingredientMap.set(ing.foodId as string, {
            foodId: ing.foodId as string,
            amount: ing.amount,
          });
        }
      }
    }

    // Create shopping list
    const listId = await ctx.db.insert("shoppingLists", {
      planId: args.planId,
      name: args.name ?? `Shopping List - ${new Date(plan.startDate).toLocaleDateString()}`,
      budget: args.budget,
      status: "PENDING",
    });

    // Add items to list
    for (const [, { foodId, amount }] of ingredientMap) {
      const food = await ctx.db.get(foodId as Id<"foods">);
      if (food) {
        await ctx.db.insert("shoppingItems", {
          listId,
          foodId: foodId as Id<"foods">,
          amount,
          category: food.category,
          purchased: false,
        });
      }
    }

    return listId;
  },
});

/**
 * Delete meal plan (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});

// Import Id type for type assertions
import { Id } from "./_generated/dataModel";
