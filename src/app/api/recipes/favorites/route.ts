import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/recipes/favorites - 获取收藏的食谱列表
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'favoritedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;
    const supabase = SupabaseClientManager.getInstance();

    // 获取收藏列表（带recipe关联）
    const { data: favorites, error: favoritesError, count } = await supabase
      .from('recipe_favorites')
      .select(`
        id,
        favoritedAt,
        notes,
        recipe:recipes!inner(
          id,
          name,
          description,
          servings,
          prepTime,
          cookTime,
          difficulty,
          cuisine,
          tags,
          imageUrl,
          createdAt,
          updatedAt
        )
      `, { count: 'exact' })
      .eq('memberId', memberId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(skip, skip + limit - 1);

    if (favoritesError) {
      console.error('查询收藏列表失败:', favoritesError);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    const total = count || 0;

    // 如果有收藏，查询对应的ingredients
    let favoritesWithIngredients = favorites || [];
    if (favorites && favorites.length > 0) {
      const recipeIds = favorites.map((fav: any) => fav.recipe.id);

      // 查询所有相关的ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
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

      if (ingredientsError) {
        console.error('查询食材失败:', ingredientsError);
      } else {
        // 按recipeId分组ingredients
        const ingredientsMap = new Map<string, any[]>();
        ingredients?.forEach((ing: any) => {
          if (!ingredientsMap.has(ing.recipeId)) {
            ingredientsMap.set(ing.recipeId, []);
          }
          ingredientsMap.get(ing.recipeId)!.push(ing);
        });

        // 组装数据
        favoritesWithIngredients = favorites.map((fav: any) => ({
          ...fav,
          recipe: {
            ...fav.recipe,
            ingredients: ingredientsMap.get(fav.recipe.id) || [],
          },
        }));
      }
    }

    return NextResponse.json({
      success: true,
      favorites: favoritesWithIngredients.map((fav: any) => ({
        id: fav.id,
        favoritedAt: fav.favoritedAt,
        notes: fav.notes,
        recipe: fav.recipe,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error getting favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
