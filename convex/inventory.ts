import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vStorageLocation, vInventoryStatus, vWasteReason } from "./schema";

/**
 * Get inventory items for a member
 */
export const list = query({
  args: {
    memberId: v.id("familyMembers"),
    status: v.optional(vInventoryStatus),
    storageLocation: v.optional(vStorageLocation),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("inventoryItems")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    const items = await query.take(args.limit ?? 100);

    let filtered = items;
    if (args.status) {
      filtered = filtered.filter((i) => i.status === args.status);
    }
    if (args.storageLocation) {
      filtered = filtered.filter((i) => i.storageLocation === args.storageLocation);
    }

    // Get food details for each item
    const itemsWithFood = await Promise.all(
      filtered.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        return { ...item, food };
      })
    );

    return itemsWithFood;
  },
});

/**
 * Get expiring items
 */
export const getExpiring = query({
  args: {
    memberId: v.id("familyMembers"),
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const daysAhead = args.daysAhead ?? 7;
    const now = Date.now();
    const futureDate = now + daysAhead * 24 * 60 * 60 * 1000;

    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.neq(q.field("expiryDate"), undefined)
        )
      )
      .collect();

    const expiringItems = items.filter((item) => {
      if (!item.expiryDate) return false;
      return item.expiryDate <= futureDate && item.expiryDate >= now;
    });

    const itemsWithFood = await Promise.all(
      expiringItems.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        return { ...item, food };
      })
    );

    return itemsWithFood.sort((a, b) => (a.expiryDate ?? 0) - (b.expiryDate ?? 0));
  },
});

/**
 * Get low stock items
 */
export const getLowStock = query({
  args: {
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_memberId_status", (q) =>
        q.eq("memberId", args.memberId).eq("status", "LOW_STOCK")
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const itemsWithFood = await Promise.all(
      items.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        return { ...item, food };
      })
    );

    return itemsWithFood;
  },
});

/**
 * Add inventory item
 */
export const add = mutation({
  args: {
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.float64(),
    unit: v.string(),
    purchaseDate: v.optional(v.number()),
    purchasePrice: v.optional(v.float64()),
    purchaseSource: v.optional(v.string()),
    expiryDate: v.optional(v.number()),
    productionDate: v.optional(v.number()),
    storageLocation: vStorageLocation,
    storageNotes: v.optional(v.string()),
    minStockThreshold: v.optional(v.float64()),
    barcode: v.optional(v.string()),
    brand: v.optional(v.string()),
    packageInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const now = Date.now();
    let daysToExpiry: number | undefined;
    let status: "FRESH" | "EXPIRING" | "EXPIRED" | "LOW_STOCK" | "OUT_OF_STOCK" = "FRESH";

    if (args.expiryDate) {
      daysToExpiry = Math.ceil((args.expiryDate - now) / (24 * 60 * 60 * 1000));
      if (daysToExpiry <= 0) {
        status = "EXPIRED";
      } else if (daysToExpiry <= 3) {
        status = "EXPIRING";
      }
    }

    const isLowStock = args.minStockThreshold
      ? args.quantity <= args.minStockThreshold
      : false;

    if (isLowStock && status === "FRESH") {
      status = "LOW_STOCK";
    }

    return await ctx.db.insert("inventoryItems", {
      memberId: args.memberId,
      foodId: args.foodId,
      quantity: args.quantity,
      unit: args.unit,
      originalQuantity: args.quantity,
      purchaseDate: args.purchaseDate ?? now,
      purchasePrice: args.purchasePrice,
      purchaseSource: args.purchaseSource,
      expiryDate: args.expiryDate,
      productionDate: args.productionDate,
      daysToExpiry,
      storageLocation: args.storageLocation,
      storageNotes: args.storageNotes,
      status,
      minStockThreshold: args.minStockThreshold,
      isLowStock,
      barcode: args.barcode,
      brand: args.brand,
      packageInfo: args.packageInfo,
    });
  },
});

/**
 * Update inventory item
 */
export const update = mutation({
  args: {
    id: v.id("inventoryItems"),
    quantity: v.optional(v.float64()),
    expiryDate: v.optional(v.number()),
    storageLocation: v.optional(vStorageLocation),
    storageNotes: v.optional(v.string()),
    minStockThreshold: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    const { id, ...updates } = args;
    const updateData: Record<string, unknown> = { ...updates };

    // Recalculate status
    const quantity = args.quantity ?? item.quantity;
    const expiryDate = args.expiryDate ?? item.expiryDate;
    const minThreshold = args.minStockThreshold ?? item.minStockThreshold;

    const now = Date.now();
    let status: "FRESH" | "EXPIRING" | "EXPIRED" | "LOW_STOCK" | "OUT_OF_STOCK" = "FRESH";

    if (quantity <= 0) {
      status = "OUT_OF_STOCK";
    } else if (expiryDate) {
      const daysToExpiry = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));
      updateData.daysToExpiry = daysToExpiry;

      if (daysToExpiry <= 0) {
        status = "EXPIRED";
      } else if (daysToExpiry <= 3) {
        status = "EXPIRING";
      }
    }

    const isLowStock = minThreshold ? quantity <= minThreshold : false;
    if (isLowStock && status === "FRESH") {
      status = "LOW_STOCK";
    }

    updateData.status = status;
    updateData.isLowStock = isLowStock;

    await ctx.db.patch(id, updateData);
    return id;
  },
});

/**
 * Use inventory item
 */
export const use = mutation({
  args: {
    id: v.id("inventoryItems"),
    memberId: v.id("familyMembers"),
    quantity: v.float64(),
    usageType: v.string(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.string()),
    notes: v.optional(v.string()),
    recipeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    if (args.quantity > item.quantity) {
      throw new Error("Not enough quantity available");
    }

    const newQuantity = item.quantity - args.quantity;

    // Log usage
    await ctx.db.insert("inventoryUsages", {
      inventoryItemId: args.id,
      memberId: args.memberId,
      usedQuantity: args.quantity,
      usedAt: Date.now(),
      usageType: args.usageType,
      relatedId: args.relatedId,
      relatedType: args.relatedType,
      notes: args.notes,
      recipeName: args.recipeName,
    });

    // Update quantity and status
    let status: "FRESH" | "EXPIRING" | "EXPIRED" | "LOW_STOCK" | "OUT_OF_STOCK" = item.status;
    if (newQuantity <= 0) {
      status = "OUT_OF_STOCK";
    } else if (item.minStockThreshold && newQuantity <= item.minStockThreshold) {
      if (status !== "EXPIRED" && status !== "EXPIRING") {
        status = "LOW_STOCK";
      }
    }

    await ctx.db.patch(args.id, {
      quantity: newQuantity,
      status,
      isLowStock: item.minStockThreshold ? newQuantity <= item.minStockThreshold : false,
    });

    return args.id;
  },
});

/**
 * Log waste
 */
export const logWaste = mutation({
  args: {
    id: v.id("inventoryItems"),
    memberId: v.id("familyMembers"),
    quantity: v.float64(),
    reason: vWasteReason,
    notes: v.optional(v.string()),
    preventable: v.optional(v.boolean()),
    preventionTip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    // Calculate estimated cost based on original purchase price
    const estimatedCost = item.purchasePrice
      ? (item.purchasePrice / item.originalQuantity) * args.quantity
      : undefined;

    await ctx.db.insert("wasteLogs", {
      inventoryItemId: args.id,
      memberId: args.memberId,
      wastedQuantity: args.quantity,
      wasteReason: args.reason,
      wastedAt: Date.now(),
      estimatedCost,
      notes: args.notes,
      preventable: args.preventable ?? false,
      preventionTip: args.preventionTip,
    });

    // Update item quantity
    const newQuantity = Math.max(0, item.quantity - args.quantity);
    await ctx.db.patch(args.id, {
      quantity: newQuantity,
      status: newQuantity <= 0 ? "OUT_OF_STOCK" : item.status,
    });

    return args.id;
  },
});

/**
 * Get usage history
 */
export const getUsageHistory = query({
  args: {
    memberId: v.id("familyMembers"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const usages = await ctx.db
      .query("inventoryUsages")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(args.limit ?? 50);

    const usagesWithDetails = await Promise.all(
      usages.map(async (usage) => {
        const item = await ctx.db.get(usage.inventoryItemId);
        const food = item ? await ctx.db.get(item.foodId) : null;
        return { ...usage, item, food };
      })
    );

    return usagesWithDetails;
  },
});

/**
 * Get waste statistics
 */
export const getWasteStats = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const wastes = await ctx.db
      .query("wasteLogs")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.memberId))
      .collect();

    let filtered = wastes;
    if (args.startDate) {
      filtered = filtered.filter((w) => w.wastedAt >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((w) => w.wastedAt <= args.endDate!);
    }

    const totalWaste = filtered.reduce((sum, w) => sum + w.wastedQuantity, 0);
    const totalCost = filtered.reduce((sum, w) => sum + (w.estimatedCost ?? 0), 0);
    const preventableCount = filtered.filter((w) => w.preventable).length;

    const byReason = filtered.reduce((acc, w) => {
      acc[w.wasteReason] = (acc[w.wasteReason] || 0) + w.wastedQuantity;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalWaste,
      totalCost: Math.round(totalCost * 100) / 100,
      wasteCount: filtered.length,
      preventableCount,
      preventablePercentage: filtered.length > 0
        ? Math.round((preventableCount / filtered.length) * 100)
        : 0,
      byReason,
    };
  },
});

/**
 * Delete inventory item (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("inventoryItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, { deletedAt: Date.now() });
    return true;
  },
});
