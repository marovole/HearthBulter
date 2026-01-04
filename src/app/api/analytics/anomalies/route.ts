import { NextRequest, NextResponse } from "next/server";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { auth } from "@/lib/auth";
import { AnomalyStatus } from "@prisma/client";
import {
  acknowledgeAnomaly,
  resolveAnomaly,
  ignoreAnomaly,
} from "@/lib/services/analytics/anomaly-detector";
import { requireMemberDataAccess } from "@/lib/middleware/authorization";

/**
 * GET /api/analytics/anomalies
 * 获取异常记录
 *
 * Migrated from Prisma to Supabase
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
      return NextResponse.json(
        { error: "缺少必要参数：memberId" },
        { status: 400 },
      );
    }

    // 验证用户对该成员数据的访问权限
    const accessResult = await requireMemberDataAccess(
      session.user.id,
      memberId,
    );
    if (!accessResult.authorized) {
      return NextResponse.json(
        { error: accessResult.reason || "无权访问此成员数据" },
        { status: 403 },
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 构建查询
    let query = supabase
      .from("health_anomalies")
      .select("*")
      .eq("memberId", memberId)
      .is("deletedAt", null)
      .order("detectedAt", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: anomalies, error } = await query;

    if (error) {
      console.error("查询异常记录失败:", error);
      return NextResponse.json({ error: "获取异常记录失败" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: anomalies || [],
    });
  } catch (error) {
    console.error("Failed to get anomalies:", error);
    return NextResponse.json({ error: "获取异常记录失败" }, { status: 500 });
  }
}

/**
 * PATCH /api/analytics/anomalies
 * 更新异常状态
 *
 * Note: acknowledgeAnomaly, resolveAnomaly, ignoreAnomaly still use Prisma
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
      return NextResponse.json(
        { error: "缺少必要参数：anomalyId, action" },
        { status: 400 },
      );
    }

    // 如果提供了 memberId，验证访问权限
    if (memberId) {
      const accessResult = await requireMemberDataAccess(
        session.user.id,
        memberId,
      );
      if (!accessResult.authorized) {
        return NextResponse.json(
          { error: accessResult.reason || "无权访问此成员数据" },
          { status: 403 },
        );
      }
    }

    switch (action) {
    case "acknowledge":
      await acknowledgeAnomaly(anomalyId);
      break;
    case "resolve":
      if (!resolution) {
        return NextResponse.json(
          { error: "解决异常需要提供resolution参数" },
          { status: 400 },
        );
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
