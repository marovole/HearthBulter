import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCheckInStats } from "@/lib/services/tracking/streak-manager";

/**
 * GET /api/tracking/streak/stats?memberId=xxx&period=week
 * 获取打卡统计
 *
 * Note: 暂时保留服务层调用
 * 这是复杂的聚合统计功能，Repository 目前只有基本的 getTrackingStreak 方法
 * 未来可考虑添加 getCheckInStats 到 Repository 接口
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const period = (searchParams.get("period") || "week") as
      | "week"
      | "month"
      | "year";

    if (!memberId) {
      return NextResponse.json({ error: "缺少memberId参数" }, { status: 400 });
    }

    const stats = await getCheckInStats(memberId, period);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching check-in stats:", error);

    return NextResponse.json({ error: "获取打卡统计失败" }, { status: 500 });
  }
}
