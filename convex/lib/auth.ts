import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Helper to verify if a user has access to a family member's data.
 * This replaces the Prisma-based verifyMemberAccess.
 */
export async function verifyMemberAccess(
  ctx: QueryCtx | MutationCtx,
  memberId: Id<"familyMembers">,
  userEmail: string,
) {
  // Find the user by email
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", userEmail))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  const userId = user._id;

  // Find the target member
  const member = await ctx.db.get(memberId);
  if (!member || member.deletedAt) {
    return { hasAccess: false, member: null };
  }

  // Find the user's role in this family
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
