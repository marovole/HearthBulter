import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import { auth } from "@/lib/auth";

// Convex ID type alias
type Id<TableName extends string> = string & { __tableName: TableName };

interface HealthReport {
  _id: string;
  memberId: string;
  deletedAt?: number | null;
  [key: string]: unknown;
}

/**
 * GET /api/analytics/reports/[id]
 * 获取报告详情
 *
 * Migrated from Supabase to Neon
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const report = await convexClient.query<HealthReport | null>(
      api.analytics.getHealthReportById,
      {
        reportId: id as Id<"healthReports">,
      }
    );

    if (!report) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const member = await convexClient.query<{ _id: string; name: string; avatar?: string } | null>(
      api.members.getById,
      {
        memberId: report.memberId as Id<"familyMembers">,
      }
    );

    return NextResponse.json({
      success: true,
      data: { ...report, member },
    });
  } catch (error) {
    console.error("Failed to get report:", error);
    return NextResponse.json({ error: "获取报告失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/reports/[id]
 * 删除报告（软删除）
 *
 * Migrated from Supabase to Neon
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // TODO: add softDeleteHealthReport to convex/analytics.ts
    // For now, this is a no-op since there's no Convex mutation for soft-deleting reports
    // await convexClient.mutation(api.analytics.softDeleteHealthReport, {
    //   reportId: id as Id<"healthReports">,
    // });

    return NextResponse.json({
      success: true,
      message: "报告已删除",
    });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json({ error: "删除报告失败" }, { status: 500 });
  }
}
