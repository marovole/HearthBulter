import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Initialize Convex Auth with Password provider
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

/**
 * Get the current authenticated user
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    return user;
  },
});

/**
 * Get the current family member for the authenticated user
 */
export const currentMember = query({
  args: { familyId: v.optional(v.id("families")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return null;

    const memberQuery = ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id));

    if (args.familyId) {
      const members = await memberQuery.collect();
      return members.find((m) => m.familyId === args.familyId) || null;
    }

    return await memberQuery.first();
  },
});

/**
 * Get user with their family memberships
 */
export const getUserWithFamilies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) return null;

    // Get all family memberships
    const memberships = await ctx.db
      .query("familyMembers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Get family details for each membership
    const families = await Promise.all(
      memberships.map(async (membership) => {
        const family = await ctx.db.get(membership.familyId);
        return family
          ? {
              ...family,
              membership: {
                role: membership.role,
                memberId: membership._id,
              },
            }
          : null;
      })
    );

    return {
      ...user,
      families: families.filter(Boolean),
    };
  },
});

/**
 * Sync or create user after authentication
 * Called after successful OAuth or password login
 */
export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        image: args.image ?? existing.image,
      });
      return existing._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name ?? args.email.split("@")[0],
      image: args.image,
      role: "USER",
    });
  },
});

/**
 * Internal mutation to create user during signup
 */
export const createUser = internalMutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      throw new Error("User already exists");
    }

    // Create new user
    return await ctx.db.insert("users", {
      email: args.email,
      password: args.password, // Already hashed by Convex Auth
      name: args.name ?? args.email.split("@")[0],
      role: "USER",
    });
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.image !== undefined && { image: args.image }),
    });

    return user._id;
  },
});

/**
 * Delete user account (soft delete)
 */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      deletedAt: Date.now(),
    });

    return true;
  },
});
