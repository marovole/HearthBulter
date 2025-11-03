import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { analyzeTrend, getCachedTrendData, cacheTrendData } from '@/lib/services/analytics/trend-analyzer';
import { TrendDataType } from '@prisma/client';

/**
 * GET /api/analytics/trends
 * 获取趋势数据
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

    // 先尝试从缓存获取
    let analysis = await getCachedTrendData(memberId, dataType, start, end);

    if (!analysis) {
      // 缓存未命中，执行分析
      analysis = await analyzeTrend(memberId, dataType, start, end);
      
      // 缓存结果
      await cacheTrendData(memberId, dataType, analysis, start, end);
    }

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

