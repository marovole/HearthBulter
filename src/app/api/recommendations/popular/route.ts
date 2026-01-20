import { NextRequest, NextResponse } from "next/server";
import { RecommendationEngine } from "@/lib/services/recommendation/recommendation-engine";
import { getDefaultContainer } from "@/lib/container/service-container";

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
    const limitParam = searchParams.get("limit");
    const category = searchParams.get("category");

    const limit = Math.max(1, Math.min(parseInt(limitParam || "10"), 50));

    if (category) {
      const validCategories = [
        "MAIN_DISH",
        "SIDE_DISH",
        "SOUP",
        "SALAD",
        "DESSERT",
        "SNACK",
        "BREAKFAST",
        "BEVERAGE",
        "SAUCE",
        "OTHER",
      ];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid category",
            details: `Category must be one of: ${validCategories.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    const recommendations = await recommendationEngine.getPopularRecipes(
      limit,
      category || undefined
    );

    if (recommendations.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          category,
          total: 0,
        },
      });
    }

    const recipeIds = recommendations.map((rec) => rec.recipeId);
    const recipes = await getDefaultContainer()
      .getRecommendationRepository()
      .getRecipesByIds(recipeIds);

    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    const enriched = recommendations.reduce<any[]>((acc, rec) => {
      const recipe = recipeMap.get(rec.recipeId);
      if (recipe) {
        acc.push({ ...rec, recipe });
      }
      return acc;
    }, []);

    enriched.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enriched,
        category,
        total: enriched.length,
      },
    });
  } catch (error) {
    console.error("GET /api/recommendations/popular error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get popular recipes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
