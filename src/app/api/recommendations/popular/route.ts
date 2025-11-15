import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdapter } from '@/lib/db/supabase-adapter';
import { RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';

// TODO: RecommendationEngine 使用 PrismaClient 类型，需要后续重构
const recommendationEngine = new RecommendationEngine(supabaseAdapter as any);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get('limit');
    const category = searchParams.get('category');

    const limit = Math.max(1, Math.min(parseInt(limitParam || '10'), 50));

    // 验证分类参数（如果提供）
    if (category) {
      const validCategories = ['MAIN_DISH', 'SIDE_DISH', 'SOUP', 'SALAD', 'DESSERT', 'SNACK', 'BREAKFAST', 'BEVERAGE', 'SAUCE', 'OTHER'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid category',
            details: `Category must be one of: ${validCategories.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // 获取热门食谱推荐
    const recommendations = await recommendationEngine.getPopularRecipes(limit, category || undefined);

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

    // 按照推荐分数排序
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
    console.error('GET /api/recommendations/popular error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get popular recipes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
