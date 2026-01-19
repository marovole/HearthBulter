/**
 * Convex 膳食追踪 Repository 实现
 *
 * 基于 Convex 实现膳食记录管理系统的数据访问层
 *
 * @module convex-meal-tracking-repository
 */

import type { PaginatedResult, PaginationInput } from "../types/common";
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
import type { MealTrackingRepository } from "../interfaces/meal-tracking-repository";
import { convexClient, api } from "@/lib/convex-client";
import {
  asConvexMutationReference,
  asConvexQueryReference,
} from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

// Convex 文档类型定义
type MealLogDoc = Doc<"mealLogs"> & {
  deletedAt?: number;
  checkedAt?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  notes?: string;
  isTemplate?: boolean;
};

type MealLogFoodDoc = Doc<"mealLogFoods"> & {
  foodId: Id<"foods">;
};

type FoodDoc = Doc<"foods"> & {
  name: string;
  nameEn?: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  verified?: boolean;
  aliases?: string[];
};

type QuickTemplateDoc = Doc<"quickTemplates"> & {
  deletedAt?: number;
  description?: string;
  useCount: number;
  lastUsed?: number;
  score: number;
};

type TemplateFoodDoc = Doc<"templateFoods"> & {
  foodId: Id<"foods">;
};

type TrackingStreakDoc = Doc<"trackingStreaks"> & {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastCheckIn?: number;
  badges: string;
};

export class ConvexMealTrackingRepository implements MealTrackingRepository {
  // ==================== CRUD 操作 ====================

  async createMealLog(input: MealLogCreateInputDTO): Promise<MealLogDTO> {
    // 1. 计算营养成分
    const nutrition = await this.calculateNutrition(input.foods);

    // 2. 创建膳食记录
    const mealLogId = await convexClient.mutation(api.tracking.createMealLog, {
      memberId: input.memberId as Id<"familyMembers">,
      date: input.date.getTime(),
      mealType: input.mealType,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      sodium: nutrition.sodium,
      notes: input.notes,
    });

    // 3. 创建食物明细
    for (const food of input.foods) {
      await convexClient.mutation(api.tracking.addMealLogFood, {
        mealLogId: mealLogId as Id<"mealLogs">,
        foodId: food.foodId as Id<"foods">,
        amount: food.amount,
      });
    }

    // 4. 更新连续打卡
    await this.updateTrackingStreak(input.memberId, input.date);

    // 5. 返回完整的膳食记录
    return (await this.getMealLogById(mealLogId as string)) as MealLogDTO;
  }

  async updateMealLog(
    id: string,
    input: MealLogUpdateInputDTO,
  ): Promise<MealLogDTO> {
    // 如果更新了食物列表，重新计算营养
    let nutrition: NutritionCalculationResultDTO | undefined;
    if (input.foods) {
      nutrition = await this.calculateNutrition(input.foods);

      // 删除旧的食物明细
      await convexClient.mutation(api.tracking.deleteMealLogFoods, {
        mealLogId: id as Id<"mealLogs">,
      });

      // 插入新的食物明细
      for (const food of input.foods) {
        await convexClient.mutation(api.tracking.addMealLogFood, {
          mealLogId: id as Id<"mealLogs">,
          foodId: food.foodId as Id<"foods">,
          amount: food.amount,
        });
      }
    }

    // 更新膳食记录
    await convexClient.mutation(api.tracking.updateMealLog, {
      id: id as Id<"mealLogs">,
      calories: nutrition?.calories,
      protein: nutrition?.protein,
      carbs: nutrition?.carbs,
      fat: nutrition?.fat,
      fiber: nutrition?.fiber,
      sugar: nutrition?.sugar,
      sodium: nutrition?.sodium,
      notes: input.notes,
    });

    return (await this.getMealLogById(id)) as MealLogDTO;
  }

  async getMealLogById(id: string): Promise<MealLogDTO | null> {
    const log = await convexClient.query<{
      logs: MealLogDoc;
      foods: MealLogFoodDoc[];
    } | null>(api.tracking.getMealLogById, { id: id as Id<"mealLogs"> });

    if (!log) return null;

    // 获取食物详情
    const foodIds = log.foods.map((f) => f.foodId);
    const foodsData = await convexClient.query<FoodDoc[]>(
      asConvexQueryReference("tracking:getFoodsByIds"),
      { foodIds },
    );

    const foodMap = new Map(foodsData.map((f) => [f._id, f]));

    return this.mapMealLogRow(log.logs, log.foods, foodMap);
  }

  async listMealLogs(
    memberId: string,
    filter?: MealLogFilterDTO,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealLogDTO>> {
    // 使用分页参数中的 limit，而不是 filter 中的
    const effectiveLimit = pagination?.limit ?? 50;

    let logs = await convexClient.query<MealLogDoc[]>(
      api.tracking.getMealLogHistory,
      {
        memberId: memberId as Id<"familyMembers">,
        startDate: filter?.startDate?.getTime(),
        endDate: filter?.endDate?.getTime(),
        mealType: filter?.mealType,
        limit: effectiveLimit,
      },
    );

    // 过滤已删除的记录
    logs = logs.filter((log) => !log.deletedAt);

    // 排序（按日期降序）
    logs.sort((a, b) => b.date - a.date);

    // 获取每个日志的食物
    const logsWithFoods = await Promise.all(
      logs.map(async (log) => {
        const foods = await convexClient.query<MealLogFoodDoc[]>(
          asConvexQueryReference("tracking:getMealLogFoods"),
          { mealLogId: log._id },
        );
        return { logs: log, foods };
      }),
    );

    // 获取所有食物详情
    const allFoodIds = logsWithFoods.flatMap((lw) =>
      lw.foods.map((f) => f.foodId),
    );
    const uniqueFoodIds = [...new Set(allFoodIds)];
    const foodsData = await convexClient.query<FoodDoc[]>(
      asConvexQueryReference("tracking:getFoodsByIds"),
      { foodIds: uniqueFoodIds },
    );
    const foodMap = new Map(foodsData.map((f) => [f._id, f]));

    const items = logsWithFoods.map((lw) =>
      this.mapMealLogRow(lw.logs, lw.foods, foodMap),
    );

    // 分页
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit;
    const paginated = limit ? items.slice(offset, offset + limit) : items;

    return {
      items: paginated,
      total: items.length,
      hasMore: limit ? offset + paginated.length < items.length : false,
    };
  }

  async deleteMealLog(id: string): Promise<void> {
    await convexClient.mutation(api.tracking.softDeleteMealLog, {
      id: id as Id<"mealLogs">,
    });
  }

  // ==================== 特殊查询 ====================

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
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealLogDTO>> {
    return this.listMealLogs(memberId, filter, pagination);
  }

  // ==================== 营养计算 ====================

  async calculateNutrition(
    foods: NutritionCalculationInputDTO,
  ): Promise<NutritionCalculationResultDTO> {
    const foodIds = foods.map((f) => f.foodId);
    const foodsData = await convexClient.query<FoodDoc[]>(
      asConvexQueryReference("tracking:getFoodsByIds"),
      { foodIds },
    );

    const foodMap = new Map(foodsData.map((f) => [f._id, f]));

    const nutrition: NutritionCalculationResultDTO = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    };

    for (const food of foods) {
      const foodInfo = foodMap.get(food.foodId as Id<"foods">);
      if (!foodInfo) continue;

      const ratio = food.amount / 100; // 营养数据基于100g
      nutrition.calories += (foodInfo.calories ?? 0) * ratio;
      nutrition.protein += (foodInfo.protein ?? 0) * ratio;
      nutrition.carbs += (foodInfo.carbs ?? 0) * ratio;
      nutrition.fat += (foodInfo.fat ?? 0) * ratio;
      nutrition.fiber += (foodInfo.fiber ?? 0) * ratio;
      nutrition.sugar += (foodInfo.sugar ?? 0) * ratio;
      nutrition.sodium += (foodInfo.sodium ?? 0) * ratio;
    }

    return nutrition;
  }

  async getDailySummary(
    memberId: string,
    date: Date,
  ): Promise<DailyNutritionSummaryDTO> {
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

    for (const log of logs) {
      summary.totalCalories += log.calories;
      summary.totalProtein += log.protein;
      summary.totalCarbs += log.carbs;
      summary.totalFat += log.fat;
      summary.totalFiber = (summary.totalFiber ?? 0) + (log.fiber ?? 0);
      summary.totalSugar = (summary.totalSugar ?? 0) + (log.sugar ?? 0);
      summary.totalSodium = (summary.totalSodium ?? 0) + (log.sodium ?? 0);
      const mealType = log.mealType as
        | "BREAKFAST"
        | "LUNCH"
        | "DINNER"
        | "SNACK";
      summary.mealCounts[mealType]++;
    }

    return summary;
  }

  // ==================== 快速模板 ====================

  async createQuickTemplate(
    input: QuickTemplateCreateInputDTO,
  ): Promise<QuickTemplateDTO> {
    const mealLog = await this.getMealLogById(input.mealLogId);
    if (!mealLog) throw new Error("Meal log not found");

    const templateId = await convexClient.mutation(
      api.tracking.createQuickTemplate,
      {
        memberId: input.memberId as Id<"familyMembers">,
        name: input.name,
        description: input.description,
        mealType: input.mealType,
        calories: mealLog.calories,
        protein: mealLog.protein,
        carbs: mealLog.carbs,
        fat: mealLog.fat,
        score: 0,
        useCount: 0,
      },
    );

    return (await this.getQuickTemplateById(
      templateId as string,
    )) as QuickTemplateDTO;
  }

  async listQuickTemplates(
    memberId: string,
    mealType?: string,
  ): Promise<QuickTemplateDTO[]> {
    const templates = await convexClient.query<QuickTemplateDoc[]>(
      api.tracking.getQuickTemplates,
      {
        memberId: memberId as Id<"familyMembers">,
        mealType,
      },
    );

    // 获取每个模板的食物
    const templatesWithFoods = await Promise.all(
      templates.map(async (template) => {
        const foods = await convexClient.query<TemplateFoodDoc[]>(
          asConvexQueryReference("tracking:getTemplateFoods"),
          { templateId: template._id },
        );
        return { template, foods };
      }),
    );

    return templatesWithFoods.map((tw) =>
      this.mapQuickTemplateRow(tw.template),
    );
  }

  async useQuickTemplate(templateId: string, date: Date): Promise<MealLogDTO> {
    // 获取模板和食物信息
    const templateWithFoods = await convexClient.query<{
      template: QuickTemplateDoc;
      foods: TemplateFoodDoc[];
    } | null>(api.tracking.getTemplateById, {
      id: templateId as Id<"quickTemplates">,
    });

    if (!templateWithFoods) throw new Error("Template not found");

    // 获取食物详情
    const foodIds = templateWithFoods.foods.map((f) => f.foodId);
    const foodsData = await convexClient.query<FoodDoc[]>(
      asConvexQueryReference("tracking:getFoodsByIds"),
      { foodIds },
    );
    const foodMap = new Map(foodsData.map((f) => [f._id, f]));

    const foods = templateWithFoods.foods.map((f) => {
      const food = foodMap.get(f.foodId);
      return {
        foodId: f.foodId as string,
        amount: f.amount,
      };
    });

    // 创建膳食记录
    const mealLog = await this.createMealLog({
      memberId: templateWithFoods.template.memberId as string,
      date,
      mealType: templateWithFoods.template.mealType as
        | "BREAKFAST"
        | "LUNCH"
        | "DINNER"
        | "SNACK",
      foods,
    });

    // 更新模板使用次数
    await convexClient.mutation(api.tracking.incrementTemplateUseCount, {
      id: templateId as Id<"quickTemplates">,
    });

    return mealLog;
  }

  async deleteQuickTemplate(id: string): Promise<void> {
    await convexClient.mutation(api.tracking.softDeleteQuickTemplate, {
      id: id as Id<"quickTemplates">,
    });
  }

  // ==================== 连续打卡统计 ====================

  async getTrackingStreak(memberId: string): Promise<TrackingStreakDTO> {
    const streak = await convexClient.query<TrackingStreakDoc | null>(
      api.tracking.getTrackingStreak,
      { memberId: memberId as Id<"familyMembers"> },
    );

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

    return this.mapTrackingStreakRow(streak);
  }

  async updateTrackingStreak(
    memberId: string,
    date: Date,
  ): Promise<TrackingStreakDTO> {
    const existing = await this.getTrackingStreak(memberId);
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    let currentStreak = existing.currentStreak;
    let totalDays = existing.totalDays;

    if (existing.lastCheckIn) {
      const lastCheckIn = new Date(existing.lastCheckIn);
      lastCheckIn.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24),
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

    await convexClient.mutation(api.tracking.upsertTrackingStreak, {
      memberId: memberId as Id<"familyMembers">,
      currentStreak,
      longestStreak,
      totalDays,
      lastCheckIn: today.getTime(),
      badges: JSON.stringify(existing.badges),
    });

    return this.getTrackingStreak(memberId);
  }

  // ==================== 统计分析 ====================

  async getRecentFoods(
    memberId: string,
    limit: number = 10,
  ): Promise<Array<{ foodId: string; useCount: number }>> {
    // Convex 版本可能不支持此功能，返回空数组
    console.warn(
      "ConvexMealTrackingRepository: getRecentFoods not implemented",
    );
    return [];
  }

  async getNutritionTrends(
    memberId: string,
    startDate: Date,
    endDate: Date,
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

  private async getQuickTemplateById(
    id: string,
  ): Promise<QuickTemplateDTO | null> {
    const template = await convexClient.query<{
      template: QuickTemplateDoc;
      foods: TemplateFoodDoc[];
    } | null>(api.tracking.getTemplateById, { id: id as Id<"quickTemplates"> });

    if (!template) return null;

    // 获取食物详情
    const foodIds = template.foods.map((f) => f.foodId);
    const foodsData = await convexClient.query<FoodDoc[]>(
      asConvexQueryReference("tracking:getFoodsByIds"),
      { foodIds },
    );
    const foodMap = new Map(foodsData.map((f) => [f._id, f]));

    return this.mapQuickTemplateRow(template.template);
  }

  private mapMealLogRow(
    log: MealLogDoc,
    foods: MealLogFoodDoc[],
    foodMap: Map<Id<"foods">, FoodDoc>,
  ): MealLogDTO {
    const mappedFoods = foods.map((f) => {
      const food = foodMap.get(f.foodId);
      if (!food) {
        // 如果找不到食物详情，使用空对象
        return {
          id: f._id as string,
          mealLogId: f.mealLogId as string,
          foodId: f.foodId as string,
          amount: f.amount,
          food: {
            id: f.foodId as string,
            name: "Unknown Food",
            category: "UNKNOWN",
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt),
        };
      }
      return {
        id: f._id as string,
        mealLogId: f.mealLogId as string,
        foodId: f.foodId as string,
        amount: f.amount,
        food: {
          id: food._id as string,
          name: food.name,
          nameEn: food.nameEn,
          category: food.category,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        },
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
      };
    });

    return {
      id: log._id as string,
      memberId: log.memberId as string,
      date: new Date(log.date),
      mealType: log.mealType as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      fiber: log.fiber,
      sugar: log.sugar,
      sodium: log.sodium,
      notes: log.notes,
      checkedAt: new Date(log.checkedAt ?? log.createdAt),
      isTemplate: log.isTemplate ?? false,
      foods: mappedFoods,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt),
    };
  }

  private mapQuickTemplateRow(template: QuickTemplateDoc): QuickTemplateDTO {
    return {
      id: template._id as string,
      memberId: template.memberId as string,
      name: template.name,
      description: template.description,
      mealType: template.mealType as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
      calories: template.calories,
      protein: template.protein,
      carbs: template.carbs,
      fat: template.fat,
      useCount: template.useCount,
      lastUsed: template.lastUsed ? new Date(template.lastUsed) : undefined,
      score: template.score,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
    };
  }

  private mapTrackingStreakRow(streak: TrackingStreakDoc): TrackingStreakDTO {
    return {
      id: streak._id,
      memberId: streak.memberId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDays: streak.totalDays,
      lastCheckIn: streak.lastCheckIn
        ? new Date(streak.lastCheckIn)
        : undefined,
      badges: Array.isArray(streak.badges)
        ? streak.badges
        : streak.badges
          ? JSON.parse(streak.badges)
          : [],
      createdAt: new Date(streak.createdAt),
      updatedAt: new Date(streak.updatedAt),
    };
  }
}
