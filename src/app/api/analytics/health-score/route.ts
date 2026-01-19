import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  calculateHealthScore,
  saveHealthScore,
  getScoreTrend,
} from "@/lib/services/analytics/health-scorer";

/**
 * GET /api/analytics/health-score
 * 获取健康评分
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const date = searchParams.get("date");
    const days = searchParams.get("days");

    if (!memberId) {
      return NextResponse.json(
        { error: "缺少必要参数：memberId" },
        { status: 400 },
      );
    }

    // 如果请求趋势数据
    if (days) {
      const trend = await getScoreTrend(memberId, parseInt(days));
      return NextResponse.json({
        success: true,
        data: trend,
      });
    }

    // 否则计算单日评分
    const targetDate = date ? new Date(date) : new Date();
    const scoreResult = await calculateHealthScore(memberId, targetDate);

    return NextResponse.json({
      success: true,
      data: scoreResult,
    });
  } catch (error) {
    console.error("Failed to get health score:", error);
    return NextResponse.json({ error: "获取健康评分失败" }, { status: 500 });
  }
}

/**
 * POST /api/analytics/health-score
 * 计算并保存健康评分
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, date } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "缺少必要参数：memberId" },
        { status: 400 },
      );
    }

    const targetDate = date ? new Date(date) : new Date();
    const scoreResult = await calculateHealthScore(memberId, targetDate);
    await saveHealthScore(memberId, targetDate, scoreResult);

    return NextResponse.json({
      success: true,
      data: scoreResult,
    });
  } catch (error) {
    console.error("Failed to calculate health score:", error);
    return NextResponse.json({ error: "计算健康评分失败" }, { status: 500 });
  }
}
