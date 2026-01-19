import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCheckInCalendar } from "@/lib/services/tracking/streak-manager";

/**
 * GET /api/tracking/streak/calendar?memberId=xxx&year=2024&month=1
 * 获取打卡日历
 *
 * Note: 暂时保留服务层调用
 * 这是复杂的聚合功能，Repository 目前只有基本的 getTrackingStreak 方法
 * 未来可考虑添加 getCheckInCalendar 到 Repository 接口
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
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!memberId || !year || !month) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const calendar = await getCheckInCalendar(
      memberId,
      parseInt(year),
      parseInt(month),
    );

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("Error fetching calendar:", error);

    return NextResponse.json({ error: "获取打卡日历失败" }, { status: 500 });
  }
}
