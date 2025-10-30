import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE /api/shopping-lists/:id - 删除购物清单
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
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
      },
    })

    if (!shoppingList) {
      return NextResponse.json({ error: '购物清单不存在' }, { status: 404 })
    }

    // 验证权限
    const isCreator =
      shoppingList.plan.member.family.creatorId === session.user.id
    const isAdmin =
      shoppingList.plan.member.family.members[0]?.role === 'ADMIN' ||
      isCreator
    const isSelf = shoppingList.plan.member.userId === session.user.id

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限删除该购物清单' },
        { status: 403 }
      )
    }

    // 删除购物清单（级联删除清单项）
    await prisma.shoppingList.delete({
      where: { id: listId },
    })

    return NextResponse.json(
      {
        message: '购物清单删除成功',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除购物清单失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

