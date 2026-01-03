import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { TrendDataType } from '@/lib/types/analytics';

/**
 * GET /api/analytics/trends
 * 获取趋势数据
 *
 * 重构说明：
 * - 使用 TrendAnalyzer 类实例（依赖注入）
 * - 使用多层缓存策略（L1: KV, L2: trend_data, L3: Materialized View）
 * - 添加 Cache-Control 头支持 CDN 缓存
 * - 所有容器和缓存模块使用动态导入以避免模块初始化问题
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
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
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 动态导入缓存模块以避免模块初始化问题
    const { getMultiLayerCache } = await import(
      '@/lib/cache/multi-layer-cache'
    );

    // 使用多层缓存获取数据
    // 🔒 环境保护：非生产环境自动禁用 KV（节省配额）
    const cache = getMultiLayerCache({
      l1Ttl: 60, // L1 (KV): 60 秒
      l2Ttl: 300, // L2 (trend_data): 5 分钟
      debug: process.env.NODE_ENV === 'development',
      // disableL1 默认值：非生产环境禁用
    });

    const result = await cache.getTrendData(
      {
        memberId,
        dataType,
        startDate: start,
        endDate: end,
      },
      async () => {
        // Fallback: 实时分析（L1/L2 miss 时执行）
        // 动态导入容器以避免模块初始化问题
        const { getDefaultContainer } = await import(
          '@/lib/container/service-container'
        );
        const container = getDefaultContainer();
        const trendAnalyzer = container.getTrendAnalyzer();
        return await trendAnalyzer.analyzeTrend(memberId, dataType, start, end);
      },
    );

    // 动态导入缓存头辅助函数
    const { addCacheHeaders, EDGE_CACHE_PRESETS } = await import(
      '@/lib/cache/edge-cache-helpers'
    );

    // 创建响应头
    const headers = new Headers();
    addCacheHeaders(headers, EDGE_CACHE_PRESETS.ANALYTICS_ENDPOINT);

    // 添加缓存元数据（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      headers.set('X-Cache-Layer', result.source);
      headers.set('X-Cache-Hit', result.hit.toString());
      headers.set('X-Cache-Duration', `${result.duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        _cache:
          process.env.NODE_ENV === 'development'
            ? {
                source: result.source,
                hit: result.hit,
                duration: result.duration,
              }
            : undefined,
      },
      { headers },
    );
  } catch (error) {
    console.error('Failed to get trend data:', error);
    return NextResponse.json({ error: '获取趋势数据失败' }, { status: 500 });
  }
}
