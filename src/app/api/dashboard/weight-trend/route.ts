// @ts-nocheck - neonAdapter returns untyped data, pending proper type definitions
import { NextRequest, NextResponse } from "next/server";
import { api, convexClient } from "@/lib/convex-client";

/**
 * 验证用户是否有权限访问成员的健康数据
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
async function verifyMemberAccess(memberId: string, clerkId: string): Promise<boolean> {
  const result = await convexClient.query(api.members.verifyAccess, {
    memberId: memberId as any,
    clerkId,
  });
  return Boolean(result?.hasAccess);
}

/**
 * GET /api/dashboard/weight-trend
 * 获取体重趋势数据
 */
export async function GET(request: NextRequest) {
  try {
    const clerkId = request.headers.get("x-auth-user-id");
    if (!clerkId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("memberId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!memberId) {
      return NextResponse.json({ error: "缺少成员ID参数" }, { status: 400 });
    }

    // 验证权限
    const hasAccess = await verifyMemberAccess(memberId, clerkId);
    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的体重趋势数据" }, { status: 403 });
    }

    const endAt = Date.now();
    const startAt = endAt - days * 24 * 60 * 60 * 1000;

    const records = await convexClient.query(api.health.listByMemberDateRange, {
      memberId: memberId as any,
      startDate: startAt,
      endDate: endAt,
    });

    const weightPoints = (records || [])
      .filter((r: any) => typeof r?.weight === "number")
      .map((r: any) => ({ date: new Date(r.measuredAt).toISOString(), weight: r.weight }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (weightPoints.length === 0) {
      return NextResponse.json(
        {
          data: {
            data: [],
            min: 0,
            max: 0,
            average: 0,
            change: 0,
            changePercent: 0,
            currentWeight: null,
            targetWeight: null,
            anomalies: [],
          },
        },
        { status: 200 }
      );
    }

    const weights = weightPoints.map((p: any) => p.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const average = weights.reduce((a: number, b: number) => a + b, 0) / weights.length;

    const first = weightPoints[0];
    const last = weightPoints[weightPoints.length - 1];
    const change = last.weight - first.weight;
    const changePercent = first.weight ? (change / first.weight) * 100 : 0;

    return NextResponse.json(
      {
        data: {
          data: weightPoints,
          min,
          max,
          average,
          change,
          changePercent,
          currentWeight: last.weight,
          targetWeight: null,
          anomalies: [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("获取体重趋势失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
