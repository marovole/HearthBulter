import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { nutritionCalculator } from '@/lib/services/nutrition-calculator'

// GET /api/meal-plans/:planId/nutrition - 获取营养汇总
export async function GET(
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
        meals: {
          include: {
            ingredients: {
              include: {
                food: true,
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
        { error: '无权限查看该食谱的营养汇总' },
        { status: 403 }
      )
    }

    // 计算营养汇总
    const allIngredients = mealPlan.meals.flatMap((meal) =>
      meal.ingredients.map((ing) => ({
        foodId: ing.foodId,
        amount: ing.amount,
      }))
    )

    const nutrition = await nutritionCalculator.calculateBatch(allIngredients)

    // 计算每日平均值
    const days = Math.ceil(
      (mealPlan.endDate.getTime() - mealPlan.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1

    return NextResponse.json(
      {
        planId: mealPlan.id,
        total: {
          calories: nutrition.totalCalories,
          protein: nutrition.totalProtein,
          carbs: nutrition.totalCarbs,
          fat: nutrition.totalFat,
        },
        daily: {
          calories: Math.round(nutrition.totalCalories / days),
          protein: Math.round(nutrition.totalProtein / days),
          carbs: Math.round(nutrition.totalCarbs / days),
          fat: Math.round(nutrition.totalFat / days),
        },
        target: {
          calories: mealPlan.targetCalories,
          protein: mealPlan.targetProtein,
          carbs: mealPlan.targetCarbs,
          fat: mealPlan.targetFat,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取营养汇总失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
