import { convexClient, api } from "@/lib/convex-client";
import { asConvexMutationReference, asConvexQueryReference } from "@/lib/convex-reference";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export const convexTracking = {
  async getReminderConfigs(memberId: string) {
    return convexClient.query(api.tracking.getReminderConfigs, {
      memberId: memberId as Id<"familyMembers">,
    });
  },

  async upsertReminderConfig(args: {
    memberId: string;
    reminderType: string;
    enabled: boolean;
    hour: number;
    minute: number;
    daysOfWeek: number[];
    message?: string | null;
  }) {
    return convexClient.mutation(api.tracking.upsertReminderConfig, {
      memberId: args.memberId as Id<"familyMembers">,
      reminderType: args.reminderType,
      enabled: args.enabled,
      hour: args.hour,
      minute: args.minute,
      daysOfWeek: args.daysOfWeek,
      message: args.message ?? undefined,
    });
  },

  async deleteReminderConfig(memberId: string, reminderType: string) {
    return convexClient.mutation(api.tracking.deleteReminderConfig, {
      memberId: memberId as Id<"familyMembers">,
      reminderType,
    });
  },

  async getActiveReminders() {
    return convexClient.query(api.tracking.getActiveReminders, {});
  },

  async updateReminderLastTriggered(id: string) {
    return convexClient.mutation(api.tracking.updateReminderLastTriggered, {
      id: id as Id<"healthReminders">,
    });
  },

  async createMealLog(args: {
    memberId: string;
    date: Date;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    notes?: string;
  }) {
    return convexClient.mutation(api.tracking.createMealLog, {
      memberId: args.memberId as Id<"familyMembers">,
      date: args.date.getTime(),
      mealType: args.mealType,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      sugar: args.sugar,
      sodium: args.sodium,
      notes: args.notes,
    });
  },

  async addMealLogFood(mealLogId: string, foodId: string, amount: number) {
    return convexClient.mutation(api.tracking.addMealLogFood, {
      mealLogId: mealLogId as Id<"mealLogs">,
      foodId: foodId as Id<"foods">,
      amount,
    });
  },

  async getTodayMealLogs(memberId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return convexClient.query(api.tracking.getTodayMealLogs, {
      memberId: memberId as Id<"familyMembers">,
      startDate: today.getTime(),
      endDate: tomorrow.getTime(),
    });
  },

  async getMealLogHistory(
    memberId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      mealType?: string;
      limit?: number;
    }
  ) {
    return convexClient.query(api.tracking.getMealLogHistory, {
      memberId: memberId as Id<"familyMembers">,
      startDate: options?.startDate?.getTime(),
      endDate: options?.endDate?.getTime(),
      mealType: options?.mealType,
      limit: options?.limit,
    });
  },

  async getMealLogById(id: string) {
    return convexClient.query(api.tracking.getMealLogById, {
      id: id as Id<"mealLogs">,
    });
  },

  async updateMealLog(
    id: string,
    data: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      notes?: string;
    }
  ) {
    return convexClient.mutation(api.tracking.updateMealLog, {
      id: id as Id<"mealLogs">,
      ...data,
    });
  },

  async deleteMealLogFoods(mealLogId: string) {
    return convexClient.mutation(api.tracking.deleteMealLogFoods, {
      mealLogId: mealLogId as Id<"mealLogs">,
    });
  },

  async softDeleteMealLog(id: string) {
    return convexClient.mutation(api.tracking.softDeleteMealLog, {
      id: id as Id<"mealLogs">,
    });
  },

  async findMealLogByTypeAndDate(memberId: string, mealType: string, date: Date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return convexClient.query(api.tracking.findMealLogByTypeAndDate, {
      memberId: memberId as Id<"familyMembers">,
      mealType,
      date: targetDate.getTime(),
    });
  },

  async getDailyNutritionTarget(memberId: string, date: Date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return convexClient.query(api.tracking.getDailyNutritionTarget, {
      memberId: memberId as Id<"familyMembers">,
      date: targetDate.getTime(),
    });
  },

  async upsertDailyNutritionTarget(args: {
    memberId: string;
    date: Date;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    actualCalories: number;
    actualProtein: number;
    actualCarbs: number;
    actualFat: number;
    caloriesDeviation: number;
    proteinDeviation: number;
    carbsDeviation: number;
    fatDeviation: number;
    isCompleted: boolean;
  }) {
    const targetDate = new Date(args.date);
    targetDate.setHours(0, 0, 0, 0);
    return convexClient.mutation(api.tracking.upsertDailyNutritionTarget, {
      memberId: args.memberId as Id<"familyMembers">,
      date: targetDate.getTime(),
      targetCalories: args.targetCalories,
      targetProtein: args.targetProtein,
      targetCarbs: args.targetCarbs,
      targetFat: args.targetFat,
      actualCalories: args.actualCalories,
      actualProtein: args.actualProtein,
      actualCarbs: args.actualCarbs,
      actualFat: args.actualFat,
      caloriesDeviation: args.caloriesDeviation,
      proteinDeviation: args.proteinDeviation,
      carbsDeviation: args.carbsDeviation,
      fatDeviation: args.fatDeviation,
      isCompleted: args.isCompleted,
    });
  },

  async getTrackingStreak(memberId: string) {
    return convexClient.query(api.tracking.getTrackingStreak, {
      memberId: memberId as Id<"familyMembers">,
    });
  },

  async upsertTrackingStreak(args: {
    memberId: string;
    currentStreak: number;
    longestStreak: number;
    totalDays: number;
    lastCheckIn?: Date;
    badges: string;
  }) {
    return convexClient.mutation(api.tracking.upsertTrackingStreak, {
      memberId: args.memberId as Id<"familyMembers">,
      currentStreak: args.currentStreak,
      longestStreak: args.longestStreak,
      totalDays: args.totalDays,
      lastCheckIn: args.lastCheckIn?.getTime(),
      badges: args.badges,
    });
  },

  async createQuickTemplate(args: {
    memberId: string;
    name: string;
    description?: string;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) {
    return convexClient.mutation(api.tracking.createQuickTemplate, {
      memberId: args.memberId as Id<"familyMembers">,
      name: args.name,
      description: args.description,
      mealType: args.mealType,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      score: 0,
      useCount: 0,
    });
  },

  async addTemplateFood(templateId: string, foodId: string, amount: number) {
    return convexClient.mutation(api.tracking.addTemplateFood, {
      templateId: templateId as Id<"quickTemplates">,
      foodId: foodId as Id<"foods">,
      amount,
    });
  },

  async getQuickTemplates(memberId: string, mealType?: string) {
    return convexClient.query(api.tracking.getQuickTemplates, {
      memberId: memberId as Id<"familyMembers">,
      mealType,
    });
  },

  async getTemplateById(id: string) {
    return convexClient.query(api.tracking.getTemplateById, {
      id: id as Id<"quickTemplates">,
    });
  },

  async updateTemplateScore(id: string, score: number) {
    return convexClient.mutation(api.tracking.updateTemplateScore, {
      id: id as Id<"quickTemplates">,
      score,
    });
  },

  async incrementTemplateUseCount(id: string) {
    return convexClient.mutation(api.tracking.incrementTemplateUseCount, {
      id: id as Id<"quickTemplates">,
    });
  },

  async updateQuickTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      score?: number;
    }
  ) {
    return convexClient.mutation(api.tracking.updateQuickTemplate, {
      id: id as Id<"quickTemplates">,
      ...data,
    });
  },

  async softDeleteQuickTemplate(id: string) {
    return convexClient.mutation(api.tracking.softDeleteQuickTemplate, {
      id: id as Id<"quickTemplates">,
    });
  },

  async deleteTemplateFoods(templateId: string) {
    return convexClient.mutation(api.tracking.deleteTemplateFoods, {
      templateId: templateId as Id<"quickTemplates">,
    });
  },

  async createFoodPhoto(args: {
    mealLogId: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    recognitionStatus: string;
  }) {
    return convexClient.mutation(asConvexMutationReference("tracking:createFoodPhoto"), {
      mealLogId: args.mealLogId as Id<"mealLogs">,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      recognitionStatus: args.recognitionStatus,
    });
  },

  async updateFoodPhoto(
    id: string,
    data: {
      recognitionStatus?: string;
      recognitionResult?: string;
      confidence?: number;
      recognitionError?: string;
    }
  ) {
    return convexClient.mutation(asConvexMutationReference("tracking:updateFoodPhoto"), {
      id: id as Id<"foodPhotos">,
      ...data,
    });
  },

  async getFoodPhotoById(id: string) {
    return convexClient.query(asConvexQueryReference("tracking:getFoodPhotoById"), {
      id: id as Id<"foodPhotos">,
    });
  },

  async getMealLogPhotos(mealLogId: string) {
    return convexClient.query(api.tracking.getMealLogPhotos, {
      mealLogId: mealLogId as Id<"mealLogs">,
    });
  },

  async deleteFoodPhoto(id: string) {
    return convexClient.mutation(api.tracking.deleteFoodPhoto, {
      id: id as Id<"foodPhotos">,
    });
  },

  async getFoodsByIds(foodIds: string[]) {
    return convexClient.query(api.tracking.getFoodsByIds, {
      foodIds: foodIds as Id<"foods">[],
    });
  },

  async getMealLogsForPeriod(memberId: string, startDate: Date, endDate: Date) {
    return convexClient.query(api.tracking.getMealLogsForPeriod, {
      memberId: memberId as Id<"familyMembers">,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });
  },

  async getDailyNutritionTargetsForPeriod(memberId: string, startDate: Date, endDate: Date) {
    return convexClient.query(api.tracking.getDailyNutritionTargetsForPeriod, {
      memberId: memberId as Id<"familyMembers">,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });
  },

  async getPreviousWeekTargets(memberId: string, startDate: Date, endDate: Date) {
    return convexClient.query(api.tracking.getPreviousWeekTargets, {
      memberId: memberId as Id<"familyMembers">,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    });
  },
};

export type ConvexTracking = typeof convexTracking;
