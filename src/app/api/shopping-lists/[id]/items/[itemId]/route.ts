import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// PATCH /api/shopping-lists/:id/items/:itemId - 标记已购
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: listId, itemId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const purchased = body.purchased !== undefined ? body.purchased : true;

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
        { error: '无权限修改该购物清单' },
        { status: 403 }
      );
    }

    // 检查清单项是否存在
    const item = await prisma.shoppingItem.findUnique({
      where: { id: itemId, listId },
    });

    if (!item) {
      return NextResponse.json({ error: '清单项不存在' }, { status: 404 });
    }

    // 更新清单项
    const updatedItem = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: { purchased },
      include: {
        food: true,
      },
    });

    // 检查是否所有项都已购买，如果是则更新清单状态
    const allItems = await prisma.shoppingItem.findMany({
      where: { listId },
    });

    const allPurchased = allItems.every((item) => item.purchased);

    if (allPurchased && shoppingList.status !== 'COMPLETED') {
      await prisma.shoppingList.update({
        where: { id: listId },
        data: { status: 'COMPLETED' },
      });
    } else if (!allPurchased && shoppingList.status === 'PENDING') {
      await prisma.shoppingList.update({
        where: { id: listId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return NextResponse.json(
      {
        message: '清单项更新成功',
        item: updatedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新清单项失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

