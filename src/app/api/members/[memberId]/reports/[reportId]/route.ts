import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { fileStorageService } from '@/lib/services/file-storage-service';
import type { IndicatorType, IndicatorStatus } from '@prisma/client';

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
 * GET /api/members/:memberId/reports/:reportId
 * 获取报告详情和指标数据
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

    // 查询报告详情
    const { data: report, error: reportError } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('id', reportId)
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .maybeSingle();

    if (reportError) {
      console.error('查询报告失败:', reportError);
      return NextResponse.json({ error: '查询报告失败' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    // 查询指标数据
    const { data: indicators, error: indicatorsError } = await supabase
      .from('medical_indicators')
      .select('*')
      .eq('reportId', reportId)
      .order('indicatorType', { ascending: true })
      .order('createdAt', { ascending: true });

    if (indicatorsError) {
      console.error('查询指标失败:', indicatorsError);
    }

    return NextResponse.json(
      {
        data: {
          ...report,
          indicators: indicators || [],
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('查询报告详情失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * PATCH /api/members/:memberId/reports/:reportId
 * 手动修正OCR识别结果
 *
 * Migrated from Prisma to Supabase
 */
export async function PATCH(
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
      return NextResponse.json({ error: '无权限修改该报告' }, { status: 403 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查询报告
    const { data: report, error: reportError } = await supabase
      .from('medical_reports')
      .select('id')
      .eq('id', reportId)
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .maybeSingle();

    if (reportError) {
      console.error('查询报告失败:', reportError);
      return NextResponse.json({ error: '查询报告失败' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    // 更新报告元数据
    const updateData: any = {};

    if (body.reportDate !== undefined) {
      updateData.reportDate = body.reportDate
        ? new Date(body.reportDate).toISOString()
        : null;
    }

    if (body.institution !== undefined) {
      updateData.institution = body.institution || null;
    }

    if (body.reportType !== undefined) {
      updateData.reportType = body.reportType || null;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.isCorrected = true;
      updateData.correctedAt = now;
      updateData.updatedAt = now;
    }

    // 更新指标
    if (body.indicators && Array.isArray(body.indicators)) {
      for (const indicatorUpdate of body.indicators) {
        const { id, value, unit, referenceRange, status } = indicatorUpdate;

        if (!id) {
          continue;
        }

        // 查询原始指标
        const { data: indicator, error: indicatorError } = await supabase
          .from('medical_indicators')
          .select('*')
          .eq('id', id)
          .eq('reportId', reportId)
          .maybeSingle();

        if (indicatorError) {
          console.error('查询指标失败:', indicatorError);
          continue;
        }

        if (indicator) {
          // 更新指标
          const { error: updateIndicatorError } = await supabase
            .from('medical_indicators')
            .update({
              value: value !== undefined ? value : indicator.value,
              unit: unit || indicator.unit,
              referenceRange:
                referenceRange !== undefined
                  ? referenceRange
                  : indicator.referenceRange,
              status: (status as IndicatorStatus) || indicator.status,
              isAbnormal: status !== 'NORMAL',
              isCorrected: true,
              originalValue: indicator.originalValue || indicator.value,
              updatedAt: now,
            })
            .eq('id', id);

          if (updateIndicatorError) {
            console.error('更新指标失败:', updateIndicatorError);
          }
        }
      }

      updateData.isCorrected = true;
      updateData.correctedAt = now;
      updateData.updatedAt = now;
    }

    // 更新报告
    if (Object.keys(updateData).length > 0) {
      const { error: updateReportError } = await supabase
        .from('medical_reports')
        .update(updateData)
        .eq('id', reportId);

      if (updateReportError) {
        console.error('更新报告失败:', updateReportError);
        return NextResponse.json({ error: '更新报告失败' }, { status: 500 });
      }
    }

    // 重新查询完整数据
    const { data: updatedReport } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    const { data: updatedIndicators } = await supabase
      .from('medical_indicators')
      .select('*')
      .eq('reportId', reportId)
      .order('indicatorType', { ascending: true })
      .order('createdAt', { ascending: true });

    return NextResponse.json(
      {
        message: '报告修正成功',
        data: {
          ...updatedReport,
          indicators: updatedIndicators || [],
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('修正报告失败:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/members/:memberId/reports/:reportId
 * 删除报告（同时删除云存储文件）
 *
 * Migrated from Prisma to Supabase
 */
export async function DELETE(
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
      return NextResponse.json({ error: '无权限删除该报告' }, { status: 403 });
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查询报告
    const { data: report, error: reportError } = await supabase
      .from('medical_reports')
      .select('id, fileUrl')
      .eq('id', reportId)
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .maybeSingle();

    if (reportError) {
      console.error('查询报告失败:', reportError);
      return NextResponse.json({ error: '查询报告失败' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: '报告不存在' }, { status: 404 });
    }

    // 从云存储删除文件
    try {
      const pathname = fileStorageService.extractPathnameFromUrl(
        report.fileUrl,
      );
      if (pathname) {
        await fileStorageService.deleteFile(pathname);
      }
    } catch (error) {
      console.warn('删除云存储文件失败（继续删除数据库记录）:', error);
    }

    const now = new Date().toISOString();

    // 软删除报告（标记deletedAt）
    const { error: deleteReportError } = await supabase
      .from('medical_reports')
      .update({
        deletedAt: now,
        updatedAt: now,
      })
      .eq('id', reportId);

    if (deleteReportError) {
      console.error('软删除报告失败:', deleteReportError);
      return NextResponse.json({ error: '删除报告失败' }, { status: 500 });
    }

    // 删除关联的指标记录（硬删除）
    const { error: deleteIndicatorsError } = await supabase
      .from('medical_indicators')
      .delete()
      .eq('reportId', reportId);

    if (deleteIndicatorsError) {
      console.error('删除指标记录失败:', deleteIndicatorsError);
    }

    return NextResponse.json({ message: '报告删除成功' }, { status: 200 });
  } catch (error) {
    console.error('删除报告失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
