import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { ocrService, type SupportedMimeType } from '@/lib/services/ocr-service';
import { reportParser } from '@/lib/services/report-parser';
import { fileStorageService } from '@/lib/services/file-storage-service';

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Prisma to Supabase
 * Note: fileStorageService, ocrService, reportParser still use Prisma-dependent logic
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(`
      id,
      userId,
      familyId,
      family:families!inner(
        id,
        creatorId
      )
    `)
    .eq('id', memberId)
    .is('deletedAt', null)
    .single();

  if (!member) {
    return { hasAccess: false, member: null };
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
    member,
  };
}

/**
 * POST /api/members/:memberId/reports
 * 上传体检报告文件并触发OCR识别
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员上传报告' },
        { status: 403 }
      );
    }

    // 解析FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const mimeType = file.type;
    if (!ocrService.isSupportedMimeType(mimeType)) {
      return NextResponse.json(
        {
          error: '不支持的文件类型',
          supportedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (!ocrService.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: '文件大小超过限制（最大10MB）' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const supabase = SupabaseClientManager.getInstance();

    // 创建报告记录（初始状态为PROCESSING）
    const { data: report, error: createError } = await supabase
      .from('medical_reports')
      .insert({
        memberId,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        ocrStatus: 'PROCESSING',
      })
      .select('id')
      .single();

    if (createError || !report) {
      console.error('创建报告记录失败:', createError);
      throw createError ?? new Error('创建报告记录失败');
    }

    try {
      // 上传文件到云存储
      const uploadResult = await fileStorageService.uploadFile(
        fileBuffer,
        file.name,
        memberId,
        {
          contentType: mimeType,
        }
      );

      // 更新报告记录，保存文件URL
      const { error: updateError } = await supabase
        .from('medical_reports')
        .update({
          fileUrl: uploadResult.url,
        })
        .eq('id', report.id);

      if (updateError) {
        console.error('更新文件URL失败:', updateError);
        // 回滚：删除报告记录
        await supabase
          .from('medical_reports')
          .delete()
          .eq('id', report.id);

        throw updateError;
      }

      // 执行OCR识别（异步处理，不阻塞响应）
      processOCR(report.id, fileBuffer, mimeType).catch((error) => {
        console.error('OCR处理失败:', error);
      });

      // 立即返回响应
      return NextResponse.json(
        {
          message: '文件上传成功，正在处理OCR识别',
          reportId: report.id,
          status: 'PROCESSING',
        },
        { status: 202 } // Accepted - 异步处理中
      );
    } catch (error) {
      // 如果上传失败，删除报告记录
      await supabase
        .from('medical_reports')
        .delete()
        .eq('id', report.id);

      throw error;
    }
  } catch (error) {
    console.error('上传报告失败:', error);
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 异步处理OCR识别和报告解析
 *
 * Migrated from Prisma to Supabase
 */
async function processOCR(
  reportId: string,
  fileBuffer: Buffer,
  mimeType: SupportedMimeType
) {
  const supabase = SupabaseClientManager.getInstance();

  try {
    // 执行OCR识别
    const ocrResult = await ocrService.recognize(fileBuffer, mimeType);

    // 解析报告内容
    const parsedReport = reportParser.parse(ocrResult.text);

    // 验证解析结果
    const validation = reportParser.validate(parsedReport);

    // 更新报告记录
    const updateData: any = {
      ocrStatus: validation.valid ? 'COMPLETED' : 'FAILED',
      ocrText: ocrResult.text,
      reportDate: parsedReport.reportDate
        ? new Date(parsedReport.reportDate).toISOString()
        : null,
      institution: parsedReport.institution || null,
      reportType: parsedReport.reportType || null,
    };

    if (!validation.valid) {
      updateData.ocrError = validation.errors.join('; ');
    }

    const { error: updateError } = await supabase
      .from('medical_reports')
      .update(updateData)
      .eq('id', reportId);

    if (updateError) {
      console.error('更新报告OCR结果失败:', updateError);
      throw updateError;
    }

    // 如果解析成功，批量创建指标记录
    if (validation.valid && parsedReport.indicators.length > 0) {
      const indicatorsToInsert = parsedReport.indicators.map((indicator) => ({
        reportId,
        indicatorType: indicator.indicatorType,
        name: indicator.name,
        value: indicator.value,
        unit: indicator.unit,
        referenceRange: indicator.referenceRange || null,
        isAbnormal: indicator.isAbnormal,
        status: indicator.status,
      }));

      const { error: indicatorError } = await supabase
        .from('medical_indicators')
        .insert(indicatorsToInsert);

      if (indicatorError) {
        console.error('批量创建指标失败:', indicatorError);
        throw indicatorError;
      }
    }
  } catch (error) {
    console.error('OCR处理失败:', error);

    // 更新报告状态为失败
    await supabase
      .from('medical_reports')
      .update({
        ocrStatus: 'FAILED',
        ocrError:
          error instanceof Error ? error.message : 'OCR处理失败',
      })
      .eq('id', reportId);
  }
}

/**
 * GET /api/members/:memberId/reports
 * 查询成员的历史报告列表
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限查看该成员的报告' },
        { status: 403 }
      );
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // OCR状态筛选

    const supabase = SupabaseClientManager.getInstance();

    // 构建查询
    let query = supabase
      .from('medical_reports')
      .select('*', { count: 'exact' })
      .eq('memberId', memberId)
      .is('deletedAt', null);

    if (status) {
      query = query.eq('ocrStatus', status);
    }

    // 查询报告列表（带分页）
    const { data: reports, error: reportsError, count } = await query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reportsError) {
      console.error('查询报告列表失败:', reportsError);
      return NextResponse.json(
        { error: '查询报告列表失败' },
        { status: 500 }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        {
          data: [],
          total: count || 0,
          limit,
          offset,
        },
        { status: 200 }
      );
    }

    // 查询所有报告的指标
    const reportIds = reports.map(r => r.id);
    const { data: indicators, error: indicatorsError } = await supabase
      .from('medical_indicators')
      .select('id, reportId, indicatorType, name, value, unit, isAbnormal, status')
      .in('reportId', reportIds);

    if (indicatorsError) {
      console.error('查询指标失败:', indicatorsError);
      return NextResponse.json(
        { error: '查询指标失败' },
        { status: 500 }
      );
    }

    // 手动组装数据
    const indicatorsMap = new Map<string, any[]>();
    indicators?.forEach(indicator => {
      if (!indicatorsMap.has(indicator.reportId)) {
        indicatorsMap.set(indicator.reportId, []);
      }
      indicatorsMap.get(indicator.reportId)!.push(indicator);
    });

    const assembledReports = reports.map(report => ({
      ...report,
      indicators: indicatorsMap.get(report.id) || [],
    }));

    return NextResponse.json(
      {
        data: assembledReports,
        total: count || 0,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('查询报告列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

