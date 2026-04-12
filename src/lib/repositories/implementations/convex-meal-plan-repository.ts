/**
 * Convex 膳食计划 Repository 实现
 *
 * 基于 Convex 实现膳食计划（MealPlan）、餐次（Meal）、食材（MealIngredient）的
 * 统一数据访问层。
 *
 * @module convex-meal-plan-repository
 */

import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  MealPlanDTO,
  MealPlanCreateInputDTO,
  MealPlanUpdateInputDTO,
  MealPlanFilterDTO,
  MealDTO,
  MealCreateInputDTO,
  MealUpdateInputDTO,
  MealIngredientCreateInputDTO,
} from "../types/meal-plan";
import type { MealPlanRepository } from "../interfaces/meal-plan-repository";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexMutationReference, asConvexQueryReference } from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

// ==================== Convex 文档类型 ====================

type MealPlanDoc = Doc<"mealPlans"> & {
  memberId: Id<"familyMembers">;
  startDate: number;
  endDate: number;
  goalType: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  status: string;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

type MealDoc = Doc<"meals"> & {
  planId: Id<"mealPlans">;
  date: number;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipeId?: Id<"recipes">;
  isFavorite?: boolean;
  createdAt: number;
  updatedAt: number;
};

type MealIngredientDoc = Doc<"mealIngredients"> & {
  mealId: Id<"meals">;
  foodId: Id<"foods">;
  amount: number;
  createdAt: number;
  updatedAt: number;
};

// getPlanDetails 返回结构
type PlanDetailsResult = {
  plan: MealPlanDoc;
  meals: (MealDoc & {
    ingredients: (MealIngredientDoc & { food?: any })[];
  })[];
};

export class ConvexMealPlanRepository implements MealPlanRepository {
  // ==================== 计划 CRUD ====================

  async createMealPlan(input: MealPlanCreateInputDTO): Promise<MealPlanDTO> {
    if (input.endDate <= input.startDate) {
      throw new Error("Meal plan endDate must be later than startDate");
    }

    const meals = (input.meals ?? []).map((m) => ({
      date: m.date.getTime(),
      mealType: m.mealType,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      ingredients: m.ingredients?.map((ing) => ({
        foodId: ing.foodId as Id<"foods">,
        amount: ing.amount,
      })),
    }));

    const result = await convexClient.mutation<{
      planId: Id<"mealPlans">;
      mealIds: Id<"meals">[];
    }>(api.meals.createPlanWithMeals, {
      memberId: input.memberId as Id<"familyMembers">,
      startDate: input.startDate.getTime(),
      endDate: input.endDate.getTime(),
      goalType: input.goalType,
      targetCalories: input.targetCalories,
      targetProtein: input.targetProtein,
      targetCarbs: input.targetCarbs,
      targetFat: input.targetFat,
      meals,
    });

    const created = await this.getMealPlanById(result.planId as string);
    if (!created) throw new Error("Unable to retrieve created meal plan");
    return created;
  }

  async getMealPlanById(id: string): Promise<MealPlanDTO | null> {
    const details = await convexClient.query<PlanDetailsResult | null>(api.meals.getPlanDetails, {
      planId: id as Id<"mealPlans">,
    });

    if (!details) return null;
    return this.mapPlanDetails(details);
  }

  async listMealPlans(
    filter?: MealPlanFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealPlanDTO>> {
    // Convex: 按 memberId 查询，客户端过滤 + 分页
    const memberId = filter?.memberId;
    if (!memberId) {
      // 无 memberId 时返回空——Convex 没有全局列表接口
      return { items: [], total: 0, hasMore: false };
    }

    const plans = await convexClient.query<(MealPlanDoc & { mealCount?: number })[]>(
      api.meals.listPlansByMember,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );

    // 客户端过滤
    let filtered = plans;
    if (filter?.goalType) filtered = filtered.filter((p) => p.goalType === filter.goalType);
    if (filter?.status) filtered = filtered.filter((p) => p.status === filter.status);
    if (!filter?.includeDeleted) filtered = filtered.filter((p) => !p.deletedAt);

    // 排序：最新创建的在前
    filtered.sort((a, b) => b.createdAt - a.createdAt);

    // 客户端分页
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 10;
    const paginated = filtered.slice(offset, offset + limit);

    // 逐个获取详情（含 meals + ingredients）
    const items: MealPlanDTO[] = [];
    for (const p of paginated) {
      const detail = await this.getMealPlanById(p._id as string);
      if (detail) items.push(detail);
    }

    return {
      items,
      total: filtered.length,
      hasMore: offset + items.length < filtered.length,
    };
  }

  async updateMealPlan(id: string, input: MealPlanUpdateInputDTO): Promise<MealPlanDTO> {
    const existing = await convexClient.query<MealPlanDoc | null>(api.meals.getPlanById, {
      planId: id as Id<"mealPlans">,
    });

    if (!existing) throw new Error(`Meal plan with id ${id} not found`);

    const newStart = input.startDate ?? new Date(existing.startDate);
    const newEnd = input.endDate ?? new Date(existing.endDate);

    if (newEnd <= newStart) {
      throw new Error("Meal plan endDate must be later than startDate");
    }

    const patch: Record<string, unknown> = {};
    if (input.startDate) patch.startDate = input.startDate.getTime();
    if (input.endDate) patch.endDate = input.endDate.getTime();
    if (input.goalType) patch.goalType = input.goalType;
    if (input.targetCalories !== undefined) patch.targetCalories = input.targetCalories;
    if (input.targetProtein !== undefined) patch.targetProtein = input.targetProtein;
    if (input.targetCarbs !== undefined) patch.targetCarbs = input.targetCarbs;
    if (input.targetFat !== undefined) patch.targetFat = input.targetFat;
    if (input.status) patch.status = input.status;

    await convexClient.mutation(asConvexMutationReference("meals:updatePlan"), {
      planId: id as Id<"mealPlans">,
      patch,
    });

    const updated = await this.getMealPlanById(id);
    if (!updated) throw new Error("Failed to retrieve updated meal plan");
    return updated;
  }

  async deleteMealPlan(id: string): Promise<void> {
    await convexClient.mutation(api.meals.deletePlan, {
      planId: id as Id<"mealPlans">,
    });
  }

  // ==================== 餐次 CRUD ====================

  async createMeal(planId: string, input: MealCreateInputDTO): Promise<MealDTO> {
    const plan = await convexClient.query<MealPlanDoc | null>(api.meals.getPlanById, {
      planId: planId as Id<"mealPlans">,
    });

    if (!plan) throw new Error(`Meal plan with id ${planId} not found`);

    const planStart = new Date(plan.startDate);
    const planEnd = new Date(plan.endDate);

    if (input.date < planStart || input.date > planEnd) {
      throw new Error("Meal date must be within plan period");
    }

    const mealId = await convexClient.mutation(api.meals.createMeal, {
      planId: planId as Id<"mealPlans">,
      date: input.date.getTime(),
      mealType: input.mealType,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      ingredients: input.ingredients?.map((ing) => ({
        foodId: ing.foodId as Id<"foods">,
        amount: ing.amount,
      })),
    });

    const meal = await this.getMealById(mealId as string);
    if (!meal) throw new Error("Unable to retrieve created meal");
    return meal;
  }

  async getMealById(id: string): Promise<MealDTO | null> {
    const meal = await convexClient.query<MealDoc | null>(api.meals.getMealById, {
      mealId: id as Id<"meals">,
    });

    if (!meal) return null;

    const ingredients = await convexClient.query<MealIngredientDoc[]>(
      api.meals.listMealIngredients,
      { mealId: id as Id<"meals"> }
    );

    return this.mapMeal(meal, ingredients);
  }

  async updateMeal(id: string, input: MealUpdateInputDTO): Promise<MealDTO> {
    // updateMeal 需要 calories/protein/carbs/fat（Convex 必填）
    // 先获取当前值作为默认
    const current = await convexClient.query<MealDoc | null>(api.meals.getMealById, {
      mealId: id as Id<"meals">,
    });

    if (!current) throw new Error(`Meal with id ${id} not found`);

    await convexClient.mutation(api.meals.updateMeal, {
      mealId: id as Id<"meals">,
      mealType: input.mealType,
      calories: input.calories ?? current.calories,
      protein: input.protein ?? current.protein,
      carbs: input.carbs ?? current.carbs,
      fat: input.fat ?? current.fat,
      ingredients: input.ingredients?.map((ing) => ({
        foodId: ing.foodId as Id<"foods">,
        amount: ing.amount,
      })),
    });

    const updated = await this.getMealById(id);
    if (!updated) throw new Error("Failed to retrieve updated meal");
    return updated;
  }

  async deleteMeal(id: string): Promise<void> {
    await convexClient.mutation(asConvexMutationReference("meals:deleteMeal"), {
      mealId: id as Id<"meals">,
    });
  }

  async updateMealIngredients(
    mealId: string,
    ingredients: MealIngredientCreateInputDTO[]
  ): Promise<MealDTO> {
    const current = await convexClient.query<MealDoc | null>(api.meals.getMealById, {
      mealId: mealId as Id<"meals">,
    });

    if (!current) throw new Error(`Meal with id ${mealId} not found`);

    await convexClient.mutation(api.meals.updateMeal, {
      mealId: mealId as Id<"meals">,
      mealType: current.mealType as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
      calories: current.calories,
      protein: current.protein,
      carbs: current.carbs,
      fat: current.fat,
      ingredients: ingredients.map((ing) => ({
        foodId: ing.foodId as Id<"foods">,
        amount: ing.amount,
      })),
    });

    const updated = await this.getMealById(mealId);
    if (!updated) throw new Error("Failed to retrieve updated meal");
    return updated;
  }

  // ==================== 特殊查询 ====================

  async getActivePlanByMember(memberId: string): Promise<MealPlanDTO | null> {
    const plan = await convexClient.query<MealPlanDoc | null>(api.meals.getActivePlanByMember, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!plan) return null;
    return this.getMealPlanById(plan._id as string);
  }

  async getPlansByDateRange(
    memberId: string,
    startDate: Date,
    endDate: Date,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealPlanDTO>> {
    const plans = await convexClient.query<(MealPlanDoc & { mealCount?: number })[]>(
      api.meals.listPlansByMember,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );

    // 客户端日期过滤：计划与查询范围有重叠
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const filtered = plans.filter(
      (p) => !p.deletedAt && p.startDate <= endMs && p.endDate >= startMs
    );

    // 按开始日期降序
    filtered.sort((a, b) => b.startDate - a.startDate);

    // 客户端分页
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 10;
    const paginated = filtered.slice(offset, offset + limit);

    const items: MealPlanDTO[] = [];
    for (const p of paginated) {
      const detail = await this.getMealPlanById(p._id as string);
      if (detail) items.push(detail);
    }

    return {
      items,
      total: filtered.length,
      hasMore: offset + items.length < filtered.length,
    };
  }

  // ==================== 辅助映射 ====================

  private mapPlanDetails(details: PlanDetailsResult): MealPlanDTO {
    const { plan, meals } = details;

    return {
      id: plan._id as string,
      memberId: plan.memberId as string,
      startDate: new Date(plan.startDate),
      endDate: new Date(plan.endDate),
      goalType: plan.goalType as "LOSE_WEIGHT" | "GAIN_MUSCLE" | "MAINTAIN" | "IMPROVE_HEALTH",
      targetCalories: plan.targetCalories,
      targetProtein: plan.targetProtein,
      targetCarbs: plan.targetCarbs,
      targetFat: plan.targetFat,
      status: plan.status as "ACTIVE" | "COMPLETED" | "CANCELLED",
      createdAt: new Date(plan.createdAt),
      updatedAt: new Date(plan.updatedAt),
      deletedAt: plan.deletedAt ? new Date(plan.deletedAt) : null,
      meals: meals.map((m) =>
        this.mapMeal(
          m,
          m.ingredients.map((ing) => ing as MealIngredientDoc)
        )
      ),
    };
  }

  private mapMeal(meal: MealDoc, ingredients: MealIngredientDoc[]): MealDTO {
    return {
      id: meal._id as string,
      planId: meal.planId as string,
      date: new Date(meal.date),
      mealType: meal.mealType as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      createdAt: new Date(meal.createdAt),
      updatedAt: new Date(meal.updatedAt),
      ingredients: ingredients.map((ing) => ({
        id: ing._id as string,
        mealId: ing.mealId as string,
        foodId: ing.foodId as string,
        amount: ing.amount,
      })),
    };
  }
}
