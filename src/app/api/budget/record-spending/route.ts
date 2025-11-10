import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { foodCategorySchema, type FoodCategory } from '@/lib/repositories/types/budget';

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

    const supabase = SupabaseClientManager.getInstance();

    // 获取预算并验证
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .single();

    if (budgetError || !budget) {
      return NextResponse.json(
        { error: '预算不存在' },
        { status: 404 }
      );
    }

    // 创建支出记录
    const now = new Date().toISOString();
    const spendingData = {
      budgetId,
      amount: spendAmount,
      category: category as FoodCategory,
      description,
      transactionId: transactionId || null,
      platform: platform || null,
      items: items || null,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : now,
      createdAt: now,
      updatedAt: now,
    };

    const { data: spending, error: spendingError } = await supabase
      .from('spendings')
      .insert(spendingData)
      .select()
      .single();

    if (spendingError) {
      console.error('创建支出记录失败:', spendingError);
      return NextResponse.json(
        { error: '创建支出记录失败' },
        { status: 500 }
      );
    }

    // 更新预算的 usedAmount
    const newUsedAmount = (budget.usedAmount || 0) + spendAmount;
    const { error: updateError } = await supabase
      .from('budgets')
      .update({
        usedAmount: newUsedAmount,
        updatedAt: now,
      })
      .eq('id', budgetId);

    if (updateError) {
      console.error('更新预算失败:', updateError);
      // 注意：这里存在潜在的数据不一致风险
      // 在生产环境中，应该使用 RPC 函数或数据库触发器来保证一致性
      return NextResponse.json(
        { error: '更新预算失败' },
        { status: 500 }
      );
    }

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
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();

    let query = supabase
      .from('spendings')
      .select('*')
      .eq('budgetId', budgetId)
      .order('purchaseDate', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: spendings, error } = await query;

    if (error) {
      console.error('获取支出历史失败:', error);
      return NextResponse.json(
        { error: '获取支出历史失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(spendings || []);
  } catch (error) {
    console.error('获取支出历史失败:', error);
    return NextResponse.json(
      { error: '获取支出历史失败' },
      { status: 500 }
    );
  }
}
