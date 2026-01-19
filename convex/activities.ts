import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    familyId: v.id("families"),
    memberId: v.optional(v.id("familyMembers")),
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("activities", {
      familyId: args.familyId,
      memberId: args.memberId,
      type: args.type,
      title: args.title,
      description: args.description,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
  },
});
