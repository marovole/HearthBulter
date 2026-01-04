import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { IndicatorType } from '@prisma/client';

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function verifyMemberAccess(
  memberId: string,
  userId: string,
): Promise<{ hasAccess: boolean }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(
      `
      id,
      userId,
      familyId,
      family:families!inner(
        id,
        creatorId
      )
    `,
    )
    .eq('id', memberId)
    .is('deletedAt', null)
    .single();

  if (!member) {
    return { hasAccess: false };
  }

  const isCreator = member.family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const { data: adminMember } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('familyId', member.familyId)
      .eq('userId', userId)
      .eq('role', 'ADMIN')
      .is('deletedAt', null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
  };
}

/**
 * GET /api/members/:memberId/reports/:reportId/compare
 * 对比两次报告的数据变化趋势
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> },
) {
  try {
    const { memberId, reportId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: '无权限查看该报告' }, { status: 403 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查询当前报告
    const { data: currentReport, error: currentError } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('id', reportId)
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .maybeSingle();

    if (currentError) {
      console.error('查询当前报告失败:', currentError);
      return NextResponse.json({ error: '查询报告失败' }, { status: 500 });
    }

    if (!currentReport) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    // 查询当前报告的指标
    const { data: currentIndicators, error: currentIndicatorsError } =
      await supabase
        .from('medical_indicators')
        .select('*')
        .eq('reportId', reportId);

    if (currentIndicatorsError) {
      console.error('查询当前指标失败:', currentIndicatorsError);
      return NextResponse.json({ error: '查询指标失败' }, { status: 500 });
    }

    // 查询该成员的其他报告（按日期排序，获取最近的一条）
    let previousQuery = supabase
      .from('medical_reports')
      .select('*')
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .neq('id', reportId);

    if (currentReport.reportDate) {
      previousQuery = previousQuery.lt('reportDate', currentReport.reportDate);
    }

    const { data: previousReports, error: previousReportsError } =
      await previousQuery
        .order('reportDate', { ascending: false, nullsFirst: false })
        .order('createdAt', { ascending: false })
        .limit(1);

    if (previousReportsError) {
      console.error('查询历史报告失败:', previousReportsError);
      return NextResponse.json({ error: '查询报告失败' }, { status: 500 });
    }

    const previousReport = previousReports?.[0];

    // 如果没有历史报告，返回当前报告数据
    if (!previousReport) {
      return NextResponse.json({
        message: '暂无历史报告可对比',
        current: {
          reportId: currentReport.id,
          reportDate: currentReport.reportDate,
          indicators: currentIndicators || [],
        },
      });
    }

    // 查询历史报告的指标
    const { data: previousIndicators, error: previousIndicatorsError } =
      await supabase
        .from('medical_indicators')
        .select('*')
        .eq('reportId', previousReport.id);

    if (previousIndicatorsError) {
      console.error('查询历史指标失败:', previousIndicatorsError);
      return NextResponse.json({ error: '查询指标失败' }, { status: 500 });
    }

    // 构建指标对比数据
    const comparison: Array<{
      indicatorType: IndicatorType;
      name: string;
      unit: string;
      previousValue?: number;
      currentValue: number;
      change?: number;
      changePercent?: number;
      trend: 'improved' | 'worsened' | 'stable' | 'new';
      previousStatus?: string;
      currentStatus: string;
    }> = [];

    // 按指标类型分组
    const previousIndicatorsMap = new Map(
      (previousIndicators || []).map((ind) => [ind.indicatorType, ind]),
    );

    const currentIndicatorsMap = new Map(
      (currentIndicators || []).map((ind) => [ind.indicatorType, ind]),
    );

    // 处理所有当前指标
    for (const [type, current] of currentIndicatorsMap) {
      const previous = previousIndicatorsMap.get(type);

      if (previous) {
        // 有历史数据，计算变化
        const change = current.value - previous.value;
        const changePercent =
          previous.value !== 0
            ? ((change / previous.value) * 100).toFixed(2)
            : '0';

        // 判断趋势
        let trend: 'improved' | 'worsened' | 'stable' = 'stable';

        // 如果当前状态比之前好，视为改善
        if (current.status === 'NORMAL' && previous.status !== 'NORMAL') {
          trend = 'improved';
        } else if (
          current.status !== 'NORMAL' &&
          previous.status === 'NORMAL'
        ) {
          trend = 'worsened';
        } else if (
          current.status === 'CRITICAL' &&
          previous.status !== 'CRITICAL'
        ) {
          trend = 'worsened';
        } else if (
          current.status !== 'CRITICAL' &&
          previous.status === 'CRITICAL'
        ) {
          trend = 'improved';
        } else if (Math.abs(change / previous.value) < 0.05) {
          // 变化小于5%视为稳定
          trend = 'stable';
        }

        comparison.push({
          indicatorType: type,
          name: current.name,
          unit: current.unit,
          previousValue: previous.value,
          currentValue: current.value,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent),
          trend,
          previousStatus: previous.status,
          currentStatus: current.status,
        });
      } else {
        // 新指标，只有当前数据
        comparison.push({
          indicatorType: type,
          name: current.name,
          unit: current.unit,
          currentValue: current.value,
          trend: 'new',
          currentStatus: current.status,
        });
      }
    }

    // 处理仅在历史报告中存在的指标（已消失）
    for (const [type, previous] of previousIndicatorsMap) {
      if (!currentIndicatorsMap.has(type)) {
        comparison.push({
          indicatorType: type,
          name: previous.name,
          unit: previous.unit,
          previousValue: previous.value,
          trend: 'new', // 标记为"新"（实际上是消失，但前端可以根据previousValue判断）
          previousStatus: previous.status,
          currentStatus: 'NORMAL',
        });
      }
    }

    // 按指标类型排序
    comparison.sort((a, b) => {
      const typeOrder: Record<IndicatorType, number> = {
        TOTAL_CHOLESTEROL: 1,
        LDL_CHOLESTEROL: 2,
        HDL_CHOLESTEROL: 3,
        TRIGLYCERIDES: 4,
        FASTING_GLUCOSE: 5,
        POSTPRANDIAL_GLUCOSE: 6,
        GLYCATED_HEMOGLOBIN: 7,
        ALT: 8,
        AST: 9,
        TOTAL_BILIRUBIN: 10,
        DIRECT_BILIRUBIN: 11,
        ALP: 12,
        CREATININE: 13,
        UREA_NITROGEN: 14,
        URIC_ACID: 15,
        WHITE_BLOOD_CELL: 16,
        RED_BLOOD_CELL: 17,
        HEMOGLOBIN: 18,
        PLATELET: 19,
        OTHER: 20,
      };

      return (
        (typeOrder[a.indicatorType] || 99) - (typeOrder[b.indicatorType] || 99)
      );
    });

    return NextResponse.json({
      previous: {
        reportId: previousReport.id,
        reportDate: previousReport.reportDate,
        createdAt: previousReport.createdAt,
      },
      current: {
        reportId: currentReport.id,
        reportDate: currentReport.reportDate,
        createdAt: currentReport.createdAt,
      },
      comparison,
      summary: {
        totalIndicators: comparison.length,
        improved: comparison.filter((c) => c.trend === 'improved').length,
        worsened: comparison.filter((c) => c.trend === 'worsened').length,
        stable: comparison.filter((c) => c.trend === 'stable').length,
        new: comparison.filter((c) => c.trend === 'new').length,
      },
    });
  } catch (error) {
    console.error('对比报告失败:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    );
  }
}
