import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { RecommendationEngine } from '@/lib/services/recommendation/recommendation-engine';

/**
 * GET /api/recommendations/similar - 获取相似食谱推荐
 *
 * Migrated from Prisma to Supabase (partial - RecommendationEngine still uses Prisma)
 */

const recommendationEngine = new RecommendationEngine(prisma);

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

    const supabase = SupabaseClientManager.getInstance();

    // 验证食谱是否存在（使用Supabase）
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, status, isPublic, deletedAt')
      .eq('id', recipeId)
      .maybeSingle();

    if (recipeError) {
      console.error('查询食谱失败:', recipeError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to check recipe',
        },
        { status: 500 }
      );
    }

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
