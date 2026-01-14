import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess } from "./lib/response";

/**
 * List families for the current user
 */
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // In Convex, we usually fetch by user ID
    const families = await ctx.db
      .query("families")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .collect();

    // Also include families where the user is a member
    const memberRecords = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const otherFamilyIds = memberRecords
      .map((m) => m.familyId)
      .filter((id) => !families.some((f) => f._id === id));

    const otherFamilies = await Promise.all(
      otherFamilyIds.map((id) => ctx.db.get(id)),
    );

    const allFamilies = [
      ...families,
      ...otherFamilies.filter((f): f is NonNullable<typeof f> => !!f),
    ];

    // Enrich with members
    return await Promise.all(
      allFamilies.map(async (family) => {
        const members = await ctx.db
          .query("familyMembers")
          .withIndex("by_family", (q) => q.eq("familyId", family._id))
          .collect();
        return { ...family, members };
      }),
    );
  },
});

/**
 * Create a new family
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const familyId = await ctx.db.insert("families", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Automatically create a member for the creator
    await ctx.db.insert("familyMembers", {
      familyId,
      userId: args.creatorId,
      name: "创建者",
      gender: "OTHER",
      birthDate: Date.now(),
      role: "ADMIN",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return familyId;
  },
});
