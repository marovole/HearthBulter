/**
 * 社交分享API - 分享统计
 *
 * Migrated from Prisma to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import type { ShareAnalytics } from '@/lib/services/social/share-tracking';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { calculateSocialStats } from '@/lib/db/supabase-rpc-helpers';
import { addCacheHeaders, EDGE_CACHE_PRESETS } from '@/lib/cache/edge-cache-helpers';

/**
 * GET /api/social/stats
 * 获取分享统计数据
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const period = searchParams.get('period') as '7d' | '30d' | '90d' | '1y';
    const type = searchParams.get('type'); // 'user' | 'global'
    const token = searchParams.get('token'); // 特定分享token

    const supabase = SupabaseClientManager.getInstance();

    // 验证用户权限
    if (memberId) {
      // 简化的权限检查：先查询成员，再检查是否在同一家庭
      const { data: member } = await supabase
        .from('family_members')
        .select('id, familyId, userId')
        .eq('id', memberId)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }

      // 检查是否是本人或同家庭成员
      if (member.userId !== session.user.id) {
        const { data: sameFamilyCheck } = await supabase
          .from('family_members')
          .select('id')
          .eq('familyId', member.familyId)
          .eq('userId', session.user.id)
          .is('deletedAt', null)
          .maybeSingle();

        if (!sameFamilyCheck) {
          return NextResponse.json(
            { error: '无权限访问该家庭成员' },
            { status: 403 }
          );
        }
      }
    }

    // 如果查询特定分享的统计
    if (token) {
      const shareStats = await shareTrackingService.getShareStatistics(token);

      // 验证访问权限
      const { data: shareContent } = await supabase
        .from('shared_content')
        .select(`
          id,
          shareToken,
          privacyLevel,
          member:family_members!inner(
            user:users(id)
          )
        `)
        .eq('shareToken', token)
        .single();

      if (!shareContent) {
        return NextResponse.json(
          { error: '分享内容不存在' },
          { status: 404 }
        );
      }

      // 检查隐私权限
      const memberUserId = shareContent.member?.user?.id;
      if (memberUserId !== session.user.id &&
          shareContent.privacyLevel === 'PRIVATE') {
        return NextResponse.json(
          { error: '无权限查看该分享统计' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          type: 'share',
          token,
          stats: shareStats,
        },
      });
    }

    // 获取用户或全局分析
    const analysisType = type || 'user';
    let analytics: ShareAnalytics;
    let additionalStats = {};

    if (analysisType === 'user' && memberId) {
      // 使用优化的 RPC 获取用户统计数据
      // 优势：单次往返、服务端聚合、减少网络延迟
      const statsResult = await calculateSocialStats(memberId, {
        period: period || '30d'
      });

      if (statsResult.success && statsResult.data) {
        // 将 RPC 数据映射到 ShareAnalytics 格式
        analytics = await mapRpcToShareAnalytics(statsResult.data, memberId, supabase);

        // 从 RPC 数据计算额外统计，避免额外查询
        additionalStats = calculateAdditionalStatsFromRpc(statsResult.data, analytics);
      } else {
        // RPC 失败，降级到原有服务层
        console.warn('RPC calculate_social_stats failed, falling back to service layer:', statsResult.error);
        analytics = await shareTrackingService.getUserShareAnalytics(memberId, period);
        additionalStats = await getUserAdditionalStats(supabase, memberId, period);
      }
    } else if (analysisType === 'global') {
      // Global 模式暂时保持现有逻辑
      // TODO: 创建支持 NULL member_id 的 RPC 或物化视图
      analytics = await shareTrackingService.getGlobalShareAnalytics(period);
      additionalStats = await getGlobalAdditionalStats(supabase, period);
    } else {
      // 无 memberId 且非 global 模式，返回错误
      return NextResponse.json(
        { error: 'memberId is required for user analytics' },
        { status: 400 }
      );
    }

    const responseData = {
      success: true,
      data: {
        type: analysisType,
        period: period || '30d',
        analytics,
        additional: additionalStats,
        generatedAt: new Date().toISOString(),
      },
    };

    // 添加 Edge Cache（仅 global 模式，私有缓存）
    const headers = new Headers();
    if (analysisType === 'global') {
      addCacheHeaders(headers, {
        ...EDGE_CACHE_PRESETS.ANALYTICS_ENDPOINT,
        private: true, // P0 修复：即使是 global 也使用私有缓存（基于 Cookie 认证）
      });
    }

    return NextResponse.json(responseData, { headers });

  } catch (error) {
    console.error('获取分享统计失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/stats
 * 生成分享报告
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberId, period, format, type, adminCode } = body;

    const supabase = SupabaseClientManager.getInstance();

    // 验证管理员权限（如果需要）
    if (adminCode) {
      const isAdmin = await checkAdminPermission(session.user.id, adminCode);
      if (!isAdmin) {
        return NextResponse.json(
          { error: '无管理员权限' },
          { status: 403 }
        );
      }
    } else if (memberId) {
      // 验证用户权限
      const { data: member } = await supabase
        .from('family_members')
        .select('id, familyId, userId')
        .eq('id', memberId)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }

      // 检查是否是本人或同家庭成员
      if (member.userId !== session.user.id) {
        const { data: sameFamilyCheck } = await supabase
          .from('family_members')
          .select('id')
          .eq('familyId', member.familyId)
          .eq('userId', session.user.id)
          .is('deletedAt', null)
          .maybeSingle();

        if (!sameFamilyCheck) {
          return NextResponse.json(
            { error: '无权限访问该家庭成员' },
            { status: 403 }
          );
        }
      }
    }

    // 生成报告
    const report = await shareTrackingService.generateShareTrackingReport(
      memberId || undefined,
      period || '30d'
    );

    // 根据格式返回数据
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: report,
      });
    } else if (format === 'csv') {
      const csvData = convertToCSV(report);

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="share-report-${period}.csv"`,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: report,
      });
    }

  } catch (error) {
    console.error('生成分享报告失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取用户额外统计信息
 *
 * Migrated from Prisma to Supabase
 */
async function getUserAdditionalStats(
  supabase: ReturnType<typeof SupabaseClientManager.getInstance>,
  memberId: string,
  period?: string
) {
  const { startDate, endDate } = getPeriodDates(period);

  // 总分享数
  const { count: totalShares } = await supabase
    .from('shared_content')
    .select('id', { count: 'exact', head: true })
    .eq('memberId', memberId)
    .gte('createdAt', startDate.toISOString());

  // 总浏览数
  const { data: viewData } = await supabase
    .from('shared_content')
    .select('viewCount')
    .eq('memberId', memberId)
    .gte('createdAt', startDate.toISOString());

  const totalViews = (viewData || []).reduce((sum, item) => sum + (item.viewCount || 0), 0);

  // 总转化数
  const { data: conversionData } = await supabase
    .from('shared_content')
    .select('conversionCount')
    .eq('memberId', memberId)
    .gte('createdAt', startDate.toISOString());

  const totalConversions = (conversionData || []).reduce((sum, item) => sum + (item.conversionCount || 0), 0);

  // 平均转化率计算
  const { data: rateData } = await supabase
    .from('shared_content')
    .select('clickCount, conversionCount')
    .eq('memberId', memberId)
    .gte('createdAt', startDate.toISOString())
    .gt('clickCount', 0);

  const avgRate = (rateData && rateData.length > 0)
    ? rateData.reduce((sum, item) => {
      return sum + ((item.conversionCount || 0) / (item.clickCount || 1)) * 100;
    }, 0) / rateData.length
    : 0;

  // 最佳分享
  const { data: topShareData } = await supabase
    .from('shared_content')
    .select('shareToken, title, viewCount, clickCount, conversionCount')
    .eq('memberId', memberId)
    .gte('createdAt', startDate.toISOString())
    .order('conversionCount', { ascending: false })
    .limit(1);

  const topShare = topShareData?.[0] || null;

  return {
    totalShares: totalShares || 0,
    totalViews,
    totalConversions,
    avgConversionRate: Math.round(avgRate * 100) / 100,
    topShare,
  };
}

/**
 * 获取全局额外统计信息
 *
 * Migrated from Prisma to Supabase
 */
async function getGlobalAdditionalStats(
  supabase: ReturnType<typeof SupabaseClientManager.getInstance>,
  period?: string
) {
  const { startDate, endDate } = getPeriodDates(period);

  // 总用户数 (distinct memberId)
  const { data: allShares } = await supabase
    .from('shared_content')
    .select('memberId')
    .gte('createdAt', startDate.toISOString());

  const uniqueMembers = new Set((allShares || []).map(s => s.memberId));
  const totalUsers = uniqueMembers.size;

  // 总分享数
  const { count: totalShares } = await supabase
    .from('shared_content')
    .select('id', { count: 'exact', head: true })
    .gte('createdAt', startDate.toISOString());

  // 总浏览数
  const { data: viewData } = await supabase
    .from('shared_content')
    .select('viewCount')
    .gte('createdAt', startDate.toISOString());

  const totalViews = (viewData || []).reduce((sum, item) => sum + (item.viewCount || 0), 0);

  // 总转化数
  const { data: conversionData } = await supabase
    .from('shared_content')
    .select('conversionCount')
    .gte('createdAt', startDate.toISOString());

  const totalConversions = (conversionData || []).reduce((sum, item) => sum + (item.conversionCount || 0), 0);

  // 活跃分享用户数（分享超过3次的用户）
  // Note: Supabase doesn't support groupBy with having clause directly
  // We need to fetch all data and compute client-side
  const { data: allSharesForGrouping } = await supabase
    .from('shared_content')
    .select('memberId')
    .gte('createdAt', startDate.toISOString());

  const shareCountByMember: Record<string, number> = {};
  (allSharesForGrouping || []).forEach(share => {
    shareCountByMember[share.memberId] = (shareCountByMember[share.memberId] || 0) + 1;
  });

  const activeSharers = Object.values(shareCountByMember).filter(count => count >= 3).length;

  const globalConversionRate = totalViews > 0
    ? (totalConversions / totalViews) * 100
    : 0;

  return {
    totalUsers,
    totalShares: totalShares || 0,
    totalViews,
    totalConversions,
    activeSharers,
    globalConversionRate: Math.round(globalConversionRate * 100) / 100,
  };
}

/**
 * 获取时间范围
 */
function getPeriodDates(period?: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate: Date;

  switch (period) {
  case '7d':
    startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    break;
  case '90d':
    startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    break;
  case '1y':
    startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    break;
  default: // 30d
    startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    break;
  }

  return { startDate, endDate };
}

/**
 * 转换为CSV格式
 */
function convertToCSV(report: any): string {
  const headers = [
    '指标',
    '数值',
    '备注',
  ];

  const rows = [
    ['报告标题', report.reportTitle, ''],
    ['生成时间', report.generatedAt, ''],
    ['统计周期', report.period, ''],
    [''],
    ['总分享数', report.summary.totalShares.toString(), ''],
    ['总浏览数', report.summary.totalViews.toString(), ''],
    ['总点击数', report.summary.totalClicks.toString(), ''],
    ['总转化数', report.summary.totalConversions.toString(), ''],
    ['转化率', report.summary.conversionRate, '%'],
    [''],
  ];

  // 添加top content
  rows.push(['TOP 5 分享内容', '', '']);
  rows.push(['标题', '浏览量', '转化量']);
  report.topContent.forEach((content: any) => {
    rows.push([content.title, content.views.toString(), content.conversions.toString()]);
  });

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * 检查管理员权限
 */
async function checkAdminPermission(userId: string, adminCode?: string): Promise<boolean> {
  if (!adminCode) {
    return false;
  }

  const validAdminCodes = process.env.ADMIN_CODES?.split(',') || [];
  return validAdminCodes.includes(adminCode);
}

/**
 * 将 RPC 数据映射到 ShareAnalytics 格式
 *
 * RPC `calculate_social_stats` 返回的数据结构与 ShareAnalytics 接口不完全匹配，
 * 需要进行映射和补充。
 *
 * @param rpcData - RPC 返回的统计数据
 * @param memberId - 成员 ID
 * @param supabase - Supabase 客户端
 * @returns ShareAnalytics 格式的数据
 */
async function mapRpcToShareAnalytics(
  rpcData: import('@/lib/db/supabase-rpc-helpers').SocialStatsRpcResult,
  memberId: string,
  supabase: ReturnType<typeof SupabaseClientManager.getInstance>
): Promise<ShareAnalytics> {
  const { totals, platformBreakdown, daily, period } = rpcData;

  // 映射平台分布数据
  // RPC: { "iOS": { shares, views, clicks, conversions, conversionRate }, ... }
  // ShareAnalytics: Record<string, { shares, clicks, conversions }>
  const mappedPlatformBreakdown: Record<string, {
    shares: number;
    clicks: number;
    conversions: number;
  }> = {};

  for (const [platform, stats] of Object.entries(platformBreakdown)) {
    mappedPlatformBreakdown[platform] = {
      shares: stats.shares,
      clicks: stats.clicks,
      conversions: stats.conversions,
    };
  }

  // 获取 topPerformingContent（RPC 不提供，需要额外查询）
  // 优化：只查询 TOP 5，减少数据传输

  // ⚠️ 规范化 period 值：确保符合 getPeriodDates 的预期格式
  // RPC 返回的 period 应该是 '7d' | '30d' | '90d' | '1y'
  // 如果 RPC 返回其他格式，这里需要转换
  const normalizedPeriod = normalizePeriod(period);
  const { startDate } = getPeriodDates(normalizedPeriod);
  const { data: topContent } = await supabase
    .from('shared_content')
    .select('shareToken, title, viewCount, clickCount, conversionCount')
    .eq('memberId', memberId)
    .gte('createdAt', startDate.toISOString())
    .order('conversionCount', { ascending: false })
    .limit(5);

  const topPerformingContent = (topContent || []).map(item => ({
    shareToken: item.shareToken,
    title: item.title || 'Untitled',
    views: item.viewCount || 0,
    clicks: item.clickCount || 0,
    conversions: item.conversionCount || 0,
    // ⚠️ 重要：使用 conversions / clicks（与服务层一致）
    // RPC 使用 conversions / views，但这里需要与原逻辑保持一致
    conversionRate: (item.clickCount && item.clickCount > 0)
      ? (item.conversionCount || 0) / item.clickCount * 100
      : 0,
  }));

  // ⚠️ 重要：重新计算总体转化率以保持一致性
  // RPC 使用 conversions / views，但服务层使用 conversions / clicks
  // 为保持向后兼容，需要重新计算
  const consistentConversionRate = totals.clicks > 0
    ? (totals.conversions / totals.clicks) * 100
    : 0;

  return {
    period,
    totalShares: totals.shares,
    totalViews: totals.views,
    totalClicks: totals.clicks,
    totalConversions: totals.conversions,
    conversionRate: consistentConversionRate, // 使用重新计算的值
    topPerformingContent,
    platformBreakdown: mappedPlatformBreakdown,
    dailyTrends: daily, // 字段名一致，直接使用
  };
}

/**
 * 规范化 period 值
 *
 * 确保 period 值符合 getPeriodDates 函数的预期格式。
 * RPC 应该返回标准格式，但这里添加防御性编程。
 *
 * @param period - RPC 返回的 period 值
 * @returns 规范化后的 period 值
 */
function normalizePeriod(period: string): string {
  const validPeriods = ['7d', '30d', '90d', '1y'];

  // 如果已经是有效值，直接返回
  if (validPeriods.includes(period)) {
    return period;
  }

  // 尝试转换其他常见格式
  const normalized = period.toLowerCase().replace(/[_\s]/g, '');
  switch (normalized) {
  case 'last7days':
  case '7days':
  case '1week':
  case 'week':
    return '7d';
  case 'last30days':
  case '30days':
  case '1month':
  case 'month':
    return '30d';
  case 'last90days':
  case '90days':
  case '3months':
  case 'quarter':
    return '90d';
  case 'lastyear':
  case '1year':
  case 'year':
    return '1y';
  default:
    // 降级到默认值
    console.warn(`Invalid period value "${period}", falling back to 30d`);
    return '30d';
  }
}

/**
 * 从 RPC 数据计算额外统计
 *
 * 利用 RPC 已经返回的数据计算额外指标，避免额外查询。
 *
 * @param rpcData - RPC 返回的统计数据
 * @param analytics - 映射后的 ShareAnalytics 数据
 * @returns 额外统计数据
 */
function calculateAdditionalStatsFromRpc(
  rpcData: import('@/lib/db/supabase-rpc-helpers').SocialStatsRpcResult,
  analytics: ShareAnalytics
): Record<string, any> {
  const { totals } = rpcData;
  const { topPerformingContent } = analytics;

  // ⚠️ 重要：avgConversionRate 需要与服务层一致（conversions / clicks）
  // 不能直接使用 RPC 的 conversionRate（它是 conversions / views）
  const avgConversionRate = totals.clicks > 0
    ? (totals.conversions / totals.clicks) * 100
    : 0;

  return {
    totalShares: totals.shares,
    totalViews: totals.views,
    totalConversions: totals.conversions,
    avgConversionRate: Math.round(avgConversionRate * 100) / 100, // 保留 2 位小数
    // 最佳分享从 topPerformingContent 取第一个
    topShare: topPerformingContent[0] || null,
  };
}
