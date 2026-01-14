import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess, apiError } from "./lib/response";

/**
 * List inventory items for a member
 */
export const list = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("inventoryItems")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();

    // Map food details
    const itemsWithFood = await Promise.all(
      items.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        return { ...item, food };
      }),
    );

    return itemsWithFood;
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
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("inventoryItems", {
      ...args,
      originalQuantity: args.quantity,
      purchaseDate: Date.now(),
      status: "FRESH",
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
