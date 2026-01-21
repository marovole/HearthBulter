// @ts-nocheck - Legacy migration: pending full type safety review
import { neonAdapter } from "@/lib/db/neon-adapter";
import { NeonClientManager } from "@/lib/db/neon-client";
import type { MealTrackingRepository } from "../interfaces/meal-tracking-repository";
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
} from "../types/meal-tracking";
import type { PaginatedResult, PaginationInput } from "../types/common";

export class NeonMealTrackingRepository implements MealTrackingRepository {
  async createMealLog(input: MealLogCreateInputDTO): Promise<MealLogDTO> {
    const nutrition = await this.calculateNutrition(input.foods);

    const mealLog = await neonAdapter.mealLog.create({
      data: {
        memberId: input.memberId,
        date: input.date,
        mealType: input.mealType,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        sugar: nutrition.sugar,
        sodium: nutrition.sodium,
        notes: input.notes ?? null,
        isTemplate: input.isTemplate ?? false,
        checkedAt: new Date(),
      },
    });

    for (const food of input.foods) {
      await neonAdapter.mealLogFood.create({
        data: {
          mealLogId: mealLog.id,
          foodId: food.foodId,
          amount: food.amount,
        },
      });
    }

    await this.updateTrackingStreak(input.memberId, input.date);

    return (await this.getMealLogById(mealLog.id)) as MealLogDTO;
  }

  async updateMealLog(id: string, input: MealLogUpdateInputDTO): Promise<MealLogDTO> {
    const updateData: any = { updatedAt: new Date() };

    if (input.date) updateData.date = input.date;
    if (input.mealType) updateData.mealType = input.mealType;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isTemplate !== undefined) updateData.isTemplate = input.isTemplate;

    if (input.foods) {
      const nutrition = await this.calculateNutrition(input.foods);
      updateData.calories = nutrition.calories;
      updateData.protein = nutrition.protein;
      updateData.carbs = nutrition.carbs;
      updateData.fat = nutrition.fat;
      updateData.fiber = nutrition.fiber;
      updateData.sugar = nutrition.sugar;
      updateData.sodium = nutrition.sodium;

      await neonAdapter.mealLogFood.deleteMany({ where: { mealLogId: id } });

      for (const food of input.foods) {
        await neonAdapter.mealLogFood.create({
          data: {
            mealLogId: id,
            foodId: food.foodId,
            amount: food.amount,
          },
        });
      }
    }

    await neonAdapter.mealLog.update({ where: { id }, data: updateData });
    return (await this.getMealLogById(id)) as MealLogDTO;
  }

  async getMealLogById(id: string): Promise<MealLogDTO | null> {
    const log = await neonAdapter.mealLog.findUnique({
      where: { id, deletedAt: null },
    });

    if (!log) return null;

    const foods = await neonAdapter.mealLogFood.findMany({
      where: { mealLogId: id },
    });

    const foodDetails: any[] = [];
    for (const f of foods || []) {
      const food = await neonAdapter.food.findUnique({ where: { id: f.foodId } });
      foodDetails.push({
        id: f.id,
        mealLogId: f.mealLogId,
        foodId: f.foodId,
        amount: f.amount,
        food: food
          ? {
              id: food.id,
              name: food.name,
              nameEn: food.nameEn ?? undefined,
              category: food.category,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
            }
          : null,
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      });
    }

    return {
      id: log.id,
      memberId: log.memberId,
      date: new Date(log.date),
      mealType: log.mealType,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      fiber: log.fiber ?? undefined,
      sugar: log.sugar ?? undefined,
      sodium: log.sodium ?? undefined,
      notes: log.notes ?? undefined,
      checkedAt: new Date(log.checkedAt),
      isTemplate: log.isTemplate ?? false,
      foods: foodDetails,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt),
    };
  }

  async listMealLogs(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealLogDTO>> {
    const where: any = { memberId, deletedAt: null };

    if (filter?.startDate) where.date = { ...where.date, gte: filter.startDate };
    if (filter?.endDate) where.date = { ...where.date, lte: filter.endDate };
    if (filter?.mealType) where.mealType = filter.mealType;
    if (filter?.isTemplate !== undefined) where.isTemplate = filter.isTemplate;

    const limit = pagination?.limit ?? 20;
    const offset = pagination?.offset ?? 0;

    const [logs, total] = await Promise.all([
      neonAdapter.mealLog.findMany({
        where,
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      neonAdapter.mealLog.count({ where }),
    ]);

    const items: MealLogDTO[] = [];
    for (const log of logs || []) {
      const fullLog = await this.getMealLogById(log.id);
      if (fullLog) items.push(fullLog);
    }

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async deleteMealLog(id: string): Promise<void> {
    await neonAdapter.mealLog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getTodayMealLogs(memberId: string): Promise<MealLogDTO[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.listMealLogs(memberId, {
      startDate: today,
      endDate: tomorrow,
    });

    return result.items;
  }

  async getMealLogHistory(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<MealLogDTO>> {
    return this.listMealLogs(memberId, filter, pagination);
  }

  async calculateNutrition(
    foods: NutritionCalculationInputDTO
  ): Promise<NutritionCalculationResultDTO> {
    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    for (const food of foods) {
      const foodData = await neonAdapter.food.findUnique({
        where: { id: food.foodId },
      });

      if (!foodData) continue;

      const ratio = food.amount / 100;
      nutrition.calories += (foodData.calories ?? 0) * ratio;
      nutrition.protein += (foodData.protein ?? 0) * ratio;
      nutrition.carbs += (foodData.carbs ?? 0) * ratio;
      nutrition.fat += (foodData.fat ?? 0) * ratio;
      nutrition.fiber += (foodData.fiber ?? 0) * ratio;
      nutrition.sugar += (foodData.sugar ?? 0) * ratio;
      nutrition.sodium += (foodData.sodium ?? 0) * ratio;
    }

    return nutrition;
  }

  async getDailySummary(memberId: string, date: Date): Promise<DailyNutritionSummaryDTO> {
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
      mealCounts: { BREAKFAST: 0, LUNCH: 0, DINNER: 0, SNACK: 0 },
    };

    for (const log of logs) {
      summary.totalCalories += log.calories;
      summary.totalProtein += log.protein;
      summary.totalCarbs += log.carbs;
      summary.totalFat += log.fat;
      summary.totalFiber! += log.fiber ?? 0;
      summary.totalSugar! += log.sugar ?? 0;
      summary.totalSodium! += log.sodium ?? 0;
      summary.mealCounts[log.mealType]++;
    }

    return summary;
  }

  async createQuickTemplate(input: QuickTemplateCreateInputDTO): Promise<QuickTemplateDTO> {
    const mealLog = await this.getMealLogById(input.mealLogId);
    if (!mealLog) throw new Error("Meal log not found");

    const template = await neonAdapter.quickTemplate.create({
      data: {
        memberId: input.memberId,
        name: input.name,
        description: input.description ?? null,
        mealType: input.mealType,
        calories: mealLog.calories,
        protein: mealLog.protein,
        carbs: mealLog.carbs,
        fat: mealLog.fat,
      },
    });

    return this.mapQuickTemplate(template);
  }

  async listQuickTemplates(memberId: string, mealType?: string): Promise<QuickTemplateDTO[]> {
    const where: any = { memberId, deletedAt: null };
    if (mealType) where.mealType = mealType;

    const templates = await neonAdapter.quickTemplate.findMany({
      where,
      orderBy: { useCount: "desc" },
    });

    return (templates || []).map((t: any) => this.mapQuickTemplate(t));
  }

  async useQuickTemplate(templateId: string, date: Date): Promise<MealLogDTO> {
    throw new Error("Method not implemented: useQuickTemplate");
  }

  async deleteQuickTemplate(id: string): Promise<void> {
    await neonAdapter.quickTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getTrackingStreak(memberId: string): Promise<TrackingStreakDTO> {
    const streak = await neonAdapter.trackingStreak.findFirst({
      where: { memberId },
    });

    if (!streak) {
      return {
        id: "",
        memberId,
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        badges: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: streak.id,
      memberId: streak.memberId,
      currentStreak: streak.currentStreak ?? 0,
      longestStreak: streak.longestStreak ?? 0,
      totalDays: streak.totalDays ?? 0,
      lastCheckIn: streak.lastCheckIn ? new Date(streak.lastCheckIn) : undefined,
      badges: Array.isArray(streak.badges) ? streak.badges : [],
      createdAt: new Date(streak.createdAt),
      updatedAt: new Date(streak.updatedAt),
    };
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
      const daysDiff = Math.floor(
        (today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
      );

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

    if (existing.id) {
      await neonAdapter.trackingStreak.update({
        where: { id: existing.id },
        data: {
          currentStreak,
          longestStreak,
          totalDays,
          lastCheckIn: today,
          updatedAt: new Date(),
        },
      });
    } else {
      await neonAdapter.trackingStreak.create({
        data: {
          memberId,
          currentStreak,
          longestStreak,
          totalDays,
          lastCheckIn: today,
        },
      });
    }

    return this.getTrackingStreak(memberId);
  }

  async getRecentFoods(
    memberId: string,
    limit: number = 10
  ): Promise<Array<{ foodId: string; useCount: number }>> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await NeonClientManager.query<{ food_id: string; use_count: string }>(
      `
      SELECT mlf.food_id, COUNT(*) as use_count
      FROM meal_log_foods mlf
      JOIN meal_logs ml ON ml.id = mlf.meal_log_id
      WHERE ml.member_id = $1 AND ml.date >= $2 AND ml.deleted_at IS NULL
      GROUP BY mlf.food_id
      ORDER BY use_count DESC
      LIMIT $3
      `,
      [memberId, thirtyDaysAgo.toISOString(), limit]
    );

    return result.map((row) => ({
      foodId: row.food_id,
      useCount: parseInt(row.use_count, 10),
    }));
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

  private mapQuickTemplate(row: any): QuickTemplateDTO {
    return {
      id: row.id,
      memberId: row.memberId,
      name: row.name,
      description: row.description ?? undefined,
      mealType: row.mealType,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      useCount: row.useCount ?? 0,
      lastUsed: row.lastUsed ? new Date(row.lastUsed) : undefined,
      score: row.score ?? 0,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
