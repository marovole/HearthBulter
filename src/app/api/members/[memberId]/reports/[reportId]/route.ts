import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";
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
  fileUrl: string | null;
  reportDate: string | null;
  institution: string | null;
  reportType: string | null;
  isCorrected: boolean;
  correctedAt: string | null;
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
  isCorrected: boolean;
  originalValue: number | null;
}

async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
  const member = await neonAdapter.familyMember.findFirst<FamilyMember>({
    where: { id: memberId, deletedAt: null },
  });

  if (!member) {
    return { hasAccess: false };
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
  };
}

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

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限查看该报告" }, { status: 403 });
    }

    const report = await neonAdapter.medicalReport.findFirst<MedicalReport>({
      where: { id: reportId, memberId, deletedAt: null },
    });

    if (!report) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const indicators = await neonAdapter.medicalIndicator.findMany<MedicalIndicator>({
      where: { reportId },
      orderBy: [{ indicatorType: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(
      { data: { ...report, indicators: indicators || [] } },
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

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限修改该报告" }, { status: 403 });
    }

    const report = await neonAdapter.medicalReport.findFirst<MedicalReport>({
      where: { id: reportId, memberId, deletedAt: null },
    });

    if (!report) {
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

        const indicator = await neonAdapter.medicalIndicator.findFirst<MedicalIndicator>({
          where: { id, reportId },
        });

        if (indicator) {
          await neonAdapter.medicalIndicator.update({
            where: { id },
            data: {
              value: value !== undefined ? value : indicator.value,
              unit: unit || indicator.unit,
              referenceRange:
                referenceRange !== undefined ? referenceRange : indicator.referenceRange,
              status: status || indicator.status,
              isAbnormal: status !== "NORMAL",
              isCorrected: true,
              originalValue: indicator.originalValue || indicator.value,
            },
          });
        }
      }

      updateData.isCorrected = true;
      updateData.correctedAt = now;
    }

    if (Object.keys(updateData).length > 0) {
      await neonAdapter.medicalReport.update({
        where: { id: reportId },
        data: updateData,
      });
    }

    const updatedReport = await neonAdapter.medicalReport.findFirst<MedicalReport>({
      where: { id: reportId },
    });

    const updatedIndicators = await neonAdapter.medicalIndicator.findMany<MedicalIndicator>({
      where: { reportId },
      orderBy: [{ indicatorType: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(
      { message: "报告修正成功", data: { ...updatedReport, indicators: updatedIndicators || [] } },
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

    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限删除该报告" }, { status: 403 });
    }

    const report = await neonAdapter.medicalReport.findFirst<MedicalReport>({
      where: { id: reportId, memberId, deletedAt: null },
    });

    if (!report) {
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

    const now = new Date().toISOString();

    await neonAdapter.medicalReport.update({
      where: { id: reportId },
      data: { deletedAt: now },
    });

    await neonAdapter.medicalIndicator.deleteMany({ where: { reportId } });

    return NextResponse.json({ message: "报告删除成功" }, { status: 200 });
  } catch (error) {
    console.error("删除报告失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
