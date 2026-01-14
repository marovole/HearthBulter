import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Resolve a Convex user id from email.
 */
export async function getUserIdByEmail(
  ctx: QueryCtx | MutationCtx,
  userEmail: string,
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", userEmail))
    .unique();

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "用户不存在",
    });
  }

  return user._id;
}

/**
 * Helper to verify if a user has access to a family member's data.
 */
export async function verifyMemberAccess(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"familyMembers">,
  userEmail: string,
) {
  const userId = await getUserIdByEmail(ctx, userEmail);

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
