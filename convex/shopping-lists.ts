import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const toLower = (value: string) => value.toLowerCase();

const sortByField = (
  field: string,
  direction: "asc" | "desc",
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  const order = direction === "asc" ? 1 : -1;
  const aValue = a[field];
  const bValue = b[field];

  if (typeof aValue === "number" && typeof bValue === "number") {
    return (aValue - bValue) * order;
  }

  return String(aValue ?? "").localeCompare(String(bValue ?? "")) * order;
};

export const list = query({
  args: {
    planId: v.optional(v.id("mealPlans")),
    planIds: v.optional(v.array(v.id("mealPlans"))),
    statuses: v.optional(v.array(v.string())),
    includeDeleted: v.optional(v.boolean()),
    includePlan: v.optional(v.boolean()),
    includeItems: v.optional(v.boolean()),
    search: v.optional(v.string()),
    sortField: v.optional(v.string()),
    sortDirection: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let lists = await ctx.db.query("shoppingLists").collect();

    if (args.planId) {
      lists = lists.filter((list) => list.planId === args.planId);
    }

    if (args.planIds && args.planIds.length > 0) {
      const planSet = new Set(args.planIds);
      lists = lists.filter((list) => planSet.has(list.planId));
    }

    if (args.statuses && args.statuses.length > 0) {
      const statusSet = new Set(args.statuses);
      lists = lists.filter((list) => statusSet.has(list.status));
    }

    if (!args.includeDeleted) {
      lists = lists.filter((list) => !list.deletedAt);
    }

    if (args.search) {
      const keyword = toLower(args.search);
      lists = lists.filter((list) => toLower(list.name).includes(keyword));
    }

    if (args.sortField) {
      const direction = args.sortDirection ?? "desc";
      lists.sort((a, b) => sortByField(args.sortField!, direction, a, b));
    } else {
      lists.sort((a, b) => b.createdAt - a.createdAt);
    }

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 20;
    const pageItems = lists.slice(offset, offset + limit);

    const data = await Promise.all(
      pageItems.map(async (list) => {
        const plan = args.includePlan
          ? await buildPlan(ctx, list.planId)
          : undefined;
        const items = args.includeItems
          ? await buildItems(ctx, list._id)
          : undefined;

        return {
          ...list,
          plan,
          items,
        };
      }),
    );

    return {
      data,
      total: lists.length,
    };
  },
});

export const getById = query({
  args: {
    listId: v.id("shoppingLists"),
    includePlan: v.optional(v.boolean()),
    includeItems: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt) {
      return null;
    }

    const plan = args.includePlan
      ? await buildPlan(ctx, list.planId)
      : undefined;
    const items = args.includeItems
      ? await buildItems(ctx, list._id)
      : undefined;

    return {
      ...list,
      plan,
      items,
    };
  },
});

export const update = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.optional(v.string()),
    budget: v.optional(v.number()),
    status: v.optional(v.string()),
    actualCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt) {
      throw new Error("Shopping list not found");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.budget !== undefined) patch.budget = args.budget;
    if (args.status !== undefined) patch.status = args.status;
    if (args.actualCost !== undefined) patch.actualCost = args.actualCost;

    await ctx.db.patch(args.listId, patch);
    return args.listId;
  },
});

export const updateItem = mutation({
  args: {
    listId: v.id("shoppingLists"),
    itemId: v.id("shoppingListItems"),
    purchased: v.optional(v.boolean()),
    quantity: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.shoppingListId !== args.listId) {
      throw new Error("Shopping list item not found");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.purchased !== undefined) patch.purchased = args.purchased;
    if (args.quantity !== undefined) patch.quantity = args.quantity;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.itemId, patch);
    return args.itemId;
  },
});

export const complete = mutation({
  args: {
    listId: v.id("shoppingLists"),
    actualCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt) {
      throw new Error("Shopping list not found");
    }

    await ctx.db.patch(args.listId, {
      status: "COMPLETED",
      actualCost: args.actualCost,
      updatedAt: Date.now(),
    });

    return args.listId;
  },
});

export const deleteList = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt) {
      return;
    }

    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_list", (q: any) => q.eq("shoppingListId", args.listId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.patch(args.listId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const createShare = mutation({
  args: {
    listId: v.id("shoppingLists"),
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("shoppingListShares", {
      listId: args.listId,
      token: args.token,
      expiresAt: args.expiresAt,
      createdBy: args.createdBy,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

async function buildPlan(ctx: any, planId: string) {
  const plan = await ctx.db.get(planId);
  if (!plan || plan.deletedAt) {
    return undefined;
  }

  const member = await ctx.db.get(plan.memberId);

  return {
    id: plan._id,
    name: plan.goalType ?? "计划",
    member: member
      ? {
          id: member._id,
          name: member.name,
        }
      : undefined,
  };
}

async function buildItems(ctx: any, listId: string) {
  const items = await ctx.db
    .query("shoppingListItems")
    .withIndex("by_list", (q: any) => q.eq("shoppingListId", listId))
    .collect();

  const mapped = await Promise.all(
    items.map(async (item: any) => {
      const food = await ctx.db.get(item.foodId);

      return {
        id: item._id,
        shoppingListId: item.shoppingListId,
        foodId: item.foodId,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        purchased: item.purchased,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        food: food
          ? {
              id: food._id,
              name: food.name,
              category: food.category ?? undefined,
              defaultUnit: undefined,
              imageUrl: undefined,
            }
          : undefined,
      };
    }),
  );

  return mapped.sort((a, b) => {
    if (a.category !== b.category) {
      return (a.category || "").localeCompare(b.category || "");
    }
    if (a.purchased !== b.purchased) {
      return a.purchased ? 1 : -1;
    }
    return (a.food?.name || "").localeCompare(b.food?.name || "");
  });
}
