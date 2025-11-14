/**
 * Supabase MealPlanRepository 实现
 *
 * 提供基于 Supabase 的膳食计划数据访问
 * 当前实现状态：部分实现，关键查询和删除方法已完成
 *
 * @module supabase-meal-plan-repository
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MealPlanRepository } from '../interfaces/meal-plan-repository';
import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  MealPlanDTO,
  MealPlanCreateInputDTO,
  MealPlanUpdateInputDTO,
  MealPlanFilterDTO,
  MealDTO,
  MealCreateInputDTO,
  MealUpdateInputDTO,
  MealIngredientCreateInputDTO,
} from '../types/meal-plan';

/**
 * SupabaseMealPlanRepository
 *
 * 部分实现版本，核心查询方法已完成
 */
export class SupabaseMealPlanRepository implements MealPlanRepository {
  constructor(private client: SupabaseClient) {}

  async createMealPlan(_input: MealPlanCreateInputDTO): Promise<MealPlanDTO> {
    throw new Error('SupabaseMealPlanRepository.createMealPlan not fully implemented yet');
  }

  async getMealPlanById(id: string): Promise<MealPlanDTO | null> {
    const { data, error } = await this.client
      .from('meal_plans')
      .select(`
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `)
      .eq('id', id)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // 转换为 DTO
    return this.toMealPlanDTO(data);
  }

  async listMealPlans(
    filter?: MealPlanFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealPlanDTO>> {
    let query = this.client
      .from('meal_plans')
      .select(`
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `, { count: 'exact' });

    // 应用过滤条件
    if (filter?.memberId) {
      query = query.eq('memberId', filter.memberId);
    }
    if (filter?.goalType) {
      query = query.eq('goalType', filter.goalType);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (!filter?.includeDeleted) {
      query = query.is('deletedAt', null);
    }

    // 时间范围过滤
    if (filter?.startDate) {
      query = query.gte('endDate', filter.startDate.toISOString());
    }
    if (filter?.endDate) {
      query = query.lte('startDate', filter.endDate.toISOString());
    }

    // 分页
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1).order('createdAt', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map(plan => this.toMealPlanDTO(plan)),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async updateMealPlan(_id: string, _input: MealPlanUpdateInputDTO): Promise<MealPlanDTO> {
    throw new Error('SupabaseMealPlanRepository.updateMealPlan not fully implemented yet');
  }

  async deleteMealPlan(id: string): Promise<void> {
    const { error } = await this.client
      .from('meal_plans')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async createMeal(_planId: string, _input: MealCreateInputDTO): Promise<MealDTO> {
    throw new Error('SupabaseMealPlanRepository.createMeal not fully implemented yet');
  }

  async getMealById(_id: string): Promise<MealDTO | null> {
    throw new Error('SupabaseMealPlanRepository.getMealById not fully implemented yet');
  }

  async updateMeal(_id: string, _input: MealUpdateInputDTO): Promise<MealDTO> {
    throw new Error('SupabaseMealPlanRepository.updateMeal not fully implemented yet');
  }

  async deleteMeal(_id: string): Promise<void> {
    throw new Error('SupabaseMealPlanRepository.deleteMeal not fully implemented yet');
  }

  async updateMealIngredients(
    _mealId: string,
    _ingredients: MealIngredientCreateInputDTO[]
  ): Promise<MealDTO> {
    throw new Error('SupabaseMealPlanRepository.updateMealIngredients not fully implemented yet');
  }

  async getActivePlanByMember(memberId: string): Promise<MealPlanDTO | null> {
    const now = new Date();
    const { data, error } = await this.client
      .from('meal_plans')
      .select(`
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `)
      .eq('memberId', memberId)
      .eq('status', 'ACTIVE')
      .is('deletedAt', null)
      .lte('startDate', now.toISOString())
      .gte('endDate', now.toISOString())
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.toMealPlanDTO(data);
  }

  async getPlansByDateRange(
    memberId: string,
    startDate: Date,
    endDate: Date,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealPlanDTO>> {
    let query = this.client
      .from('meal_plans')
      .select(`
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `, { count: 'exact' })
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .lte('startDate', endDate.toISOString())
      .gte('endDate', startDate.toISOString());

    // 分页
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1).order('startDate', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map(plan => this.toMealPlanDTO(plan)),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * 转换 Supabase 数据为 DTO
   */
  private toMealPlanDTO(data: any): MealPlanDTO {
    return {
      id: data.id,
      memberId: data.memberId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      goalType: data.goalType,
      targetCalories: data.targetCalories,
      targetProtein: data.targetProtein,
      targetCarbs: data.targetCarbs,
      targetFat: data.targetFat,
      status: data.status,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      meals: (data.meals || []).map((meal: any) => ({
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
        ingredients: (meal.ingredients || []).map((ing: any) => ({
          id: ing.id,
          mealId: ing.mealId,
          foodId: ing.foodId,
          amount: ing.amount,
        })),
      })),
    };
  }
}
