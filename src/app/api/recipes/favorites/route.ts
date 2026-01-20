import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeRepository } from "@/lib/repositories/recipe-repository-singleton";
import type { GetFavoritesQuery } from "@/lib/repositories/interfaces/recipe-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberIdParam = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = (searchParams.get("sortBy") as "favoritedAt" | "name") || "favoritedAt";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    let memberId = memberIdParam;

    if (!memberId) {
      const session = await auth();
      if (session?.user?.id) {
        const members = await convexClient.query<Array<{ _id: Id<"familyMembers"> }>>(
          api.members.listByClerkId,
          { clerkId: session.user.id }
        );
        memberId = members[0]?._id ?? null;
      }
    }

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const query: GetFavoritesQuery = {
      memberId,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const result = await recipeRepository.getFavoritesByMember(query);

    return NextResponse.json({
      success: true,
      favorites: result.favorites,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error getting favorites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
