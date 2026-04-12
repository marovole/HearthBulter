import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";

interface CleanupResult {
  expiredUpdated: number;
  softDeleted: number;
}

/**
 * POST /api/cleanup/expired-invitations - 清理过期邀请
 *
 * Migrated from Neon to Convex
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限执行此操作" }, { status: 403 });
    }

    const result = await convexClient.mutation<CleanupResult>(
      api.families.cleanupExpiredInvitations,
      {}
    );

    return NextResponse.json(
      {
        message: "清理任务完成",
        results: {
          expiredUpdated: result.expiredUpdated,
          softDeleted: result.softDeleted,
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
 * Migrated from Neon to Convex
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "无权限执行此操作" }, { status: 403 });
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const [pendingExpired, expiredStatus, rejectedStatus, softDeletable] = await Promise.all([
      convexClient.query<number>(api.families.countInvitationsByStatus, {
        status: "PENDING",
        expiresBefore: now,
      }),
      convexClient.query<number>(api.families.countInvitationsByStatus, {
        status: "EXPIRED",
      }),
      convexClient.query<number>(api.families.countInvitationsByStatus, {
        status: "REJECTED",
      }),
      convexClient.query<number>(api.families.countInvitationsByStatus, {
        updatedBefore: thirtyDaysAgo,
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
