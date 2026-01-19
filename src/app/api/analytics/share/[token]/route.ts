import { NextRequest, NextResponse } from "next/server";
import { getReportByShareToken } from "@/lib/services/analytics/report-generator";

/**
 * GET /api/analytics/share/[token]
 * 通过分享token获取报告（公开访问）
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const report = await getReportByShareToken(token);

    if (!report) {
      return NextResponse.json(
        { error: "报告不存在或已过期" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Failed to get shared report:", error);
    return NextResponse.json({ error: "获取报告失败" }, { status: 500 });
  }
}
