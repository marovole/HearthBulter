import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recipeId = id;
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
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // 创建或更新评分
    const recipeRating = await prisma.recipeRating.upsert({
      where: {
        recipeId_memberId: {
          recipeId,
          memberId,
        },
      },
      update: {
        rating,
        comment: comment || null,
        tags: JSON.stringify(tags || []),
        ratedAt: new Date(),
      },
      create: {
        recipeId,
        memberId,
        rating,
        comment: comment || null,
        tags: JSON.stringify(tags || []),
      },
    });

    // 更新食谱的平均评分
    await updateRecipeAverageRating(recipeId);

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

    // 获取用户评分
    const rating = await prisma.recipeRating.findUnique({
      where: {
        recipeId_memberId: {
          recipeId,
          memberId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      rating: rating ? {
        ...rating,
        tags: JSON.parse(rating.tags),
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

async function updateRecipeAverageRating(recipeId: string) {
  const ratings = await prisma.recipeRating.aggregate({
    where: { recipeId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      averageRating: ratings._avg.rating || 0,
      ratingCount: ratings._count.rating,
    },
  });
}
