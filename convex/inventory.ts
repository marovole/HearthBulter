import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess, apiError } from "./lib/response";
import { verifyMemberAccess } from "./lib/auth";

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
    userEmail: v.string(),
    status: v.optional(v.string()),
    storageLocation: v.optional(v.string()),
    category: v.optional(v.string()),
    isExpiring: v.optional(v.boolean()),
    isExpired: v.optional(v.boolean()),
    isLowStock: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { hasAccess, member } = await verifyMemberAccess(
      ctx,
      args.memberId,
      args.userEmail,
    );
    if (!hasAccess || !member) {
      return apiError("无权访问此成员数据", "FORBIDDEN");
    }

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
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { hasAccess, member } = await verifyMemberAccess(
      ctx,
      args.memberId,
      args.userEmail,
    );
    if (!hasAccess || !member) {
      return apiError("无权访问此成员数据", "FORBIDDEN");
    }

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
