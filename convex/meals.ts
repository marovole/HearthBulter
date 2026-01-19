import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const loadMealIngredients = async (ctx: { db: any }, mealIds: string[]) => {
  const ingredientsByMeal = new Map<string, any[]>();

  for (const mealId of mealIds) {
    const ingredients = await ctx.db
      .query("mealIngredients")
      .withIndex("by_meal", (q: any) => q.eq("mealId", mealId))
      .collect();
    ingredientsByMeal.set(mealId, ingredients);
  }

  return ingredientsByMeal;
};

const loadFoods = async (ctx: { db: any }, foodIds: string[]) => {
  const foods = new Map<string, any>();
  const uniqueFoodIds = Array.from(new Set(foodIds));

  await Promise.all(
    uniqueFoodIds.map(async (foodId) => {
      const food = await ctx.db.get(foodId);
      if (food) {
        foods.set(foodId, food);
      }
    }),
  );

  return foods;
};

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

export const getPlanById = query({
  args: { planId: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.deletedAt) {
      return null;
    }
    return plan;
  },
});

export const getActivePlanByMember = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const activePlan = plans.find((plan) => plan.status === "ACTIVE");
    return activePlan ?? null;
  },
});

export const getPlanDetails = query({
  args: { planId: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.deletedAt) {
      return null;
    }

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const mealIds = meals.map((meal) => meal._id);
    const ingredientsByMeal = await loadMealIngredients(ctx, mealIds);
    const allIngredients = Array.from(ingredientsByMeal.values()).flat();
    const foodIds = allIngredients.map((ingredient) => ingredient.foodId);
    const foods = await loadFoods(ctx, foodIds);

    const mealsWithIngredients = meals.map((meal) => {
      const ingredients = (ingredientsByMeal.get(meal._id) ?? []).map(
        (ingredient) => ({
          ...ingredient,
          food: foods.get(ingredient.foodId),
        }),
      );
      return { ...meal, ingredients };
    });

    return { plan, meals: mealsWithIngredients };
  },
});

export const listByMembers = query({
  args: { memberIds: v.array(v.id("familyMembers")) },
  handler: async (ctx, args) => {
    const memberSet = new Set(args.memberIds);
    const plans = await ctx.db.query("mealPlans").collect();

    return plans.filter(
      (plan) => memberSet.has(plan.memberId) && !plan.deletedAt,
    );
  },
});

export const listPlansByMember = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const results = [];
    for (const plan of plans) {
      const meals = await ctx.db
        .query("meals")
        .withIndex("by_plan", (q) => q.eq("planId", plan._id))
        .collect();
      results.push({ ...plan, mealCount: meals.length });
    }

    return results;
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

export const createPlanWithMeals = mutation({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.number(),
    endDate: v.number(),
    goalType: v.string(),
    targetCalories: v.number(),
    targetProtein: v.number(),
    targetCarbs: v.number(),
    targetFat: v.number(),
    meals: v.array(
      v.object({
        date: v.number(),
        mealType: v.union(
          v.literal("BREAKFAST"),
          v.literal("LUNCH"),
          v.literal("DINNER"),
          v.literal("SNACK"),
        ),
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
        recipeId: v.optional(v.id("recipes")),
        ingredients: v.optional(
          v.array(
            v.object({
              foodId: v.id("foods"),
              amount: v.number(),
            }),
          ),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const planId = await ctx.db.insert("mealPlans", {
      memberId: args.memberId,
      startDate: args.startDate,
      endDate: args.endDate,
      goalType: args.goalType,
      targetCalories: args.targetCalories,
      targetProtein: args.targetProtein,
      targetCarbs: args.targetCarbs,
      targetFat: args.targetFat,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    const mealIds: string[] = [];
    for (const meal of args.meals) {
      const mealId = await ctx.db.insert("meals", {
        planId,
        date: meal.date,
        mealType: meal.mealType,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        recipeId: meal.recipeId,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
      });
      mealIds.push(mealId);

      if (meal.ingredients?.length) {
        for (const ingredient of meal.ingredients) {
          await ctx.db.insert("mealIngredients", {
            mealId,
            foodId: ingredient.foodId,
            amount: ingredient.amount,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return { planId, mealIds };
  },
});

export const createMeal = mutation({
  args: {
    planId: v.id("mealPlans"),
    date: v.number(),
    mealType: v.union(
      v.literal("BREAKFAST"),
      v.literal("LUNCH"),
      v.literal("DINNER"),
      v.literal("SNACK"),
    ),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    recipeId: v.optional(v.id("recipes")),
    ingredients: v.optional(
      v.array(
        v.object({
          foodId: v.id("foods"),
          amount: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const mealId = await ctx.db.insert("meals", {
      planId: args.planId,
      date: args.date,
      mealType: args.mealType,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      recipeId: args.recipeId,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    });

    if (args.ingredients?.length) {
      for (const ingredient of args.ingredients) {
        await ctx.db.insert("mealIngredients", {
          mealId,
          foodId: ingredient.foodId,
          amount: ingredient.amount,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return mealId;
  },
});

export const deletePlan = mutation({
  args: { planId: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.planId, {
      deletedAt: now,
      status: "CANCELLED",
      updatedAt: now,
    });
    return args.planId;
  },
});

export const updateMealFavorite = mutation({
  args: { mealId: v.id("meals"), isFavorite: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mealId, {
      isFavorite: args.isFavorite,
      updatedAt: Date.now(),
    });
    return args.mealId;
  },
});

export const getMealIngredientById = query({
  args: { ingredientId: v.id("mealIngredients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.ingredientId);
  },
});

export const listMealIngredients = query({
  args: { mealId: v.id("meals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mealIngredients")
      .withIndex("by_meal", (q) => q.eq("mealId", args.mealId))
      .collect();
  },
});

export const updateMealIngredient = mutation({
  args: {
    ingredientId: v.id("mealIngredients"),
    foodId: v.id("foods"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ingredientId, {
      foodId: args.foodId,
      amount: args.amount,
      updatedAt: Date.now(),
    });
    return args.ingredientId;
  },
});

export const getMealById = query({
  args: { mealId: v.id("meals") },
  handler: async (ctx, args) => {
    const meal = await ctx.db.get(args.mealId);
    if (!meal) {
      return null;
    }
    return meal;
  },
});

export const updateMeal = mutation({
  args: {
    mealId: v.id("meals"),
    mealType: v.optional(
      v.union(
        v.literal("BREAKFAST"),
        v.literal("LUNCH"),
        v.literal("DINNER"),
        v.literal("SNACK"),
      ),
    ),
    recipeId: v.optional(v.id("recipes")),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    ingredients: v.optional(
      v.array(
        v.object({
          foodId: v.id("foods"),
          amount: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const mealType = args.mealType as
      | "BREAKFAST"
      | "LUNCH"
      | "DINNER"
      | "SNACK"
      | undefined;

    await ctx.db.patch(args.mealId, {
      mealType,
      recipeId: args.recipeId,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      updatedAt: now,
    });

    if (args.ingredients) {
      const existingIngredients = await ctx.db
        .query("mealIngredients")
        .withIndex("by_meal", (q) => q.eq("mealId", args.mealId))
        .collect();

      for (const ingredient of existingIngredients) {
        await ctx.db.delete(ingredient._id);
      }

      for (const ingredient of args.ingredients) {
        await ctx.db.insert("mealIngredients", {
          mealId: args.mealId,
          foodId: ingredient.foodId,
          amount: ingredient.amount,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return args.mealId;
  },
});
