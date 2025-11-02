import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ocrService, type SupportedMimeType } from '@/lib/services/ocr-service';
import { reportParser } from '@/lib/services/report-parser';
import { fileStorageService } from '@/lib/services/file-storage-service';

/**
 * 验证用户是否有权限访问成员的健康数据
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId, deletedAt: null },
    include: {
      family: {
        select: {
          creatorId: true,
          members: {
            where: { userId, deletedAt: null },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!member) {
    return { hasAccess: false, member: null };
  }

  const isCreator = member.family.creatorId === userId;
  const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
  const isSelf = member.userId === userId;

  return {
    hasAccess: isAdmin || isSelf,
    member,
  };
}

/**
 * POST /api/members/:memberId/reports
 * 上传体检报告文件并触发OCR识别
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

    // 创建报告记录（初始状态为PENDING）
    const report = await prisma.medicalReport.create({
      data: {
        memberId,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        ocrStatus: 'PROCESSING',
      },
    });

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
      await prisma.medicalReport.update({
        where: { id: report.id },
        data: {
          fileUrl: uploadResult.url,
        },
      });

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
      await prisma.medicalReport.delete({
        where: { id: report.id },
      });

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
 */
async function processOCR(
  reportId: string,
  fileBuffer: Buffer,
  mimeType: SupportedMimeType
) {
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
      reportDate: parsedReport.reportDate || null,
      institution: parsedReport.institution || null,
      reportType: parsedReport.reportType || null,
    };

    if (!validation.valid) {
      updateData.ocrError = validation.errors.join('; ');
    }

    await prisma.medicalReport.update({
      where: { id: reportId },
      data: updateData,
    });

    // 如果解析成功，创建指标记录
    if (validation.valid && parsedReport.indicators.length > 0) {
      await prisma.medicalIndicator.createMany({
        data: parsedReport.indicators.map((indicator) => ({
          reportId,
          indicatorType: indicator.indicatorType,
          name: indicator.name,
          value: indicator.value,
          unit: indicator.unit,
          referenceRange: indicator.referenceRange || null,
          isAbnormal: indicator.isAbnormal,
          status: indicator.status,
        })),
      });
    }
  } catch (error) {
    console.error('OCR处理失败:', error);

    // 更新报告状态为失败
    await prisma.medicalReport.update({
      where: { id: reportId },
      data: {
        ocrStatus: 'FAILED',
        ocrError:
          error instanceof Error ? error.message : 'OCR处理失败',
      },
    });
  }
}

/**
 * GET /api/members/:memberId/reports
 * 查询成员的历史报告列表
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

    // 构建查询条件
    const where: any = {
      memberId,
      deletedAt: null,
    };

    if (status) {
      where.ocrStatus = status;
    }

    // 查询报告列表
    const [reports, total] = await Promise.all([
      prisma.medicalReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          indicators: {
            select: {
              id: true,
              indicatorType: true,
              name: true,
              value: true,
              unit: true,
              isAbnormal: true,
              status: true,
            },
          },
        },
      }),
      prisma.medicalReport.count({ where }),
    ]);

    return NextResponse.json(
      {
        data: reports,
        total,
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

