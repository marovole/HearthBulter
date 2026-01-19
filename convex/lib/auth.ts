import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export async function getCurrentUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "未登录",
    });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "用户不存在",
    });
  }

  return user._id;
}

export async function verifyMemberAccess(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"familyMembers">,
) {
  const userId = await getCurrentUserId(ctx);

  const member = await ctx.db.get(memberId);
  if (!member || member.deletedAt) {
    return { hasAccess: false, member: null };
  }

  const userMember = await ctx.db
    .query("familyMembers")
    .withIndex("by_family_active", (q) =>
      q.eq("familyId", member.familyId).eq("deletedAt", undefined),
    )
    .filter((q) => q.eq(q.field("userId"), userId))
    .unique();

  if (!userMember) {
    return { hasAccess: false, member: null };
  }

  const isSelf = member.userId === userId;
  const isAdmin = userMember.role === "ADMIN";

  return {
    hasAccess: isAdmin || isSelf,
    member,
  };
}
