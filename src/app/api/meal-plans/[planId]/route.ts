import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { mealPlanner } from '@/lib/services/meal-planner'

// DELETE /api/meal-plans/:planId - 删除食谱
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 查询食谱计划并验证权限
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: planId },
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
    })

    if (!mealPlan) {
      return NextResponse.json({ error: '食谱计划不存在' }, { status: 404 })
    }

    const isCreator = mealPlan.member.family.creatorId === session.user.id
    const isAdmin = mealPlan.member.family.members[0]?.role === 'ADMIN' || isCreator
    const isSelf = mealPlan.member.userId === session.user.id

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限删除该食谱计划' },
        { status: 403 }
      )
    }

    // 软删除
    await prisma.mealPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json(
      { message: '食谱计划删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('删除食谱计划失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
