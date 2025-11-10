import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { BudgetStatus, FoodCategory } from '@/lib/repositories/types/budget';

/**
 * GET /api/budget/current
 * 获取预算状态
 *
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();

    let targetBudgetId: string;

    // 如果提供了budgetId，直接使用
    if (budgetId) {
      targetBudgetId = budgetId;
    } else {
      // 如果只提供了memberId，获取当前活跃预算
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('id')
        .eq('memberId', memberId!)
        .eq('status', 'ACTIVE')
        .order('createdAt', { ascending: false })
        .limit(1);

      if (budgetsError || !budgets || budgets.length === 0) {
        return NextResponse.json(
          { error: '没有找到活跃的预算' },
          { status: 404 }
        );
      }

      targetBudgetId = budgets[0].id;
    }

    // 获取预算详情
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', targetBudgetId)
      .single();

    if (budgetError || !budget) {
      return NextResponse.json(
        { error: '预算不存在' },
        { status: 404 }
      );
    }

    // 获取支出记录
    const { data: spendings, error: spendingsError } = await supabase
      .from('spendings')
      .select('amount, category')
      .eq('budgetId', targetBudgetId);

    if (spendingsError) {
      console.error('获取支出记录失败:', spendingsError);
      return NextResponse.json(
        { error: '获取支出记录失败' },
        { status: 500 }
      );
    }

    // 计算预算状态
    const usedAmount = (spendings || []).reduce((sum, s) => sum + s.amount, 0);
    const remainingAmount = budget.totalAmount - usedAmount;
    const usagePercentage = (usedAmount / budget.totalAmount) * 100;

    // 计算分类使用情况
    const categoryUsage: any = {};
    const categoryBudgets = budget.categoryBudgets as any || {};

    // 初始化所有分类
    const categories: FoodCategory[] = [
      'VEGETABLE', 'MEAT', 'FRUIT', 'GRAIN', 'DAIRY',
      'SEAFOOD', 'OILS', 'SNACKS', 'BEVERAGES', 'OTHER'
    ];

    for (const category of categories) {
      const budgetAmount = categoryBudgets[category] || 0;
      if (budgetAmount > 0) {
        const used = (spendings || [])
          .filter((s) => s.category === category)
          .reduce((sum, s) => sum + s.amount, 0);

        categoryUsage[category] = {
          budget: budgetAmount,
          used,
          remaining: budgetAmount - used,
          percentage: (used / budgetAmount) * 100,
        };
      }
    }

    // 计算日均和预测
    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);
    const now = new Date();

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const dailyAverage = daysElapsed > 0 ? usedAmount / daysElapsed : 0;
    const projectedSpend = dailyAverage * totalDays;

    // 生成警报
    const alerts: string[] = [];
    if (usagePercentage >= 110 && budget.alertThreshold110) {
      alerts.push('预算超支10%，请注意控制支出');
    } else if (usagePercentage >= 100 && budget.alertThreshold100) {
      alerts.push('预算已用完，请控制支出');
    } else if (usagePercentage >= 80 && budget.alertThreshold80) {
      alerts.push('预算已使用80%，接近限额');
    }

    const budgetStatus = {
      budget,
      usedAmount,
      remainingAmount,
      usagePercentage,
      categoryUsage,
      dailyAverage,
      daysRemaining,
      projectedSpend,
      alerts,
    };

    return NextResponse.json(budgetStatus);
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
