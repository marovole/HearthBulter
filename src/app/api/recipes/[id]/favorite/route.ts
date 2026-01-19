import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeRepository } from "@/lib/repositories/recipe-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

const resolveMemberId = async (
  memberId: string | undefined,
  clerkId: string,
) => {
  if (memberId) {
    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: memberId as Id<"familyMembers">,
        clerkId,
      },
    );
    return access.hasAccess ? memberId : null;
  }

  const members = await convexClient.query<Array<{ _id: Id<"familyMembers"> }>>(
    api.members.listByClerkId,
    { clerkId },
  );

  return members[0]?._id ?? null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recipeId } = await params;
    const body = await request.json();
    const notes = body?.notes as string | undefined;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const memberId = await resolveMemberId(body?.memberId, session.user.id);
    if (!memberId) {
      return NextResponse.json(
        { error: "Missing required parameter: memberId" },
        { status: 400 },
      );
    }

    const recipeExists = await recipeRepository.recipeExists(recipeId);
    if (!recipeExists) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const favorite = await recipeRepository.addFavorite({
      recipeId,
      memberId,
      notes,
    });

    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error("Error favoriting recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberIdParam = searchParams.get("memberId") || undefined;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const memberId = await resolveMemberId(memberIdParam, session.user.id);
    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 },
      );
    }

    await recipeRepository.removeFavorite(recipeId, memberId);

    return NextResponse.json({
      success: true,
      message: "Recipe unfavorited successfully",
    });
  } catch (error) {
    console.error("Error unfavoriting recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId is required" },
        { status: 400 },
      );
    }

    const favorite = await recipeRepository.checkFavoriteStatus(
      recipeId,
      memberId,
    );

    return NextResponse.json({
      success: true,
      isFavorited: !!favorite,
      favorite,
    });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
