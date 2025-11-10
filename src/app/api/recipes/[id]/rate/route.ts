import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/recipes/[id]/rate
 * 评分食谱
 *
 * Migrated from Prisma to Supabase - Uses RPC function for atomic rating updates
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const { memberId, rating, comment, tags } = await request.json();

    // 验证必需参数
    if (!memberId || !rating) {
      return NextResponse.json(
        { error: 'Missing required parameters: memberId and rating' },
        { status: 400 }
      );
    }

    // 验证评分范围
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
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

    // 创建或更新评分 - Supabase 可以直接存储数组
    const ratingData = {
      recipeId,
      memberId,
      rating,
      comment: comment || null,
      tags: tags || [],
      ratedAt: new Date().toISOString(),
    };

    const { data: recipeRating, error: ratingError } = await supabase
      .from('recipe_ratings')
      .upsert(ratingData, {
        onConflict: 'recipeId,memberId',
      })
      .select()
      .single();

    if (ratingError) {
      console.error('Error rating recipe:', ratingError);
      return NextResponse.json(
        { error: 'Failed to rate recipe' },
        { status: 500 }
      );
    }

    // 使用 RPC 函数更新食谱的平均评分和评分数量
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_recipe_average_rating', { p_recipe_id: recipeId });

    if (updateError) {
      console.error('Error updating average rating:', updateError);
      // 不阻止请求，只记录错误
    }

    return NextResponse.json({
      success: true,
      rating: recipeRating,
    });

  } catch (error) {
    console.error('Error rating recipe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recipes/[id]/rate
 * 获取用户对食谱的评分
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

    // 获取用户评分
    const { data: rating, error } = await supabase
      .from('recipe_ratings')
      .select('*')
      .eq('recipeId', recipeId)
      .eq('memberId', memberId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error getting recipe rating:', error);
      return NextResponse.json(
        { error: 'Failed to get recipe rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rating: rating ? {
        ...rating,
        tags: Array.isArray(rating.tags) ? rating.tags : (rating.tags ? JSON.parse(rating.tags as string) : []),
      } : null,
    });

  } catch (error) {
    console.error('Error getting recipe rating:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
