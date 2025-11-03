import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recipeId = id;
    const { memberId, notes } = await request.json();

    // 验证必需参数
    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing required parameter: memberId' },
        { status: 400 }
      );
    }

    // 检查食谱是否存在
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // 创建收藏记录
    const favorite = await prisma.recipeFavorite.create({
      data: {
        recipeId,
        memberId,
        notes: notes || null,
      },
    });

    // 更新食谱收藏计数
    await updateRecipeFavoriteCount(recipeId);

    return NextResponse.json({
      success: true,
      favorite,
    });

  } catch (error) {
    // 如果是重复收藏，返回现有记录
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      const existingFavorite = await prisma.recipeFavorite.findUnique({
        where: {
          recipeId_memberId: {
            recipeId: id,
            memberId: (await request.json()).memberId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        favorite: existingFavorite,
        message: 'Recipe already favorited',
      });
    }

    console.error('Error favoriting recipe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recipeId = id;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    // 删除收藏记录
    const deletedFavorite = await prisma.recipeFavorite.delete({
      where: {
        recipeId_memberId: {
          recipeId,
          memberId,
        },
      },
    });

    // 更新食谱收藏计数
    await updateRecipeFavoriteCount(recipeId);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recipeId = id;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    // 检查是否已收藏
    const favorite = await prisma.recipeFavorite.findUnique({
      where: {
        recipeId_memberId: {
          recipeId,
          memberId,
        },
      },
    });

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

async function updateRecipeFavoriteCount(recipeId: string) {
  const count = await prisma.recipeFavorite.count({
    where: { recipeId },
  });

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { favoriteCount: count },
  });
}
