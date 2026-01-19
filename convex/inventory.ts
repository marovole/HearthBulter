import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess, apiError } from "./lib/response";

const STATUS_PRIORITY = {
  OUT_OF_STOCK: 0,
  LOW_STOCK: 1,
  EXPIRED: 2,
  EXPIRING: 3,
  FRESH: 4,
};

function calculateDaysToExpiry(expiryDate?: number) {
  if (!expiryDate) return null;
  const diffTime = expiryDate - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateInventoryStatus(
  quantity: number,
  expiryDate?: number,
  minStockThreshold?: number,
) {
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (minStockThreshold !== undefined && quantity <= minStockThreshold) {
    return "LOW_STOCK";
  }
  if (expiryDate) {
    const daysToExpiry = calculateDaysToExpiry(expiryDate);
    if (daysToExpiry !== null && daysToExpiry < 0) return "EXPIRED";
    if (daysToExpiry !== null && daysToExpiry <= 3) return "EXPIRING";
  }
  return "FRESH";
}

function applyItemFilters(
  item: any,
  filters: {
    status?: string;
    storageLocation?: string;
    category?: string;
    isExpiring?: boolean;
    isExpired?: boolean;
    isLowStock?: boolean;
  },
) {
  if (filters.status && item.status !== filters.status) return false;
  if (
    filters.storageLocation &&
    item.storageLocation !== filters.storageLocation
  ) {
    return false;
  }
  if (filters.category && item.food?.category !== filters.category)
    return false;
  if (filters.isExpiring && item.status !== "EXPIRING") return false;
  if (filters.isExpired && item.status !== "EXPIRED") return false;
  if (filters.isLowStock && item.status !== "LOW_STOCK") return false;
  return true;
}

/**
 * List inventory items for a member
 */
export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    category: v.optional(v.string()),
    isExpiring: v.optional(v.boolean()),
    isExpired: v.optional(v.boolean()),
    isLowStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    const itemsWithFood = await Promise.all(
      items.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        const daysToExpiry = calculateDaysToExpiry(item.expiryDate);
        const isLowStock =
          item.minStockThreshold !== undefined &&
          item.quantity <= item.minStockThreshold;
        const status = calculateInventoryStatus(
          item.quantity,
          item.expiryDate,
          item.minStockThreshold,
        );
        return {
          ...item,
          food,
          daysToExpiry,
          isLowStock,
          status,
        };
      }),
    );

    const filtered = itemsWithFood.filter((item) =>
      applyItemFilters(item, {
        status: args.status,
        storageLocation: args.storageLocation,
        category: args.category,
        isExpiring: args.isExpiring,
        isExpired: args.isExpired,
        isLowStock: args.isLowStock,
      }),
    );

    return filtered.sort((a, b) => {
      const aScore =
        STATUS_PRIORITY[a.status as keyof typeof STATUS_PRIORITY] ?? 0;
      const bScore =
        STATUS_PRIORITY[b.status as keyof typeof STATUS_PRIORITY] ?? 0;
      if (aScore !== bScore) return aScore - bScore;
      const aExpiry = a.expiryDate ?? Number.POSITIVE_INFINITY;
      const bExpiry = b.expiryDate ?? Number.POSITIVE_INFINITY;
      return aExpiry - bExpiry;
    });
  },
});

/**
 * Add an item to inventory
 */
export const add = mutation({
  args: {
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.number(),
    unit: v.string(),
    storageLocation: v.string(),
    expiryDate: v.optional(v.number()),
    minStockThreshold: v.optional(v.number()),
    purchasePrice: v.optional(v.number()),
    purchaseSource: v.optional(v.string()),
    productionDate: v.optional(v.number()),
    storageNotes: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
    packageInfo: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const food = await ctx.db.get(args.foodId);
    if (!food) {
      return apiError("食物不存在", "NOT_FOUND");
    }
    // Check if food was soft-deleted
    const foodWithDeleted = food as typeof food & { deletedAt?: number };
    if (foodWithDeleted.deletedAt) {
      return apiError("食物不存在或已删除", "NOT_FOUND");
    }

    const status = calculateInventoryStatus(
      args.quantity,
      args.expiryDate,
      args.minStockThreshold,
    );
    const itemId = await ctx.db.insert("inventoryItems", {
      memberId: args.memberId,
      foodId: args.foodId,
      quantity: args.quantity,
      unit: args.unit,
      originalQuantity: args.quantity,
      purchaseDate: Date.now(),
      purchasePrice: args.purchasePrice,
      purchaseSource: args.purchaseSource,
      expiryDate: args.expiryDate,
      storageLocation: args.storageLocation,
      storageNotes: args.storageNotes,
      minStockThreshold: args.minStockThreshold,
      status,
      barcode: args.barcode,
      brand: args.brand,
      packageInfo: args.packageInfo,
      productionDate: args.productionDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return apiSuccess({ itemId });
  },
});

/**
 * Update inventory item quantity
 */
export const updateQuantity = mutation({
  args: {
    id: v.id("inventoryItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return apiError("Item not found");

    await ctx.db.patch(args.id, {
      quantity: args.quantity,
      status: args.quantity <= 0 ? "OUT_OF_STOCK" : item.status,
      updatedAt: Date.now(),
    });

    return apiSuccess({ id: args.id });
  },
});

export const getById = query({
  args: { itemId: v.id("inventoryItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) {
      return null;
    }

    const food = await ctx.db.get(item.foodId);
    const usageRecords = await ctx.db
      .query("inventoryUsages")
      .withIndex("by_item_date", (q) => q.eq("inventoryItemId", args.itemId))
      .order("desc")
      .take(5);
    const wasteRecords = await ctx.db
      .query("wasteRecords")
      .withIndex("by_item_date", (q) => q.eq("inventoryItemId", args.itemId))
      .order("desc")
      .take(5);

    const daysToExpiry = calculateDaysToExpiry(item.expiryDate);
    const isLowStock =
      item.minStockThreshold !== undefined &&
      item.quantity <= item.minStockThreshold;
    const status = calculateInventoryStatus(
      item.quantity,
      item.expiryDate,
      item.minStockThreshold,
    );

    return {
      ...item,
      food,
      daysToExpiry,
      isLowStock,
      status,
      usageRecords,
      wasteRecords,
    };
  },
});

export const update = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    purchaseSource: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    productionDate: v.optional(v.number()),
    storageLocation: v.optional(v.string()),
    storageNotes: v.optional(v.string()),
    minStockThreshold: v.optional(v.number()),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
    packageInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.deletedAt) {
      return apiError("Item not found");
    }

    const quantity = args.quantity ?? item.quantity;
    const expiryDate = args.expiryDate ?? item.expiryDate;
    const minStockThreshold = args.minStockThreshold ?? item.minStockThreshold;
    const status = calculateInventoryStatus(
      quantity,
      expiryDate,
      minStockThreshold,
    );

    await ctx.db.patch(args.itemId, {
      quantity,
      unit: args.unit ?? item.unit,
      purchasePrice: args.purchasePrice ?? item.purchasePrice,
      purchaseSource: args.purchaseSource ?? item.purchaseSource,
      expiryDate,
      productionDate: args.productionDate ?? item.productionDate,
      storageLocation: args.storageLocation ?? item.storageLocation,
      storageNotes: args.storageNotes ?? item.storageNotes,
      minStockThreshold,
      barcode: args.barcode ?? item.barcode,
      brand: args.brand ?? item.brand,
      packageInfo: args.packageInfo ?? item.packageInfo,
      status,
      updatedAt: Date.now(),
    });

    return apiSuccess({ id: args.itemId });
  },
});

export const softDelete = mutation({
  args: { itemId: v.id("inventoryItems") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.itemId, { deletedAt: now, updatedAt: now });
    return apiSuccess({ id: args.itemId });
  },
});

export const useItem = mutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.string(),
    mealId: v.optional(v.id("meals")),
    recipeId: v.optional(v.id("recipes")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inventoryItemId);
    if (!item || item.deletedAt) {
      return apiError("Item not found");
    }

    if (item.quantity < args.quantity) {
      return apiError("库存不足", "INSUFFICIENT_STOCK");
    }

    const newQuantity = item.quantity - args.quantity;
    const status = calculateInventoryStatus(
      newQuantity,
      item.expiryDate,
      item.minStockThreshold,
    );
    const now = Date.now();

    await ctx.db.patch(args.inventoryItemId, {
      quantity: newQuantity,
      status,
      lastUsedAt: now,
      usageCount: (item.usageCount ?? 0) + 1,
      updatedAt: now,
    });

    const usageId = await ctx.db.insert("inventoryUsages", {
      inventoryItemId: args.inventoryItemId,
      quantity: args.quantity,
      reason: args.reason,
      mealId: args.mealId,
      recipeId: args.recipeId,
      notes: args.notes,
      usageDate: now,
      createdAt: now,
      updatedAt: now,
    });

    return apiSuccess({ usageId });
  },
});

export const batchUse = mutation({
  args: {
    memberId: v.id("familyMembers"),
    recipeId: v.optional(v.id("recipes")),
    mealId: v.optional(v.id("meals")),
    items: v.array(
      v.object({
        inventoryItemId: v.id("inventoryItems"),
        quantity: v.number(),
        reason: v.string(),
        mealId: v.optional(v.id("meals")),
        recipeId: v.optional(v.id("recipes")),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const itemInput of args.items) {
      const item = await ctx.db.get(itemInput.inventoryItemId);
      if (!item || item.deletedAt) {
        return apiError("Item not found");
      }
      if (item.quantity < itemInput.quantity) {
        return apiError("库存不足", "INSUFFICIENT_STOCK");
      }

      const newQuantity = item.quantity - itemInput.quantity;
      const status = calculateInventoryStatus(
        newQuantity,
        item.expiryDate,
        item.minStockThreshold,
      );

      await ctx.db.patch(itemInput.inventoryItemId, {
        quantity: newQuantity,
        status,
        lastUsedAt: now,
        usageCount: (item.usageCount ?? 0) + 1,
        updatedAt: now,
      });

      await ctx.db.insert("inventoryUsages", {
        inventoryItemId: itemInput.inventoryItemId,
        quantity: itemInput.quantity,
        reason: itemInput.reason,
        mealId: itemInput.mealId ?? args.mealId,
        recipeId: itemInput.recipeId ?? args.recipeId,
        notes: itemInput.notes,
        usageDate: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return apiSuccess({ count: args.items.length });
  },
});

export const listUsages = query({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("inventoryUsages")
      .withIndex("by_item_date", (q) =>
        q.eq("inventoryItemId", args.inventoryItemId),
      )
      .order("desc")
      .collect();

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;

    return {
      data: records.slice(offset, offset + limit),
      total: records.length,
    };
  },
});

export const createWaste = mutation({
  args: {
    inventoryItemId: v.id("inventoryItems"),
    quantity: v.number(),
    reason: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inventoryItemId);
    if (!item || item.deletedAt) {
      return apiError("Item not found");
    }

    const newQuantity = Math.max(0, item.quantity - args.quantity);
    const status = calculateInventoryStatus(
      newQuantity,
      item.expiryDate,
      item.minStockThreshold,
    );
    const now = Date.now();

    await ctx.db.patch(args.inventoryItemId, {
      quantity: newQuantity,
      status,
      wasteCount: (item.wasteCount ?? 0) + 1,
      updatedAt: now,
    });

    const wasteId = await ctx.db.insert("wasteRecords", {
      inventoryItemId: args.inventoryItemId,
      quantity: args.quantity,
      reason: args.reason,
      wasteDate: now,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return apiSuccess({ wasteId });
  },
});

export const listWasteRecords = query({
  args: {
    inventoryItemId: v.optional(v.id("inventoryItems")),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db.query("wasteRecords").collect();
    const filtered = args.inventoryItemId
      ? records.filter(
          (record) => record.inventoryItemId === args.inventoryItemId,
        )
      : records;

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;

    return {
      data: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  },
});

export const stats = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const totalValue = items.reduce(
      (sum, item) => sum + (item.purchasePrice ?? 0),
      0,
    );

    const itemsByStatus = items.reduce<Record<string, number>>((acc, item) => {
      const status = item.status ?? "NORMAL";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const itemsByLocation = items.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.storageLocation] = (acc[item.storageLocation] || 0) + 1;
        return acc;
      },
      {},
    );

    const expiringCount = items.filter(
      (item) => item.status === "EXPIRING",
    ).length;
    const expiredCount = items.filter(
      (item) => item.status === "EXPIRED",
    ).length;
    const lowStockCount = items.filter(
      (item) => item.status === "LOW_STOCK",
    ).length;

    const wasteRecords = await ctx.db.query("wasteRecords").collect();
    const wasteStats = wasteRecords.reduce(
      (acc, record) => {
        acc.totalQuantity += record.quantity;
        acc.totalValue += record.quantity * 0;
        acc.byReason[record.reason] =
          (acc.byReason[record.reason] || 0) + record.quantity;
        return acc;
      },
      {
        totalQuantity: 0,
        totalValue: 0,
        byReason: {} as Record<string, number>,
      },
    );

    return {
      totalItems: items.length,
      totalValue,
      itemsByStatus,
      itemsByLocation,
      expiringCount,
      expiredCount,
      lowStockCount,
      wasteStats,
    };
  },
});
