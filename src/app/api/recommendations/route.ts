import { NextRequest, NextResponse } from "next/server";
import type { RecommendationRepository } from "@/lib/repositories/interfaces/recommendation-repository";
import type { RecipeRecommendation } from "@/lib/services/recommendation/recommendation-engine";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const memberId = searchParams.get("memberId") || "default-user";
    const mealTypeParam = searchParams.get("mealType");
    const mealType =
      mealTypeParam &&
      ["BREAKFAST", "LUNCH", "DINNER", "SNACK"].includes(mealTypeParam)
        ? (mealTypeParam as "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK")
        : undefined;
    const servings = parseInt(searchParams.get("servings") || "2");
    const maxCookTime = parseInt(searchParams.get("maxCookTime") || "60");
    const budgetLimit = parseFloat(searchParams.get("budgetLimit") || "50");
    const dietaryRestrictions =
      searchParams.get("dietaryRestrictions")?.split(",") || [];
    const excludedIngredients =
      searchParams.get("excludedIngredients")?.split(",") || [];
    const preferredCuisines =
      searchParams.get("preferredCuisines")?.split(",") || [];
    const seasonParam = searchParams.get("season");
    const season =
      seasonParam &&
      ["SPRING", "SUMMER", "AUTUMN", "WINTER"].includes(seasonParam)
        ? (seasonParam as "SPRING" | "SUMMER" | "AUTUMN" | "WINTER")
        : undefined;
    const limit = parseInt(searchParams.get("limit") || "10");

    const context = {
      memberId,
      mealType,
      servings,
      maxCookTime,
      budgetLimit,
      dietaryRestrictions,
      excludedIngredients,
      preferredCuisines,
      season,
    };

    const { RecommendationEngine } = await import(
      "@/lib/services/recommendation/recommendation-engine"
    );
    const { getDefaultContainer } = await import(
      "@/lib/container/service-container"
    );
    const recommendationRepository =
      getDefaultContainer().getRecommendationRepository() as RecommendationRepository;
    const recommendationEngine = new RecommendationEngine(
      recommendationRepository,
    );
    const recommendations: RecipeRecommendation[] =
      await recommendationEngine.getRecommendations(context, limit);

    const recipeIds = recommendations.map((rec) => rec.recipeId);

    if (recipeIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          context,
          total: 0,
        },
      });
    }

    const recipes = await recommendationRepository.getRecipesByIds(recipeIds);

    const recipeMap = new Map(
      recipes
        .filter((recipe): recipe is NonNullable<typeof recipe> => !!recipe)
        .map((recipe) => [recipe.id, recipe]),
    );

    const enrichedRecommendations = recommendations
      .map((rec) => ({
        ...rec,
        recipe: recipeMap.get(rec.recipeId) ?? null,
      }))
      .filter((rec) => rec.recipe);

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        context,
        total: enrichedRecommendations.length,
      },
    });
  } catch (error) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case "rating": {
        const rating = await convexClient.mutation<Record<string, unknown>>(
          api["recipe-interactions"].addOrUpdateRating,
          {
            recipeId: data.recipeId as Id<"recipes">,
            memberId: data.memberId as Id<"familyMembers">,
            rating: data.rating,
            comment: data.review ?? undefined,
            tags: data.tags ?? undefined,
          },
        );
        return NextResponse.json({ success: true, data: rating });
      }
      case "favorite": {
        const favorite = await convexClient.mutation<Record<string, unknown>>(
          api["recipe-interactions"].addFavorite,
          {
            recipeId: data.recipeId as Id<"recipes">,
            memberId: data.memberId as Id<"familyMembers">,
            notes: data.notes ?? undefined,
          },
        );
        return NextResponse.json({ success: true, data: favorite });
      }
      case "view": {
        const view = await convexClient.mutation<Record<string, unknown>>(
          api["recipe-interactions"].addView,
          {
            recipeId: data.recipeId as Id<"recipes">,
            memberId: data.memberId as Id<"familyMembers">,
            viewDuration: data.viewDuration ?? undefined,
            source: data.viewSource ?? undefined,
          },
        );
        return NextResponse.json({ success: true, data: view });
      }
      case "substitution": {
        const substitutionId = await convexClient.mutation<string>(
          api.recipes.createIngredientSubstitution,
          {
            originalIngredientId:
              data.originalIngredientId as Id<"recipeIngredients">,
            substituteFoodId: data.substitutedIngredientId as Id<"foods">,
            substitutionType: data.substitutionType || "MANUAL",
            reason: data.substitutionReason ?? undefined,
            nutritionDelta: {
              qualityImpact: data.qualityImpact,
              isSuccessful: data.isSuccessful,
              feedback: data.feedback,
            },
          },
        );

        return NextResponse.json({
          success: true,
          data: { id: substitutionId },
        });
      }
      default:
        return NextResponse.json(
          { success: false, error: "Invalid interaction type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Interaction API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to record interaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
