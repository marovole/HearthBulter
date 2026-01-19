import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("achievements") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByMember = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("achievements")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

export const listByMembers = query({
  args: {
    memberIds: v.array(v.id("familyMembers")),
    type: v.optional(v.string()),
    rarity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const memberSet = new Set(args.memberIds);
    let achievements = await ctx.db.query("achievements").collect();

    achievements = achievements.filter((achievement) =>
      memberSet.has(achievement.memberId),
    );

    if (args.type) {
      achievements = achievements.filter(
        (achievement) => achievement.type === args.type,
      );
    }

    if (args.rarity) {
      achievements = achievements.filter(
        (achievement) => achievement.rarity === args.rarity,
      );
    }

    const members = new Map(
      (
        await ctx.db
          .query("familyMembers")
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect()
      ).map((member) => [member._id, member]),
    );

    return achievements.map((achievement) => {
      const member = members.get(achievement.memberId);
      return {
        ...achievement,
        member: member
          ? {
              id: member._id,
              name: member.name,
              avatar: member.avatar,
            }
          : null,
      };
    });
  },
});

export const findByMemberTypeLevel = query({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    level: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("achievements")
      .withIndex("by_member_type_level", (q) =>
        q
          .eq("memberId", args.memberId)
          .eq("type", args.type)
          .eq("level", args.level),
      )
      .unique();
  },
});

export const createAchievement = mutation({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    iconUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    rarity: v.string(),
    level: v.optional(v.number()),
    points: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    progress: v.optional(v.number()),
    isUnlocked: v.boolean(),
    unlockedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    rewardType: v.optional(v.string()),
    rewardValue: v.optional(v.string()),
    rewardClaimed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("achievements", {
      memberId: args.memberId,
      type: args.type,
      title: args.title,
      description: args.description,
      iconUrl: args.iconUrl,
      imageUrl: args.imageUrl,
      rarity: args.rarity,
      level: args.level ?? 1,
      points: args.points ?? 0,
      targetValue: args.targetValue,
      currentValue: args.currentValue,
      progress: args.progress ?? 0,
      isUnlocked: args.isUnlocked,
      unlockedAt: args.unlockedAt,
      isShared: false,
      sharedAt: undefined,
      rewardType: args.rewardType,
      rewardValue: args.rewardValue,
      rewardClaimed: args.rewardClaimed ?? false,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAchievement = mutation({
  args: {
    id: v.id("achievements"),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { ...args.patch, updatedAt: Date.now() });
  },
});
