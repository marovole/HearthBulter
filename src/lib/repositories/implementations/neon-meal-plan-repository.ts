// @ts-nocheck - Legacy migration: pending full type safety review
import { neonAdapter } from "@/lib/db/neon-adapter";
import type { MealPlanRepository } from "../interfaces/meal-plan-repository";
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

export class NeonMealPlanRepository implements MealPlanRepository {
  async createMealPlan(input: MealPlanCreateInputDTO): Promise<MealPlanDTO> {
    if (input.endDate <= input.startDate) {
      throw new Error("Meal plan endDate must be later than startDate");
    }

    const plan = await neonAdapter.mealPlan.create({
      data: {
        memberId: input.memberId,
        startDate: input.startDate,
        endDate: input.endDate,
        goalType: input.goalType,
        targetCalories: input.targetCalories,
        targetProtein: input.targetProtein,
        targetCarbs: input.targetCarbs,
        targetFat: input.targetFat,
        status: input.status ?? "ACTIVE",
      },
    });

    const meals = input.meals || [];
    for (const mealInput of meals) {
      if (mealInput.date < input.startDate || mealInput.date > input.endDate) {
        throw new Error(`Meal date ${mealInput.date.toISOString()} is outside plan period`);
      }

      const meal = await neonAdapter.meal.create({
        data: {
          planId: plan.id,
          date: mealInput.date,
          mealType: mealInput.mealType,
          calories: mealInput.calories,
          protein: mealInput.protein,
          carbs: mealInput.carbs,
          fat: mealInput.fat,
        },
      });

      if (mealInput.ingredients?.length) {
        for (const ing of mealInput.ingredients) {
          await neonAdapter.mealIngredient.create({
            data: {
              mealId: meal.id,
              foodId: ing.foodId,
              amount: ing.amount,
            },
          });
        }
      }
    }

    const createdPlan = await this.getMealPlanById(plan.id);
    if (!createdPlan) throw new Error("Unable to retrieve created meal plan");
    return createdPlan;
  }

  async getMealPlanById(id: string): Promise<MealPlanDTO | null> {
    const plan = await neonAdapter.mealPlan.findUnique({
      where: { id, deletedAt: null },
    });

    if (!plan) return null;

    const meals = await neonAdapter.meal.findMany({
      where: { planId: id },
    });

    const mealDTOs: MealDTO[] = [];
    for (const meal of meals || []) {
      const ingredients = await neonAdapter.mealIngredient.findMany({
        where: { mealId: meal.id },
      });

      mealDTOs.push({
        id: meal.id,
        planId: meal.planId,
        date: new Date(meal.date),
        mealType: meal.mealType,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        createdAt: new Date(meal.createdAt),
        updatedAt: new Date(meal.updatedAt),
        ingredients: (ingredients || []).map((ing: any) => ({
          id: ing.id,
          mealId: ing.mealId,
          foodId: ing.foodId,
          amount: ing.amount,
        })),
      });
    }

    return {
      id: plan.id,
      memberId: plan.memberId,
      startDate: new Date(plan.startDate),
      endDate: new Date(plan.endDate),
      goalType: plan.goalType,
      targetCalories: plan.targetCalories,
      targetProtein: plan.targetProtein,
      targetCarbs: plan.targetCarbs,
      targetFat: plan.targetFat,
      status: plan.status,
      createdAt: new Date(plan.createdAt),
      updatedAt: new Date(plan.updatedAt),
      deletedAt: plan.deletedAt ? new Date(plan.deletedAt) : null,
      meals: mealDTOs,
    };
  }

  async listMealPlans(
    filter?: MealPlanFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealPlanDTO>> {
    const where: any = {};
    if (!filter?.includeDeleted) where.deletedAt = null;
    if (filter?.memberId) where.memberId = filter.memberId;
    if (filter?.goalType) where.goalType = filter.goalType;
    if (filter?.status) where.status = filter.status;

    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const [plans, total] = await Promise.all([
      neonAdapter.mealPlan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      neonAdapter.mealPlan.count({ where }),
    ]);

    const items: MealPlanDTO[] = [];
    for (const plan of plans || []) {
      const fullPlan = await this.getMealPlanById(plan.id);
      if (fullPlan) items.push(fullPlan);
    }

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async updateMealPlan(id: string, input: MealPlanUpdateInputDTO): Promise<MealPlanDTO> {
    const existing = await neonAdapter.mealPlan.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) throw new Error(`Meal plan with id ${id} not found`);

    const newStart = input.startDate ?? new Date(existing.startDate);
    const newEnd = input.endDate ?? new Date(existing.endDate);

    if (newEnd <= newStart) {
      throw new Error("Meal plan endDate must be later than startDate");
    }

    const updateData: any = { updatedAt: new Date() };
    if (input.startDate) updateData.startDate = input.startDate;
    if (input.endDate) updateData.endDate = input.endDate;
    if (input.goalType) updateData.goalType = input.goalType;
    if (input.targetCalories !== undefined) updateData.targetCalories = input.targetCalories;
    if (input.targetProtein !== undefined) updateData.targetProtein = input.targetProtein;
    if (input.targetCarbs !== undefined) updateData.targetCarbs = input.targetCarbs;
    if (input.targetFat !== undefined) updateData.targetFat = input.targetFat;
    if (input.status) updateData.status = input.status;

    await neonAdapter.mealPlan.update({
      where: { id },
      data: updateData,
    });

    const updated = await this.getMealPlanById(id);
    if (!updated) throw new Error("Failed to retrieve updated meal plan");
    return updated;
  }

  async deleteMealPlan(id: string): Promise<void> {
    await neonAdapter.mealPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createMeal(planId: string, input: MealCreateInputDTO): Promise<MealDTO> {
    const plan = await neonAdapter.mealPlan.findUnique({
      where: { id: planId, deletedAt: null },
    });

    if (!plan) throw new Error(`Meal plan with id ${planId} not found`);

    const planStart = new Date(plan.startDate);
    const planEnd = new Date(plan.endDate);

    if (input.date < planStart || input.date > planEnd) {
      throw new Error("Meal date must be within plan period");
    }

    const meal = await neonAdapter.meal.create({
      data: {
        planId,
        date: input.date,
        mealType: input.mealType,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
      },
    });

    if (input.ingredients?.length) {
      for (const ing of input.ingredients) {
        await neonAdapter.mealIngredient.create({
          data: {
            mealId: meal.id,
            foodId: ing.foodId,
            amount: ing.amount,
          },
        });
      }
    }

    const mealDTO = await this.getMealById(meal.id);
    if (!mealDTO) throw new Error("Unable to retrieve created meal");
    return mealDTO;
  }

  async getMealById(id: string): Promise<MealDTO | null> {
    const meal = await neonAdapter.meal.findUnique({ where: { id } });
    if (!meal) return null;

    const ingredients = await neonAdapter.mealIngredient.findMany({
      where: { mealId: id },
    });

    return {
      id: meal.id,
      planId: meal.planId,
      date: new Date(meal.date),
      mealType: meal.mealType,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      createdAt: new Date(meal.createdAt),
      updatedAt: new Date(meal.updatedAt),
      ingredients: (ingredients || []).map((ing: any) => ({
        id: ing.id,
        mealId: ing.mealId,
        foodId: ing.foodId,
        amount: ing.amount,
      })),
    };
  }

  async updateMeal(id: string, input: MealUpdateInputDTO): Promise<MealDTO> {
    const updateData: any = { updatedAt: new Date() };
    if (input.date !== undefined) updateData.date = input.date;
    if (input.mealType !== undefined) updateData.mealType = input.mealType;
    if (input.calories !== undefined) updateData.calories = input.calories;
    if (input.protein !== undefined) updateData.protein = input.protein;
    if (input.carbs !== undefined) updateData.carbs = input.carbs;
    if (input.fat !== undefined) updateData.fat = input.fat;

    await neonAdapter.meal.update({ where: { id }, data: updateData });

    if (input.ingredients) {
      await neonAdapter.mealIngredient.deleteMany({ where: { mealId: id } });

      for (const ing of input.ingredients) {
        await neonAdapter.mealIngredient.create({
          data: {
            mealId: id,
            foodId: ing.foodId,
            amount: ing.amount,
          },
        });
      }
    }

    const updated = await this.getMealById(id);
    if (!updated) throw new Error("Failed to retrieve updated meal");
    return updated;
  }

  async deleteMeal(id: string): Promise<void> {
    await neonAdapter.mealIngredient.deleteMany({ where: { mealId: id } });
    await neonAdapter.meal.delete({ where: { id } });
  }

  async updateMealIngredients(
    mealId: string,
    ingredients: MealIngredientCreateInputDTO[]
  ): Promise<MealDTO> {
    await neonAdapter.mealIngredient.deleteMany({ where: { mealId } });

    for (const ing of ingredients) {
      await neonAdapter.mealIngredient.create({
        data: {
          mealId,
          foodId: ing.foodId,
          amount: ing.amount,
        },
      });
    }

    const updated = await this.getMealById(mealId);
    if (!updated) throw new Error("Failed to retrieve updated meal");
    return updated;
  }

  async getActivePlanByMember(memberId: string): Promise<MealPlanDTO | null> {
    const now = new Date();

    const plan = await neonAdapter.mealPlan.findFirst({
      where: {
        memberId,
        status: "ACTIVE",
        deletedAt: null,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!plan) return null;
    return this.getMealPlanById(plan.id);
  }

  async getPlansByDateRange(
    memberId: string,
    startDate: Date,
    endDate: Date,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealPlanDTO>> {
    const where: any = {
      memberId,
      deletedAt: null,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };

    const limit = pagination?.limit || 10;
    const offset = pagination?.offset || 0;

    const [plans, total] = await Promise.all([
      neonAdapter.mealPlan.findMany({
        where,
        orderBy: { startDate: "desc" },
        take: limit,
        skip: offset,
      }),
      neonAdapter.mealPlan.count({ where }),
    ]);

    const items: MealPlanDTO[] = [];
    for (const plan of plans || []) {
      const fullPlan = await this.getMealPlanById(plan.id);
      if (fullPlan) items.push(fullPlan);
    }

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }
}
