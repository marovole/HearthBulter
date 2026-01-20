import { NextRequest, NextResponse } from "next/server";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { auth } from "@/lib/auth";
import { ReportType } from "@prisma/client";
import { createReport } from "@/lib/services/analytics/report-generator";
import { requireMemberDataAccess } from "@/lib/middleware/authorization";

/**
 * GET /api/analytics/reports
 * 获取报告列表
 *
 * Migrated from Supabase to Neon
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const reportType = searchParams.get("reportType") as ReportType | null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    if (!memberId) {
      return NextResponse.json({ error: "缺少必要参数：memberId" }, { status: 400 });
    }

    const accessResult = await requireMemberDataAccess(session.user.id, memberId);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || "无权访问此成员数据" },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = {
      memberId,
      deletedAt: null,
    };

    if (reportType) {
      where.reportType = reportType;
    }

    const [reports, total] = await Promise.all([
      neonAdapter.healthReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      neonAdapter.healthReport.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports: reports || [],
        pagination: {
          page,
          pageSize,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("Failed to get reports:", error);
    return NextResponse.json({ error: "获取报告列表失败" }, { status: 500 });
  }
}

/**
 * POST /api/analytics/reports
 * 生成新报告
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, reportType, startDate, endDate } = body;

    if (!memberId || !reportType) {
      return NextResponse.json({ error: "缺少必要参数：memberId, reportType" }, { status: 400 });
    }

    const accessResult = await requireMemberDataAccess(session.user.id, memberId);
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || "无权访问此成员数据" },
        { status: 403 }
      );
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const report = await createReport(memberId, reportType as ReportType, start, end);

    return NextResponse.json({
      success: true,
      data: report,
      message: "报告生成成功",
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json({ error: "生成报告失败" }, { status: 500 });
  }
}
