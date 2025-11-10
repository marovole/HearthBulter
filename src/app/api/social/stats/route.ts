/**
 * 社交分享API - 分享统计
 *
 * Migrated from Prisma to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/social/stats
 * 获取分享统计数据
 *
 * Migrated from Prisma to Supabase
 */
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
    const analytics = memberId
      ? await shareTrackingService.getUserShareAnalytics(memberId, period)
      : await shareTrackingService.getGlobalShareAnalytics(period);

    // 获取额外的统计信息
    let additionalStats = {};

    if (analysisType === 'user' && memberId) {
      additionalStats = await getUserAdditionalStats(supabase, memberId, period);
    } else if (analysisType === 'global') {
      additionalStats = await getGlobalAdditionalStats(supabase, period);
    }

    return NextResponse.json({
      success: true,
      data: {
        type: analysisType,
        period: period || '30d',
        analytics,
        additional: additionalStats,
        generatedAt: new Date().toISOString(),
      },
    });

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
