import { NextRequest, NextResponse } from 'next/server';
import { budgetTracker } from '@/lib/services/budget/budget-tracker';
import { FoodCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!budgetId) {
      return NextResponse.json(
        { error: '缺少budgetId参数' },
        { status: 400 }
      );
    }

    // 获取支出历史
    let spendings = await budgetTracker.getSpendingHistory(
      budgetId,
      category as FoodCategory
    );

    // 日期过滤
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      
      spendings = spendings.filter(spending => {
        const purchaseDate = new Date(spending.purchaseDate);
        return purchaseDate >= start && purchaseDate <= end;
      });
    }

    // 分页
    const total = spendings.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSpendings = spendings.slice(startIndex, endIndex);

    // 统计信息
    const totalAmount = spendings.reduce((sum, spending) => sum + spending.amount, 0);
    const categoryStats = spendings.reduce((stats, spending) => {
      if (!stats[spending.category]) {
        stats[spending.category] = {
          count: 0,
          amount: 0,
          category: spending.category,
        };
      }
      stats[spending.category].count += 1;
      stats[spending.category].amount += spending.amount;
      return stats;
    }, {} as Record<string, { count: number; amount: number; category: FoodCategory }>);

    return NextResponse.json({
      spendings: paginatedSpendings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalAmount,
        totalTransactions: spendings.length,
        averageAmount: spendings.length > 0 ? totalAmount / spendings.length : 0,
        categoryBreakdown: Object.values(categoryStats),
      },
    });
  } catch (error) {
    console.error('获取支出历史失败:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '获取支出历史失败' },
      { status: 500 }
    );
  }
}
