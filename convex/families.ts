import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new family
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    // Create the family
    const familyId = await ctx.db.insert("families", {
      name: args.name,
      description: args.description,
      inviteCode: generateInviteCode(),
      creatorId: user._id,
    });

    // Create family member for the creator
    await ctx.db.insert("familyMembers", {
      name: user.name ?? identity.email!.split("@")[0],
      gender: "OTHER",
      birthDate: Date.now(),
      familyId,
      userId: user._id,
      role: "ADMIN",
    });

    return familyId;
  },
});

/**
 * List user's families
 */
export const listUserFamilies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return [];

    // Get families where user is a member
    const memberships = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get family details
    const families = await Promise.all(
      memberships.map(async (membership) => {
        const family = await ctx.db.get(membership.familyId);
        if (!family || family.deletedAt) return null;

        // Get member count
        const members = await ctx.db
          .query("familyMembers")
          .withIndex("by_familyId", (q) => q.eq("familyId", family._id))
          .filter((q) => q.eq(q.field("deletedAt"), undefined))
          .collect();

        return {
          ...family,
          memberCount: members.length,
          userRole: membership.role,
          memberId: membership._id,
        };
      })
    );

    return families.filter(Boolean);
  },
});

/**
 * Get family by ID with members
 */
export const getById = query({
  args: { id: v.id("families") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const family = await ctx.db.get(args.id);
    if (!family || family.deletedAt) return null;

    // Get all members
    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_familyId", (q) => q.eq("familyId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get creator info
    const creator = await ctx.db.get(family.creatorId);

    return {
      ...family,
      members,
      creator: creator
        ? { id: creator._id, name: creator.name, email: creator.email }
        : null,
    };
  },
});

/**
 * Update family
 */
export const update = mutation({
  args: {
    id: v.id("families"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const family = await ctx.db.get(args.id);
    if (!family) throw new Error("Family not found");

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), args.id))
      .first();

    if (!membership || membership.role !== "ADMIN") {
      throw new Error("Only admins can update family");
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
    });

    return args.id;
  },
});

/**
 * Join family by invite code
 */
export const joinByInviteCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    // Find family by invite code
    const family = await ctx.db
      .query("families")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!family) throw new Error("Invalid invite code");
    if (family.deletedAt) throw new Error("Family no longer exists");

    // Check if already a member
    const existingMembership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), family._id))
      .first();

    if (existingMembership) {
      if (existingMembership.deletedAt) {
        // Reactivate membership
        await ctx.db.patch(existingMembership._id, { deletedAt: undefined });
        return existingMembership._id;
      }
      throw new Error("Already a member of this family");
    }

    // Create new membership
    return await ctx.db.insert("familyMembers", {
      name: user.name ?? identity.email!.split("@")[0],
      gender: "OTHER",
      birthDate: Date.now(),
      familyId: family._id,
      userId: user._id,
      role: "MEMBER",
    });
  },
});

/**
 * Regenerate invite code
 */
export const regenerateInviteCode = mutation({
  args: { id: v.id("families") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    // Check if user is admin
    const membership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), args.id))
      .first();

    if (!membership || membership.role !== "ADMIN") {
      throw new Error("Only admins can regenerate invite code");
    }

    const newCode = generateInviteCode();
    await ctx.db.patch(args.id, { inviteCode: newCode });

    return newCode;
  },
});

/**
 * Leave family
 */
export const leave = mutation({
  args: { id: v.id("families") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("familyId"), args.id))
      .first();

    if (!membership) throw new Error("Not a member of this family");

    const family = await ctx.db.get(args.id);
    if (family?.creatorId === user._id) {
      throw new Error("Creator cannot leave the family. Transfer ownership first.");
    }

    await ctx.db.patch(membership._id, { deletedAt: Date.now() });

    return true;
  },
});

/**
 * Delete family (soft delete)
 */
export const remove = mutation({
  args: { id: v.id("families") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    const family = await ctx.db.get(args.id);
    if (!family) throw new Error("Family not found");

    if (family.creatorId !== user._id) {
      throw new Error("Only the creator can delete the family");
    }

    await ctx.db.patch(args.id, { deletedAt: Date.now() });

    return true;
  },
});
