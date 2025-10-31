import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // 获取收藏列表
    const favorites = await prisma.recipeFavorite.findMany({
      where: { memberId },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { food: true }
            }
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limit
    });

    // 获取总数
    const total = await prisma.recipeFavorite.count({
      where: { memberId }
    });

    return NextResponse.json({
      success: true,
      favorites: favorites.map(fav => ({
        id: fav.id,
        favoritedAt: fav.favoritedAt,
        notes: fav.notes,
        recipe: fav.recipe
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
