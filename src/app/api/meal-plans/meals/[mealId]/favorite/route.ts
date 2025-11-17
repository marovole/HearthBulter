import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/meal-plans/meals/:mealId/favorite - 切换收藏状态

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { isFavorite } = body;

    // 验证餐食权限
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        plan: {
          include: {
            member: {
              include: {
                family: {
                  select: {
                    creatorId: true,
                    members: {
                      where: { userId: session.user.id, deletedAt: null },
                      select: { role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: '餐食不存在' }, { status: 404 });
    }

    const isCreator = meal.plan.member.family.creatorId === session.user.id;
    const isAdmin = meal.plan.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = meal.plan.member.userId === session.user.id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    // 更新收藏状态
    const updatedMeal = await prisma.meal.update({
      where: { id: mealId },
      data: { isFavorite },
    });

    return NextResponse.json({
      message: isFavorite ? '已添加到收藏' : '已取消收藏',
      isFavorite: updatedMeal.isFavorite,
    }, { status: 200 });

  } catch (error) {
    console.error('更新收藏状态失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// GET /api/meal-plans/meals/:mealId/favorite - 获取收藏状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证餐食权限
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      select: { isFavorite: true },
      include: {
        plan: {
          include: {
            member: {
              include: {
                family: {
                  select: {
                    creatorId: true,
                    members: {
                      where: { userId: session.user.id, deletedAt: null },
                      select: { role: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!meal) {
      return NextResponse.json({ error: '餐食不存在' }, { status: 404 });
    }

    const isCreator = meal.plan.member.family.creatorId === session.user.id;
    const isAdmin = meal.plan.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = meal.plan.member.userId === session.user.id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    return NextResponse.json({
      isFavorite: meal.isFavorite,
    }, { status: 200 });

  } catch (error) {
    console.error('获取收藏状态失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
