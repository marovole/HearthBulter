/**
 * Prisma InventoryRepository 占位符实现
 *
 * 当前所有方法抛出 "not implemented" 错误
 * 待后续实现完整的 Prisma 支持
 *
 * @module prisma-inventory-repository
 */

import type { InventoryRepository } from "../interfaces/inventory-repository";
import type {
  InventoryItemDTO,
  InventoryItemCreateDTO,
  InventoryItemUpdateDTO,
  InventoryItemFilterDTO,
  InventoryItemWithRelationsDTO,
  InventoryUsageDTO,
  InventoryUsageCreateDTO,
  WasteRecordDTO,
  WasteRecordCreateDTO,
  InventoryStatsDTO,
  UseInventoryInputDTO,
  BatchUseInventoryInputDTO,
} from "../types/inventory";
import type { PaginatedResult, PaginationInput } from "../types/common";

/**
 * PrismaInventoryRepository
 *
 * 占位符实现，待后续完成 Prisma 数据访问层
 */
export class PrismaInventoryRepository implements InventoryRepository {
  async createInventoryItem(
    _payload: InventoryItemCreateDTO,
  ): Promise<InventoryItemDTO> {
    throw new Error(
      "PrismaInventoryRepository.createInventoryItem not implemented",
    );
  }

  async updateInventoryItem(
    _id: string,
    _payload: InventoryItemUpdateDTO,
  ): Promise<InventoryItemDTO> {
    throw new Error(
      "PrismaInventoryRepository.updateInventoryItem not implemented",
    );
  }

  async getInventoryItemById(
    _id: string,
  ): Promise<InventoryItemWithRelationsDTO | null> {
    throw new Error(
      "PrismaInventoryRepository.getInventoryItemById not implemented",
    );
  }

  async listInventoryItems(
    _memberId: string,
    _filter?: InventoryItemFilterDTO,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<InventoryItemDTO>> {
    throw new Error(
      "PrismaInventoryRepository.listInventoryItems not implemented",
    );
  }

  async softDeleteInventoryItem(_id: string): Promise<void> {
    throw new Error(
      "PrismaInventoryRepository.softDeleteInventoryItem not implemented",
    );
  }

  async useInventoryItem(
    _payload: UseInventoryInputDTO,
  ): Promise<InventoryItemDTO> {
    throw new Error(
      "PrismaInventoryRepository.useInventoryItem not implemented",
    );
  }

  async batchUseInventory(
    _payload: BatchUseInventoryInputDTO,
  ): Promise<InventoryItemDTO[]> {
    throw new Error(
      "PrismaInventoryRepository.batchUseInventory not implemented",
    );
  }

  async listInventoryUsages(
    _inventoryItemId: string,
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<InventoryUsageDTO>> {
    throw new Error(
      "PrismaInventoryRepository.listInventoryUsages not implemented",
    );
  }

  async createWasteRecord(
    _payload: WasteRecordCreateDTO,
  ): Promise<WasteRecordDTO> {
    throw new Error(
      "PrismaInventoryRepository.createWasteRecord not implemented",
    );
  }

  async listWasteRecords(
    _inventoryItemId?: string,
    _filter?: {
      startDate?: Date;
      endDate?: Date;
      reason?: WasteRecordDTO["reason"];
    },
    _pagination?: PaginationInput,
  ): Promise<PaginatedResult<WasteRecordDTO>> {
    throw new Error(
      "PrismaInventoryRepository.listWasteRecords not implemented",
    );
  }

  async getInventoryStats(_memberId: string): Promise<InventoryStatsDTO> {
    throw new Error(
      "PrismaInventoryRepository.getInventoryStats not implemented",
    );
  }

  async getExpiringItems(
    _memberId: string,
    _daysThreshold?: number,
  ): Promise<InventoryItemDTO[]> {
    throw new Error(
      "PrismaInventoryRepository.getExpiringItems not implemented",
    );
  }

  async getLowStockItems(_memberId: string): Promise<InventoryItemDTO[]> {
    throw new Error(
      "PrismaInventoryRepository.getLowStockItems not implemented",
    );
  }

  async getInventoryValueTrend(
    _memberId: string,
    _startDate: Date,
    _endDate: Date,
  ): Promise<Array<{ date: Date; totalValue: number; itemCount: number }>> {
    throw new Error(
      "PrismaInventoryRepository.getInventoryValueTrend not implemented",
    );
  }

  async batchUpdateInventoryStatus(_memberId?: string): Promise<number> {
    throw new Error(
      "PrismaInventoryRepository.batchUpdateInventoryStatus not implemented",
    );
  }

  async batchDeleteExpiredItems(
    _memberId: string,
    _expiredDaysThreshold?: number,
  ): Promise<number> {
    throw new Error(
      "PrismaInventoryRepository.batchDeleteExpiredItems not implemented",
    );
  }
}
