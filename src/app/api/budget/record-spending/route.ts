import { NextRequest, NextResponse } from 'next/server';
import { budgetRepository } from '@/lib/repositories/budget-repository-singleton';
import {
  foodCategorySchema,
  type FoodCategory,
  type SpendingCreateDTO,
} from '@/lib/repositories/types/budget';

/**
 * POST /api/budget/record-spending
 * 记录支出（使用事务确保数据一致性）
 *
 * Migrated from Prisma to Supabase
 * WARNING: Critical endpoint - handles financial transactions
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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
        { status: 400 },
      );
    }

    // 验证金额
    const spendAmount = parseFloat(amount);
    if (spendAmount <= 0) {
      return NextResponse.json({ error: '支出金额必须大于0' }, { status: 400 });
    }

    // 验证分类
    const categoryValidation = foodCategorySchema.safeParse(category);
    if (!categoryValidation.success) {
      return NextResponse.json({ error: '无效的食材分类' }, { status: 400 });
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
    // Repository 内部调用 record_spending_tx RPC 函数，确保：
    // - 原子性：支出创建 + 预算更新在同一事务中
    // - 验证：预算存在性、总预算和分类预算限制
    // - 预警：自动生成 80%、100%、110% 预警
    const spending = await budgetRepository.recordSpending(spendingData);

    return NextResponse.json(spending);
  } catch (error) {
    console.error('记录支出失败:', error);

    if (error instanceof Error) {
      // 根据 RPC 函数返回的错误类型，映射到合适的 HTTP 状态码
      const message = error.message;

      if (
        message.includes('BUDGET_NOT_FOUND') ||
        message.includes('预算不存在')
      ) {
        return NextResponse.json(
          { error: '预算不存在或已不活跃' },
          { status: 404 },
        );
      }

      if (
        message.includes('DATE_OUT_OF_RANGE') ||
        message.includes('不在预算周期内')
      ) {
        return NextResponse.json(
          { error: '支出日期不在预算周期内' },
          { status: 400 },
        );
      }

      if (message.includes('BUDGET_EXCEEDED') || message.includes('超出预算')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      if (
        message.includes('CATEGORY_LIMIT_EXCEEDED') ||
        message.includes('分类预算')
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }

      if (message.includes('ID 与请求不一致')) {
        return NextResponse.json(
          { error: '系统错误：预算 ID 不一致' },
          { status: 500 },
        );
      }

      // 其他错误
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: '记录支出失败' }, { status: 500 });
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
      return NextResponse.json({ error: '缺少budgetId参数' }, { status: 400 });
    }

    // 使用 Repository 获取支出历史
    const result = await budgetRepository.listSpendings(
      {
        budgetId,
        category: category || undefined,
      },
      undefined, // 不使用分页，返回所有结果
    );

    return NextResponse.json(result.items || []);
  } catch (error) {
    console.error('获取支出历史失败:', error);
    return NextResponse.json({ error: '获取支出历史失败' }, { status: 500 });
  }
}
