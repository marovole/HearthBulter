import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdapter } from '@/lib/db/supabase-adapter';
import {
  RecommendationContext,
  RecommendationEngine,
} from '@/lib/services/recommendation/recommendation-engine';

// TODO: RecommendationEngine 使用 PrismaClient 类型，需要后续重构

// Force dynamic rendering
export const dynamic = 'force-dynamic';
const recommendationEngine = new RecommendationEngine(supabaseAdapter as any);

const parseInteger = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseFloatValue = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

function buildContext(searchParams: URLSearchParams): {
  context: RecommendationContext;
  limit: number;
} {
  const memberId = searchParams.get('memberId');
  if (!memberId) {
    throw new Error('memberId is required');
  }

  const limitParam = parseInteger(searchParams.get('limit')) ?? 10;
  const limit = Math.max(1, Math.min(limitParam, 50));

  const context: RecommendationContext = {
    memberId,
    mealType:
      (searchParams.get('mealType') as RecommendationContext['mealType']) ||
      undefined,
    servings: parseInteger(searchParams.get('servings')),
    maxCookTime: parseInteger(searchParams.get('maxCookTime')),
    budgetLimit: parseFloatValue(searchParams.get('budgetLimit')),
    dietaryRestrictions: parseCsv(searchParams.get('dietaryRestrictions')),
    excludedIngredients: parseCsv(searchParams.get('excludedIngredients')),
    preferredCuisines: parseCsv(searchParams.get('preferredCuisines')),
    season:
      (searchParams.get('season') as RecommendationContext['season']) ||
      undefined,
  };

  return { context, limit };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { context, limit } = buildContext(searchParams);

    const recommendations = await recommendationEngine.getRecommendations(
      context,
      limit,
    );
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

    const recipes = await supabaseAdapter.recipe.findMany({
      where: {
        id: { in: recipeIds },
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
      },
      include: {
        ingredients: {
          include: { food: true },
        },
        instructions: true,
        nutrition: true,
      },
    });

    type RecipeWithRelations = Awaited<
      ReturnType<typeof supabaseAdapter.recipe.findMany>
    >[number];
    const recipeMap = new Map<string, RecipeWithRelations>();
    for (const recipe of recipes) {
      recipeMap.set(recipe.id, recipe);
    }

    const enriched = recommendations.reduce<
      Array<(typeof recommendations)[number] & { recipe: RecipeWithRelations }>
    >((acc, rec) => {
      const recipe = recipeMap.get(rec.recipeId);
      if (recipe) {
        acc.push({ ...rec, recipe });
      }
      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enriched,
        context,
        total: enriched.length,
      },
    });
  } catch (error) {
    console.error('GET /api/recommendations/recipes error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 },
    );
  }
}
