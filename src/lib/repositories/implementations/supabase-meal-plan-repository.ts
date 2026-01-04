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

  /**
   * 创建膳食计划
   *
   * 支持同时创建计划及其关联的餐次和食材
   *
   * @param input - 膳食计划创建输入
   * @returns 创建的完整膳食计划（包含餐次和食材）
   * @throws 如果日期验证失败或数据库操作失败
   */
  async createMealPlan(input: MealPlanCreateInputDTO): Promise<MealPlanDTO> {
    // 日期验证
    if (input.endDate <= input.startDate) {
      throw new Error('Meal plan endDate must be later than startDate');
    }

    // 创建主计划
    const { data: planRow, error: planError } = await this.client
      .from('meal_plans')
      .insert({
        memberId: input.memberId,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
        goalType: input.goalType,
        targetCalories: input.targetCalories,
        targetProtein: input.targetProtein,
        targetCarbs: input.targetCarbs,
        targetFat: input.targetFat,
        status: input.status ?? 'ACTIVE',
      })
      .select('id')
      .single();

    if (planError) throw planError;
    if (!planRow) throw new Error('Failed to create meal plan');

    // 如果有初始餐次，逐个创建以确保正确的食材关联
    // 注意：使用逐个插入而非批量插入，以避免依赖 Supabase 的返回顺序
    const meals = input.meals || [];
    if (meals.length > 0) {
      try {
        for (const mealInput of meals) {
          // 验证餐次日期在计划范围内
          if (
            mealInput.date < input.startDate ||
            mealInput.date > input.endDate
          ) {
            throw new Error(
              `Meal date ${mealInput.date.toISOString()} is outside plan period`,
            );
          }

          // 创建单个餐次
          const { data: createdMeal, error: mealError } = await this.client
            .from('meals')
            .insert({
              planId: planRow.id,
              date: mealInput.date.toISOString(),
              mealType: mealInput.mealType,
              calories: mealInput.calories,
              protein: mealInput.protein,
              carbs: mealInput.carbs,
              fat: mealInput.fat,
            })
            .select('id')
            .single();

          if (mealError) throw mealError;
          if (!createdMeal)
            throw new Error('Failed to create meal for the plan');

          // 立即为该餐次添加食材，确保正确关联
          if (mealInput.ingredients && mealInput.ingredients.length > 0) {
            const ingredientsData = mealInput.ingredients.map((ing) => ({
              mealId: createdMeal.id,
              foodId: ing.foodId,
              amount: ing.amount,
            }));

            const { error: ingredientsError } = await this.client
              .from('meal_ingredients')
              .insert(ingredientsData);

            if (ingredientsError) throw ingredientsError;
          }
        }
      } catch (error) {
        // 补偿删除：如果餐次或食材创建失败，删除已创建的计划
        // 注意：数据库配置了级联删除 (MealPlan -> Meal -> MealIngredient)
        // 因此删除计划会自动清理所有已创建的餐次和食材
        const { error: cleanupError } = await this.client
          .from('meal_plans')
          .delete()
          .eq('id', planRow.id);

        if (cleanupError) {
          // 记录清理失败，但仍抛出原始错误
          console.error(
            'Failed to cleanup meal plan after error:',
            cleanupError,
          );
        }

        throw error;
      }
    }

    // 查询完整的计划数据（包含餐次和食材）
    const createdPlan = await this.getMealPlanById(planRow.id);
    if (!createdPlan) {
      throw new Error('Unable to retrieve created meal plan');
    }

    return createdPlan;
  }

  async getMealPlanById(id: string): Promise<MealPlanDTO | null> {
    const { data, error } = await this.client
      .from('meal_plans')
      .select(
        `
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `,
      )
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
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealPlanDTO>> {
    let query = this.client.from('meal_plans').select(
      `
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `,
      { count: 'exact' },
    );

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

    query = query
      .range(offset, offset + limit - 1)
      .order('createdAt', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map((plan) => this.toMealPlanDTO(plan)),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  /**
   * 更新膳食计划
   *
   * 仅支持更新时间范围、目标营养和状态，不能变动餐次
   *
   * @param id - 计划 ID
   * @param input - 更新输入
   * @returns 更新后的完整膳食计划
   * @throws 如果计划不存在或日期验证失败
   */
  async updateMealPlan(
    id: string,
    input: MealPlanUpdateInputDTO,
  ): Promise<MealPlanDTO> {
    // 查询现有计划
    const { data: existingPlan, error: fetchError } = await this.client
      .from('meal_plans')
      .select('startDate, endDate')
      .eq('id', id)
      .is('deletedAt', null)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingPlan) throw new Error(`Meal plan with id ${id} not found`);

    // 计算新的日期范围
    const baseStart = new Date(existingPlan.startDate);
    const baseEnd = new Date(existingPlan.endDate);
    const newStart = input.startDate ?? baseStart;
    const newEnd = input.endDate ?? baseEnd;

    // 验证新的日期范围
    if (newEnd <= newStart) {
      throw new Error('Meal plan endDate must be later than startDate');
    }

    // 构建更新数据（仅包含提供的字段）
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (input.startDate) updateData.startDate = input.startDate.toISOString();
    if (input.endDate) updateData.endDate = input.endDate.toISOString();
    if (input.goalType) updateData.goalType = input.goalType;
    if (input.targetCalories !== undefined)
      updateData.targetCalories = input.targetCalories;
    if (input.targetProtein !== undefined)
      updateData.targetProtein = input.targetProtein;
    if (input.targetCarbs !== undefined)
      updateData.targetCarbs = input.targetCarbs;
    if (input.targetFat !== undefined) updateData.targetFat = input.targetFat;
    if (input.status) updateData.status = input.status;

    // 执行更新并获取完整数据
    const { data: updatedPlan, error: updateError } = await this.client
      .from('meal_plans')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `,
      )
      .single();

    if (updateError) throw updateError;
    if (!updatedPlan) throw new Error('Failed to retrieve updated meal plan');

    return this.toMealPlanDTO(updatedPlan);
  }

  async deleteMealPlan(id: string): Promise<void> {
    const { error } = await this.client
      .from('meal_plans')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * 创建餐次
   *
   * 在指定的膳食计划中创建新餐次，支持同时添加食材
   *
   * @param planId - 所属计划 ID
   * @param input - 餐次创建输入
   * @returns 创建的完整餐次（包含食材）
   * @throws 如果计划不存在或餐次日期不在计划范围内
   */
  async createMeal(
    planId: string,
    input: MealCreateInputDTO,
  ): Promise<MealDTO> {
    // 验证计划存在且未删除
    const { data: plan, error: planError } = await this.client
      .from('meal_plans')
      .select('startDate, endDate')
      .eq('id', planId)
      .is('deletedAt', null)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) throw new Error(`Meal plan with id ${planId} not found`);

    // 验证餐次日期在计划范围内
    const planStart = new Date(plan.startDate);
    const planEnd = new Date(plan.endDate);

    if (input.date < planStart || input.date > planEnd) {
      throw new Error(
        `Meal date ${input.date.toISOString()} must be within plan period ` +
          `(${planStart.toISOString()} to ${planEnd.toISOString()})`,
      );
    }

    // 创建餐次
    const { data: createdMeal, error: mealError } = await this.client
      .from('meals')
      .insert({
        planId,
        date: input.date.toISOString(),
        mealType: input.mealType,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
      })
      .select('id')
      .single();

    if (mealError) throw mealError;
    if (!createdMeal) throw new Error('Failed to create meal');

    // 如果有食材，批量添加
    if (input.ingredients && input.ingredients.length > 0) {
      const { error: ingredientError } = await this.client
        .from('meal_ingredients')
        .insert(
          input.ingredients.map((ing) => ({
            mealId: createdMeal.id,
            foodId: ing.foodId,
            amount: ing.amount,
          })),
        );

      if (ingredientError) throw ingredientError;
    }

    // 查询完整的餐次数据（包含食材）
    const mealDTO = await this.getMealById(createdMeal.id);
    if (!mealDTO) throw new Error('Unable to retrieve created meal');

    return mealDTO;
  }

  async getMealById(id: string): Promise<MealDTO | null> {
    const { data, error } = await this.client
      .from('meals')
      .select(
        `
        *,
        ingredients:meal_ingredients(
          id,
          mealId,
          foodId,
          amount
        )
      `,
      )
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
      .select(
        `
        *,
        ingredients:meal_ingredients(
          id,
          mealId,
          foodId,
          amount
        )
      `,
      )
      .single();

    if (error) throw error;

    // 如果提供了 ingredients，更新它们
    if (input.ingredients) {
      // 先删除所有现有 ingredients
      await this.client.from('meal_ingredients').delete().eq('mealId', id);

      // 插入新的 ingredients
      if (input.ingredients.length > 0) {
        const { error: insertError } = await this.client
          .from('meal_ingredients')
          .insert(
            input.ingredients.map((ing) => ({
              mealId: id,
              foodId: ing.foodId,
              amount: ing.amount,
            })),
          );

        if (insertError) throw insertError;
      }

      // 重新查询以获取更新后的 ingredients
      const { data: updatedData, error: fetchError } = await this.client
        .from('meals')
        .select(
          `
          *,
          ingredients:meal_ingredients(
            id,
            mealId,
            foodId,
            amount
          )
        `,
        )
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

  /**
   * 删除餐次
   *
   * 硬删除餐次及其所有关联的食材
   *
   * @param id - 餐次 ID
   * @throws 如果餐次不存在或删除失败
   */
  async deleteMeal(id: string): Promise<void> {
    // 先删除所有关联的食材
    const { error: ingredientError } = await this.client
      .from('meal_ingredients')
      .delete()
      .eq('mealId', id);

    if (ingredientError) throw ingredientError;

    // 删除餐次本身
    const { data, error } = await this.client
      .from('meals')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) throw error;

    // 验证餐次是否存在
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`Meal with id ${id} not found`);
    }
  }

  async updateMealIngredients(
    mealId: string,
    ingredients: MealIngredientCreateInputDTO[],
  ): Promise<MealDTO> {
    // 先删除所有现有 ingredients
    await this.client.from('meal_ingredients').delete().eq('mealId', mealId);

    // 插入新的 ingredients
    if (ingredients.length > 0) {
      const { error: insertError } = await this.client
        .from('meal_ingredients')
        .insert(
          ingredients.map((ing) => ({
            mealId,
            foodId: ing.foodId,
            amount: ing.amount,
          })),
        );

      if (insertError) throw insertError;
    }

    // 查询更新后的 meal（包含新的 ingredients）
    const { data, error } = await this.client
      .from('meals')
      .select(
        `
        *,
        ingredients:meal_ingredients(
          id,
          mealId,
          foodId,
          amount
        )
      `,
      )
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
      .select(
        `
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `,
      )
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
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealPlanDTO>> {
    let query = this.client
      .from('meal_plans')
      .select(
        `
        *,
        meals:meals(
          *,
          ingredients:meal_ingredients(
            *,
            food:foods(id, name)
          )
        )
      `,
        { count: 'exact' },
      )
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .lte('startDate', endDate.toISOString())
      .gte('endDate', startDate.toISOString());

    // 分页
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query = query
      .range(offset, offset + limit - 1)
      .order('startDate', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: (data || []).map((plan) => this.toMealPlanDTO(plan)),
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
