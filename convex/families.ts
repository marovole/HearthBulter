import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const clerkId = args.clerkId ?? (await ctx.auth.getUserIdentity())?.subject;

    if (!clerkId) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) {
      return [];
    }

    const userId = user._id;

    const families = await ctx.db
      .query("families")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();

    const memberRecords = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const otherFamilyIds = memberRecords
      .map((m) => m.familyId)
      .filter((id) => !families.some((f) => f._id === id));

    const otherFamilies = await Promise.all(otherFamilyIds.map((id) => ctx.db.get(id)));

    const allFamilies = [
      ...families,
      ...otherFamilies.filter((f): f is NonNullable<typeof f> => !!f),
    ];

    return await Promise.all(
      allFamilies.map(async (family) => {
        const members = await ctx.db
          .query("familyMembers")
          .withIndex("by_family", (q) => q.eq("familyId", family._id))
          .collect();
        return { ...family, members };
      })
    );
  },
});

export const getById = query({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family || family.deletedAt) {
      return null;
    }

    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return { ...family, members };
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const family = await ctx.db
      .query("families")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!family || family.deletedAt) {
      return null;
    }

    const members = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", family._id))
      .collect();

    return { ...family, members };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = args.clerkId ?? (await ctx.auth.getUserIdentity())?.subject;
    if (!clerkId) {
      throw new Error("未登录");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) {
      throw new Error("用户不存在");
    }

    const creatorId = user._id;
    const now = Date.now();

    const familyId = await ctx.db.insert("families", {
      name: args.name,
      description: args.description,
      inviteCode: generateInviteCode(),
      creatorId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("familyMembers", {
      familyId,
      userId: creatorId,
      name: "创建者",
      gender: "OTHER",
      birthDate: now,
      role: "ADMIN",
      createdAt: now,
      updatedAt: now,
    });

    return familyId;
  },
});

export const ensureDefaultFamily = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.subject && identity.subject !== args.clerkId) {
      throw new Error("身份不匹配");
    }

    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    let userId = existingUser?._id;

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        updatedAt: now,
      });
    } else {
      userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        role: "USER",
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!userId) {
      throw new Error("用户创建失败");
    }

    const existingMembers = await ctx.db
      .query("familyMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const activeMember = existingMembers[0];
    if (activeMember) {
      return { familyId: activeMember.familyId, memberId: activeMember._id, created: false };
    }

    const createdFamilies = await ctx.db
      .query("families")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .collect();

    const activeFamily = createdFamilies.find((family) => !family.deletedAt);
    if (activeFamily) {
      const memberId = await ctx.db.insert("familyMembers", {
        familyId: activeFamily._id,
        userId,
        name: args.name ?? "创建者",
        gender: "OTHER",
        birthDate: now,
        role: "ADMIN",
        createdAt: now,
        updatedAt: now,
      });

      return { familyId: activeFamily._id, memberId, created: false };
    }

    const familyId = await ctx.db.insert("families", {
      name: "我的家庭",
      inviteCode: generateInviteCode(),
      creatorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    const memberId = await ctx.db.insert("familyMembers", {
      familyId,
      userId,
      name: args.name ?? "创建者",
      gender: "OTHER",
      birthDate: now,
      role: "ADMIN",
      createdAt: now,
      updatedAt: now,
    });

    return { familyId, memberId, created: true };
  },
});

export const update = mutation({
  args: {
    familyId: v.id("families"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.familyId, {
      name: args.name,
      description: args.description,
      updatedAt: now,
    });
    return args.familyId;
  },
});

export const softDelete = mutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.familyId, { deletedAt: now, updatedAt: now });
  },
});

export const listMembers = query({
  args: { familyId: v.id("families"), includeDeleted: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let members = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    if (!args.includeDeleted) {
      members = members.filter((m) => !m.deletedAt);
    }

    return members;
  },
});

export const getMemberById = query({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.deletedAt) {
      return null;
    }
    return member;
  },
});

export const addMember = mutation({
  args: {
    familyId: v.id("families"),
    name: v.string(),
    gender: v.optional(v.string()),
    birthDate: v.optional(v.number()),
    role: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    avatar: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("familyMembers", {
      familyId: args.familyId,
      userId: args.userId,
      name: args.name,
      gender: (args.gender ?? "OTHER") as "MALE" | "FEMALE" | "OTHER",
      birthDate: args.birthDate ?? now,
      role: (args.role ?? "MEMBER") as "ADMIN" | "MEMBER" | "GUEST",
      avatar: args.avatar,
      height: args.height,
      weight: args.weight,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMember = mutation({
  args: {
    memberId: v.id("familyMembers"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.memberId, {
      name: args.name,
      avatar: args.avatar,
      role: args.role as "ADMIN" | "MEMBER" | "GUEST" | undefined,
      updatedAt: now,
    });
    return args.memberId;
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("familyMembers") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.memberId, { deletedAt: now, updatedAt: now });
  },
});

export const isUserFamilyMember = query({
  args: { familyId: v.id("families"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();
    return Boolean(member && !member.deletedAt);
  },
});

export const getUserFamilyRole = query({
  args: { familyId: v.id("families"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (!member || member.deletedAt) {
      return null;
    }

    return member.role;
  },
});

// === Family Invitations ==================================================

export const getInvitationByCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("familyInvitations")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!invitation || invitation.deletedAt) return null;
    return invitation;
  },
});

export const createInvitation = mutation({
  args: {
    inviteCode: v.string(),
    email: v.string(),
    role: v.string(),
    familyId: v.id("families"),
    userId: v.optional(v.id("users")),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("familyInvitations", {
      ...args,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateInvitationStatus = mutation({
  args: {
    invitationId: v.id("familyInvitations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.invitationId, {
      status: args.status,
      updatedAt: now,
    });
    return args.invitationId;
  },
});

export const acceptInvitation = mutation({
  args: {
    inviteCode: v.string(),
    userId: v.id("users"),
    memberName: v.string(),
    gender: v.optional(v.string()),
    birthDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find invitation by code
    const invitation = await ctx.db
      .query("familyInvitations")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!invitation || invitation.deletedAt) {
      return {
        success: false,
        error: "INVALID_OR_EXPIRED_INVITATION",
        message: "邀请码无效或已过期",
      };
    }

    // Check expiration
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "EXPIRED", updatedAt: Date.now() });
      return { success: false, error: "INVALID_OR_EXPIRED_INVITATION", message: "邀请已过期" };
    }

    // Check status
    if (invitation.status === "ACCEPTED") {
      return { success: false, error: "ALREADY_ACCEPTED", message: "该邀请已被接受" };
    }

    if (invitation.status !== "PENDING") {
      return { success: false, error: "INVALID_OR_EXPIRED_INVITATION", message: "邀请不可用" };
    }

    // Check if user is already a member of this family
    const existingMember = await ctx.db
      .query("familyMembers")
      .withIndex("by_family", (q) => q.eq("familyId", invitation.familyId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();

    if (existingMember) {
      return { success: false, error: "ALREADY_MEMBER", message: "您已经是该家庭的成员" };
    }

    // Get family
    const family = await ctx.db.get(invitation.familyId);
    if (!family || family.deletedAt) {
      return { success: false, error: "FAMILY_NOT_FOUND", message: "家庭不存在" };
    }

    // Create member
    const now = Date.now();
    const memberId = await ctx.db.insert("familyMembers", {
      familyId: invitation.familyId,
      userId: args.userId,
      name: args.memberName,
      gender: (args.gender ?? "OTHER") as "MALE" | "FEMALE" | "OTHER",
      birthDate: args.birthDate ?? now,
      role: (invitation.role ?? "MEMBER") as "ADMIN" | "MEMBER" | "GUEST",
      createdAt: now,
      updatedAt: now,
    });

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "ACCEPTED",
      userId: args.userId,
      updatedAt: now,
    });

    return {
      success: true,
      message: "成功加入家庭",
      data: {
        family: { id: family._id, name: family.name, description: family.description },
        member: { id: memberId, name: args.memberName, role: invitation.role },
      },
    };
  },
});

export const cleanupExpiredInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Mark expired PENDING invitations
    const pendingExpired = await ctx.db
      .query("familyInvitations")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();

    let expiredUpdated = 0;
    for (const inv of pendingExpired) {
      if (inv.expiresAt < now) {
        await ctx.db.patch(inv._id, { status: "EXPIRED", updatedAt: now });
        expiredUpdated++;
      }
    }

    // Soft-delete old EXPIRED/REJECTED invitations
    const oldInvitations = await ctx.db.query("familyInvitations").collect();

    let softDeleted = 0;
    for (const inv of oldInvitations) {
      if (
        (inv.status === "EXPIRED" || inv.status === "REJECTED") &&
        inv.updatedAt < thirtyDaysAgo
      ) {
        await ctx.db.patch(inv._id, { status: "DELETED", updatedAt: now });
        softDeleted++;
      }
    }

    return { expiredUpdated, softDeleted };
  },
});

export const countInvitationsByStatus = query({
  args: {
    status: v.optional(v.string()),
    expiresBefore: v.optional(v.number()),
    updatedBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let invitations = await ctx.db.query("familyInvitations").collect();

    if (args.status) {
      invitations = invitations.filter((inv) => inv.status === args.status);
    }
    if (args.expiresBefore) {
      invitations = invitations.filter((inv) => inv.expiresAt < args.expiresBefore!);
    }
    if (args.updatedBefore) {
      invitations = invitations.filter((inv) => inv.updatedAt < args.updatedBefore!);
    }

    return invitations.length;
  },
});

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
