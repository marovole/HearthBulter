import { NextRequest, NextResponse } from "next/server";
import { recipeRepository } from "@/lib/repositories/recipe-repository-singleton";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: recipeId } = await params;
    const { memberId, rating, comment, tags } = await request.json();

    if (!memberId || !rating) {
      return NextResponse.json(
        { error: "Missing required parameters: memberId and rating" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const recipeExists = await recipeRepository.recipeExists(recipeId);
    if (!recipeExists) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipeRating = await recipeRepository.addOrUpdateRating({
      recipeId,
      memberId,
      rating,
      comment,
      tags,
    });

    return NextResponse.json({
      success: true,
      rating: recipeRating,
    });
  } catch (error) {
    console.error("Error rating recipe:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const rating = await recipeRepository.getRating(recipeId, memberId);

    return NextResponse.json({
      success: true,
      rating,
    });
  } catch (error) {
    console.error("Error getting recipe rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
