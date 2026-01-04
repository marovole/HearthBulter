import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mealPlanner } from '@/lib/services/meal-planner';

/**
 * PATCH /api/meal-plans/:planId/meals/:mealId
 *
 * Note: 保留服务层调用
 * 此端点使用智能餐食替换算法，涉及：
 * - 营养相似度计算
 * - 食材可替代性分析
 * - 保持整体营养平衡
 * 这些复杂逻辑应保持在 mealPlanner 服务层
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; mealId: string }> },
) {
  try {
    const { planId, mealId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 查询餐食和食谱计划，验证权限
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

    if (meal.planId !== planId) {
      return NextResponse.json(
        { error: '餐食不属于指定的食谱计划' },
        { status: 400 },
      );
    }

    const isCreator = meal.plan.member.family.creatorId === session.user.id;
    const isAdmin =
      meal.plan.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = meal.plan.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: '无权限替换此餐食' }, { status: 403 });
    }

    // 替换餐食
    const replacedMeal = await mealPlanner.replaceMeal(
      mealId,
      meal.plan.memberId,
    );

    return NextResponse.json(
      {
        message: '餐食替换成功',
        meal: replacedMeal,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === '餐食不存在') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === '无权限替换此餐食') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === '未找到合适的替代餐食') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    console.error('替换餐食失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
