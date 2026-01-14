import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get current user by email (from JWT)
 */
export const getMe = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});
