import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { vListStatus, vFoodCategory } from "./schema";

/**
 * Get shopping lists
 */
export const list = query({
  args: {
    planId: v.optional(v.id("mealPlans")),
    status: v.optional(vListStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (args.planId) {
      return await ctx.db
        .query("shoppingLists")
        .withIndex("by_planId", (q) => q.eq("planId", args.planId!))
        .take(args.limit ?? 50);
    }

    if (args.status) {
      return await ctx.db
        .query("shoppingLists")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(args.limit ?? 50);
    }

    // Get all lists - need to collect then limit since no general index
    const lists = await ctx.db.query("shoppingLists").collect();
    return lists.slice(0, args.limit ?? 50);
  },
});

/**
 * Get shopping list by ID with items
 */
export const getById = query({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const list = await ctx.db.get(args.id);
    if (!list) return null;

    // Get items
    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_listId", (q) => q.eq("listId", args.id))
      .collect();

    // Get food details for each item
    const itemsWithFood = await Promise.all(
      items.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        return { ...item, food };
      })
    );

    // Group by category
    const itemsByCategory = itemsWithFood.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, typeof itemsWithFood>
    );

    // Calculate totals
    const purchasedCount = items.filter((i) => i.purchased).length;
    const estimatedTotal = items.reduce(
      (sum, i) => sum + (i.estimatedPrice ?? 0),
      0
    );

    return {
      ...list,
      items: itemsWithFood,
      itemsByCategory,
      totalItems: items.length,
      purchasedCount,
      estimatedTotal,
      progress: items.length > 0 ? (purchasedCount / items.length) * 100 : 0,
    };
  },
});

/**
 * Create shopping list
 */
export const create = mutation({
  args: {
    planId: v.id("mealPlans"),
    name: v.string(),
    budget: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("shoppingLists", {
      planId: args.planId,
      name: args.name,
      budget: args.budget,
      status: "PENDING",
    });
  },
});

/**
 * Update shopping list
 */
export const update = mutation({
  args: {
    id: v.id("shoppingLists"),
    name: v.optional(v.string()),
    budget: v.optional(v.float64()),
    status: v.optional(vListStatus),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

/**
 * Add item to shopping list
 */
export const addItem = mutation({
  args: {
    listId: v.id("shoppingLists"),
    foodId: v.id("foods"),
    amount: v.float64(),
    estimatedPrice: v.optional(v.float64()),
    assigneeId: v.optional(v.id("familyMembers")),
    addedBy: v.optional(v.id("familyMembers")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const food = await ctx.db.get(args.foodId);
    if (!food) throw new Error("Food not found");

    // Check if item already exists
    const existing = await ctx.db
      .query("shoppingItems")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("foodId"), args.foodId))
      .first();

    if (existing) {
      // Update amount
      await ctx.db.patch(existing._id, {
        amount: existing.amount + args.amount,
      });
      return existing._id;
    }

    const itemId = await ctx.db.insert("shoppingItems", {
      listId: args.listId,
      foodId: args.foodId,
      amount: args.amount,
      category: food.category,
      purchased: false,
      estimatedPrice: args.estimatedPrice,
      assigneeId: args.assigneeId,
      addedBy: args.addedBy,
    });

    // Update list estimated cost
    if (args.estimatedPrice) {
      const list = await ctx.db.get(args.listId);
      if (list) {
        await ctx.db.patch(args.listId, {
          estimatedCost: (list.estimatedCost ?? 0) + args.estimatedPrice,
        });
      }
    }

    return itemId;
  },
});

/**
 * Update shopping item
 */
export const updateItem = mutation({
  args: {
    id: v.id("shoppingItems"),
    amount: v.optional(v.float64()),
    estimatedPrice: v.optional(v.float64()),
    assigneeId: v.optional(v.id("familyMembers")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

/**
 * Mark item as purchased
 */
export const markPurchased = mutation({
  args: {
    id: v.id("shoppingItems"),
    purchasedBy: v.optional(v.id("familyMembers")),
    actualPrice: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    await ctx.db.patch(args.id, {
      purchased: true,
      purchasedBy: args.purchasedBy,
      purchasedAt: Date.now(),
    });

    // Update list actual cost
    if (args.actualPrice) {
      const list = await ctx.db.get(item.listId);
      if (list) {
        await ctx.db.patch(item.listId, {
          actualCost: (list.actualCost ?? 0) + args.actualPrice,
        });
      }
    }

    // Check if all items purchased
    const allItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_listId", (q) => q.eq("listId", item.listId))
      .collect();

    const allPurchased = allItems.every(
      (i) => i.purchased || i._id === args.id
    );

    if (allPurchased) {
      await ctx.db.patch(item.listId, { status: "COMPLETED" });
    } else {
      await ctx.db.patch(item.listId, { status: "IN_PROGRESS" });
    }

    return args.id;
  },
});

/**
 * Unmark item as purchased
 */
export const unmarkPurchased = mutation({
  args: { id: v.id("shoppingItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    await ctx.db.patch(args.id, {
      purchased: false,
      purchasedBy: undefined,
      purchasedAt: undefined,
    });

    // Update list status
    await ctx.db.patch(item.listId, { status: "IN_PROGRESS" });

    return args.id;
  },
});

/**
 * Remove item from list
 */
export const removeItem = mutation({
  args: { id: v.id("shoppingItems") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Share shopping list
 */
export const share = mutation({
  args: {
    listId: v.id("shoppingLists"),
    createdBy: v.string(),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Generate share token
    const token = `share_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const expiresAt =
      Date.now() + (args.expiresInHours ?? 24) * 60 * 60 * 1000;

    await ctx.db.insert("shoppingListShares", {
      listId: args.listId,
      token,
      expiresAt,
      createdBy: args.createdBy,
      viewCount: 0,
    });

    return { token, expiresAt };
  },
});

/**
 * Get shared list
 */
export const getByShareToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shoppingListShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!share) return null;
    if (share.expiresAt < Date.now()) return null;

    const list = await ctx.db.get(share.listId);
    if (!list) return null;

    // Get items
    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_listId", (q) => q.eq("listId", share.listId))
      .collect();

    const itemsWithFood = await Promise.all(
      items.map(async (item) => {
        const food = await ctx.db.get(item.foodId);
        return { ...item, food };
      })
    );

    return {
      ...list,
      items: itemsWithFood,
      shareExpiresAt: share.expiresAt,
    };
  },
});

/**
 * Increment share view count
 */
export const incrementShareView = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shoppingListShares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (share) {
      await ctx.db.patch(share._id, {
        viewCount: share.viewCount + 1,
        lastViewedAt: Date.now(),
      });
    }

    return true;
  },
});

/**
 * Delete shopping list
 */
export const remove = mutation({
  args: { id: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Delete all items
    const items = await ctx.db
      .query("shoppingItems")
      .withIndex("by_listId", (q) => q.eq("listId", args.id))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete shares
    const shares = await ctx.db
      .query("shoppingListShares")
      .withIndex("by_listId", (q) => q.eq("listId", args.id))
      .collect();

    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});
