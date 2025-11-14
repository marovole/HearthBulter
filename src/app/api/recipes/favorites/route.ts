import { NextRequest, NextResponse } from 'next/server';
import { recipeRepository } from '@/lib/repositories/recipe-repository-singleton';
import type { GetFavoritesQuery } from '@/lib/repositories/interfaces/recipe-repository';

/**
 * GET /api/recipes/favorites - 获取收藏的食谱列表
 *
 * 使用双写框架迁移
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') as 'favoritedAt' | 'name' || 'favoritedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const query: GetFavoritesQuery = {
      memberId,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    // 使用 Repository 获取收藏列表
    const result = await recipeRepository.decorateMethod('getFavoritesByMember', query);

    return NextResponse.json({
      success: true,
      favorites: result.favorites,
      pagination: result.pagination,
    });

  } catch (error) {
    console.error('Error getting favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
