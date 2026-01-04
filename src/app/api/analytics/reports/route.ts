import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { auth } from '@/lib/auth';
import { ReportType } from '@prisma/client';
import { createReport } from '@/lib/services/analytics/report-generator';
import { requireMemberDataAccess } from '@/lib/middleware/authorization';

/**
 * GET /api/analytics/reports
 * 获取报告列表
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');
    const reportType = searchParams.get('reportType') as ReportType | null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (!memberId) {
      return NextResponse.json(
        { error: '缺少必要参数：memberId' },
        { status: 400 },
      );
    }

    // 验证用户对该成员数据的访问权限
    const accessResult = await requireMemberDataAccess(
      session.user.id,
      memberId,
    );
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此成员数据' },
        { status: 403 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 构建查询
    let query = supabase
      .from('health_reports')
      .select(
        `
        id,
        reportType,
        startDate,
        endDate,
        title,
        summary,
        overallScore,
        status,
        createdAt
      `,
        { count: 'exact' },
      )
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (reportType) {
      query = query.eq('reportType', reportType);
    }

    const { data: reports, error, count: total } = await query;

    if (error) {
      console.error('查询报告列表失败:', error);
      return NextResponse.json({ error: '获取报告列表失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        reports: reports || [],
        pagination: {
          page,
          pageSize,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('Failed to get reports:', error);
    return NextResponse.json({ error: '获取报告列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/analytics/reports
 * 生成新报告
 *
 * Note: createReport service still uses Prisma
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, reportType, startDate, endDate } = body;

    if (!memberId || !reportType) {
      return NextResponse.json(
        { error: '缺少必要参数：memberId, reportType' },
        { status: 400 },
      );
    }

    // 验证用户对该成员数据的访问权限
    const accessResult = await requireMemberDataAccess(
      session.user.id,
      memberId,
    );
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || '无权访问此成员数据' },
        { status: 403 },
      );
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report = await createReport(
      memberId,
      reportType as ReportType,
      start,
      end,
    );

    return NextResponse.json({
      success: true,
      data: report,
      message: '报告生成成功',
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: '生成报告失败' }, { status: 500 });
  }
}
