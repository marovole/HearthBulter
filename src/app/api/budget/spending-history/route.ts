import { NextRequest, NextResponse } from 'next/server';
import { budgetRepository } from '@/lib/repositories/budget-repository-singleton';
import type { FoodCategory } from '@/lib/repositories/types/budget';

/**
 * GET /api/budget/spending-history
 * 获取支出历史
 *
 * 使用双写框架迁移 - 完全通过 Repository 层访问数据
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    const category = searchParams.get('category') as FoodCategory | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!budgetId) {
      return NextResponse.json({ error: '缺少budgetId参数' }, { status: 400 });
    }

    // 构建查询过滤器
    const filter = {
      budgetId,
      category: category || undefined,
      range:
        startDate || endDate
          ? {
              start: startDate ? new Date(startDate) : undefined,
              end: endDate ? new Date(endDate) : undefined,
            }
          : undefined,
    };

    // 获取所有支出（用于统计）
    const allSpendingsResult = await budgetRepository.listSpendings(
      filter,
      undefined, // 不使用分页，获取所有数据用于统计
    );

    // 获取分页数据
    const offset = (page - 1) * limit;
    const paginatedResult = await budgetRepository.listSpendings(filter, {
      offset,
      limit,
    });

    // 计算统计信息
    const allSpendings = allSpendingsResult.items;
    const totalAmount = allSpendings.reduce((sum, s) => sum + s.amount, 0);
    const categoryStats = allSpendings.reduce(
      (stats, spending) => {
        const cat = spending.category;
        if (!stats[cat]) {
          stats[cat] = {
            count: 0,
            amount: 0,
            category: cat,
          };
        }
        stats[cat]!.count += 1;
        stats[cat]!.amount += spending.amount;
        return stats;
      },
      {} as Record<
        string,
        { count: number; amount: number; category: FoodCategory }
      >,
    );

    return NextResponse.json({
      spendings: paginatedResult.items,
      pagination: {
        page,
        limit,
        total: paginatedResult.total,
        totalPages: Math.ceil(paginatedResult.total / limit),
      },
      statistics: {
        totalAmount,
        totalTransactions: allSpendings.length,
        averageAmount:
          allSpendings.length > 0 ? totalAmount / allSpendings.length : 0,
        categoryBreakdown: Object.values(categoryStats),
      },
    });
  } catch (error) {
    console.error('获取支出历史失败:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: '获取支出历史失败' }, { status: 500 });
  }
}
