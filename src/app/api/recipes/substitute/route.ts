import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const {
      originalIngredientId,
      substituteFoodId,
      substitutionType,
      reason,
      nutritionDelta,
      costDelta,
      tasteSimilarity,
    } = await request.json();

    if (!originalIngredientId || !substituteFoodId || !substitutionType) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: originalIngredientId, substituteFoodId, substitutionType",
        },
        { status: 400 },
      );
    }

    const originalIngredient = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.recipes.getIngredientById, {
      id: originalIngredientId as Id<"recipeIngredients">,
    });

    if (!originalIngredient) {
      return NextResponse.json(
        { error: "Original ingredient not found" },
        { status: 404 },
      );
    }

    const substituteFood = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.recipes.getFoodById, { id: substituteFoodId as Id<"foods"> });

    if (!substituteFood) {
      return NextResponse.json(
        { error: "Substitute food not found" },
        { status: 404 },
      );
    }

    const substitutionId = await convexClient.mutation<string>(
      api.recipes.createIngredientSubstitution,
      {
        originalIngredientId: originalIngredientId as Id<"recipeIngredients">,
        substituteFoodId: substituteFoodId as Id<"foods">,
        substitutionType,
        reason: reason || undefined,
        nutritionDelta: nutritionDelta || undefined,
        costDelta: costDelta || undefined,
        tasteSimilarity: tasteSimilarity || undefined,
      },
    );

    return NextResponse.json({
      success: true,
      substitution: {
        id: substitutionId,
        originalIngredient,
        substituteFood,
        nutritionDelta: nutritionDelta || null,
      },
    });
  } catch (error) {
    console.error("Error creating ingredient substitution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const originalIngredientId = searchParams.get("originalIngredientId");
    const substitutionType = searchParams.get("substitutionType");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!originalIngredientId) {
      return NextResponse.json(
        { error: "originalIngredientId is required" },
        { status: 400 },
      );
    }

    const substitutions = await convexClient.query<
      Array<Record<string, unknown>>
    >(api.recipes.listIngredientSubstitutions, {
      originalIngredientId: originalIngredientId as Id<"recipeIngredients">,
      substitutionType: substitutionType || undefined,
      limit,
    });

    const originalIngredient = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.recipes.getIngredientById, {
      id: originalIngredientId as Id<"recipeIngredients">,
    });

    return NextResponse.json({
      success: true,
      substitutions: substitutions.map((sub) => ({
        ...sub,
        originalIngredient: originalIngredient ?? null,
        nutritionDelta: sub.nutritionDelta ?? null,
        conditions: sub.conditions ?? [],
      })),
    });
  } catch (error) {
    console.error("Error getting ingredient substitutions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
