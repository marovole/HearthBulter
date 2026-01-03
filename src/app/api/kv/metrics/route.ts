import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKvCache } from '@/lib/cache/cloudflare-kv';

/**
 * GET /api/kv/metrics
 * 获取 KV API 调用指标
 *
 * 用于监控 KV 用量，帮助诊断配额问题
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const kv = getKvCache();
    const metrics = kv.getMetrics();
    const isAvailable = kv.isAvailable();

    // 计算运行时长
    const timeSinceReset = Date.now() - metrics.lastReset.getTime();
    const hoursElapsed = timeSinceReset / (1000 * 60 * 60);

    // Cloudflare 免费额度（每日）
    const dailyLimits = {
      reads: 100000,
      writes: 1000,
      deletes: 1000,
      lists: 1000,
    };

    // 计算预估每日用量
    const estimatedDaily = {
      reads: hoursElapsed > 0 ? Math.round((metrics.reads / hoursElapsed) * 24) : 0,
      writes: hoursElapsed > 0 ? Math.round((metrics.writes / hoursElapsed) * 24) : 0,
      deletes: hoursElapsed > 0 ? Math.round((metrics.deletes / hoursElapsed) * 24) : 0,
      lists: hoursElapsed > 0 ? Math.round((metrics.lists / hoursElapsed) * 24) : 0,
    };

    // 计算使用率
    const usagePercentage = {
      reads: (estimatedDaily.reads / dailyLimits.reads) * 100,
      writes: (estimatedDaily.writes / dailyLimits.writes) * 100,
      deletes: (estimatedDaily.deletes / dailyLimits.deletes) * 100,
      lists: (estimatedDaily.lists / dailyLimits.lists) * 100,
    };

    // 总体状态
    const maxUsage = Math.max(...Object.values(usagePercentage));
    let status: 'healthy' | 'warning' | 'critical' | 'unavailable';
    if (!isAvailable) {
      status = 'unavailable';
    } else if (maxUsage >= 80) {
      status = 'critical';
    } else if (maxUsage >= 50) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return NextResponse.json({
      success: true,
      status,
      isAvailable,
      environment: process.env.NODE_ENV,
      metrics: {
        current: metrics,
        estimatedDaily,
        limits: dailyLimits,
        usagePercentage: {
          reads: usagePercentage.reads.toFixed(1) + '%',
          writes: usagePercentage.writes.toFixed(1) + '%',
          deletes: usagePercentage.deletes.toFixed(1) + '%',
          lists: usagePercentage.lists.toFixed(1) + '%',
        },
      },
      runtime: {
        hoursElapsed: hoursElapsed.toFixed(2),
        lastReset: metrics.lastReset.toISOString(),
      },
      recommendations: generateRecommendations(status, usagePercentage, metrics),
    });
  } catch (error) {
    console.error('Failed to get KV metrics:', error);
    return NextResponse.json(
      { error: '获取 KV 指标失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kv/metrics/reset
 * 重置 KV 指标计数器
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const kv = getKvCache();
    kv.resetMetrics();

    return NextResponse.json({
      success: true,
      message: 'KV 指标已重置',
      resetAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to reset KV metrics:', error);
    return NextResponse.json(
      { error: '重置 KV 指标失败' },
      { status: 500 }
    );
  }
}

/**
 * 生成优化建议
 */
function generateRecommendations(
  status: string,
  usagePercentage: Record<string, number>,
  metrics: any
): string[] {
  const recommendations: string[] = [];

  if (status === 'unavailable') {
    recommendations.push('⚠️ KV 不可用 - 可能在本地开发环境或 KV 绑定未配置');
    recommendations.push('💡 这是正常的，系统会自动降级到 L2 缓存（Supabase）');
    return recommendations;
  }

  if (status === 'critical') {
    recommendations.push('🚨 用量已达到临界值（≥80%），建议立即采取措施');
  } else if (status === 'warning') {
    recommendations.push('⚠️ 用量已达到警戒值（≥50%），建议密切监控');
  } else {
    recommendations.push('✅ KV 用量正常');
  }

  // 针对高用量的具体操作提供建议
  const reads = usagePercentage.reads ?? 0;
  const writes = usagePercentage.writes ?? 0;
  const deletes = usagePercentage.deletes ?? 0;
  const lists = usagePercentage.lists ?? 0;

  if (reads >= 50) {
    recommendations.push(
      `📖 Read 操作用量高（${reads.toFixed(1)}%）` +
      ' - 考虑增加 TTL 或禁用非生产环境的 KV'
    );
  }

  if (writes >= 50) {
    recommendations.push(
      `✍️ Write 操作用量高（${writes.toFixed(1)}%）` +
      ' - 检查是否有不必要的重复写入'
    );
  }

  if (deletes >= 50) {
    recommendations.push(
      `🗑️ Delete 操作用量高（${deletes.toFixed(1)}%）` +
      ' - 避免使用 deleteByPrefix，优先使用 TTL 自动过期'
    );
  }

  if (lists >= 50) {
    recommendations.push(
      `📋 List 操作用量高（${lists.toFixed(1)}%）` +
      ' - List 操作非常昂贵，检查是否调用了 deleteByPrefix'
    );
  }

  if (metrics.errors > 10) {
    recommendations.push(
      `❌ 检测到 ${metrics.errors} 个错误 - 检查 KV 绑定配置和网络连接`
    );
  }

  return recommendations;
}
