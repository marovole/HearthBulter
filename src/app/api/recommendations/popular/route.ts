import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';

/**
 * GET /api/recommendations/popular - 获取热门食谱推荐
 *
 * Migrated from Prisma to Supabase (partial - RecommendationEngine still uses Prisma)
 */

const recommendationEngine = new RecommendationEngine(prisma);

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
    const recommendations = await recommendationEngine.getPopularRecipes(limit, category);
    
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
      .is('deletedAt', null)
      .order('averageRating', { ascending: false, nullsFirst: false })
      .order('ratingCount', { ascending: false })
      .order('viewCount', { ascending: false });

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
