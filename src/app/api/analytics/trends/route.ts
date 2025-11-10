import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDefaultContainer } from '@/lib/container/service-container';
import { TrendDataType } from '@prisma/client';

/**
 * GET /api/analytics/trends
 * 获取趋势数据
 *
 * 重构说明：
 * - 使用 TrendAnalyzer 类实例（依赖注入）
 * - 移除缓存功能（由 Cloudflare KV 处理）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const dataType = searchParams.get('dataType') as TrendDataType;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!memberId || !dataType || !startDate || !endDate) {
      return NextResponse.json(
        { error: '缺少必要参数：memberId, dataType, startDate, endDate' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 使用 Service Container 获取 TrendAnalyzer 实例
    const container = getDefaultContainer();
    const trendAnalyzer = container.getTrendAnalyzer();

    // 执行趋势分析
    const analysis = await trendAnalyzer.analyzeTrend(memberId, dataType, start, end);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Failed to get trend data:', error);
    return NextResponse.json(
      { error: '获取趋势数据失败' },
      { status: 500 }
    );
  }
}

