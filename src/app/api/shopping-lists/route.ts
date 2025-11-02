import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/shopping-lists - 查询购物清单
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const status = searchParams.get('status');

    // 构建查询条件
    const where: any = {};

    if (planId) {
      // 验证权限：只有关联的家庭成员可以查询
      const plan = await prisma.mealPlan.findUnique({
        where: { id: planId, deletedAt: null },
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
      });

      if (!plan) {
        return NextResponse.json({ error: '食谱计划不存在' }, { status: 404 });
      }

      const isCreator = plan.member.family.creatorId === session.user.id;
      const isAdmin =
        plan.member.family.members[0]?.role === 'ADMIN' || isCreator;
      const isSelf = plan.member.userId === session.user.id;

      if (!isAdmin && !isSelf) {
        return NextResponse.json(
          { error: '无权限查看该购物清单' },
          { status: 403 }
        );
      }

      where.planId = planId;
    } else {
      // 如果没有指定 planId，只能查询当前用户相关的清单
      // 通过查找用户所属的家庭成员的食谱计划
      const userMembers = await prisma.familyMember.findMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      const memberIds = userMembers.map((m) => m.id);

      const plans = await prisma.mealPlan.findMany({
        where: {
          memberId: { in: memberIds },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      where.planId = { in: plans.map((p) => p.id) };
    }

    if (status) {
      where.status = status;
    }

    // 查询购物清单
    const shoppingLists = await prisma.shoppingList.findMany({
      where,
      include: {
        plan: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        items: {
          include: {
            food: true,
          },
          orderBy: [
            { category: 'asc' },
            { purchased: 'asc' },
            { food: { name: 'asc' } },
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ shoppingLists }, { status: 200 });
  } catch (error) {
    console.error('查询购物清单失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

