import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { apiSuccess } from "./lib/response";

/**
 * Common mutation for all migrations (Users, Families, FamilyMembers)
 */
export const insertUser = mutation({
  args: {
    email: v.string(),
    clerkId: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) return existing._id;
    return await ctx.db.insert("users", {
      ...args,
      clerkId: args.clerkId ?? args.email,
    });
  },
});

export const insertFamily = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
    creatorId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("families", args);
  },
});

export const insertFamilyMember = mutation({
  args: {
    name: v.string(),
    gender: v.union(v.literal("MALE"), v.literal("FEMALE"), v.literal("OTHER")),
    birthDate: v.number(),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
    role: v.union(v.literal("ADMIN"), v.literal("MEMBER"), v.literal("GUEST")),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("familyMembers", args);
  },
});

export const insertFood = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    aliases: v.array(v.string()),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    category: v.string(),
    tags: v.array(v.string()),
    source: v.union(
      v.literal("USDA"),
      v.literal("LOCAL"),
      v.literal("USER_SUBMITTED"),
    ),
    verified: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("foods", args);
  },
});

export const insertInventoryItem = mutation({
  args: {
    memberId: v.id("familyMembers"),
    foodId: v.id("foods"),
    quantity: v.number(),
    unit: v.string(),
    originalQuantity: v.number(),
    purchaseDate: v.number(),
    purchasePrice: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
    storageLocation: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventoryItems", args);
  },
});
