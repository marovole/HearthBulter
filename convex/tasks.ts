import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess, apiError } from "./lib/response";

/**
 * List tasks for a family
 */
export const list = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/**
 * Create a new task
 */
export const create = mutation({
  args: {
    familyId: v.id("families"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    assigneeId: v.optional(v.id("familyMembers")),
    creatorId: v.id("familyMembers"),
    priority: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      ...args,
      status: "TODO",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return apiSuccess({ taskId });
  },
});

/**
 * Update task status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("TODO"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return apiSuccess({ id: args.id });
  },
});
