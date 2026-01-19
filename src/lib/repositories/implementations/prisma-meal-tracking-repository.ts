/**
 * Prisma MealTrackingRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-meal-tracking-repository
 */

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

/**
 * PrismaMealTrackingRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaMealTrackingRepository implements MealTrackingRepository {
  async createMealLog(_input: MealLogCreateInputDTO): Promise<MealLogDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.createMealLog not implemented",
    );
  }

  async updateMealLog(
    _id: string,
    _input: MealLogUpdateInputDTO,
  ): Promise<MealLogDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.updateMealLog not implemented",
    );
  }

  async getMealLogById(_id: string): Promise<MealLogDTO | null> {
    throw new Error(
      "PrismaMealTrackingRepository.getMealLogById not implemented",
    );
  }

  async listMealLogs(
    _memberId: string,
    _filter?: MealLogFilterDTO,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealLogDTO>> {
    throw new Error(
      "PrismaMealTrackingRepository.listMealLogs not implemented",
    );
  }

  async deleteMealLog(_id: string): Promise<void> {
    throw new Error(
      "PrismaMealTrackingRepository.deleteMealLog not implemented",
    );
  }

  async getTodayMealLogs(_memberId: string): Promise<MealLogDTO[]> {
    throw new Error(
      "PrismaMealTrackingRepository.getTodayMealLogs not implemented",
    );
  }

  async getMealLogHistory(
    _memberId: string,
    _filter?: MealLogFilterDTO,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<MealLogDTO>> {
    throw new Error(
      "PrismaMealTrackingRepository.getMealLogHistory not implemented",
    );
  }

  async calculateNutrition(
    _foods: NutritionCalculationInputDTO,
  ): Promise<NutritionCalculationResultDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.calculateNutrition not implemented",
    );
  }

  async getDailySummary(
    _memberId: string,
    _date: Date,
  ): Promise<DailyNutritionSummaryDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.getDailySummary not implemented",
    );
  }

  async createQuickTemplate(
    _input: QuickTemplateCreateInputDTO,
  ): Promise<QuickTemplateDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.createQuickTemplate not implemented",
    );
  }

  async listQuickTemplates(
    _memberId: string,
    _mealType?: string,
  ): Promise<QuickTemplateDTO[]> {
    throw new Error(
      "PrismaMealTrackingRepository.listQuickTemplates not implemented",
    );
  }

  async useQuickTemplate(
    _templateId: string,
    _date: Date,
  ): Promise<MealLogDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.useQuickTemplate not implemented",
    );
  }

  async deleteQuickTemplate(_id: string): Promise<void> {
    throw new Error(
      "PrismaMealTrackingRepository.deleteQuickTemplate not implemented",
    );
  }

  async getTrackingStreak(_memberId: string): Promise<TrackingStreakDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.getTrackingStreak not implemented",
    );
  }

  async updateTrackingStreak(
    _memberId: string,
    _date: Date,
  ): Promise<TrackingStreakDTO> {
    throw new Error(
      "PrismaMealTrackingRepository.updateTrackingStreak not implemented",
    );
  }

  async getRecentFoods(
    _memberId: string,
    _limit?: number,
  ): Promise<Array<{ foodId: string; useCount: number }>> {
    throw new Error(
      "PrismaMealTrackingRepository.getRecentFoods not implemented",
    );
  }

  async getNutritionTrends(
    _memberId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<DailyNutritionSummaryDTO[]> {
    throw new Error(
      "PrismaMealTrackingRepository.getNutritionTrends not implemented",
    );
  }
}
