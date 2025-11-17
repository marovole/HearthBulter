import { NextResponse } from 'next/server';
import { CacheService } from '@/lib/cache/redis-client';

/**
 * GET /api/cache/stats
 * 获取缓存统计信息和性能日志
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const stats = CacheService.getStats();
    const logs = CacheService.getPerformanceLogs(50); // 最近50条日志

    return NextResponse.json({
      stats: {
        ...stats,
        hitRate: `${stats.hitRate.toFixed(2)}%`,
      },
      recentLogs: logs.map(log => ({
        ...log,
        duration: `${log.duration}ms`,
        timestamp: log.timestamp.toISOString(),
      })),
      summary: {
        totalRequests: stats.totalRequests,
        cacheHits: stats.hits,
        cacheMisses: stats.misses,
        averageResponseTime: logs.length > 0
          ? `${(logs.reduce((sum, log) => sum + log.duration, 0) / logs.length).toFixed(2)}ms`
          : 'N/A',
      },
    });
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/stats/reset
 * 重置缓存统计信息
 */
export async function POST() {
  try {
    CacheService.resetStats();

    return NextResponse.json({
      message: '缓存统计已重置',
      success: true,
    });
  } catch (error) {
    console.error('重置缓存统计失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
