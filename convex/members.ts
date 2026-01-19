import { query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.memberId);
  },
});

export const getByClerkInFamily = query({
  args: { familyId: v.id("families"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return null;
    }

    const member = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    return member ?? null;
  },
});

export const listByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const listAccessibleByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return [];
    }

    const userMembers = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const familyIds = new Set(userMembers.map((member) => member.familyId));
    const accessibleMembers: typeof userMembers = [];

    for (const familyId of familyIds) {
      const familyMembers = await ctx.db
        .query("familyMembers")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .collect();

      accessibleMembers.push(...familyMembers);
    }

    const uniqueMembers = new Map(
      accessibleMembers.map((member) => [member._id, member]),
    );

    return Array.from(uniqueMembers.values());
  },
});

export const verifyAccess = query({
  args: { memberId: v.id("familyMembers"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) {
      return { hasAccess: false, member: null };
    }

    const userId = user._id;
    const member = await ctx.db.get(args.memberId);

    if (!member || member.deletedAt) {
      return { hasAccess: false, member: null };
    }

    const family = await ctx.db.get(member.familyId);
    if (!family || family.deletedAt) {
      return { hasAccess: false, member: null };
    }

    const isCreator = family.creatorId === userId;
    const isSelf = member.userId === userId;

    let isAdmin = false;
    if (!isCreator && !isSelf) {
      const userMember = await ctx.db
        .query("familyMembers")
        .withIndex("by_family", (q) => q.eq("familyId", member.familyId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .unique();

      isAdmin = userMember?.role === "ADMIN";
    }

    const hasAccess = isCreator || isSelf || isAdmin;

    return {
      hasAccess,
      member: {
        id: member._id,
        name: member.name,
        familyId: member.familyId,
        userId: member.userId ?? undefined,
        role: member.role,
        family: {
          id: family._id,
          creatorId: family.creatorId,
        },
      },
    };
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("familyMembers")
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
