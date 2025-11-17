import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdapter } from '@/lib/db/supabase-adapter';
import { RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';

// TODO: RecommendationEngine 使用 PrismaClient 类型，需要后续重构

// Force dynamic rendering
export const dynamic = 'force-dynamic';
const recommendationEngine = new RecommendationEngine(supabaseAdapter as any);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const recipeId = searchParams.get('recipeId');
    const limitParam = searchParams.get('limit');

    if (!recipeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'recipeId is required',
          details: 'Please provide a recipeId parameter',
        },
        { status: 400 }
      );
    }

    const limit = Math.max(1, Math.min(parseInt(limitParam || '5'), 20));

    // 验证食谱是否存在
    const recipe = await supabaseAdapter.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true, status: true, isPublic: true, deletedAt: true },
    });

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recipe not found',
          details: 'The specified recipe does not exist',
        },
        { status: 404 }
      );
    }

    if (recipe.status !== 'PUBLISHED' || !recipe.isPublic || recipe.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recipe not available',
          details: 'The recipe is not published or has been deleted',
        },
        { status: 404 }
      );
    }

    // 获取相似食谱推荐
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

    // 获取推荐的食谱详细信息（使用Supabase）
    const recipeIds = recommendations.map(rec => rec.recipeId);
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
      },
    });

    type RecipeWithRelations = Awaited<ReturnType<typeof supabaseAdapter.recipe.findMany>>[number];
    const recipeMap = new Map<string, RecipeWithRelations>();
    for (const recipe of recipes) {
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
        recipeId,
        total: enriched.length,
      },
    });
  } catch (error) {
    console.error('GET /api/recommendations/similar error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get similar recipes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
