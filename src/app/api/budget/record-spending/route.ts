import { NextRequest, NextResponse } from 'next/server'
import { budgetTracker } from '@/lib/services/budget/budget-tracker'
import { FoodCategory } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      budgetId,
      amount,
      category,
      description,
      transactionId,
      platform,
      items,
      purchaseDate
    } = body

    // 验证必需字段
    if (!budgetId || !amount || !category || !description) {
      return NextResponse.json(
        { error: '缺少必需字段：budgetId, amount, category, description' },
        { status: 400 }
      )
    }

    // 验证金额
    if (amount <= 0) {
      return NextResponse.json(
        { error: '支出金额必须大于0' },
        { status: 400 }
      )
    }

    // 验证分类
    if (!Object.values(FoodCategory).includes(category)) {
      return NextResponse.json(
        { error: '无效的食材分类' },
        { status: 400 }
      )
    }

    // 记录支出
    const spending = await budgetTracker.recordSpending({
      budgetId,
      amount: parseFloat(amount),
      category,
      description,
      transactionId,
      platform,
      items,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined
    })

    return NextResponse.json(spending)
  } catch (error) {
    console.error('记录支出失败:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '记录支出失败' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const budgetId = searchParams.get('budgetId')
    const category = searchParams.get('category')

    if (!budgetId) {
      return NextResponse.json(
        { error: '缺少budgetId参数' },
        { status: 400 }
      )
    }

    const spendings = await budgetTracker.getSpendingHistory(
      budgetId,
      category as FoodCategory
    )

    return NextResponse.json(spendings)
  } catch (error) {
    console.error('获取支出历史失败:', error)
    return NextResponse.json(
      { error: '获取支出历史失败' },
      { status: 500 }
    )
  }
}
