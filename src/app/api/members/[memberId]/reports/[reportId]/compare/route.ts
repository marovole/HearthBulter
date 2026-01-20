import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";

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
  reportDate: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface MedicalIndicator {
  id: string;
  reportId: string;
  indicatorType: string;
  name: string;
  value: number;
  unit: string;
  status: string;
}

type IndicatorType =
  | "TOTAL_CHOLESTEROL"
  | "LDL_CHOLESTEROL"
  | "HDL_CHOLESTEROL"
  | "TRIGLYCERIDES"
  | "FASTING_GLUCOSE"
  | "POSTPRANDIAL_GLUCOSE"
  | "GLYCATED_HEMOGLOBIN"
  | "ALT"
  | "AST"
  | "TOTAL_BILIRUBIN"
  | "DIRECT_BILIRUBIN"
  | "ALP"
  | "CREATININE"
  | "UREA_NITROGEN"
  | "URIC_ACID"
  | "WHITE_BLOOD_CELL"
  | "RED_BLOOD_CELL"
  | "HEMOGLOBIN"
  | "PLATELET"
  | "OTHER";

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

    const currentReport = await neonAdapter.medicalReport.findFirst<MedicalReport>({
      where: { id: reportId, memberId, deletedAt: null },
    });

    if (!currentReport) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const currentIndicators = await neonAdapter.medicalIndicator.findMany<MedicalIndicator>({
      where: { reportId },
    });

    const previousReports = await neonAdapter.medicalReport.findMany<MedicalReport>({
      where: {
        memberId,
        deletedAt: null,
        id: { not: reportId },
        ...(currentReport.reportDate ? { reportDate: { lt: currentReport.reportDate } } : {}),
      },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      take: 1,
    });

    const previousReport = previousReports?.[0];

    if (!previousReport) {
      return NextResponse.json({
        message: "暂无历史报告可对比",
        current: {
          reportId: currentReport.id,
          reportDate: currentReport.reportDate,
          indicators: currentIndicators || [],
        },
      });
    }

    const previousIndicators = await neonAdapter.medicalIndicator.findMany<MedicalIndicator>({
      where: { reportId: previousReport.id },
    });

    const comparison: Array<{
      indicatorType: IndicatorType;
      name: string;
      unit: string;
      previousValue?: number;
      currentValue: number;
      change?: number;
      changePercent?: number;
      trend: "improved" | "worsened" | "stable" | "new";
      previousStatus?: string;
      currentStatus: string;
    }> = [];

    const previousIndicatorsMap = new Map(
      (previousIndicators || []).map((ind) => [ind.indicatorType, ind])
    );

    const currentIndicatorsMap = new Map(
      (currentIndicators || []).map((ind) => [ind.indicatorType, ind])
    );

    for (const [type, current] of currentIndicatorsMap) {
      const previous = previousIndicatorsMap.get(type);

      if (previous) {
        const change = current.value - previous.value;
        const changePercent =
          previous.value !== 0 ? ((change / previous.value) * 100).toFixed(2) : "0";

        let trend: "improved" | "worsened" | "stable" = "stable";

        if (current.status === "NORMAL" && previous.status !== "NORMAL") {
          trend = "improved";
        } else if (current.status !== "NORMAL" && previous.status === "NORMAL") {
          trend = "worsened";
        } else if (current.status === "CRITICAL" && previous.status !== "CRITICAL") {
          trend = "worsened";
        } else if (current.status !== "CRITICAL" && previous.status === "CRITICAL") {
          trend = "improved";
        } else if (Math.abs(change / previous.value) < 0.05) {
          trend = "stable";
        }

        comparison.push({
          indicatorType: type as IndicatorType,
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
        comparison.push({
          indicatorType: type as IndicatorType,
          name: current.name,
          unit: current.unit,
          currentValue: current.value,
          trend: "new",
          currentStatus: current.status,
        });
      }
    }

    for (const [type, previous] of previousIndicatorsMap) {
      if (!currentIndicatorsMap.has(type)) {
        comparison.push({
          indicatorType: type as IndicatorType,
          name: previous.name,
          unit: previous.unit,
          previousValue: previous.value,
          currentValue: previous.value,
          trend: "new",
          previousStatus: previous.status,
          currentStatus: "NORMAL",
        });
      }
    }

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

    comparison.sort((a, b) => {
      return (typeOrder[a.indicatorType] || 99) - (typeOrder[b.indicatorType] || 99);
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
        improved: comparison.filter((c) => c.trend === "improved").length,
        worsened: comparison.filter((c) => c.trend === "worsened").length,
        stable: comparison.filter((c) => c.trend === "stable").length,
        new: comparison.filter((c) => c.trend === "new").length,
      },
    });
  } catch (error) {
    console.error("对比报告失败:", error);
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
