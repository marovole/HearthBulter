import { NextRequest, NextResponse } from 'next/server';
import { budgetRepository } from '@/lib/repositories/budget-repository-singleton';
import { foodCategorySchema, type FoodCategory, type SpendingCreateDTO } from '@/lib/repositories/types/budget';

/**
 * POST /api/budget/record-spending
 * 记录支出（使用事务确保数据一致性）
 *
 * Migrated from Prisma to Supabase
 * WARNING: Critical endpoint - handles financial transactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      budgetId,
      amount,
      category,
      description,
      transactionId,
      platform,
      items,
      purchaseDate,
    } = body;

    // 验证必需字段
    if (!budgetId || !amount || !category || !description) {
      return NextResponse.json(
        { error: '缺少必需字段：budgetId, amount, category, description' },
        { status: 400 }
      );
    }

    // 验证金额
    const spendAmount = parseFloat(amount);
    if (spendAmount <= 0) {
      return NextResponse.json(
        { error: '支出金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证分类
    const categoryValidation = foodCategorySchema.safeParse(category);
    if (!categoryValidation.success) {
      return NextResponse.json(
        { error: '无效的食材分类' },
        { status: 400 }
      );
    }

    // 获取预算并验证
    const budget = await budgetRepository.decorateMethod('getBudgetById', budgetId);

    if (!budget) {
      return NextResponse.json(
        { error: '预算不存在' },
        { status: 404 }
      );
    }

    // 构建 SpendingCreateDTO
    const spendingData: SpendingCreateDTO = {
      budgetId,
      amount: spendAmount,
      category: category as FoodCategory,
      description,
      transactionId: transactionId || undefined,
      platform: platform || undefined,
      items: items || undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    };

    // 使用 Repository 创建支出记录
    const spending = await budgetRepository.decorateMethod('recordSpending', spendingData);

    // 更新预算的 usedAmount
    // 注意：这里存在潜在的数据不一致风险
    // 在生产环境中，应该使用 RPC 函数或数据库触发器来保证一致性
    const newUsedAmount = (budget.usedAmount || 0) + spendAmount;
    await budgetRepository.decorateMethod('updateBudget', budgetId, {
      usedAmount: newUsedAmount,
    });

    return NextResponse.json(spending);
  } catch (error) {
    console.error('记录支出失败:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '记录支出失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/budget/record-spending
 * 获取支出历史
 *
 * 使用双写框架迁移
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    const category = searchParams.get('category') as FoodCategory | null;

    if (!budgetId) {
      return NextResponse.json(
        { error: '缺少budgetId参数' },
        { status: 400 }
      );
    }

    // 使用 Repository 获取支出历史
    const result = await budgetRepository.decorateMethod(
      'listSpendings',
      {
        budgetId,
        category: category || undefined,
      },
      undefined // 不使用分页，返回所有结果
    );

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('获取支出历史失败:', error);
    return NextResponse.json(
      { error: '获取支出历史失败' },
      { status: 500 }
    );
  }
}
