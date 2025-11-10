import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/recipes/[id]/favorite
 * 收藏食谱
 *
 * Migrated from Prisma to Supabase - Uses RPC function for atomic count updates
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const { memberId, notes } = await request.json();

    // 验证必需参数
    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing required parameter: memberId' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 检查食谱是否存在
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // 创建收藏记录
    const { data: favorite, error: favoriteError } = await supabase
      .from('recipe_favorites')
      .insert({
        recipeId,
        memberId,
        notes: notes || null,
        favoritedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (favoriteError) {
      // 如果是重复收藏（违反唯一约束），返回现有记录
      if (favoriteError.code === '23505') {
        const { data: existingFavorite } = await supabase
          .from('recipe_favorites')
          .select('*')
          .eq('recipeId', recipeId)
          .eq('memberId', memberId)
          .single();

        return NextResponse.json({
          success: true,
          favorite: existingFavorite,
          message: 'Recipe already favorited',
        });
      }

      console.error('Error favoriting recipe:', favoriteError);
      return NextResponse.json(
        { error: 'Failed to favorite recipe' },
        { status: 500 }
      );
    }

    // 使用 RPC 函数更新食谱收藏计数
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_recipe_favorite_count', { p_recipe_id: recipeId });

    if (updateError) {
      console.error('Error updating favorite count:', updateError);
      // 不阻止请求，只记录错误
    }

    return NextResponse.json({
      success: true,
      favorite,
    });

  } catch (error) {
    console.error('Error favoriting recipe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[id]/favorite
 * 取消收藏食谱
 *
 * Migrated from Prisma to Supabase - Uses RPC function for atomic count updates
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 删除收藏记录
    const { error: deleteError } = await supabase
      .from('recipe_favorites')
      .delete()
      .eq('recipeId', recipeId)
      .eq('memberId', memberId);

    if (deleteError) {
      console.error('Error unfavoriting recipe:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unfavorite recipe' },
        { status: 500 }
      );
    }

    // 使用 RPC 函数更新食谱收藏计数
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_recipe_favorite_count', { p_recipe_id: recipeId });

    if (updateError) {
      console.error('Error updating favorite count:', updateError);
      // 不阻止请求，只记录错误
    }

    return NextResponse.json({
      success: true,
      message: 'Recipe unfavorited successfully',
    });

  } catch (error) {
    console.error('Error unfavoriting recipe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recipes/[id]/favorite
 * 检查食谱收藏状态
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 检查是否已收藏
    const { data: favorite, error } = await supabase
      .from('recipe_favorites')
      .select('*')
      .eq('recipeId', recipeId)
      .eq('memberId', memberId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error checking favorite status:', error);
      return NextResponse.json(
        { error: 'Failed to check favorite status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isFavorited: !!favorite,
      favorite,
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
