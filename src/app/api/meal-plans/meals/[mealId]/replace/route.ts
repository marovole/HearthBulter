import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { mealPlanner } from '@/lib/services/meal-planner'

// POST /api/meal-plans/meals/:mealId/replace
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 加载餐食并校验权限
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
    })

    if (!meal) {
      return NextResponse.json({ error: '餐食不存在' }, { status: 404 })
    }

    const isCreator = meal.plan.member.family.creatorId === session.user.id
    const isAdmin = meal.plan.member.family.members[0]?.role === 'ADMIN' || isCreator
    const isSelf = meal.plan.member.userId === session.user.id
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 })
    }

    const replaced = await mealPlanner.replaceMeal(mealId, meal.plan.memberId)
    return NextResponse.json({ message: '替换成功', meal: replaced }, { status: 200 })
  } catch (error) {
    console.error('替换餐食失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
