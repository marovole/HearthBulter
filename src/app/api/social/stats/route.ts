/**
 * 社交分享API - 分享统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shareTrackingService } from '@/lib/services/social/share-tracking';
import { prisma } from '@/lib/db';

/**
 * 获取分享统计数据
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

    // 验证用户权限
    if (memberId) {
      const member = await prisma.familyMember.findFirst({
        where: {
          id: memberId,
          user: {
            createdFamilies: {
              some: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
      }
    }

    // 如果查询特定分享的统计
    if (token) {
      const shareStats = await shareTrackingService.getShareStatistics(token);
      
      // 验证访问权限
      const shareContent = await prisma.sharedContent.findUnique({
        where: { shareToken: token },
        include: {
          member: {
            select: {
              user: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!shareContent) {
        return NextResponse.json(
          { error: '分享内容不存在' },
          { status: 404 }
        );
      }

      // 检查隐私权限
      if (shareContent.member.user?.id !== session.user.id &&
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
      additionalStats = await getUserAdditionalStats(memberId, period);
    } else if (analysisType === 'global') {
      additionalStats = await getGlobalAdditionalStats(period);
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
 * 生成分享报告
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
      const member = await prisma.familyMember.findFirst({
        where: {
          id: memberId,
          user: {
            createdFamilies: {
              some: {
                members: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
            },
          },
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: '无权限访问该家庭成员' },
          { status: 403 }
        );
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
 */
async function getUserAdditionalStats(memberId: string, period?: string) {
  const { startDate, endDate } = getPeriodDates(period);

  const [
    totalShares,
    totalViews,
    totalConversions,
    avgConversionRate,
    topShare,
  ] = await Promise.all([
    // 总分享数
    prisma.sharedContent.count({
      where: {
        memberId,
        createdAt: { gte: startDate },
      },
    }),
    
    // 总浏览数
    prisma.sharedContent.aggregate({
      where: {
        memberId,
        createdAt: { gte: startDate },
      },
      _sum: { viewCount: true },
    }),
    
    // 总转化数
    prisma.sharedContent.aggregate({
      where: {
        memberId,
        createdAt: { gte: startDate },
      },
      _sum: { conversionCount: true },
    }),
    
    // 平均转化率
    prisma.sharedContent.findMany({
      where: {
        memberId,
        createdAt: { gte: startDate },
        clickCount: { gt: 0 },
      },
      select: { clickCount: true, conversionCount: true },
    }),
    
    // 最佳分享
    prisma.sharedContent.findFirst({
      where: {
        memberId,
        createdAt: { gte: startDate },
      },
      orderBy: { conversionCount: 'desc' },
      select: {
        shareToken: true,
        title: true,
        viewCount: true,
        clickCount: true,
        conversionCount: true,
      },
    }),
  ]);

  // 计算平均转化率
  const avgRate = avgConversionRate.length > 0
    ? avgConversionRate.reduce((sum, item) => {
      return sum + (item.conversionCount / item.clickCount) * 100;
    }, 0) / avgConversionRate.length
    : 0;

  return {
    totalShares,
    totalViews: totalViews._sum.viewCount || 0,
    totalConversions: totalConversions._sum.conversionCount || 0,
    avgConversionRate: Math.round(avgRate * 100) / 100,
    topShare,
  };
}

/**
 * 获取全局额外统计信息
 */
async function getGlobalAdditionalStats(period?: string) {
  const { startDate, endDate } = getPeriodDates(period);

  const [
    totalUsers,
    totalShares,
    totalViews,
    totalConversions,
    activeSharers,
  ] = await Promise.all([
    // 总用户数
    prisma.sharedContent.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: { memberId: true },
      distinct: ['memberId'],
    }).then(users => users.length),
    
    // 总分享数
    prisma.sharedContent.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),
    
    // 总浏览数
    prisma.sharedContent.aggregate({
      where: {
        createdAt: { gte: startDate },
      },
      _sum: { viewCount: true },
    }),
    
    // 总转化数
    prisma.sharedContent.aggregate({
      where: {
        createdAt: { gte: startDate },
      },
      _sum: { conversionCount: true },
    }),
    
    // 活跃分享用户数（分享超过3次的用户）
    prisma.sharedContent.groupBy({
      by: ['memberId'],
      where: {
        createdAt: { gte: startDate },
      },
      having: {
        shareCount: {
          gte: 3,
        },
      },
    }).then(groups => groups.length),
  ]);

  const globalConversionRate = totalViews._sum.viewCount && totalViews._sum.viewCount > 0
    ? ((totalConversions._sum.conversionCount || 0) / totalViews._sum.viewCount) * 100
    : 0;

  return {
    totalUsers,
    totalShares,
    totalViews: totalViews._sum.viewCount || 0,
    totalConversions: totalConversions._sum.conversionCount || 0,
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
