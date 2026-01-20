import { NextRequest, NextResponse } from "next/server";
import { neonAdapter } from "@/lib/db/neon-adapter";
import { auth } from "@/lib/auth";

interface HealthReport {
  id: string;
  memberId: string;
  deletedAt?: Date | null;
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

    const report = await neonAdapter.healthReport.findFirst<HealthReport>({
      where: { id, deletedAt: null },
    });

    if (!report) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    const member = await neonAdapter.familyMember.findUnique({
      where: { id: report.memberId },
    });

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

    await neonAdapter.healthReport.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "报告已删除",
    });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json({ error: "删除报告失败" }, { status: 500 });
  }
}
