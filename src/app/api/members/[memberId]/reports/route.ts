import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { OcrService, type SupportedMimeType } from "@/lib/services/ocr-service";
import { ReportParser } from "@/lib/services/report-parser";
import { FileStorageService } from "@/lib/services/file-storage-service";

export const dynamic = "force-dynamic";

interface FamilyMember {
  id: string;
  userId: string | null;
  familyId: string;
  role?: string;
}

interface Family {
  id: string;
  creatorId: string;
}

interface MedicalReport {
  id: string;
  memberId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string | null;
  ocrStatus: string;
  ocrText: string | null;
  ocrError: string | null;
  reportDate: string | null;
  institution: string | null;
  reportType: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface MedicalIndicator {
  id: string;
  reportId: string;
  indicatorType: string;
  name: string;
  value: number;
  unit: string;
  referenceRange: string | null;
  isAbnormal: boolean;
  status: string;
}

async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: FamilyMember | null }> {
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false, member: null };
  }

  const family = await neonAdapter.family.findFirst<Family>({
    where: { id: member.familyId },
  });

  const isCreator = family?.creatorId === userId;

  let isAdmin = false;
  if (!isCreator) {
    const adminMember = await neonAdapter.familyMember.findFirst<FamilyMember>({
      where: {
        familyId: member.familyId,
        userId: userId,
        role: "ADMIN",
        deletedAt: null,
      },
    });

    isAdmin = !!adminMember;
  }

  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    member,
  };
}

async function processOCR(reportId: string, fileBuffer: Buffer, mimeType: SupportedMimeType) {
  try {
    const ocrResult = await OcrService.recognize(fileBuffer, mimeType);
    const parsedReport = ReportParser.parse(ocrResult.text);
    const validation = ReportParser.validate(parsedReport);

    const updateData: Record<string, unknown> = {
      ocrStatus: validation.valid ? "COMPLETED" : "FAILED",
      ocrText: ocrResult.text,
      reportDate: parsedReport.reportDate ? new Date(parsedReport.reportDate).toISOString() : null,
      institution: parsedReport.institution || null,
      reportType: parsedReport.reportType || null,
    };

    if (!validation.valid) {
      updateData.ocrError = validation.errors.join("; ");
    }

    await neonAdapter.medicalReport.update({
      where: { id: reportId },
      data: updateData,
    });

    if (validation.valid && parsedReport.indicators.length > 0) {
      for (const indicator of parsedReport.indicators) {
        await neonAdapter.medicalIndicator.create({
          data: {
            reportId,
            indicatorType: indicator.indicatorType,
            name: indicator.name,
            value: indicator.value,
            unit: indicator.unit,
            referenceRange: indicator.referenceRange || null,
            isAbnormal: indicator.isAbnormal,
            status: indicator.status,
          },
        });
      }
    }
  } catch (error) {
    console.error("OCR处理失败:", error);

    await neonAdapter.medicalReport.update({
      where: { id: reportId },
      data: {
        ocrStatus: "FAILED",
        ocrError: error instanceof Error ? error.message : "OCR处理失败",
      },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限为该成员上传报告" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    }

    const mimeType = file.type;
    if (!OcrService.isSupportedMimeType(mimeType)) {
      return NextResponse.json(
        {
          error: "不支持的文件类型",
          supportedTypes: ["application/pdf", "image/jpeg", "image/png"],
        },
        { status: 400 }
      );
    }

    if (!OcrService.validateFileSize(file.size)) {
      return NextResponse.json({ error: "文件大小超过限制（最大10MB）" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const report = await neonAdapter.medicalReport.create<MedicalReport>({
      data: {
        memberId,
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        ocrStatus: "PROCESSING",
      },
    });

    try {
      const uploadResult = await FileStorageService.uploadFile(fileBuffer, file.name, memberId, {
        contentType: mimeType as SupportedMimeType,
      });

      await neonAdapter.medicalReport.update({
        where: { id: report.id },
        data: { fileUrl: uploadResult.url },
      });

      processOCR(report.id, fileBuffer, mimeType as SupportedMimeType).catch((error) => {
        console.error("OCR处理失败:", error);
      });

      return NextResponse.json(
        {
          message: "文件上传成功，正在处理OCR识别",
          reportId: report.id,
          status: "PROCESSING",
        },
        { status: 202 }
      );
    } catch (error) {
      await neonAdapter.medicalReport.delete({ where: { id: report.id } });
      throw error;
    }
  } catch (error) {
    console.error("上传报告失败:", error);
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限查看该成员的报告" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = { memberId, deletedAt: null };
    if (status) {
      whereClause.ocrStatus = status;
    }

    const reports = await neonAdapter.medicalReport.findMany<MedicalReport>({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const count = await neonAdapter.medicalReport.count({ where: whereClause });

    if (!reports || reports.length === 0) {
      return NextResponse.json({ data: [], total: count || 0, limit, offset }, { status: 200 });
    }

    const reportIds = reports.map((r) => r.id);
    const indicators = await neonAdapter.medicalIndicator.findMany<MedicalIndicator>({
      where: { reportId: { in: reportIds } },
    });

    const indicatorsMap = new Map<string, MedicalIndicator[]>();
    indicators?.forEach((indicator) => {
      if (!indicatorsMap.has(indicator.reportId)) {
        indicatorsMap.set(indicator.reportId, []);
      }
      indicatorsMap.get(indicator.reportId)!.push(indicator);
    });

    const assembledReports = reports.map((report) => ({
      ...report,
      indicators: indicatorsMap.get(report.id) || [],
    }));

    return NextResponse.json(
      { data: assembledReports, total: count || 0, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error("查询报告列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
