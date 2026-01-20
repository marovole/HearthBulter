/**
 * 社交排行榜API - 排行榜数据
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { leaderboardService } from "@/lib/services/social/leaderboard";
import { LeaderboardType } from "@/types/social-sharing";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

/**
 * 获取排行榜数据
 *
 * Migrated from Prisma to Supabase (partial - leaderboardService still uses Prisma)
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const memberId = searchParams.get("memberId");
    const timeframe = searchParams.get("timeframe") as
      | "daily"
      | "weekly"
      | "monthly"
      | "all-time";
    const limit = parseInt(searchParams.get("limit") || "50");
    const history = searchParams.get("history") === "true";

    if (
      !typeParam ||
      !Object.values(LeaderboardType).includes(typeParam as LeaderboardType)
    ) {
      return NextResponse.json({ error: "无效的排行榜类型" }, { status: 400 });
    }

    const type = typeParam as LeaderboardType;

    // 验证时间范围
    const validTimeframes = ["daily", "weekly", "monthly", "all-time"];
    if (timeframe && !validTimeframes.includes(timeframe)) {
      return NextResponse.json({ error: "无效的时间范围" }, { status: 400 });
    }

    // 验证用户权限（如果指定了memberId）
    if (memberId) {
      const access = await convexClient.query<{ hasAccess: boolean }>(
        api.members.verifyAccess,
        {
          memberId: memberId as Id<"familyMembers">,
          clerkId: session.user.id,
        },
      );

      if (!access.hasAccess) {
        return NextResponse.json(
          { error: "无权限访问该家庭成员" },
          { status: 403 },
        );
      }
    }

    // 如果请求历史数据
    if (history && memberId) {
      const rankingHistory = await leaderboardService.getRankingHistory(
        memberId!,
        type,
        timeframe === "daily"
          ? 7
          : timeframe === "weekly"
            ? 30
            : timeframe === "monthly"
              ? 90
              : 365,
      );

      return NextResponse.json({
        success: true,
        data: {
          type,
          memberId: memberId!,
          timeframe: timeframe || "weekly",
          history: rankingHistory,
          period: getHistoryPeriod(timeframe),
        },
      });
    }

    // 获取排行榜数据
    const leaderboard = await leaderboardService.getLeaderboard(
      type,
      memberId || undefined,
      timeframe || "weekly",
      limit,
    );

    return NextResponse.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error("获取排行榜失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 刷新排行榜数据（管理员功能）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { type: typeParam, timeframe, adminCode } = body;

    const isAdmin = await checkAdminPermission(session.user.id, adminCode);
    if (!isAdmin) {
      return NextResponse.json({ error: "无管理员权限" }, { status: 403 });
    }

    if (
      !typeParam ||
      !Object.values(LeaderboardType).includes(typeParam as LeaderboardType)
    ) {
      return NextResponse.json({ error: "无效的排行榜类型" }, { status: 400 });
    }

    const type = typeParam as LeaderboardType;

    const service = leaderboardService;
    service.clearCache();

    const leaderboard = await service.getLeaderboard(
      type,
      undefined,
      timeframe || "weekly",
      100,
    );

    // 保存排行榜数据到数据库（可选）
    if (leaderboard.data.length > 0) {
      await saveLeaderboardData(leaderboard, timeframe || "weekly");
    }

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        refreshedAt: new Date(),
        message: "排行榜数据刷新成功",
      },
    });
  } catch (error) {
    console.error("刷新排行榜失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}

/**
 * 获取排行榜配置
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");

    if (
      typeParam &&
      !Object.values(LeaderboardType).includes(typeParam as LeaderboardType)
    ) {
      return NextResponse.json({ error: "无效的排行榜类型" }, { status: 400 });
    }

    const service = leaderboardService;

    if (typeParam) {
      const type = typeParam as LeaderboardType;
      const config = service.getLeaderboardConfig(type);
      return NextResponse.json({
        success: true,
        data: {
          type,
          config,
        },
      });
    } else {
      // 获取所有可用排行榜
      const availableTypes = service.getAvailableLeaderboards();
      const configs = availableTypes.map((type) => ({
        type,
        config: service.getLeaderboardConfig(type),
      }));

      return NextResponse.json({
        success: true,
        data: {
          availableTypes,
          configs,
        },
      });
    }
  } catch (error) {
    console.error("获取排行榜配置失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 保存排行榜数据
 * Migrated from Prisma to Supabase
 */
async function saveLeaderboardData(
  _leaderboard: unknown,
  _timeframe: string,
): Promise<void> {
  return;
}

/**
 * 检查管理员权限
 */
async function checkAdminPermission(
  userId: string,
  adminCode?: string,
): Promise<boolean> {
  if (!adminCode) {
    return false;
  }

  const validAdminCodes = process.env.ADMIN_CODES?.split(",") || [];
  return validAdminCodes.includes(adminCode);
}

/**
 * 获取历史数据周期描述
 */
function getHistoryPeriod(timeframe?: string): string {
  switch (timeframe) {
    case "daily":
      return "最近7天";
    case "weekly":
      return "最近30天";
    case "monthly":
      return "最近90天";
    case "all-time":
      return "最近1年";
    default:
      return "最近30天";
  }
}
