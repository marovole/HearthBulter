import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";

export const dynamic = "force-dynamic";

// Convex ID type helper
type Id<TableName extends string> = string & { __tableName: TableName };

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

    const currentReport = await convexClient.query(api.health.getMedicalReportById, {
      reportId: reportId as Id<"medicalReports">,
    });

    if (!currentReport || currentReport.memberId !== memberId) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const currentIndicators = await convexClient.query(api.health.listIndicatorsByReport, {
      reportId: reportId as Id<"medicalReports">,
    });

    // 获取所有报告并客户端过滤找到上一个报告
    const allReports = await convexClient.query(api.health.listMedicalReportsByMember, {
      memberId: memberId as Id<"familyMembers">,
      limit: 100, // 获取足够多的历史记录
    });

    // 客户端过滤：排除当前报告，且报告日期早于当前报告
    const previousReports = allReports
      .filter((r) => {
        if (r._id === reportId) return false;
        if (!currentReport.reportDate) return true; // 如果当前报告无日期，取任意历史报告
        if (!r.reportDate) return false;
        return new Date(r.reportDate) < new Date(currentReport.reportDate);
      })
      .sort((a, b) => {
        // 按报告日期降序，然后按创建日期降序
        const dateA = a.reportDate
          ? new Date(a.reportDate).getTime()
          : new Date(a._creationTime).getTime();
        const dateB = b.reportDate
          ? new Date(b.reportDate).getTime()
          : new Date(b._creationTime).getTime();
        return dateB - dateA;
      });

    const previousReport = previousReports?.[0];

    if (!previousReport) {
      return NextResponse.json({
        message: "暂无历史报告可对比",
        current: {
          reportId: currentReport._id,
          reportDate: currentReport.reportDate,
          indicators: currentIndicators || [],
        },
      });
    }

    const previousIndicators = await convexClient.query(api.health.listIndicatorsByReport, {
      reportId: previousReport._id as Id<"medicalReports">,
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
        reportId: previousReport._id,
        reportDate: previousReport.reportDate,
        createdAt: new Date(previousReport._creationTime).toISOString(),
      },
      current: {
        reportId: currentReport._id,
        reportDate: currentReport.reportDate,
        createdAt: new Date(currentReport._creationTime).toISOString(),
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
