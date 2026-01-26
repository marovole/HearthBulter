import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    isActive: v.optional(v.boolean()),
    category: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("notificationTemplates").collect();

    if (args.isActive !== undefined) {
      items = items.filter((item) => item.isActive === args.isActive);
    }

    if (args.category) {
      items = items.filter((item) => item.category === args.category);
    }

    items.sort((a, b) => b.createdAt - a.createdAt);

    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;

    return {
      data: items.slice(offset, offset + limit),
      total: items.length,
    };
  },
});

export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notificationTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    type: v.string(),
    titleTemplate: v.string(),
    contentTemplate: v.string(),
    channelTemplates: v.optional(v.any()),
    variables: v.optional(v.any()),
    isActive: v.boolean(),
    version: v.string(),
    defaultChannels: v.optional(v.any()),
    defaultPriority: v.optional(v.string()),
    translations: v.optional(v.any()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        titleTemplate: args.titleTemplate,
        contentTemplate: args.contentTemplate,
        channelTemplates: args.channelTemplates,
        variables: args.variables,
        isActive: args.isActive,
        version: args.version,
        defaultChannels: args.defaultChannels,
        defaultPriority: args.defaultPriority,
        translations: args.translations,
        description: args.description,
        category: args.category,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("notificationTemplates", {
      type: args.type,
      titleTemplate: args.titleTemplate,
      contentTemplate: args.contentTemplate,
      channelTemplates: args.channelTemplates,
      variables: args.variables,
      isActive: args.isActive,
      version: args.version,
      defaultChannels: args.defaultChannels,
      defaultPriority: args.defaultPriority,
      translations: args.translations,
      description: args.description,
      category: args.category,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteTemplate = mutation({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const incrementUsage = mutation({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("notificationTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        usageCount: (existing.usageCount ?? 0) + 1,
        lastUsed: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getStats = query({
  args: { type: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let templates = await ctx.db.query("notificationTemplates").collect();

    if (args.type) {
      templates = templates.filter((t) => t.type === args.type);
    }

    return templates.map((t) => ({
      type: t.type,
      usageCount: t.usageCount ?? 0,
      lastUsed: t.lastUsed,
      category: t.category,
      isActive: t.isActive,
    }));
  },
});
