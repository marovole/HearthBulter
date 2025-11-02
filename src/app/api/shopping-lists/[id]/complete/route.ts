import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { priceEstimator } from '@/lib/services/price-estimator';
import { z } from 'zod';

// 完成采购的验证 schema
const completeShoppingSchema = z.object({
  actualCost: z.number().min(0).optional(), // 实际花费（元）
});

// PATCH /api/shopping-lists/:id/complete - 完成采购
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json().catch(() => ({}));
    const validatedData = completeShoppingSchema.parse(body);

    // 查询购物清单并验证权限
    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id: listId },
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

    if (!shoppingList) {
      return NextResponse.json({ error: '购物清单不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator =
      shoppingList.plan.member.family.creatorId === session.user.id;
    const isAdmin =
      shoppingList.plan.member.family.members[0]?.role === 'ADMIN' ||
      isCreator;
    const isSelf = shoppingList.plan.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限完成该购物清单' },
        { status: 403 }
      );
    }

    // 更新清单状态和实际花费
    const updatedList = await prisma.shoppingList.update({
      where: { id: listId },
      data: {
        status: 'COMPLETED',
        actualCost: validatedData.actualCost || shoppingList.actualCost,
      },
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
    });

    // 如果提供了实际花费，更新价格估算器的记录
    if (validatedData.actualCost !== undefined) {
      await priceEstimator.updateActualCost(listId, validatedData.actualCost);
    }

    // 生成价格趋势建议
    let priceAdvice: string | undefined;
    if (
      updatedList.estimatedCost !== null &&
      updatedList.actualCost !== null
    ) {
      priceAdvice = priceEstimator.getPriceTrendAdvice(
        updatedList.estimatedCost,
        updatedList.actualCost
      );
    }

    return NextResponse.json(
      {
        message: '购物清单已完成',
        shoppingList: updatedList,
        priceAdvice,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('完成购物清单失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

