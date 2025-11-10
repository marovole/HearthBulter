import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { FoodCategory } from '@/lib/repositories/types/budget';

/**
 * GET /api/budget/spending-history
 * 获取支出历史
 *
 * Migrated from Prisma to Supabase
 */
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
      return NextResponse.json(
        { error: '缺少budgetId参数' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 构建查询
    let query = supabase
      .from('spendings')
      .select('*', { count: 'exact' })
      .eq('budgetId', budgetId)
      .order('purchaseDate', { ascending: false });

    // 分类过滤
    if (category) {
      query = query.eq('category', category);
    }

    // 日期过滤
    if (startDate) {
      query = query.gte('purchaseDate', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('purchaseDate', new Date(endDate).toISOString());
    }

    // 先获取统计信息（不分页）
    const { data: allSpendings, error: allError } = await supabase
      .from('spendings')
      .select('amount, category, purchaseDate')
      .eq('budgetId', budgetId)
      .eq('category', category || undefined);

    if (allError) {
      console.error('获取支出统计失败:', allError);
    }

    // 分页查询
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: spendings, error, count } = await query;

    if (error) {
      console.error('获取支出历史失败:', error);
      return NextResponse.json(
        { error: '获取支出历史失败' },
        { status: 500 }
      );
    }

    // 计算统计信息
    const totalAmount = (allSpendings || []).reduce((sum, s) => sum + s.amount, 0);
    const categoryStats = (allSpendings || []).reduce((stats, spending) => {
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
    }, {} as Record<string, { count: number; amount: number; category: FoodCategory }>);

    return NextResponse.json({
      spendings: spendings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      statistics: {
        totalAmount,
        totalTransactions: (allSpendings || []).length,
        averageAmount: (allSpendings || []).length > 0
          ? totalAmount / (allSpendings || []).length
          : 0,
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
