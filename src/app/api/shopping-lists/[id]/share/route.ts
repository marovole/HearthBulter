import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

// POST /api/shopping-lists/:id/share - 生成分享链接
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

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
        items: {
          include: {
            food: true,
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
        { error: '无权限分享该购物清单' },
        { status: 403 }
      );
    }

    // 生成分享令牌
    const shareToken = randomBytes(32).toString('hex');
    const shareExpiry = new Date();
    shareExpiry.setDate(shareExpiry.getDate() + 7); // 7天后过期

    // 保存分享令牌
    await prisma.shoppingListShare.create({
      data: {
        listId,
        token: shareToken,
        expiresAt: shareExpiry,
        createdBy: session.user.id,
      },
    });

    // 生成分享URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/shopping-list/${shareToken}`;

    return NextResponse.json({
      shareUrl,
      expiresAt: shareExpiry,
    });
  } catch (error) {
    console.error('生成分享链接失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
