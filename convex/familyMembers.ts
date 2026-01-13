import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  vGender,
  vAgeGroup,
  vFamilyMemberRole,
} from "./schema";

/**
 * Get family member by ID
 */
export const getById = query({
  args: { id: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member || member.deletedAt) return null;

    // Get family info
    const family = await ctx.db.get(member.familyId);

    // Get user info if linked
    const user = member.userId ? await ctx.db.get(member.userId) : null;

    return {
      ...member,
      family: family ? { id: family._id, name: family.name } : null,
      user: user ? { id: user._id, name: user.name, email: user.email } : null,
    };
  },
});

/**
 * List members of a family
 */
export const listByFamily = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Enrich with user info
    return await Promise.all(
      members.map(async (member) => {
        const user = member.userId ? await ctx.db.get(member.userId) : null;
        return {
          ...member,
          user: user
            ? { id: user._id, name: user.name, email: user.email }
            : null,
        };
      })
    );
  },
});

/**
 * Add a family member (not linked to user account)
 */
export const add = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    gender: vGender,
    birthDate: v.number(),
    height: v.optional(v.float64()),
    weight: v.optional(v.float64()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify user has access to this family
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    const userMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), args.familyId))
      .first();

    if (!userMembership || userMembership.role === "GUEST") {
      throw new Error("You don't have permission to add members");
    }

    // Calculate age group
    const ageInYears = Math.floor(
      (Date.now() - args.birthDate) / (365.25 * 24 * 60 * 60 * 1000)
    );
    let ageGroup: "CHILD" | "TEENAGER" | "ADULT" | "ELDERLY";
    if (ageInYears < 12) ageGroup = "CHILD";
    else if (ageInYears < 18) ageGroup = "TEENAGER";
    else if (ageInYears < 65) ageGroup = "ADULT";
    else ageGroup = "ELDERLY";

    // Calculate BMI if height and weight provided
    let bmi: number | undefined;
    if (args.height && args.weight && args.height > 0) {
      const heightInMeters = args.height / 100;
      bmi = args.weight / (heightInMeters * heightInMeters);
    }

    return await ctx.db.insert("familyMembers", {
      name: args.name,
      gender: args.gender,
      birthDate: args.birthDate,
      height: args.height,
      weight: args.weight,
      avatar: args.avatar,
      bmi,
      ageGroup,
      familyId: args.familyId,
      role: "MEMBER",
    });
  },
});

/**
 * Update family member
 */
export const update = mutation({
  args: {
    id: v.id("familyMembers"),
    name: v.optional(v.string()),
    gender: v.optional(vGender),
    birthDate: v.optional(v.number()),
    height: v.optional(v.float64()),
    weight: v.optional(v.float64()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const member = await ctx.db.get(args.id);
    if (!member) throw new Error("Member not found");

    // Calculate age group if birthDate changes
    let ageGroup = member.ageGroup;
    if (args.birthDate) {
      const ageInYears = Math.floor(
        (Date.now() - args.birthDate) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (ageInYears < 12) ageGroup = "CHILD";
      else if (ageInYears < 18) ageGroup = "TEENAGER";
      else if (ageInYears < 65) ageGroup = "ADULT";
      else ageGroup = "ELDERLY";
    }

    // Recalculate BMI if height or weight changes
    const height = args.height ?? member.height;
    const weight = args.weight ?? member.weight;
    let bmi = member.bmi;
    if (height && weight && height > 0) {
      const heightInMeters = height / 100;
      bmi = weight / (heightInMeters * heightInMeters);
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      ageGroup,
      bmi,
    });

    return id;
  },
});

/**
 * Update member role
 */
export const updateRole = mutation({
  args: {
    id: v.id("familyMembers"),
    role: vFamilyMemberRole,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const member = await ctx.db.get(args.id);
    if (!member) throw new Error("Member not found");

    // Verify requester is admin of the family
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    const requesterMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), member.familyId))
      .first();

    if (!requesterMembership || requesterMembership.role !== "ADMIN") {
      throw new Error("Only admins can change member roles");
    }

    await ctx.db.patch(args.id, { role: args.role });

    return args.id;
  },
});

/**
 * Remove member from family (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const member = await ctx.db.get(args.id);
    if (!member) throw new Error("Member not found");

    // Verify requester has permission
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    const requesterMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), member.familyId))
      .first();

    // Can only remove if admin or removing self
    const isSelf = member.userId === user._id;
    const isAdmin = requesterMembership?.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      throw new Error("You don't have permission to remove this member");
    }

    // Check if this is the family creator
    const family = await ctx.db.get(member.familyId);
    if (family && member.userId === family.creatorId) {
      throw new Error("Cannot remove the family creator");
    }

    await ctx.db.patch(args.id, { deletedAt: Date.now() });

    return true;
  },
});
