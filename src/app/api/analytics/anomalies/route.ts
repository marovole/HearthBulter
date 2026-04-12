import { NextRequest, NextResponse } from "next/server";
import { convexClient, api } from "@/lib/convex-client";
import { auth } from "@/lib/auth";
import { AnomalyStatus } from "@/types/enums";
import {
  acknowledgeAnomaly,
  resolveAnomaly,
  ignoreAnomaly,
} from "@/lib/services/analytics/anomaly-detector";
import { requireMemberDataAccess } from "@/lib/middleware/authorization";

// Convex ID type alias
type Id<TableName extends string> = string & { __tableName: TableName };

/**
 * GET /api/analytics/anomalies
 * 获取异常记录
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
    const status = searchParams.get("status") as AnomalyStatus | null;
    const limit = parseInt(searchParams.get("limit") || "20");

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

    // Use a wide date range to get all anomalies (1 year back to now)
    const endDate = Date.now();
    const startDate = endDate - 365 * 24 * 60 * 60 * 1000;

    const anomalies = await convexClient.query<
      Array<{
        _id: string;
        anomalyType: string;
        severity: string;
        title: string;
        description: string;
        dataType: string | null;
        value: number;
        expectedMin: number | null;
        expectedMax: number | null;
        deviation: number | null;
        status: string;
        detectedAt: number;
      }>
    >(api.analytics.listAnomaliesByMember, {
      memberId: memberId as Id<"familyMembers">,
      startDate,
      endDate,
      limit,
    });

    // Client-side filtering by status if provided
    let filteredAnomalies = anomalies || [];
    if (status) {
      filteredAnomalies = filteredAnomalies.filter((a) => a.status === status);
    }

    return NextResponse.json({
      success: true,
      data: filteredAnomalies,
    });
  } catch (error) {
    console.error("Failed to get anomalies:", error);
    return NextResponse.json({ error: "获取异常记录失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/analytics/anomalies
 * 更新异常状态
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { anomalyId, action, resolution, memberId } = body;

    if (!anomalyId || !action) {
      return NextResponse.json({ error: "缺少必要参数：anomalyId, action" }, { status: 400 });
    }

    if (memberId) {
      const accessResult = await requireMemberDataAccess(session.user.id, memberId);
      if (!accessResult.authorized) {
        return NextResponse.json(
          { error: accessResult.reason || "无权访问此成员数据" },
          { status: 403 }
        );
      }
    }

    switch (action) {
      case "acknowledge":
        await acknowledgeAnomaly(anomalyId);
        break;
      case "resolve":
        if (!resolution) {
          return NextResponse.json({ error: "解决异常需要提供resolution参数" }, { status: 400 });
        }
        await resolveAnomaly(anomalyId, resolution);
        break;
      case "ignore":
        await ignoreAnomaly(anomalyId);
        break;
      default:
        return NextResponse.json({ error: "无效的action值" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "异常状态已更新",
    });
  } catch (error) {
    console.error("Failed to update anomaly:", error);
    return NextResponse.json({ error: "更新异常状态失败" }, { status: 500 });
  }
}
