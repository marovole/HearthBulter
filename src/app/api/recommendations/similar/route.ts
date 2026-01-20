import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Initialize recommendation engine lazily to avoid circular dependency issues
    const { RecommendationEngine } = await import(
      "@/lib/services/recommendation/recommendation-engine"
    );
    const { getDefaultContainer } = await import("@/lib/container/service-container");
    const recommendationEngine = new RecommendationEngine(
      getDefaultContainer().getRecommendationRepository()
    );

    const { searchParams } = request.nextUrl;
    const recipeId = searchParams.get("recipeId");
    const limitParam = searchParams.get("limit");

    if (!recipeId) {
      return NextResponse.json(
        {
          success: false,
          error: "recipeId is required",
          details: "Please provide a recipeId parameter",
        },
        { status: 400 }
      );
    }

    const limit = Math.max(1, Math.min(parseInt(limitParam || "5"), 20));

    const recipe = await convexClient.query<Record<string, unknown> | null>(api.recipes.getById, {
      recipeId: recipeId as Id<"recipes">,
    });

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found",
          details: "The specified recipe does not exist",
        },
        { status: 404 }
      );
    }

    if (recipe.status && recipe.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not available",
          details: "The recipe is not published or has been deleted",
        },
        { status: 404 }
      );
    }

    if (recipe.isPublic === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not available",
          details: "The recipe is not published or has been deleted",
        },
        { status: 404 }
      );
    }

    const recommendations = await recommendationEngine.getSimilarRecipes(recipeId, limit);

    if (recommendations.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          recipeId,
          total: 0,
        },
      });
    }

    const recipeIds = recommendations.map((rec) => rec.recipeId);
    const recipes = await getDefaultContainer()
      .getRecommendationRepository()
      .getRecipesByIds(recipeIds);

    const recipeMap = new Map(recipes.map((item) => [item.id, item]));

    const enriched = recommendations.reduce<any[]>((acc, rec) => {
      const related = recipeMap.get(rec.recipeId);
      if (related) {
        acc.push({ ...rec, recipe: related });
      }
      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enriched,
        recipeId,
        total: enriched.length,
      },
    });
  } catch (error) {
    console.error("GET /api/recommendations/similar error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get similar recipes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
