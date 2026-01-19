import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

export const getById = query({
  args: { familyId: v.id("families"), taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.deletedAt || task.familyId !== args.familyId) {
      return null;
    }
    return task;
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    creatorId: v.id("familyMembers"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT"),
    ),
    assigneeId: v.optional(v.id("familyMembers")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("tasks", {
      familyId: args.familyId,
      creatorId: args.creatorId,
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      assigneeId: args.assigneeId,
      dueDate: args.dueDate,
      status: "TODO",
      reminderSent: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("LOW"),
        v.literal("MEDIUM"),
        v.literal("HIGH"),
        v.literal("URGENT"),
      ),
    ),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      dueDate: args.dueDate,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("TODO"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const patch: {
      status: "TODO" | "IN_PROGRESS" | "DONE" | "COMPLETED" | "CANCELLED";
      updatedAt: number;
      startedAt?: number;
      completedAt?: number;
    } = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "IN_PROGRESS") {
      patch.startedAt = now;
    }

    if (args.status === "DONE" || args.status === "COMPLETED") {
      patch.completedAt = now;
    }

    await ctx.db.patch(args.taskId, patch);
  },
});

export const assign = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      assigneeId: args.assigneeId,
      updatedAt: now,
    });
  },
});

export const softDelete = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.taskId, { deletedAt: now, updatedAt: now });
  },
});

export const stats = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    const active = tasks.filter((task) => !task.deletedAt);
    const now = Date.now();

    const byStatus = {
      todo: active.filter((task) => task.status === "TODO").length,
      inProgress: active.filter((task) => task.status === "IN_PROGRESS").length,
      completed: active.filter(
        (task) => task.status === "DONE" || task.status === "COMPLETED",
      ).length,
      cancelled: active.filter((task) => task.status === "CANCELLED").length,
    };

    const byCategory = active.reduce<Record<string, number>>((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});

    const byPriority = {
      low: active.filter((task) => task.priority === "LOW").length,
      medium: active.filter((task) => task.priority === "MEDIUM").length,
      high: active.filter((task) => task.priority === "HIGH").length,
      urgent: active.filter((task) => task.priority === "URGENT").length,
    };

    const overdue = active.filter(
      (task) => task.dueDate && task.dueDate < now && task.status !== "DONE",
    ).length;
    const dueToday = active.filter((task) => {
      if (!task.dueDate) return false;
      const date = new Date(task.dueDate);
      const today = new Date(now);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;

    return {
      total: active.length,
      byStatus,
      byCategory,
      byPriority,
      overdue,
      dueToday,
      byAssignee: {},
      byCreator: {},
    };
  },
});
