import { NextRequest, NextResponse } from 'next/server';
import { budgetTracker } from '@/lib/services/budget/budget-tracker';
import { BudgetPeriod } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      memberId,
      name,
      period,
      startDate,
      endDate,
      totalAmount,
      vegetableBudget,
      meatBudget,
      fruitBudget,
      grainBudget,
      dairyBudget,
      otherBudget,
      alertThreshold80,
      alertThreshold100,
      alertThreshold110,
    } = body;

    // 验证必需字段
    if (!memberId || !name || !period || !startDate || !endDate || !totalAmount) {
      return NextResponse.json(
        { error: '缺少必需字段' },
        { status: 400 }
      );
    }

    // 验证预算周期
    if (!Object.values(BudgetPeriod).includes(period)) {
      return NextResponse.json(
        { error: '无效的预算周期' },
        { status: 400 }
      );
    }

    // 验证日期格式
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: '无效的日期格式' },
        { status: 400 }
      );
    }

    // 验证金额
    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: '总预算必须大于0' },
        { status: 400 }
      );
    }

    // 创建预算
    const budget = await budgetTracker.createBudget({
      memberId,
      name,
      period,
      startDate: start,
      endDate: end,
      totalAmount: parseFloat(totalAmount),
      vegetableBudget: vegetableBudget ? parseFloat(vegetableBudget) : undefined,
      meatBudget: meatBudget ? parseFloat(meatBudget) : undefined,
      fruitBudget: fruitBudget ? parseFloat(fruitBudget) : undefined,
      grainBudget: grainBudget ? parseFloat(grainBudget) : undefined,
      dairyBudget: dairyBudget ? parseFloat(dairyBudget) : undefined,
      otherBudget: otherBudget ? parseFloat(otherBudget) : undefined,
      alertThreshold80: alertThreshold80 !== undefined ? alertThreshold80 : true,
      alertThreshold100: alertThreshold100 !== undefined ? alertThreshold100 : true,
      alertThreshold110: alertThreshold110 !== undefined ? alertThreshold110 : true,
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error('创建预算失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '创建预算失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    const budgets = await budgetTracker.getUserBudgets(
      memberId,
      status as any
    );

    return NextResponse.json(budgets);
  } catch (error) {
    console.error('获取预算列表失败:', error);
    return NextResponse.json(
      { error: '获取预算列表失败' },
      { status: 500 }
    );
  }
}
