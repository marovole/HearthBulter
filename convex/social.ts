import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSharedContent = mutation({
  args: {
    memberId: v.id("familyMembers"),
    contentType: v.string(),
    privacyLevel: v.string(),
    targetId: v.optional(v.string()),
    sharedPlatforms: v.array(v.string()),
    shareToken: v.string(),
    shareUrl: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    status: v.string(),
    expiresAt: v.optional(v.number()),
    allowComment: v.optional(v.boolean()),
    allowLike: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("sharedContents", {
      memberId: args.memberId,
      contentType: args.contentType,
      privacyLevel: args.privacyLevel,
      targetId: args.targetId,
      sharedPlatforms: args.sharedPlatforms,
      shareToken: args.shareToken,
      shareUrl: args.shareUrl,
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      metadata: args.metadata,
      status: args.status,
      expiresAt: args.expiresAt,
      allowComment: args.allowComment,
      allowLike: args.allowLike,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      clickCount: 0,
      downloadCount: 0,
      conversionCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateSharedContent = mutation({
  args: {
    id: v.id("sharedContents"),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args.patch,
      updatedAt: Date.now(),
    });
  },
});

export const getSharedContentById = query({
  args: { id: v.id("sharedContents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getSharedContentByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sharedContents")
      .withIndex("by_token", (q) => q.eq("shareToken", args.token))
      .unique();
  },
});

export const listSharedContents = query({
  args: {
    memberId: v.optional(v.id("familyMembers")),
    contentType: v.optional(v.string()),
    status: v.optional(v.string()),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    let records = await ctx.db.query("sharedContents").collect();

    if (args.memberId) {
      records = records.filter((record) => record.memberId === args.memberId);
    }

    if (args.contentType) {
      records = records.filter(
        (record) => record.contentType === args.contentType,
      );
    }

    if (args.status) {
      records = records.filter((record) => record.status === args.status);
    }

    records.sort((a, b) => b.createdAt - a.createdAt);

    const total = records.length;
    const pageItems = records.slice(args.offset, args.offset + args.limit);

    const data = await Promise.all(
      pageItems.map(async (record) => {
        const member = await ctx.db.get(record.memberId);
        return {
          ...record,
          member: member
            ? {
                id: member._id,
                name: member.name,
                avatar: member.avatar,
              }
            : null,
        };
      }),
    );

    return { data, total };
  },
});

export const recordShareEvent = mutation({
  args: {
    id: v.id("sharedContents"),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) {
      return;
    }

    const patch: Record<string, number | string> = {};
    switch (args.action) {
      case "VIEW":
        patch.viewCount = record.viewCount + 1;
        break;
      case "CLICK":
        patch.clickCount = record.clickCount + 1;
        break;
      case "SHARE":
        patch.shareCount = record.shareCount + 1;
        break;
      case "DOWNLOAD":
        patch.downloadCount = record.downloadCount + 1;
        break;
      case "CONVERSION":
        patch.conversionCount = record.conversionCount + 1;
        break;
      default:
        return;
    }

    await ctx.db.patch(args.id, {
      ...patch,
      updatedAt: Date.now(),
    });
  },
});
