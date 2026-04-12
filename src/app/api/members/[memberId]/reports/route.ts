import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import { OcrService, type SupportedMimeType } from "@/lib/services/ocr-service";
import { ReportParser } from "@/lib/services/report-parser";
import { FileStorageService } from "@/lib/services/file-storage-service";

export const dynamic = "force-dynamic";

// Convex ID type helper
type Id<TableName extends string> = string & { __tableName: TableName };

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

    await convexClient.mutation(api.health.updateMedicalReport, {
      reportId: reportId as Id<"medicalReports">,
      ...updateData,
    });

    if (validation.valid && parsedReport.indicators.length > 0) {
      for (const indicator of parsedReport.indicators) {
        await convexClient.mutation(api.health.createMedicalIndicator, {
          reportId: reportId as Id<"medicalReports">,
          indicatorType: indicator.indicatorType,
          name: indicator.name,
          value: indicator.value,
          unit: indicator.unit,
          referenceRange: indicator.referenceRange || null,
          isAbnormal: indicator.isAbnormal,
          status: indicator.status,
        });
      }
    }
  } catch (error) {
    console.error("OCR处理失败:", error);

    await convexClient.mutation(api.health.updateMedicalReport, {
      reportId: reportId as Id<"medicalReports">,
      ocrStatus: "FAILED",
      ocrError: error instanceof Error ? error.message : "OCR处理失败",
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

    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

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

    const report = await convexClient.mutation(api.health.createMedicalReport, {
      memberId: memberId as Id<"familyMembers">,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      ocrStatus: "PROCESSING",
    });

    try {
      const uploadResult = await FileStorageService.uploadFile(fileBuffer, file.name, memberId, {
        contentType: mimeType as SupportedMimeType,
      });

      await convexClient.mutation(api.health.updateMedicalReport, {
        reportId: report._id as Id<"medicalReports">,
        fileUrl: uploadResult.url,
      });

      processOCR(report._id, fileBuffer, mimeType as SupportedMimeType).catch((error) => {
        console.error("OCR处理失败:", error);
      });

      return NextResponse.json(
        {
          message: "文件上传成功，正在处理OCR识别",
          reportId: report._id,
          status: "PROCESSING",
        },
        { status: 202 }
      );
    } catch (error) {
      await convexClient.mutation(api.health.deleteMedicalReport, {
        reportId: report._id as Id<"medicalReports">,
      });
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

    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限查看该成员的报告" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    // 获取报告列表（Convex 返回所有，客户端过滤和分页）
    const reports = await convexClient.query(api.health.listMedicalReportsByMember, {
      memberId: memberId as Id<"familyMembers">,
      limit: limit + offset, // 获取足够多的数据用于客户端分页
    });

    // 客户端过滤 status
    let filteredReports = reports;
    if (status) {
      filteredReports = reports.filter((r) => r.ocrStatus === status);
    }

    // 客户端分页
    const total = filteredReports.length;
    const paginatedReports = filteredReports.slice(offset, offset + limit);

    if (!paginatedReports || paginatedReports.length === 0) {
      return NextResponse.json({ data: [], total, limit, offset }, { status: 200 });
    }

    // 获取所有报告的指标
    const reportsWithIndicators = await Promise.all(
      paginatedReports.map(async (report) => {
        const indicators = await convexClient.query(api.health.listIndicatorsByReport, {
          reportId: report._id as Id<"medicalReports">,
        });
        return {
          ...report,
          id: report._id,
          indicators: indicators || [],
        };
      })
    );

    return NextResponse.json(
      { data: reportsWithIndicators, total, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error("查询报告列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
