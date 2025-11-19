import { NextRequest, NextResponse } from 'next/server';
import { budgetRepository } from '@/lib/repositories/budget-repository-singleton';
import { budgetPeriodSchema, type BudgetPeriod, type BudgetStatus, type BudgetCreateDTO } from '@/lib/repositories/types/budget';

/**
 * POST /api/budget/set
 * 创建预算
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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
      seafoodBudget,
      oilsBudget,
      snacksBudget,
      beveragesBudget,
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
    const periodValidation = budgetPeriodSchema.safeParse(period);
    if (!periodValidation.success) {
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

    // 验证日期范围
    if (end <= start) {
      return NextResponse.json(
        { error: '结束日期必须晚于开始日期' },
        { status: 400 }
      );
    }

    // 验证金额
    const total = parseFloat(totalAmount);
    if (total <= 0) {
      return NextResponse.json(
        { error: '总预算必须大于0' },
        { status: 400 }
      );
    }

    // 构建分类预算 (使用正确的复数形式键名以匹配 Repository)
    const categoryBudgets: any = {};
    if (vegetableBudget) categoryBudgets.VEGETABLES = parseFloat(vegetableBudget);
    if (meatBudget) categoryBudgets.PROTEIN = parseFloat(meatBudget);
    if (fruitBudget) categoryBudgets.FRUITS = parseFloat(fruitBudget);
    if (grainBudget) categoryBudgets.GRAINS = parseFloat(grainBudget);
    if (dairyBudget) categoryBudgets.DAIRY = parseFloat(dairyBudget);
    if (seafoodBudget) categoryBudgets.SEAFOOD = parseFloat(seafoodBudget);
    if (oilsBudget) categoryBudgets.OILS = parseFloat(oilsBudget);
    if (snacksBudget) categoryBudgets.SNACKS = parseFloat(snacksBudget);
    if (beveragesBudget) categoryBudgets.BEVERAGES = parseFloat(beveragesBudget);
    if (otherBudget) categoryBudgets.OTHER = parseFloat(otherBudget);

    // 验证分类预算总和不超过总预算
    const categoryTotal = Object.values(categoryBudgets).reduce(
      (sum: number, val) => sum + (val as number),
      0
    );

    if (categoryTotal > total) {
      return NextResponse.json(
        { error: '分类预算总和不能超过总预算' },
        { status: 400 }
      );
    }

    // 构建 BudgetCreateDTO
    const budgetCreateData: BudgetCreateDTO = {
      memberId,
      name,
      period: period as BudgetPeriod,
      startDate: start,
      endDate: end,
      totalAmount: total,
      categoryBudgets: Object.keys(categoryBudgets).length > 0 ? categoryBudgets : undefined,
      alertThreshold80: alertThreshold80 !== undefined ? alertThreshold80 : true,
      alertThreshold100: alertThreshold100 !== undefined ? alertThreshold100 : true,
      alertThreshold110: alertThreshold110 !== undefined ? alertThreshold110 : true,
    };

    // 使用 Repository 创建预算
    const budget = await budgetRepository.createBudget(budgetCreateData);

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

/**
 * GET /api/budget/set
 * 获取预算列表
 *
 * 使用双写框架迁移
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status') as BudgetStatus | null;

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少memberId参数' },
        { status: 400 }
      );
    }

    // 使用 Repository 获取预算列表
    const result = await budgetRepository.listBudgets(
      memberId,
      status ? { status } : undefined,
      undefined // 不使用分页，返回所有结果
    );

    return NextResponse.json(result.items || []);
  } catch (error) {
    console.error('获取预算列表失败:', error);
    return NextResponse.json(
      { error: '获取预算列表失败' },
      { status: 500 }
    );
  }
}
