import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { RecommendationContext, RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';

/**
 * GET /api/recommendations/refresh - 刷新推荐列表
 *
 * Migrated from Prisma to Supabase (partial - RecommendationEngine still uses Prisma)
 */

const recommendationEngine = new RecommendationEngine(prisma);

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
  const items = value.split(',').map(item => item.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
};

function buildContext(searchParams: URLSearchParams): { context: RecommendationContext; limit: number; excludeRecipeIds: string[] } {
  const memberId = searchParams.get('memberId');
  if (!memberId) {
    throw new Error('memberId is required');
  }

  const limitParam = parseInteger(searchParams.get('limit')) ?? 10;
  const limit = Math.max(1, Math.min(limitParam, 50));

  const excludeRecipeIds = parseCsv(searchParams.get('excludeRecipeIds')) ?? [];

  const context: RecommendationContext = {
    memberId,
    mealType: (searchParams.get('mealType') as RecommendationContext['mealType']) || undefined,
    servings: parseInteger(searchParams.get('servings')),
    maxCookTime: parseInteger(searchParams.get('maxCookTime')),
    budgetLimit: parseFloatValue(searchParams.get('budgetLimit')),
    dietaryRestrictions: parseCsv(searchParams.get('dietaryRestrictions')),
    excludedIngredients: parseCsv(searchParams.get('excludedIngredients')),
    preferredCuisines: parseCsv(searchParams.get('preferredCuisines')),
    season: (searchParams.get('season') as RecommendationContext['season']) || undefined,
  };

  return { context, limit, excludeRecipeIds };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const { context, limit, excludeRecipeIds } = buildContext(searchParams);

    // 获取刷新的推荐结果（排除指定食谱）
    const recommendations = await recommendationEngine.refreshRecommendations(
      context,
      excludeRecipeIds,
      limit
    );

    const recipeIds = recommendations.map(rec => rec.recipeId);

    if (recipeIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          context,
          excludeRecipeIds,
          total: 0,
        },
      });
    }

    // 获取食谱详细信息（使用Supabase）
    const supabase = SupabaseClientManager.getInstance();

    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        description,
        servings,
        prepTime,
        cookTime,
        difficulty,
        cuisine,
        category,
        tags,
        imageUrl,
        status,
        isPublic,
        averageRating,
        ratingCount,
        viewCount,
        createdAt,
        updatedAt
      `)
      .in('id', recipeIds)
      .eq('status', 'PUBLISHED')
      .eq('isPublic', true)
      .is('deletedAt', null);

    if (recipesError) {
      console.error('查询食谱失败:', recipesError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recipe details',
        },
        { status: 500 }
      );
    }

    // 查询相关的ingredients, instructions和nutrition
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        recipeId,
        amount,
        unit,
        notes,
        food:foods!inner(
          id,
          name,
          nameEn,
          calories,
          protein,
          carbs,
          fat,
          category
        )
      `)
      .in('recipeId', recipeIds);

    const { data: instructions } = await supabase
      .from('recipe_instructions')
      .select('*')
      .in('recipeId', recipeIds)
      .order('stepNumber', { ascending: true });

    const { data: nutrition } = await supabase
      .from('recipe_nutrition')
      .select('*')
      .in('recipeId', recipeIds);

    // 手动组装数据
    const ingredientsMap = new Map<string, any[]>();
    ingredients?.forEach((ing: any) => {
      if (!ingredientsMap.has(ing.recipeId)) {
        ingredientsMap.set(ing.recipeId, []);
      }
      ingredientsMap.get(ing.recipeId)!.push(ing);
    });

    const instructionsMap = new Map<string, any[]>();
    instructions?.forEach((inst: any) => {
      if (!instructionsMap.has(inst.recipeId)) {
        instructionsMap.set(inst.recipeId, []);
      }
      instructionsMap.get(inst.recipeId)!.push(inst);
    });

    const nutritionMap = new Map<string, any>();
    nutrition?.forEach((nutr: any) => {
      nutritionMap.set(nutr.recipeId, nutr);
    });

    const enrichedRecipes = (recipes || []).map((recipe: any) => ({
      ...recipe,
      ingredients: ingredientsMap.get(recipe.id) || [],
      instructions: instructionsMap.get(recipe.id) || [],
      nutrition: nutritionMap.get(recipe.id) || null,
    }));

    const recipeMap = new Map<string, any>();
    for (const recipe of enrichedRecipes) {
      recipeMap.set(recipe.id, recipe);
    }

    const enriched = recommendations.reduce<any[]>((acc, rec) => {
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
        excludeRecipeIds,
        total: enriched.length,
      },
    });
  } catch (error) {
    console.error('GET /api/recommendations/refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}
