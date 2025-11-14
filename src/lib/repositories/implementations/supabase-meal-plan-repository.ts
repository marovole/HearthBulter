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

  async getMealById(id: string): Promise<MealDTO | null> {
    const { data, error } = await this.client
      .from('meals')
      .select(`
        *,
        ingredients:meal_ingredients(
          id,
          mealId,
          foodId,
          amount
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      planId: data.planId,
      date: new Date(data.date),
      mealType: data.mealType,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      ingredients: (data.ingredients || []).map((ing: any) => ({
        id: ing.id,
        mealId: ing.mealId,
        foodId: ing.foodId,
        amount: ing.amount,
      })),
    };
  }

  async updateMeal(id: string, input: MealUpdateInputDTO): Promise<MealDTO> {
    const updateData: any = {};

    if (input.date !== undefined) updateData.date = input.date.toISOString();
    if (input.mealType !== undefined) updateData.mealType = input.mealType;
    if (input.calories !== undefined) updateData.calories = input.calories;
    if (input.protein !== undefined) updateData.protein = input.protein;
    if (input.carbs !== undefined) updateData.carbs = input.carbs;
    if (input.fat !== undefined) updateData.fat = input.fat;

    // 更新 updatedAt 时间戳
    updateData.updatedAt = new Date().toISOString();

    const { data, error } = await this.client
      .from('meals')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        ingredients:meal_ingredients(
          id,
          mealId,
          foodId,
          amount
        )
      `)
      .single();

    if (error) throw error;

    // 如果提供了 ingredients，更新它们
    if (input.ingredients) {
      // 先删除所有现有 ingredients
      await this.client
        .from('meal_ingredients')
        .delete()
        .eq('mealId', id);

      // 插入新的 ingredients
      if (input.ingredients.length > 0) {
        const { error: insertError } = await this.client
          .from('meal_ingredients')
          .insert(
            input.ingredients.map(ing => ({
              mealId: id,
              foodId: ing.foodId,
              amount: ing.amount,
            }))
          );

        if (insertError) throw insertError;
      }

      // 重新查询以获取更新后的 ingredients
      const { data: updatedData, error: fetchError } = await this.client
        .from('meals')
        .select(`
          *,
          ingredients:meal_ingredients(
            id,
            mealId,
            foodId,
            amount
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return {
        id: updatedData.id,
        planId: updatedData.planId,
        date: new Date(updatedData.date),
        mealType: updatedData.mealType,
        calories: updatedData.calories,
        protein: updatedData.protein,
        carbs: updatedData.carbs,
        fat: updatedData.fat,
        createdAt: new Date(updatedData.createdAt),
        updatedAt: new Date(updatedData.updatedAt),
        ingredients: (updatedData.ingredients || []).map((ing: any) => ({
          id: ing.id,
          mealId: ing.mealId,
          foodId: ing.foodId,
          amount: ing.amount,
        })),
      };
    }

    return {
      id: data.id,
      planId: data.planId,
      date: new Date(data.date),
      mealType: data.mealType,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      ingredients: (data.ingredients || []).map((ing: any) => ({
        id: ing.id,
        mealId: ing.mealId,
        foodId: ing.foodId,
        amount: ing.amount,
      })),
    };
  }

  async deleteMeal(_id: string): Promise<void> {
    throw new Error('SupabaseMealPlanRepository.deleteMeal not fully implemented yet');
  }

  async updateMealIngredients(
    mealId: string,
    ingredients: MealIngredientCreateInputDTO[]
  ): Promise<MealDTO> {
    // 先删除所有现有 ingredients
    await this.client
      .from('meal_ingredients')
      .delete()
      .eq('mealId', mealId);

    // 插入新的 ingredients
    if (ingredients.length > 0) {
      const { error: insertError } = await this.client
        .from('meal_ingredients')
        .insert(
          ingredients.map(ing => ({
            mealId,
            foodId: ing.foodId,
            amount: ing.amount,
          }))
        );

      if (insertError) throw insertError;
    }

    // 查询更新后的 meal（包含新的 ingredients）
    const { data, error } = await this.client
      .from('meals')
      .select(`
        *,
        ingredients:meal_ingredients(
          id,
          mealId,
          foodId,
          amount
        )
      `)
      .eq('id', mealId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      planId: data.planId,
      date: new Date(data.date),
      mealType: data.mealType,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      ingredients: (data.ingredients || []).map((ing: any) => ({
        id: ing.id,
        mealId: ing.mealId,
        foodId: ing.foodId,
        amount: ing.amount,
      })),
    };
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
