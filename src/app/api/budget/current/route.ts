import { NextRequest, NextResponse } from 'next/server';
import { budgetRepository } from '@/lib/repositories/budget-repository-singleton';
import type { FoodCategory } from '@/lib/repositories/types/budget';

/**
 * GET /api/budget/current
 * 获取预算状态
 *
 * 使用双写框架迁移 - Repository 已包含所有计算逻辑
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const budgetId = searchParams.get('budgetId');

    if (!memberId && !budgetId) {
      return NextResponse.json(
        { error: '必须提供memberId或budgetId参数' },
        { status: 400 }
      );
    }

    let targetBudgetId: string;

    // 如果提供了budgetId，直接使用
    if (budgetId) {
      targetBudgetId = budgetId;
    } else {
      // 如果只提供了memberId，获取当前活跃预算
      const budgets = await budgetRepository.decorateMethod(
        'listBudgets',
        memberId!,
        { status: 'ACTIVE' },
        { offset: 0, limit: 1 }
      );

      if (!budgets.items || budgets.items.length === 0) {
        return NextResponse.json(
          { error: '没有找到活跃的预算' },
          { status: 404 }
        );
      }

      targetBudgetId = budgets.items[0].id;
    }

    // 使用 Repository 获取完整的预算状态
    // getBudgetStatus 已包含所有计算：日均、预测、分类使用情况等
    const budgetStatus = await budgetRepository.decorateMethod('getBudgetStatus', targetBudgetId);

    // 生成警报（业务逻辑保留在端点层）
    const alerts: string[] = [];
    const usagePercentage = budgetStatus.budget.usagePercentage;

    if (usagePercentage >= 110 && budgetStatus.budget.alertThreshold110) {
      alerts.push('预算超支10%，请注意控制支出');
    } else if (usagePercentage >= 100 && budgetStatus.budget.alertThreshold100) {
      alerts.push('预算已用完，请控制支出');
    } else if (usagePercentage >= 80 && budgetStatus.budget.alertThreshold80) {
      alerts.push('预算已使用80%，接近限额');
    }

    // 构建响应，添加警报信息
    return NextResponse.json({
      ...budgetStatus,
      usedAmount: budgetStatus.budget.usedAmount,
      remainingAmount: budgetStatus.budget.remainingAmount,
      usagePercentage: budgetStatus.budget.usagePercentage,
      alerts,
    });
  } catch (error) {
    console.error('获取预算状态失败:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取预算状态失败' },
      { status: 500 }
    );
  }
}
