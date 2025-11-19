import { NextRequest, NextResponse } from 'next/server';
import { recipeRepository } from '@/lib/repositories/recipe-repository-singleton';
import { updateRecipeAverageRating } from '@/lib/db/supabase-rpc-helpers';

/**
 * POST /api/recipes/[id]/rate
 * 评分食谱
 *
 * 使用双写框架迁移 - 保留 RPC 函数用于原子性评分更新
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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

    // 检查食谱是否存在
    const recipeExists = await recipeRepository.recipeExists( recipeId);
    if (!recipeExists) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // 使用 Repository 添加或更新评分
    const recipeRating = await recipeRepository.addOrUpdateRating( {
      recipeId,
      memberId,
      rating,
      comment,
      tags,
    });

    // 使用 RPC 函数更新食谱的平均评分和评分数量
    const ratingUpdate = await updateRecipeAverageRating(recipeId);

    if (!ratingUpdate.success) {
      console.error('Error updating average rating:', ratingUpdate.error);
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
 * 使用双写框架迁移
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

    // 使用 Repository 获取评分
    const rating = await recipeRepository.getRating( recipeId, memberId);

    return NextResponse.json({
      success: true,
      rating,
    });

  } catch (error) {
    console.error('Error getting recipe rating:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
