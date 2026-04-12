import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import { auth } from "@/lib/auth";
import { ReportType } from "@/types/enums";
import { createReport } from "@/lib/services/analytics/report-generator";
import { requireMemberDataAccess } from "@/lib/middleware/authorization";

// Convex ID type alias
type Id<TableName extends string> = string & { __tableName: TableName };

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

    // Use a wide date range to get all reports (10 years back to 1 year future)
    const endDate = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const startDate = endDate - 10 * 365 * 24 * 60 * 60 * 1000;

    const reports = await convexClient.query<
      Array<{
        _id: string;
        memberId: string;
        reportType: string;
        startDate: number;
        endDate: number;
        title: string;
        summary: string;
        htmlContent: string;
        dataSnapshot: string;
        insights: string;
        overallScore: number;
        status: string;
        shareToken?: string;
        shareExpiresAt?: number;
        createdAt: number;
        updatedAt: number;
      }>
    >(api.analytics.getHealthReportsByMember, {
      memberId: memberId as Id<"familyMembers">,
      startDate,
      endDate,
    });

    // Client-side filtering by reportType if provided
    let filteredReports = reports || [];
    if (reportType) {
      filteredReports = filteredReports.filter((r) => r.reportType === reportType);
    }

    // Client-side pagination
    const total = filteredReports.length;
    const paginatedReports = filteredReports.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      success: true,
      data: {
        reports: paginatedReports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
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
