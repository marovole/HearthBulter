import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const days = parseInt(searchParams.get('days') || '30');

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取浏览历史
    const views = await prisma.recipeView.findMany({
      where: {
        memberId,
        viewedAt: {
          gte: startDate
        }
      },
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
        viewedAt: 'desc'
      },
      skip,
      take: limit
    });

    // 获取总数
    const total = await prisma.recipeView.count({
      where: {
        memberId,
        viewedAt: {
          gte: startDate
        }
      }
    });

    return NextResponse.json({
      success: true,
      views: views.map(view => ({
        id: view.id,
        viewedAt: view.viewedAt,
        viewDuration: view.viewDuration,
        source: view.source,
        recipe: view.recipe
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting recipe history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { memberId, recipeId, viewDuration, source } = await request.json();

    // 验证必需参数
    if (!memberId || !recipeId) {
      return NextResponse.json(
        { error: 'Missing required parameters: memberId and recipeId' },
        { status: 400 }
      );
    }

    // 检查食谱是否存在
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // 创建浏览记录
    const view = await prisma.recipeView.create({
      data: {
        memberId,
        recipeId,
        viewDuration: viewDuration || null,
        source: source || 'direct'
      }
    });

    // 更新食谱浏览计数
    await updateRecipeViewCount(recipeId);

    return NextResponse.json({
      success: true,
      view
    });

  } catch (error) {
    console.error('Error recording recipe view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateRecipeViewCount(recipeId: string) {
  const count = await prisma.recipeView.count({
    where: { recipeId }
  });

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { viewCount: count }
  });
}
