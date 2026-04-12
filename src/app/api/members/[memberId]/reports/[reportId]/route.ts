import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import { FileStorageService } from "@/lib/services/file-storage-service";

export const dynamic = "force-dynamic";

// Convex ID type helper
type Id<TableName extends string> = string & { __tableName: TableName };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> }
) {
  try {
    const { memberId, reportId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限查看该报告" }, { status: 403 });
    }

    const report = await convexClient.query(api.health.getMedicalReportById, {
      reportId: reportId as Id<"medicalReports">,
    });

    if (!report || report.memberId !== memberId) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const indicators = await convexClient.query(api.health.listIndicatorsByReport, {
      reportId: reportId as Id<"medicalReports">,
    });

    return NextResponse.json(
      { data: { ...report, id: report._id, indicators: indicators || [] } },
      { status: 200 }
    );
  } catch (error) {
    console.error("查询报告详情失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> }
) {
  try {
    const { memberId, reportId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限修改该报告" }, { status: 403 });
    }

    const report = await convexClient.query(api.health.getMedicalReportById, {
      reportId: reportId as Id<"medicalReports">,
    });

    if (!report || report.memberId !== memberId) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const body = await request.json();
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {};

    if (body.reportDate !== undefined) {
      updateData.reportDate = body.reportDate ? new Date(body.reportDate).toISOString() : null;
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
    }

    if (body.indicators && Array.isArray(body.indicators)) {
      for (const indicatorUpdate of body.indicators) {
        const { id, value, unit, referenceRange, status } = indicatorUpdate;

        if (!id) continue;

        const indicator = await convexClient.query(api.health.getMedicalIndicatorById, {
          indicatorId: id as Id<"medicalIndicators">,
        });

        if (indicator && indicator.reportId === reportId) {
          await convexClient.mutation(api.health.updateMedicalIndicator, {
            indicatorId: id as Id<"medicalIndicators">,
            value: value !== undefined ? value : indicator.value,
            unit: unit || indicator.unit,
            referenceRange:
              referenceRange !== undefined ? referenceRange : indicator.referenceRange,
            status: status || indicator.status,
            isAbnormal: status !== "NORMAL",
            isCorrected: true,
            originalValue: indicator.originalValue || indicator.value,
          });
        }
      }

      updateData.isCorrected = true;
      updateData.correctedAt = now;
    }

    if (Object.keys(updateData).length > 0) {
      await convexClient.mutation(api.health.updateMedicalReport, {
        reportId: reportId as Id<"medicalReports">,
        ...updateData,
      });
    }

    const updatedReport = await convexClient.query(api.health.getMedicalReportById, {
      reportId: reportId as Id<"medicalReports">,
    });

    const updatedIndicators = await convexClient.query(api.health.listIndicatorsByReport, {
      reportId: reportId as Id<"medicalReports">,
    });

    return NextResponse.json(
      {
        message: "报告修正成功",
        data: { ...updatedReport, id: updatedReport?._id, indicators: updatedIndicators || [] },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("修正报告失败:", error);
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; reportId: string }> }
) {
  try {
    const { memberId, reportId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限删除该报告" }, { status: 403 });
    }

    const report = await convexClient.query(api.health.getMedicalReportById, {
      reportId: reportId as Id<"medicalReports">,
    });

    if (!report || report.memberId !== memberId) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    try {
      if (report.fileUrl) {
        const pathname = FileStorageService.extractPathnameFromUrl(report.fileUrl);
        if (pathname) {
          await FileStorageService.deleteFile(pathname);
        }
      }
    } catch (error) {
      console.warn("删除云存储文件失败（继续删除数据库记录）:", error);
    }

    // 获取所有指标 ID 并批量删除
    const indicators = await convexClient.query(api.health.listIndicatorsByReport, {
      reportId: reportId as Id<"medicalReports">,
    });

    if (indicators && indicators.length > 0) {
      const indicatorIds = indicators.map((i) => i._id as Id<"medicalIndicators">);
      await convexClient.mutation(api.health.deleteManyMedicalIndicators, {
        indicatorIds,
      });
    }

    // 软删除报告
    await convexClient.mutation(api.health.deleteMedicalReport, {
      reportId: reportId as Id<"medicalReports">,
    });

    return NextResponse.json({ message: "报告删除成功" }, { status: 200 });
  } catch (error) {
    console.error("删除报告失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
