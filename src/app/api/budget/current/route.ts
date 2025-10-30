import { NextRequest, NextResponse } from 'next/server'
import { budgetTracker } from '@/lib/services/budget/budget-tracker'
import { BudgetStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const budgetId = searchParams.get('budgetId')

    if (!memberId && !budgetId) {
      return NextResponse.json(
        { error: '必须提供memberId或budgetId参数' },
        { status: 400 }
      )
    }

    // 如果提供了budgetId，获取特定预算状态
    if (budgetId) {
      const budgetStatus = await budgetTracker.getBudgetStatus(budgetId)
      return NextResponse.json(budgetStatus)
    }

    // 如果只提供了memberId，获取当前活跃预算
    const budgets = await budgetTracker.getUserBudgets(
      memberId!,
      BudgetStatus.ACTIVE
    )

    if (budgets.length === 0) {
      return NextResponse.json(
        { error: '没有找到活跃的预算' },
        { status: 404 }
      )
    }

    // 获取最新的活跃预算状态
    const currentBudget = budgets[0]
    const budgetStatus = await budgetTracker.getBudgetStatus(currentBudget.id)

    return NextResponse.json(budgetStatus)
  } catch (error) {
    console.error('获取预算状态失败:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '获取预算状态失败' },
      { status: 500 }
    )
  }
}
