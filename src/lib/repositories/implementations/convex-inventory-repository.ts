import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  BatchUseInventoryInputDTO,
  InventoryItemCreateDTO,
  InventoryItemDTO,
  InventoryItemFilterDTO,
  InventoryItemUpdateDTO,
  InventoryItemWithRelationsDTO,
  InventoryStatsDTO,
  InventoryUsageDTO,
  UseInventoryInputDTO,
  WasteRecordCreateDTO,
  WasteRecordDTO,
} from "../types/inventory";
import type { InventoryRepository } from "../interfaces/inventory-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const DEFAULT_LIMIT = 20;

export class ConvexInventoryRepository implements InventoryRepository {
  async createInventoryItem(payload: InventoryItemCreateDTO): Promise<InventoryItemDTO> {
    const response = await convexClient.mutation<{ data: { itemId: string } }>(api.inventory.add, {
      memberId: payload.memberId as Id<"familyMembers">,
      foodId: payload.foodId as Id<"foods">,
      quantity: payload.quantity,
      unit: payload.unit,
      storageLocation: payload.storageLocation ?? "ROOM_TEMP",
      expiryDate: payload.expiryDate?.getTime(),
      minStockThreshold: payload.minStockThreshold,
      purchasePrice: payload.purchasePrice,
      purchaseSource: payload.purchaseSource,
      productionDate: payload.productionDate?.getTime(),
      storageNotes: payload.storageNotes,
      barcode: payload.barcode,
      brand: payload.brand,
      packageInfo: payload.packageInfo,
    });

    const item = await convexClient.query<any>(api.inventory.getById, {
      itemId: response.data.itemId as Id<"inventoryItems">,
    });

    if (!item) {
      throw new Error("库存物品创建失败");
    }

    return mapInventoryItem(item);
  }

  async updateInventoryItem(
    id: string,
    payload: InventoryItemUpdateDTO
  ): Promise<InventoryItemDTO> {
    await convexClient.mutation(api.inventory.update, {
      itemId: id as Id<"inventoryItems">,
      quantity: payload.quantity,
      unit: payload.unit,
      purchasePrice: payload.purchasePrice,
      purchaseSource: payload.purchaseSource,
      expiryDate: payload.expiryDate?.getTime(),
      productionDate: payload.productionDate?.getTime(),
      storageLocation: payload.storageLocation,
      storageNotes: payload.storageNotes,
      minStockThreshold: payload.minStockThreshold,
      barcode: payload.barcode,
      brand: payload.brand,
      packageInfo: payload.packageInfo,
    });

    const item = await convexClient.query<any>(api.inventory.getById, {
      itemId: id as Id<"inventoryItems">,
    });

    if (!item) {
      throw new Error("库存物品不存在");
    }

    return mapInventoryItem(item);
  }

  async getInventoryItemById(id: string): Promise<InventoryItemWithRelationsDTO | null> {
    const item = await convexClient.query<any>(api.inventory.getById, {
      itemId: id as Id<"inventoryItems">,
    });

    return item ? mapInventoryItemWithRelations(item) : null;
  }

  async listInventoryItems(
    memberId: string,
    filter?: InventoryItemFilterDTO,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<InventoryItemDTO>> {
    const items = await convexClient.query<any[]>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
      status: filter?.status,
      storageLocation: filter?.storageLocation,
      category: filter?.category,
      isExpiring: filter?.isExpiring,
      isExpired: filter?.isExpired,
      isLowStock: filter?.isLowStock,
    });

    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? DEFAULT_LIMIT;
    const pageItems = items.slice(offset, offset + limit).map(mapInventoryItem);

    return {
      items: pageItems,
      total: items.length,
      hasMore: offset + pageItems.length < items.length,
    };
  }

  async softDeleteInventoryItem(id: string): Promise<void> {
    await convexClient.mutation(api.inventory.softDelete, {
      itemId: id as Id<"inventoryItems">,
    });
  }

  async useInventoryItem(payload: UseInventoryInputDTO): Promise<InventoryItemDTO> {
    await convexClient.mutation(api.inventory.useItem, {
      inventoryItemId: payload.inventoryItemId as Id<"inventoryItems">,
      quantity: payload.quantity,
      reason: payload.reason,
      mealId: payload.mealId ? (payload.mealId as Id<"meals">) : undefined,
      recipeId: payload.recipeId ? (payload.recipeId as Id<"recipes">) : undefined,
      notes: payload.notes,
    });

    const item = await convexClient.query<any>(api.inventory.getById, {
      itemId: payload.inventoryItemId as Id<"inventoryItems">,
    });

    if (!item) {
      throw new Error("库存物品不存在");
    }

    return mapInventoryItem(item);
  }

  async batchUseInventory(payload: BatchUseInventoryInputDTO): Promise<InventoryItemDTO[]> {
    await convexClient.mutation(api.inventory.batchUse, {
      memberId: payload.memberId as Id<"familyMembers">,
      recipeId: payload.recipeId ? (payload.recipeId as Id<"recipes">) : undefined,
      mealId: payload.mealId ? (payload.mealId as Id<"meals">) : undefined,
      items: payload.items.map((item) => ({
        inventoryItemId: item.inventoryItemId as Id<"inventoryItems">,
        quantity: item.quantity,
        reason: item.reason,
        mealId: item.mealId ? (item.mealId as Id<"meals">) : undefined,
        recipeId: item.recipeId ? (item.recipeId as Id<"recipes">) : undefined,
        notes: item.notes,
      })),
    });

    const updated = await Promise.all(
      payload.items.map(async (item) => {
        const record = await convexClient.query<any>(api.inventory.getById, {
          itemId: item.inventoryItemId as Id<"inventoryItems">,
        });
        return record ? mapInventoryItem(record) : null;
      })
    );

    return updated.filter((item): item is InventoryItemDTO => !!item);
  }

  async listInventoryUsages(
    inventoryItemId: string,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<InventoryUsageDTO>> {
    const result = await convexClient.query<{
      data: Doc<"inventoryUsages">[];
      total: number;
    }>(api.inventory.listUsages, {
      inventoryItemId: inventoryItemId as Id<"inventoryItems">,
      offset: pagination?.offset,
      limit: pagination?.limit,
    });

    return {
      items: result.data.map(mapUsage),
      total: result.total,
      hasMore: (pagination?.offset ?? 0) + result.data.length < result.total,
    };
  }

  async createWasteRecord(payload: WasteRecordCreateDTO): Promise<WasteRecordDTO> {
    const result = await convexClient.mutation<{ data: { recordId: string } }>(
      api.inventory.createWaste,
      {
        inventoryItemId: payload.inventoryItemId as Id<"inventoryItems">,
        quantity: payload.quantity,
        reason: payload.reason,
        notes: payload.notes,
      }
    );

    const wasteRecords = await convexClient.query<{
      data: Doc<"wasteRecords">[];
      total: number;
    }>(api.inventory.listWasteRecords, {
      inventoryItemId: payload.inventoryItemId as Id<"inventoryItems">,
      offset: 0,
      limit: 1,
    });

    const record = wasteRecords.data[0];
    if (!record) {
      throw new Error("浪费记录创建失败");
    }

    return mapWasteRecord(record);
  }

  async listWasteRecords(
    inventoryItemId?: string,
    filter?: {
      startDate?: Date;
      endDate?: Date;
      reason?: WasteRecordDTO["reason"];
    },
    pagination?: PaginationInput
  ): Promise<PaginatedResult<WasteRecordDTO>> {
    const result = await convexClient.query<{
      data: Doc<"wasteRecords">[];
      total: number;
    }>(api.inventory.listWasteRecords, {
      inventoryItemId: inventoryItemId ? (inventoryItemId as Id<"inventoryItems">) : undefined,
      offset: pagination?.offset,
      limit: pagination?.limit,
    });

    const filtered = result.data.filter((record) => {
      if (filter?.reason && record.reason !== filter.reason) return false;
      if (filter?.startDate && record.wasteDate < filter.startDate.getTime()) {
        return false;
      }
      if (filter?.endDate && record.wasteDate > filter.endDate.getTime()) {
        return false;
      }
      return true;
    });

    return {
      items: filtered.map(mapWasteRecord),
      total: filtered.length,
      hasMore: (pagination?.offset ?? 0) + filtered.length < filtered.length,
    };
  }

  async getInventoryStats(memberId: string): Promise<InventoryStatsDTO> {
    return await convexClient.query<InventoryStatsDTO>(api.inventory.stats, {
      memberId: memberId as Id<"familyMembers">,
    });
  }

  async getExpiringItems(memberId: string, days: number = 3): Promise<InventoryItemDTO[]> {
    const items = await convexClient.query<any[]>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
      isExpiring: true,
    });

    const threshold = Date.now() + days * 24 * 60 * 60 * 1000;
    return items
      .filter((item: any) => item.expiryDate && item.expiryDate <= threshold)
      .map(mapInventoryItem);
  }

  async getLowStockItems(memberId: string): Promise<InventoryItemDTO[]> {
    const items = await convexClient.query<any[]>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
      isLowStock: true,
    });

    return items.map(mapInventoryItem);
  }

  async getInventoryValueTrend(
    memberId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; totalValue: number; itemCount: number }>> {
    const items = await convexClient.query<any[]>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
    });

    const start = startDate.getTime();
    const end = endDate.getTime();
    const buckets = new Map<string, { totalValue: number; itemCount: number }>();

    items.forEach((item: any) => {
      const timestamp = item.purchaseDate ?? item.createdAt ?? 0;
      if (timestamp < start || timestamp > end) return;
      const dateKey = new Date(timestamp).toISOString().slice(0, 10);
      const current = buckets.get(dateKey) || {
        totalValue: 0,
        itemCount: 0,
      };
      current.totalValue += item.purchasePrice ?? 0;
      current.itemCount += 1;
      buckets.set(dateKey, current);
    });

    return Array.from(buckets.entries())
      .map(([dateKey, data]) => ({
        date: new Date(dateKey),
        totalValue: data.totalValue,
        itemCount: data.itemCount,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async batchUpdateInventoryStatus(memberId?: string): Promise<number> {
    if (!memberId) {
      return 0;
    }

    const items = await convexClient.query<any[]>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
    });

    let updated = 0;
    for (const item of items) {
      const status = calculateStatus(item.quantity, item.expiryDate, item.minStockThreshold);
      await convexClient.mutation(api.inventory.update, {
        itemId: item._id as Id<"inventoryItems">,
        quantity: item.quantity,
        expiryDate: item.expiryDate,
        minStockThreshold: item.minStockThreshold,
        storageLocation: item.storageLocation,
        storageNotes: item.storageNotes,
        unit: item.unit,
      });
      if (status) {
        updated += 1;
      }
    }

    return updated;
  }

  async batchDeleteExpiredItems(
    memberId: string,
    expiredDaysThreshold: number = 30
  ): Promise<number> {
    const items = await convexClient.query<any[]>(api.inventory.list, {
      memberId: memberId as Id<"familyMembers">,
    });

    const threshold = Date.now() - expiredDaysThreshold * 24 * 60 * 60 * 1000;
    const expiredItems = items.filter(
      (item: any) => item.expiryDate && item.expiryDate < threshold
    );

    for (const item of expiredItems) {
      await convexClient.mutation(api.inventory.softDelete, {
        itemId: item._id as Id<"inventoryItems">,
      });
    }

    return expiredItems.length;
  }
}

function calculateStatus(quantity: number, expiryDate?: number, minStockThreshold?: number) {
  if (quantity <= 0) return "DEPLETED";
  if (minStockThreshold !== undefined && quantity <= minStockThreshold) {
    return "NORMAL";
  }
  if (expiryDate) {
    const daysToExpiry = Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry < 0) return "EXPIRED";
    if (daysToExpiry <= 3) return "EXPIRING";
  }
  return "FRESH";
}

function mapInventoryItem(item: any): InventoryItemDTO {
  const daysToExpiry = item.daysToExpiry ?? null;
  const isLowStock = item.isLowStock ?? false;

  return {
    id: item._id,
    memberId: item.memberId,
    foodId: item.foodId,
    food: mapFood(item.food),
    quantity: item.quantity,
    originalQuantity: item.originalQuantity,
    unit: item.unit,
    purchasePrice: item.purchasePrice ?? undefined,
    purchaseSource: item.purchaseSource ?? undefined,
    expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
    productionDate: item.productionDate ? new Date(item.productionDate) : undefined,
    daysToExpiry: daysToExpiry ?? undefined,
    storageLocation: item.storageLocation,
    storageNotes: item.storageNotes ?? undefined,
    minStockThreshold: item.minStockThreshold ?? undefined,
    isLowStock,
    barcode: item.barcode ?? undefined,
    brand: item.brand ?? undefined,
    packageInfo: item.packageInfo ?? undefined,
    status: mapInventoryStatus(item.status),
    lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt) : undefined,
    usageCount: item.usageCount ?? 0,
    wasteCount: item.wasteCount ?? 0,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

function mapInventoryItemWithRelations(item: any): InventoryItemWithRelationsDTO {
  return {
    ...mapInventoryItem(item),
    usageRecords: (item.usageRecords ?? []).map(mapUsage),
    wasteRecords: (item.wasteRecords ?? []).map(mapWasteRecord),
  };
}

function mapUsage(record: Doc<"inventoryUsages">): InventoryUsageDTO {
  return {
    id: record._id,
    inventoryItemId: record.inventoryItemId,
    quantity: record.quantity,
    reason: record.reason as InventoryUsageDTO["reason"],
    mealId: record.mealId ?? undefined,
    recipeId: record.recipeId ?? undefined,
    notes: record.notes ?? undefined,
    usageDate: new Date(record.usageDate),
    createdAt: new Date(record.createdAt),
  };
}

function mapWasteRecord(record: Doc<"wasteRecords">): WasteRecordDTO {
  return {
    id: record._id,
    inventoryItemId: record.inventoryItemId,
    quantity: record.quantity,
    reason: record.reason as WasteRecordDTO["reason"],
    wasteDate: new Date(record.wasteDate),
    notes: record.notes ?? undefined,
    createdAt: new Date(record.createdAt),
  };
}

function mapFood(food: Doc<"foods"> | null | undefined): InventoryItemDTO["food"] {
  if (!food) {
    return {
      id: "",
      name: "",
      nameEn: undefined,
      category: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }

  return {
    id: food._id,
    name: food.name,
    nameEn: food.nameEn ?? undefined,
    category: food.category,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
  };
}

function mapInventoryStatus(status: string): InventoryItemDTO["status"] {
  switch (status) {
    case "OUT_OF_STOCK":
      return "DEPLETED";
    case "LOW_STOCK":
      return "NORMAL";
    case "EXPIRING":
      return "EXPIRING";
    case "EXPIRED":
      return "EXPIRED";
    case "FRESH":
      return "FRESH";
    default:
      return "NORMAL";
  }
}
