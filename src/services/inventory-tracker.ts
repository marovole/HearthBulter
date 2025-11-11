/**
 * 库存追踪服务
 *
 * 提供库存管理的业务逻辑层，包括：
 * - 库存物品 CRUD
 * - 库存使用追踪
 * - 批量操作
 * - 统计分析
 *
 * @module inventory-tracker
 */

import type { InventoryRepository } from '@/lib/repositories/interfaces/inventory-repository';
import type {
  InventoryItemDTO,
  InventoryItemCreateDTO,
  InventoryItemUpdateDTO,
  InventoryItemFilterDTO,
  InventoryItemWithRelationsDTO,
  InventoryStatsDTO,
  InventoryStatus,
  StorageLocation,
} from '@/lib/repositories/types/inventory';

/**
 * 创建库存物品输入（兼容旧接口）
 * @deprecated 使用 InventoryItemCreateDTO 替代
 */
export interface CreateInventoryItemInput {
  memberId: string;
  foodId: string;
  quantity: number;
  unit: string;
  purchasePrice?: number;
  purchaseSource?: string;
  expiryDate?: Date;
  productionDate?: Date;
  storageLocation?: StorageLocation;
  storageNotes?: string;
  minStockThreshold?: number;
  barcode?: string;
  brand?: string;
  packageInfo?: string;
}

/**
 * 更新库存物品输入（兼容旧接口）
 * @deprecated 使用 InventoryItemUpdateDTO 替代
 */
export interface UpdateInventoryItemInput {
  quantity?: number;
  unit?: string;
  purchasePrice?: number;
  purchaseSource?: string;
  expiryDate?: Date;
  productionDate?: Date;
  storageLocation?: StorageLocation;
  storageNotes?: string;
  minStockThreshold?: number;
  barcode?: string;
  brand?: string;
  packageInfo?: string;
}

/**
 * 库存过滤条件（兼容旧接口）
 * @deprecated 使用 InventoryItemFilterDTO 替代
 */
export interface InventoryFilters {
  status?: InventoryStatus;
  storageLocation?: StorageLocation;
  category?: string;
  isExpiring?: boolean;
  isExpired?: boolean;
  isLowStock?: boolean;
}

/**
 * 库存物品（含关联数据）
 * @deprecated 使用 InventoryItemWithRelationsDTO 替代
 */
export type InventoryItemWithRelations = InventoryItemWithRelationsDTO;

/**
 * 库存追踪服务类
 *
 * 提供库存管理的核心业务逻辑，通过 Repository 模式访问数据
 */
export class InventoryTracker {
  constructor(private readonly repository: InventoryRepository) {}

  /**
   * 创建库存条目
   */
  async createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItemWithRelations> {
    const payload: InventoryItemCreateDTO = {
      memberId: input.memberId,
      foodId: input.foodId,
      quantity: input.quantity,
      unit: input.unit,
      purchasePrice: input.purchasePrice,
      purchaseSource: input.purchaseSource,
      expiryDate: input.expiryDate,
      productionDate: input.productionDate,
      storageLocation: input.storageLocation,
      storageNotes: input.storageNotes,
      minStockThreshold: input.minStockThreshold,
      barcode: input.barcode,
      brand: input.brand,
      packageInfo: input.packageInfo,
    };

    // 创建库存物品（Repository 会自动计算状态字段）
    const item = await this.repository.createInventoryItem(payload);

    // 获取完整的关联数据
    const itemWithRelations = await this.repository.getInventoryItemById(item.id);
    if (!itemWithRelations) {
      throw new Error('Failed to retrieve created inventory item');
    }

    return itemWithRelations;
  }

  /**
   * 更新库存条目
   */
  async updateInventoryItem(id: string, input: UpdateInventoryItemInput): Promise<InventoryItemWithRelations> {
    const payload: InventoryItemUpdateDTO = {
      quantity: input.quantity,
      unit: input.unit,
      purchasePrice: input.purchasePrice,
      purchaseSource: input.purchaseSource,
      expiryDate: input.expiryDate,
      productionDate: input.productionDate,
      storageLocation: input.storageLocation,
      storageNotes: input.storageNotes,
      minStockThreshold: input.minStockThreshold,
      barcode: input.barcode,
      brand: input.brand,
      packageInfo: input.packageInfo,
    };

    // 更新库存物品
    await this.repository.updateInventoryItem(id, payload);

    // 获取更新后的完整数据
    const itemWithRelations = await this.repository.getInventoryItemById(id);
    if (!itemWithRelations) {
      throw new Error('Failed to retrieve updated inventory item');
    }

    return itemWithRelations;
  }

  /**
   * 删除库存条目
   */
  async deleteInventoryItem(id: string): Promise<void> {
    await this.repository.softDeleteInventoryItem(id);
  }

  /**
   * 获取用户的库存列表
   *
   * 优化：直接从 Repository 获取带关联数据的结果，避免 N+1 查询
   * Repository 的 listInventoryItems 已经使用 Supabase JOIN 返回了 food 信息
   * 后续可以添加批量获取 usage_records 和 waste_records 的逻辑
   */
  async getInventoryItems(memberId: string, filters?: InventoryFilters): Promise<InventoryItemWithRelations[]> {
    // 转换过滤条件格式
    const filter: InventoryItemFilterDTO = {};

    if (filters) {
      filter.status = filters.status;
      filter.storageLocation = filters.storageLocation;
      filter.category = filters.category;
      filter.isExpiring = filters.isExpiring;
      filter.isExpired = filters.isExpired;
      filter.isLowStock = filters.isLowStock;
    }

    // 使用 Repository 查询（已包含 food 关联数据）
    const result = await this.repository.listInventoryItems(memberId, filter);

    // 优化：不再对每个 item 调用 getInventoryItemById（避免 N+1 查询）
    // 目前返回的数据已包含 food 信息（通过 Supabase JOIN 获取）
    // TODO: 如果需要 usage_records 和 waste_records，可添加批量查询逻辑
    return result.items as InventoryItemWithRelations[];
  }

  /**
   * 获取单个库存条目详情
   */
  async getInventoryItemById(id: string): Promise<InventoryItemWithRelations | null> {
    return await this.repository.getInventoryItemById(id);
  }

  /**
   * 使用库存
   *
   * 优化：添加 usageType 验证和 memberId 权限验证
   */
  async useInventory(
    inventoryItemId: string,
    usedQuantity: number,
    usageType: string,
    memberId: string,
    options?: {
      relatedId?: string;
      relatedType?: string;
      notes?: string;
      recipeName?: string;
    }
  ): Promise<InventoryItemWithRelations> {
    // 验证 usageType 是否为有效的枚举值
    const validReasons: Array<typeof usageReasonSchema._type> = [
      'COOKING', 'EATING', 'RECIPE', 'EXPIRED', 'DAMAGED', 'OTHER'
    ];

    if (!validReasons.includes(usageType as typeof usageReasonSchema._type)) {
      throw new Error(
        `Invalid usageType: ${usageType}. Valid values: ${validReasons.join(', ')}`
      );
    }

    // 验证库存物品属于当前用户（权限检查）
    const inventoryItem = await this.repository.getInventoryItemById(inventoryItemId);
    if (!inventoryItem) {
      throw new Error(`Inventory item not found: ${inventoryItemId}`);
    }

    if (inventoryItem.memberId !== memberId) {
      throw new Error('Permission denied: Inventory item does not belong to the current user');
    }

    // 使用库存（移除 any 类型强制转换）
    await this.repository.useInventoryItem({
      inventoryItemId,
      quantity: usedQuantity,
      reason: usageType as typeof usageReasonSchema._type,
      notes: options?.notes,
      // 注意：relatedId 和 relatedType 在新的 DTO 中映射为 mealId/recipeId
      mealId: options?.relatedType === 'MEAL' ? options?.relatedId : undefined,
      recipeId: options?.relatedType === 'RECIPE' ? options?.relatedId : undefined,
    });

    // 获取更新后的完整数据
    const item = await this.repository.getInventoryItemById(inventoryItemId);
    if (!item) {
      throw new Error('Failed to retrieve inventory item after use');
    }

    return item;
  }

  /**
   * 批量使用库存（用于食谱烹饪）
   */
  async useInventoryForRecipe(
    memberId: string,
    ingredients: Array<{
      foodId: string;
      quantity: number;
      unit: string;
    }>,
    recipeName: string
  ): Promise<InventoryItemWithRelations[]> {
    const results: InventoryItemWithRelations[] = [];

    for (const ingredient of ingredients) {
      // 查找匹配的库存条目（优先使用临期食材）
      // 先获取所有匹配的物品
      const allItems = await this.repository.listInventoryItems(memberId, {
        category: undefined, // 不按分类过滤
      });

      // 筛选符合条件的物品（foodId 匹配且数量充足）
      const matchingItems = allItems.items
        .filter((item) => item.foodId === ingredient.foodId && item.quantity >= ingredient.quantity)
        .sort((a, b) => {
          // 按过期日期升序排序（临期优先）
          if (a.expiryDate && b.expiryDate) {
            return a.expiryDate.getTime() - b.expiryDate.getTime();
          }
          if (a.expiryDate) return -1;
          if (b.expiryDate) return 1;
          // 如果都没有过期日期，按创建时间升序
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      if (matchingItems.length > 0) {
        const inventoryItem = matchingItems[0];

        const updatedItem = await this.useInventory(
          inventoryItem.id,
          ingredient.quantity,
          'COOKING',
          memberId,
          {
            recipeName,
            notes: `食谱：${recipeName}`,
            relatedType: 'RECIPE',
          }
        );

        results.push(updatedItem);
      }
    }

    return results;
  }

  /**
   * 获取库存统计信息
   */
  async getInventoryStats(memberId: string): Promise<{
    totalItems: number;
    totalCategories: number;
    freshItems: number;
    expiringItems: number;
    expiredItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    estimatedValue: number;
  }> {
    const stats = await this.repository.getInventoryStats(memberId);

    // 转换为旧接口格式
    return {
      totalItems: stats.totalItems,
      totalCategories: Object.keys(stats.itemsByLocation).length, // 使用位置数量作为近似
      freshItems: stats.itemsByStatus['FRESH'] ?? 0,
      expiringItems: stats.itemsByStatus['EXPIRING'] ?? 0,
      expiredItems: stats.itemsByStatus['EXPIRED'] ?? 0,
      lowStockItems: stats.lowStockCount,
      outOfStockItems: stats.itemsByStatus['DEPLETED'] ?? 0,
      estimatedValue: stats.totalValue,
    };
  }

  // ==================== 辅助方法（保留用于向后兼容）====================

  /**
   * 计算剩余保质期天数
   * @deprecated 此方法已移至 Repository 层
   */
  private calculateDaysToExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * 计算库存状态
   * @deprecated 此方法已移至 Repository 层
   */
  private calculateInventoryStatus(
    quantity: number,
    expiryDate?: Date,
    minStockThreshold?: number
  ): InventoryStatus {
    if (quantity <= 0) {
      return 'DEPLETED';
    }

    if (minStockThreshold && quantity <= minStockThreshold) {
      return 'NORMAL';
    }

    if (expiryDate) {
      const now = new Date();
      const daysToExpiry = this.calculateDaysToExpiry(expiryDate);

      if (daysToExpiry < 0) {
        return 'EXPIRED';
      } else if (daysToExpiry <= 3) {
        return 'EXPIRING';
      }
    }

    return 'FRESH';
  }
}

/**
 * 默认库存追踪器实例（用于向后兼容）
 * @deprecated 建议使用依赖注入方式创建实例
 */
// export const inventoryTracker = new InventoryTracker(defaultRepository);
// 注释掉单例导出，强制使用依赖注入
