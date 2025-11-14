/**
 * Supabase 膳食追踪 Repository 实现
 *
 * 基于 Supabase PostgreSQL 实现膳食记录管理系统的数据访问层
 *
 * @module supabase-meal-tracking-repository
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { MealTrackingRepository } from '../interfaces/meal-tracking-repository';
import type {
  MealLogDTO,
  MealLogCreateInputDTO,
  MealLogUpdateInputDTO,
  MealLogFilterDTO,
  QuickTemplateDTO,
  QuickTemplateCreateInputDTO,
  TrackingStreakDTO,
  DailyNutritionSummaryDTO,
  NutritionCalculationInputDTO,
  NutritionCalculationResultDTO,
} from '../types/meal-tracking';
import type { PaginatedResult, PaginationInput } from '../types/common';

/**
 * Supabase 膳食追踪 Repository 实现
 */
export class SupabaseMealTrackingRepository implements MealTrackingRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = '[SupabaseMealTrackingRepository]';

  constructor(client: SupabaseClient<Database> = SupabaseClientManager.getInstance()) {
    this.client = client;
  }

  // ==================== CRUD 操作 ====================

  async createMealLog(input: MealLogCreateInputDTO): Promise<MealLogDTO> {
    // 1. 计算营养成分
    const nutrition = await this.calculateNutrition(input.foods);

    // 2. 创建膳食记录
    const { data: mealLog, error } = await this.client
      .from('meal_logs')
      .insert({
        member_id: input.memberId,
        date: input.date.toISOString(),
        meal_type: input.mealType,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        sugar: nutrition.sugar,
        sodium: nutrition.sodium,
        notes: input.notes ?? null,
        is_template: input.isTemplate ?? false,
        checked_at: new Date().toISOString(),
      } as any)
      .select('*')
      .single();

    if (error) this.handleError('createMealLog:insert', error);

    // 3. 创建食物明细
    const foodInserts = input.foods.map((food) => ({
      meal_log_id: mealLog!.id,
      food_id: food.foodId,
      amount: food.amount,
    }));

    await this.client.from('meal_log_foods').insert(foodInserts as any);

    // 4. 更新连续打卡
    await this.updateTrackingStreak(input.memberId, input.date);

    // 5. 返回完整的膳食记录
    return await this.getMealLogById(mealLog!.id) as MealLogDTO;
  }

  async updateMealLog(id: string, input: MealLogUpdateInputDTO): Promise<MealLogDTO> {
    const updateData: any = {};

    if (input.date) updateData.date = input.date.toISOString();
    if (input.mealType) updateData.meal_type = input.mealType;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isTemplate !== undefined) updateData.is_template = input.isTemplate;

    // 如果更新了食物列表，重新计算营养
    if (input.foods) {
      const nutrition = await this.calculateNutrition(input.foods);
      updateData.calories = nutrition.calories;
      updateData.protein = nutrition.protein;
      updateData.carbs = nutrition.carbs;
      updateData.fat = nutrition.fat;
      updateData.fiber = nutrition.fiber;
      updateData.sugar = nutrition.sugar;
      updateData.sodium = nutrition.sodium;

      // 删除旧的食物明细
      await this.client.from('meal_log_foods').delete().eq('meal_log_id', id);

      // 插入新的食物明细
      const foodInserts = input.foods.map((food) => ({
        meal_log_id: id,
        food_id: food.foodId,
        amount: food.amount,
      }));
      await this.client.from('meal_log_foods').insert(foodInserts as any);
    }

    const { error } = await this.client
      .from('meal_logs')
      .update(updateData)
      .eq('id', id);

    if (error) this.handleError('updateMealLog', error);

    return await this.getMealLogById(id) as MealLogDTO;
  }

  async getMealLogById(id: string): Promise<MealLogDTO | null> {
    const { data, error } = await this.client
      .from('meal_logs')
      .select(`
        *,
        foods:meal_log_foods(
          id,
          meal_log_id,
          food_id,
          amount,
          created_at,
          updated_at,
          food:foods(id, name, name_en, category, calories, protein, carbs, fat)
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') this.handleError('getMealLogById', error);
    return data ? this.mapMealLogRow(data as any) : null;
  }

  async listMealLogs(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealLogDTO>> {
    let query = this.client
      .from('meal_logs')
      .select(`
        *,
        foods:meal_log_foods(
          id,
          meal_log_id,
          food_id,
          amount,
          created_at,
          updated_at,
          food:foods(id, name, name_en, category, calories, protein, carbs, fat)
        )
      `, { count: 'exact' })
      .eq('member_id', memberId)
      .is('deleted_at', null);

    if (filter) {
      if (filter.startDate) query = query.gte('date', filter.startDate.toISOString());
      if (filter.endDate) query = query.lte('date', filter.endDate.toISOString());
      if (filter.mealType) query = query.eq('meal_type', filter.mealType);
      if (filter.isTemplate !== undefined) query = query.eq('is_template', filter.isTemplate);
    }

    query = query.order('date', { ascending: false });
    query = query.order('created_at', { ascending: false });

    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) this.handleError('listMealLogs', error);

    const items = (data || []).map((row) => this.mapMealLogRow(row as any));
    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < (count ?? 0) : false,
    };
  }

  async deleteMealLog(id: string): Promise<void> {
    const { error } = await this.client
      .from('meal_logs')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) this.handleError('deleteMealLog', error);
  }

  // ==================== 特殊查询 ====================

  async getTodayMealLogs(memberId: string): Promise<MealLogDTO[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.listMealLogs(
      memberId,
      {
        startDate: today,
        endDate: tomorrow,
      }
    );

    return result.items;
  }

  async getMealLogHistory(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealLogDTO>> {
    return this.listMealLogs(memberId, filter, pagination);
  }

  // ==================== 营养计算 ====================

  async calculateNutrition(foods: NutritionCalculationInputDTO): Promise<NutritionCalculationResultDTO> {
    const foodIds = foods.map((f) => f.foodId);
    const { data: foodData, error } = await this.client
      .from('foods')
      .select('id, calories, protein, carbs, fat, fiber, sugar, sodium')
      .in('id', foodIds);

    if (error) this.handleError('calculateNutrition', error);

    const foodMap = new Map(foodData!.map((f: any) => [f.id, f]));

    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    foods.forEach((food) => {
      const foodInfo = foodMap.get(food.foodId);
      if (!foodInfo) return;

      const ratio = food.amount / 100; // 营养数据基于100g
      nutrition.calories += (foodInfo.calories ?? 0) * ratio;
      nutrition.protein += (foodInfo.protein ?? 0) * ratio;
      nutrition.carbs += (foodInfo.carbs ?? 0) * ratio;
      nutrition.fat += (foodInfo.fat ?? 0) * ratio;
      nutrition.fiber += (foodInfo.fiber ?? 0) * ratio;
      nutrition.sugar += (foodInfo.sugar ?? 0) * ratio;
      nutrition.sodium += (foodInfo.sodium ?? 0) * ratio;
    });

    return nutrition;
  }

  async getDailySummary(memberId: string, date: Date): Promise<DailyNutritionSummaryDTO> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await this.getTodayMealLogs(memberId);

    const summary: DailyNutritionSummaryDTO = {
      date,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
      mealCounts: {
        BREAKFAST: 0,
        LUNCH: 0,
        DINNER: 0,
        SNACK: 0,
      },
    };

    logs.forEach((log) => {
      summary.totalCalories += log.calories;
      summary.totalProtein += log.protein;
      summary.totalCarbs += log.carbs;
      summary.totalFat += log.fat;
      summary.totalFiber! += log.fiber ?? 0;
      summary.totalSugar! += log.sugar ?? 0;
      summary.totalSodium! += log.sodium ?? 0;
      summary.mealCounts[log.mealType]++;
    });

    return summary;
  }

  // ==================== 快速模板 ====================

  async createQuickTemplate(input: QuickTemplateCreateInputDTO): Promise<QuickTemplateDTO> {
    const mealLog = await this.getMealLogById(input.mealLogId);
    if (!mealLog) throw new Error('Meal log not found');

    const { data, error } = await this.client
      .from('quick_templates')
      .insert({
        member_id: input.memberId,
        name: input.name,
        description: input.description ?? null,
        meal_type: input.mealType,
        calories: mealLog.calories,
        protein: mealLog.protein,
        carbs: mealLog.carbs,
        fat: mealLog.fat,
      } as any)
      .select('*')
      .single();

    if (error) this.handleError('createQuickTemplate', error);
    return this.mapQuickTemplateRow(data!);
  }

  async listQuickTemplates(memberId: string, mealType?: string): Promise<QuickTemplateDTO[]> {
    let query = this.client
      .from('quick_templates')
      .select('*')
      .eq('member_id', memberId)
      .is('deleted_at', null);

    if (mealType) query = query.eq('meal_type', mealType);

    query = query.order('use_count', { ascending: false });
    query = query.order('last_used', { ascending: false, nullsFirst: false });

    const { data, error } = await query;
    if (error) this.handleError('listQuickTemplates', error);

    return (data || []).map((row: any) => this.mapQuickTemplateRow(row));
  }

  async useQuickTemplate(templateId: string, date: Date): Promise<MealLogDTO> {
    throw new Error('Method not implemented: useQuickTemplate');
  }

  async deleteQuickTemplate(id: string): Promise<void> {
    const { error } = await this.client
      .from('quick_templates')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) this.handleError('deleteQuickTemplate', error);
  }

  // ==================== 连续打卡统计 ====================

  async getTrackingStreak(memberId: string): Promise<TrackingStreakDTO> {
    const { data, error } = await this.client
      .from('tracking_streaks')
      .select('*')
      .eq('member_id', memberId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') this.handleError('getTrackingStreak', error);

    if (!data) {
      return {
        id: '',
        memberId,
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        badges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return this.mapTrackingStreakRow(data as any);
  }

  async updateTrackingStreak(memberId: string, date: Date): Promise<TrackingStreakDTO> {
    const existing = await this.getTrackingStreak(memberId);
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    let currentStreak = existing.currentStreak;
    let totalDays = existing.totalDays;

    if (existing.lastCheckIn) {
      const lastCheckIn = new Date(existing.lastCheckIn);
      lastCheckIn.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        currentStreak++;
      } else if (daysDiff > 1) {
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }

    totalDays++;
    const longestStreak = Math.max(existing.longestStreak, currentStreak);

    const updateData = {
      member_id: memberId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_days: totalDays,
      last_check_in: today.toISOString(),
    };

    if (existing.id) {
      const { error } = await this.client
        .from('tracking_streaks')
        .update(updateData as any)
        .eq('id', existing.id);

      if (error) this.handleError('updateTrackingStreak:update', error);
    } else {
      const { error } = await this.client
        .from('tracking_streaks')
        .insert(updateData as any);

      if (error) this.handleError('updateTrackingStreak:insert', error);
    }

    return await this.getTrackingStreak(memberId);
  }

  // ==================== 统计分析 ====================

  async getRecentFoods(memberId: string, limit: number = 10): Promise<Array<{ foodId: string; useCount: number }>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.client.rpc('get_recent_foods', {
      p_member_id: memberId,
      p_start_date: thirtyDaysAgo.toISOString(),
      p_limit: limit,
    }) as any;

    if (error) {
      console.warn('RPC get_recent_foods not available, using fallback');
      return [];
    }

    return data || [];
  }

  async getNutritionTrends(
    memberId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyNutritionSummaryDTO[]> {
    const trends: DailyNutritionSummaryDTO[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const summary = await this.getDailySummary(memberId, new Date(current));
      trends.push(summary);
      current.setDate(current.getDate() + 1);
    }

    return trends;
  }

  // ==================== 辅助方法 ====================

  private mapMealLogRow(row: any): MealLogDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      date: new Date(row.date),
      mealType: row.meal_type,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      fiber: row.fiber ?? undefined,
      sugar: row.sugar ?? undefined,
      sodium: row.sodium ?? undefined,
      notes: row.notes ?? undefined,
      checkedAt: new Date(row.checked_at),
      isTemplate: row.is_template ?? false,
      foods: (row.foods || []).map((f: any) => ({
        id: f.id,
        mealLogId: f.meal_log_id,
        foodId: f.food_id,
        amount: f.amount,
        food: {
          id: f.food.id,
          name: f.food.name,
          nameEn: f.food.name_en ?? undefined,
          category: f.food.category,
          calories: f.food.calories,
          protein: f.food.protein,
          carbs: f.food.carbs,
          fat: f.food.fat,
        },
        createdAt: new Date(f.created_at),
        updatedAt: new Date(f.updated_at),
      })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapQuickTemplateRow(row: any): QuickTemplateDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      name: row.name,
      description: row.description ?? undefined,
      mealType: row.meal_type,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      useCount: row.use_count ?? 0,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      score: row.score ?? 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTrackingStreakRow(row: any): TrackingStreakDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      currentStreak: row.current_streak ?? 0,
      longestStreak: row.longest_streak ?? 0,
      totalDays: row.total_days ?? 0,
      lastCheckIn: row.last_check_in ? new Date(row.last_check_in) : undefined,
      badges: Array.isArray(row.badges) ? row.badges : (row.badges ? JSON.parse(row.badges) : []),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? 'Unknown Supabase error';
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`MealTrackingRepository.${operation} failed: ${message}`);
  }
}
