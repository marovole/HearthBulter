/**
 * Prisma MealPlanRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-meal-plan-repository
 */

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

/**
 * PrismaMealPlanRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaMealPlanRepository implements MealPlanRepository {
  async createMealPlan(_input: MealPlanCreateInputDTO): Promise<MealPlanDTO> {
    throw new Error("PrismaMealPlanRepository.createMealPlan not implemented");
  }

  async getMealPlanById(_id: string): Promise<MealPlanDTO | null> {
    throw new Error("PrismaMealPlanRepository.getMealPlanById not implemented");
  }

  async listMealPlans(
    _filter?: MealPlanFilterDTO,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealPlanDTO>> {
    throw new Error("PrismaMealPlanRepository.listMealPlans not implemented");
  }

  async updateMealPlan(
    _id: string,
    _input: MealPlanUpdateInputDTO,
  ): Promise<MealPlanDTO> {
    throw new Error("PrismaMealPlanRepository.updateMealPlan not implemented");
  }

  async deleteMealPlan(_id: string): Promise<void> {
    throw new Error("PrismaMealPlanRepository.deleteMealPlan not implemented");
  }

  async createMeal(
    _planId: string,
    _input: MealCreateInputDTO,
  ): Promise<MealDTO> {
    throw new Error("PrismaMealPlanRepository.createMeal not implemented");
  }

  async getMealById(_id: string): Promise<MealDTO | null> {
    throw new Error("PrismaMealPlanRepository.getMealById not implemented");
  }

  async updateMeal(_id: string, _input: MealUpdateInputDTO): Promise<MealDTO> {
    throw new Error("PrismaMealPlanRepository.updateMeal not implemented");
  }

  async deleteMeal(_id: string): Promise<void> {
    throw new Error("PrismaMealPlanRepository.deleteMeal not implemented");
  }

  async updateMealIngredients(
    _mealId: string,
    _ingredients: MealIngredientCreateInputDTO[],
  ): Promise<MealDTO> {
    throw new Error(
      "PrismaMealPlanRepository.updateMealIngredients not implemented",
    );
  }

  async getActivePlanByMember(_memberId: string): Promise<MealPlanDTO | null> {
    throw new Error(
      "PrismaMealPlanRepository.getActivePlanByMember not implemented",
    );
  }

  async getPlansByDateRange(
    _memberId: string,
    _startDate: Date,
    _endDate: Date,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealPlanDTO>> {
    throw new Error(
      "PrismaMealPlanRepository.getPlansByDateRange not implemented",
    );
  }
}
