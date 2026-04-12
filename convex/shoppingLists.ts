import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const toLower = (value: string) => value.toLowerCase();

const sortByField = (
  field: string,
  direction: "asc" | "desc",
  a: Record<string, unknown>,
  b: Record<string, unknown>
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
        const plan = args.includePlan ? await buildPlan(ctx, list.planId) : undefined;
        const items = args.includeItems ? await buildItems(ctx, list._id) : undefined;

        return {
          ...list,
          plan,
          items,
        };
      })
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

    const plan = args.includePlan ? await buildPlan(ctx, list.planId) : undefined;
    const items = args.includeItems ? await buildItems(ctx, list._id) : undefined;

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
    })
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

// 按家庭获取购物清单（通过 mealPlans 关联）
export const listByFamily = query({
  args: {
    familyId: v.id("families"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 获取家庭所有成员
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
    const memberIds = new Set(members.map((m) => m._id));

    // 获取这些成员的所有 mealPlans
    const mealPlans = await ctx.db.query("mealPlans").collect();
    const familyPlanIds = mealPlans.filter((p) => memberIds.has(p.memberId)).map((p) => p._id);
    const planIdSet = new Set(familyPlanIds);

    // 获取关联的购物清单
    let lists = await ctx.db.query("shoppingLists").collect();
    lists = lists.filter((list) => planIdSet.has(list.planId));

    if (!args.includeDeleted) {
      lists = lists.filter((list) => !list.deletedAt);
    }

    // 获取清单项和计划信息
    const data = await Promise.all(
      lists.map(async (list) => {
        const items = await buildItemsWithDetails(ctx, list._id);
        const plan = await ctx.db.get(list.planId);
        const member = plan ? await ctx.db.get(plan.memberId) : null;

        return {
          ...list,
          items,
          plan: plan
            ? {
                id: plan._id,
                member: member
                  ? {
                      id: member._id,
                      name: member.name,
                      avatar: member.avatar,
                    }
                  : undefined,
              }
            : undefined,
        };
      })
    );

    return data.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// 添加购物项
export const addItem = mutation({
  args: {
    listId: v.id("shoppingLists"),
    foodId: v.id("foods"),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
    estimatedPrice: v.optional(v.number()),
    assigneeId: v.optional(v.id("familyMembers")),
    addedBy: v.id("familyMembers"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list || list.deletedAt) {
      throw new Error("Shopping list not found");
    }

    const food = await ctx.db.get(args.foodId);
    if (!food) {
      throw new Error("Food not found");
    }

    const now = Date.now();
    const itemId = await ctx.db.insert("shoppingListItems", {
      shoppingListId: args.listId,
      foodId: args.foodId,
      quantity: args.quantity,
      unit: args.unit,
      category: args.category,
      estimatedPrice: args.estimatedPrice,
      assigneeId: args.assigneeId,
      addedBy: args.addedBy,
      purchased: false,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

// 分配购物项
export const assignItem = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
    assigneeId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping item not found");
    }

    const assignee = await ctx.db.get(args.assigneeId);
    if (!assignee) {
      throw new Error("Assignee not found");
    }

    await ctx.db.patch(args.itemId, {
      assigneeId: args.assigneeId,
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

// 确认购买
export const confirmPurchase = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
    purchasedBy: v.id("familyMembers"),
    actualPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping item not found");
    }

    const patch: Record<string, unknown> = {
      purchased: true,
      purchasedBy: args.purchasedBy,
      purchasedAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (args.actualPrice !== undefined) {
      patch.estimatedPrice = args.actualPrice;
    }

    await ctx.db.patch(args.itemId, patch);
    return args.itemId;
  },
});

// 删除购物项
export const deleteItem = mutation({
  args: {
    itemId: v.id("shoppingListItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Shopping item not found");
    }

    await ctx.db.delete(args.itemId);
    return args.itemId;
  },
});

// 获取购物统计
export const getStats = query({
  args: {
    familyId: v.id("families"),
  },
  handler: async (ctx, args) => {
    // 获取家庭所有成员
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
    const memberIds = new Set(members.map((m) => m._id));

    // 获取这些成员的所有 mealPlans
    const mealPlans = await ctx.db.query("mealPlans").collect();
    const familyPlanIds = mealPlans.filter((p) => memberIds.has(p.memberId)).map((p) => p._id);
    const planIdSet = new Set(familyPlanIds);

    // 获取关联的购物清单
    const lists = await ctx.db.query("shoppingLists").collect();
    const familyLists = lists.filter((list) => planIdSet.has(list.planId) && !list.deletedAt);
    const listIdSet = new Set(familyLists.map((l) => l._id));

    // 获取所有购物项
    const allItems = await ctx.db.query("shoppingListItems").collect();
    const items = allItems.filter((item) => listIdSet.has(item.shoppingListId));

    // 构建成员信息映射
    const memberMap = new Map(
      members.map((m) => [m._id, { id: m._id, name: m.name, avatar: m.avatar }])
    );

    // 统计
    const stats = {
      totalItems: items.length,
      purchasedItems: items.filter((item) => item.purchased).length,
      pendingItems: items.filter((item) => !item.purchased).length,
      assignedItems: items.filter((item) => item.assigneeId).length,
      totalEstimatedCost: items.reduce((sum, item) => sum + (item.estimatedPrice || 0), 0),
      categoryStats: {} as Record<string, number>,
      assigneeStats: {} as Record<string, { name: string; count: number; avatar?: string }>,
      addedByStats: {} as Record<string, { name: string; count: number; avatar?: string }>,
    };

    // 按分类统计
    items.forEach((item) => {
      stats.categoryStats[item.category] = (stats.categoryStats[item.category] || 0) + 1;
    });

    // 按分配人统计
    items.forEach((item) => {
      if (item.assigneeId) {
        const assignee = memberMap.get(item.assigneeId);
        if (assignee) {
          const key = assignee.id;
          if (!stats.assigneeStats[key]) {
            stats.assigneeStats[key] = {
              name: assignee.name,
              count: 0,
              avatar: assignee.avatar ?? undefined,
            };
          }
          stats.assigneeStats[key].count++;
        }
      }
    });

    // 按添加人统计
    items.forEach((item) => {
      const addedBy = memberMap.get(item.addedBy);
      if (addedBy) {
        const key = addedBy.id;
        if (!stats.addedByStats[key]) {
          stats.addedByStats[key] = {
            name: addedBy.name,
            count: 0,
            avatar: addedBy.avatar ?? undefined,
          };
        }
        stats.addedByStats[key].count++;
      }
    });

    return stats;
  },
});

// 辅助函数：构建带详细信息的购物项
async function buildItemsWithDetails(ctx: any, listId: string) {
  const items = await ctx.db
    .query("shoppingListItems")
    .withIndex("by_list", (q: any) => q.eq("shoppingListId", listId))
    .collect();

  const mapped = await Promise.all(
    items.map(async (item: any) => {
      const [food, assignee, addedByMember, purchasedByMember] = await Promise.all([
        ctx.db.get(item.foodId),
        item.assigneeId ? ctx.db.get(item.assigneeId) : null,
        ctx.db.get(item.addedBy),
        item.purchasedBy ? ctx.db.get(item.purchasedBy) : null,
      ]);

      return {
        id: item._id,
        shoppingListId: item.shoppingListId,
        foodId: item.foodId,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        purchased: item.purchased,
        estimatedPrice: item.estimatedPrice,
        notes: item.notes,
        assigneeId: item.assigneeId,
        addedBy: item.addedBy,
        purchasedBy: item.purchasedBy,
        purchasedAt: item.purchasedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        food: food
          ? {
              id: food._id,
              name: food.name,
              nameEn: food.nameEn,
              category: food.category ?? undefined,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
            }
          : undefined,
        assignee: assignee
          ? {
              id: assignee._id,
              name: assignee.name,
              avatar: assignee.avatar,
              role: assignee.role,
            }
          : undefined,
        addedByMember: addedByMember
          ? {
              id: addedByMember._id,
              name: addedByMember.name,
              avatar: addedByMember.avatar,
              role: addedByMember.role,
            }
          : undefined,
        purchasedByMember: purchasedByMember
          ? {
              id: purchasedByMember._id,
              name: purchasedByMember.name,
              avatar: purchasedByMember.avatar,
              role: purchasedByMember.role,
            }
          : undefined,
      };
    })
  );

  return mapped.sort((a: any, b: any) => {
    if (a.category !== b.category) {
      return (a.category || "").localeCompare(b.category || "");
    }
    if (a.purchased !== b.purchased) {
      return a.purchased ? 1 : -1;
    }
    return (a.food?.name || "").localeCompare(b.food?.name || "");
  });
}
