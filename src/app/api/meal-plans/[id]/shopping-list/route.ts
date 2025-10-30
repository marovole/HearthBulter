import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { listGenerator } from '@/lib/services/list-generator'
import { priceEstimator } from '@/lib/services/price-estimator'
import { z } from 'zod'

// 生成购物清单的验证 schema
const createShoppingListSchema = z.object({
  budget: z.number().min(0).optional(), // 预算（元）
})

// POST /api/meal-plans/:id/shopping-list - 生成购物清单
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    // 查询食谱计划并验证权限
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
    })

    if (!plan) {
      return NextResponse.json({ error: '食谱计划不存在' }, { status: 404 })
    }

    // 验证权限
    const isCreator = plan.member.family.creatorId === session.user.id
    const isAdmin =
      plan.member.family.members[0]?.role === 'ADMIN' || isCreator
    const isSelf = plan.member.userId === session.user.id

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限为该食谱生成购物清单' },
        { status: 403 }
      )
    }

    // 检查是否已存在购物清单
    const existingList = await prisma.shoppingList.findFirst({
      where: { planId },
    })

    if (existingList) {
      return NextResponse.json(
        { error: '该食谱计划已有购物清单', shoppingListId: existingList.id },
        { status: 409 }
      )
    }

    // 解析请求体（预算）
    const body = await request.json().catch(() => ({}))
    const validatedData = createShoppingListSchema.parse(body)

    // 生成购物清单数据
    const generatedList = await listGenerator.generateShoppingList(planId)

    // 估算价格
    const priceEstimates = await priceEstimator.estimatePrices(
      generatedList.items.map((item) => ({
        foodId: item.foodId,
        amount: item.totalAmount,
      }))
    )

    // 计算总估算成本
    const totalEstimatedCost = priceEstimator.calculateTotalCost(priceEstimates)

    // 检查预算
    const budgetCheck = priceEstimator.checkBudget(
      totalEstimatedCost,
      validatedData.budget || null
    )

    // 创建购物清单
    const shoppingList = await prisma.shoppingList.create({
      data: {
        planId,
        budget: validatedData.budget || null,
        estimatedCost: totalEstimatedCost,
        status: 'PENDING',
        items: {
          create: generatedList.items.map((item) => {
            const estimate = priceEstimates.find((e) => e.foodId === item.foodId)
            return {
              foodId: item.foodId,
              amount: item.totalAmount,
              category: item.category,
              estimatedPrice: estimate?.estimatedPrice || null,
            }
          }),
        },
      },
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: '购物清单生成成功',
        shoppingList,
        budgetCheck,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      )
    }

    console.error('生成购物清单失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

