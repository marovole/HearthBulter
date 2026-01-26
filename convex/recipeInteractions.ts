import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const getRecipeOrThrow = async (ctx: { db: any }, recipeId: string) => {
  const recipe = await ctx.db.get(recipeId);
  if (!recipe || recipe.deletedAt) {
    throw new Error("Recipe not found");
  }
  return recipe;
};

export const addFavorite = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("recipeFavorites")
      .withIndex("by_member_recipe", (q) =>
        q.eq("memberId", args.memberId).eq("recipeId", args.recipeId)
      )
      .unique();

    if (existing) {
      if (args.notes && args.notes !== existing.notes) {
        await ctx.db.patch(existing._id, {
          notes: args.notes,
          updatedAt: Date.now(),
        });
      }
      return existing;
    }

    const recipe = await getRecipeOrThrow(ctx, args.recipeId);
    const now = Date.now();
    const favoriteId = await ctx.db.insert("recipeFavorites", {
      recipeId: args.recipeId,
      memberId: args.memberId,
      favoritedAt: now,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.recipeId, {
      favoriteCount: (recipe.favoriteCount ?? 0) + 1,
      updatedAt: now,
    });

    return await ctx.db.get(favoriteId);
  },
});

export const removeFavorite = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("recipeFavorites")
      .withIndex("by_member_recipe", (q) =>
        q.eq("memberId", args.memberId).eq("recipeId", args.recipeId)
      )
      .unique();

    if (!existing) return null;

    const recipe = await getRecipeOrThrow(ctx, args.recipeId);
    await ctx.db.delete(existing._id);

    const nextCount = Math.max((recipe.favoriteCount ?? 1) - 1, 0);
    await ctx.db.patch(args.recipeId, {
      favoriteCount: nextCount,
      updatedAt: Date.now(),
    });

    return existing._id;
  },
});

export const getFavorite = query({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipeFavorites")
      .withIndex("by_member_recipe", (q) =>
        q.eq("memberId", args.memberId).eq("recipeId", args.recipeId)
      )
      .unique();
  },
});

export const listFavoritesByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    offset: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("recipeFavorites")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .collect();

    const total = favorites.length;
    const page = favorites.slice(args.offset, args.offset + args.limit);

    return {
      items: page,
      total,
    };
  },
});

export const addOrUpdateRating = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    rating: v.number(),
    comment: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await getRecipeOrThrow(ctx, args.recipeId);
    const now = Date.now();

    const existing = await ctx.db
      .query("recipeRatings")
      .withIndex("by_member_recipe", (q) =>
        q.eq("memberId", args.memberId).eq("recipeId", args.recipeId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        comment: args.comment,
        tags: args.tags,
        ratedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("recipeRatings", {
        recipeId: args.recipeId,
        memberId: args.memberId,
        rating: args.rating,
        comment: args.comment,
        tags: args.tags,
        ratedAt: now,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const ratings = await ctx.db
      .query("recipeRatings")
      .withIndex("by_recipe", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    const ratingCount = ratings.length;
    const averageRating = ratingCount
      ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratingCount
      : 0;

    await ctx.db.patch(args.recipeId, {
      ratingCount,
      averageRating: Math.round(averageRating * 10) / 10,
      updatedAt: now,
    });

    return await ctx.db
      .query("recipeRatings")
      .withIndex("by_member_recipe", (q) =>
        q.eq("memberId", args.memberId).eq("recipeId", args.recipeId)
      )
      .unique();
  },
});

export const getRating = query({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipeRatings")
      .withIndex("by_member_recipe", (q) =>
        q.eq("memberId", args.memberId).eq("recipeId", args.recipeId)
      )
      .unique();
  },
});

export const addView = mutation({
  args: {
    recipeId: v.id("recipes"),
    memberId: v.id("familyMembers"),
    viewDuration: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const recipe = await getRecipeOrThrow(ctx, args.recipeId);
    const now = Date.now();
    const viewId = await ctx.db.insert("recipeViews", {
      recipeId: args.recipeId,
      memberId: args.memberId,
      viewedAt: now,
      viewDuration: args.viewDuration,
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.recipeId, {
      viewCount: (recipe.viewCount ?? 0) + 1,
      updatedAt: now,
    });

    return await ctx.db.get(viewId);
  },
});

export const listViewsByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let views = await ctx.db
      .query("recipeViews")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .collect();

    if (args.startDate !== undefined) {
      views = views.filter((view) => view.viewedAt >= args.startDate!);
    }

    return views;
  },
});

export const listRatingsByMember = query({
  args: {
    memberId: v.id("familyMembers"),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let ratings = await ctx.db
      .query("recipeRatings")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .collect();

    if (args.startDate !== undefined) {
      ratings = ratings.filter((rating) => rating.ratedAt >= args.startDate!);
    }

    return ratings;
  },
});

export const listFavoritesByMemberSimple = query({
  args: {
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recipeFavorites")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .collect();
  },
});

export const getMemberInteractionCounts = query({
  args: {
    memberId: v.id("familyMembers"),
  },
  handler: async (ctx, args) => {
    const [ratings, favorites, views] = await Promise.all([
      ctx.db
        .query("recipeRatings")
        .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
        .collect(),
      ctx.db
        .query("recipeFavorites")
        .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
        .collect(),
      ctx.db
        .query("recipeViews")
        .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
        .collect(),
    ]);

    return {
      ratingCount: ratings.length,
      favoriteCount: favorites.length,
      viewCount: views.length,
    };
  },
});

export const listRatingsForMatrix = query({
  args: {
    minRatingsPerUser: v.number(),
    minRatingsPerItem: v.number(),
    maxAge: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let ratings = await ctx.db.query("recipeRatings").collect();
    ratings = ratings.filter((rating) => rating.rating >= 1 && rating.rating <= 5);

    if (args.maxAge !== undefined) {
      ratings = ratings.filter((rating) => rating.ratedAt >= args.maxAge!);
    }

    const userCounts = new Map<string, number>();
    ratings.forEach((rating) => {
      userCounts.set(rating.memberId, (userCounts.get(rating.memberId) ?? 0) + 1);
    });

    const activeUsers = new Set(
      [...userCounts.entries()]
        .filter(([, count]) => count >= args.minRatingsPerUser)
        .map(([userId]) => userId)
    );

    if (activeUsers.size === 0) return [];

    const itemCounts = new Map<string, number>();
    ratings
      .filter((rating) => activeUsers.has(rating.memberId))
      .forEach((rating) => {
        itemCounts.set(rating.recipeId, (itemCounts.get(rating.recipeId) ?? 0) + 1);
      });

    const activeItems = new Set(
      [...itemCounts.entries()]
        .filter(([, count]) => count >= args.minRatingsPerItem)
        .map(([itemId]) => itemId)
    );

    if (activeItems.size === 0) return [];

    return ratings
      .filter((rating) => activeUsers.has(rating.memberId) && activeItems.has(rating.recipeId))
      .map((rating) => ({
        userId: rating.memberId,
        itemId: rating.recipeId,
        rating: rating.rating,
        timestamp: rating.ratedAt,
      }));
  },
});
