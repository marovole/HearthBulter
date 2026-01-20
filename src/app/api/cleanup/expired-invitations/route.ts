import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { neonAdapter } from "@/lib/db/neon-adapter";

/**
 * POST /api/cleanup/expired-invitations - 清理过期邀请
 *
 * Migrated from Supabase to Neon
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限执行此操作" }, { status: 403 });
    }

    const now = new Date();

    const expiredInvitations = await neonAdapter.familyInvitation.findMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
    });

    for (const inv of expiredInvitations) {
      await neonAdapter.familyInvitation.update({
        where: { id: (inv as { id: string }).id },
        data: { status: "EXPIRED" },
      });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletableInvitations = await neonAdapter.familyInvitation.findMany({
      where: { status: { in: ["EXPIRED", "REJECTED"] }, updatedAt: { lt: thirtyDaysAgo } },
    });

    for (const inv of deletableInvitations) {
      await neonAdapter.familyInvitation.update({
        where: { id: (inv as { id: string }).id },
        data: { status: "DELETED" },
      });
    }

    return NextResponse.json(
      {
        message: "清理任务完成",
        results: {
          expiredUpdated: expiredInvitations.length,
          softDeleted: deletableInvitations.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("清理过期邀请失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * GET /api/cleanup/expired-invitations - 获取过期邀请统计
 *
 * Migrated from Supabase to Neon
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限执行此操作" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [pendingExpired, expiredStatus, rejectedStatus, softDeletable] = await Promise.all([
      neonAdapter.familyInvitation.count({ where: { status: "PENDING", expiresAt: { lt: now } } }),
      neonAdapter.familyInvitation.count({ where: { status: "EXPIRED" } }),
      neonAdapter.familyInvitation.count({ where: { status: "REJECTED" } }),
      neonAdapter.familyInvitation.count({
        where: { status: { in: ["EXPIRED", "REJECTED"] }, updatedAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    return NextResponse.json(
      {
        statistics: {
          pendingExpired,
          expiredStatus,
          rejectedStatus,
          softDeletable,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("获取过期邀请统计失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
