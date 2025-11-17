import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiResponseCache } from '@/lib/services/ai/response-cache';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';

// 管理员权限检查

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function checkAdminPermission(userId: string): Promise<boolean> {
  // 这里应该检查用户是否有管理员权限
  // 暂时简化实现，实际项目中应该检查用户角色
  return true; // 临时允许所有用户访问
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const isAdmin = await checkAdminPermission(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      'ai_general'
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    // 获取缓存统计
    const cacheStats = aiResponseCache.getStats();
    const cacheInfo = aiResponseCache.getCacheInfo();

    // 获取速率限制统计
    const rateLimitStats = await rateLimiter.getStats();

    // 计算成本节省估算
    const estimatedSavings = {
      tokensSaved: cacheStats.hits * 1000, // 假设每次缓存命中节省1000 tokens
      costSavedUSD: cacheStats.hits * 0.002, // 假设每1000 tokens成本$0.002
    };

    const response = {
      timestamp: new Date().toISOString(),
      cache: {
        stats: cacheStats,
        topEntries: cacheInfo.slice(0, 10), // 前10个最常用的缓存条目
        totalSizeKB: Math.round(
          cacheInfo.reduce((sum, entry) => sum + entry.size, 0) / 1024
        ),
      },
      rateLimit: rateLimitStats,
      performance: {
        hitRatePercent: cacheStats.hitRate,
        estimatedSavings,
        cacheEfficiency: cacheStats.hits > 0 ? 'good' : cacheStats.totalSize > 0 ? 'moderate' : 'poor',
      },
      recommendations: generateRecommendations(cacheStats, rateLimitStats),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Cache stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查管理员权限
    const isAdmin = await checkAdminPermission(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permission required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear') {
      // 清空所有缓存
      await aiResponseCache.clear();
      return NextResponse.json({ message: 'Cache cleared successfully' });
    } else if (action === 'reset-stats') {
      // 重置统计信息
      aiResponseCache.resetStats();
      return NextResponse.json({ message: 'Cache stats reset successfully' });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use ?action=clear or ?action=reset-stats' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Cache management API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 生成缓存优化建议
 */
function generateRecommendations(
  cacheStats: any,
  rateLimitStats: any
): string[] {
  const recommendations: string[] = [];

  // 缓存命中率建议
  if (cacheStats.hitRate < 20) {
    recommendations.push('缓存命中率较低，考虑增加缓存时间或优化缓存键策略');
  } else if (cacheStats.hitRate > 80) {
    recommendations.push('缓存命中率良好，系统性能表现优秀');
  }

  // 缓存大小建议
  if (cacheStats.totalSize > 800) {
    recommendations.push('缓存条目数量较多，考虑调整TTL或增加缓存清理频率');
  }

  // 驱逐策略建议
  if (cacheStats.evictions > cacheStats.sets * 0.1) {
    recommendations.push('缓存驱逐频率较高，建议增加最大缓存大小');
  }

  // 速率限制建议
  const activeRate = rateLimitStats.activeRecords / rateLimitStats.totalRecords;
  if (activeRate > 0.8) {
    recommendations.push('活跃用户比例较高，监控系统负载');
  }

  return recommendations;
}
