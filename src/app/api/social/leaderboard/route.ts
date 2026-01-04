/**
 * 社交排行榜API - 排行榜数据
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { leaderboardService } from "@/lib/services/social/leaderboard";
import { LeaderboardType } from "@prisma/client";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";

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
    const type = searchParams.get("type") as LeaderboardType;
    const memberId = searchParams.get("memberId");
    const timeframe = searchParams.get("timeframe") as
      | "daily"
      | "weekly"
      | "monthly"
      | "all-time";
    const limit = parseInt(searchParams.get("limit") || "50");
    const history = searchParams.get("history") === "true";

    // 验证排行榜类型
    if (!type || !Object.values(LeaderboardType).includes(type)) {
      return NextResponse.json({ error: "无效的排行榜类型" }, { status: 400 });
    }

    // 验证时间范围
    const validTimeframes = ["daily", "weekly", "monthly", "all-time"];
    if (timeframe && !validTimeframes.includes(timeframe)) {
      return NextResponse.json({ error: "无效的时间范围" }, { status: 400 });
    }

    // 验证用户权限（如果指定了memberId）
    if (memberId) {
      const supabase = SupabaseClientManager.getInstance();

      // 查询家庭成员和验证权限
      const { data: member, error } = await supabase
        .from("family_members")
        .select("id, familyId")
        .eq("id", memberId)
        .maybeSingle();

      if (error || !member) {
        return NextResponse.json(
          { error: "无权限访问该家庭成员" },
          { status: 403 },
        );
      }

      // 验证当前用户是否属于该家庭
      const { data: userMember } = await supabase
        .from("family_members")
        .select("id")
        .eq("familyId", (member as any).familyId)
        .eq("userId", session.user.id)
        .maybeSingle();

      if (!userMember) {
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
    const { type, timeframe, adminCode } = body;

    // 验证管理员权限
    const isAdmin = await checkAdminPermission(session.user.id, adminCode);
    if (!isAdmin) {
      return NextResponse.json({ error: "无管理员权限" }, { status: 403 });
    }

    // 验证排行榜类型
    if (!type || !Object.values(LeaderboardType).includes(type)) {
      return NextResponse.json({ error: "无效的排行榜类型" }, { status: 400 });
    }

    // 清除缓存
    const service = leaderboardService;
    service.clearCache();

    // 重新计算排行榜
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
    const type = searchParams.get("type") as LeaderboardType;

    if (type && !Object.values(LeaderboardType).includes(type)) {
      return NextResponse.json({ error: "无效的排行榜类型" }, { status: 400 });
    }

    const service = leaderboardService;

    if (type) {
      // 获取特定排行榜配置
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
  leaderboard: any,
  timeframe: string,
): Promise<void> {
  try {
    const supabase = SupabaseClientManager.getInstance();
    const entries = leaderboard.data.slice(0, 100); // 只保存前100名

    // 使用 Supabase upsert 批量插入
    const leaderboardEntries = entries.map((entry: any) => ({
      memberId: entry.memberId,
      type: leaderboard.type,
      rank: entry.rank,
      value: entry.value,
      metadata: JSON.stringify({
        timeframe,
        memberName: entry.memberName,
        displayValue: entry.displayValue,
        change: entry.change,
        changeValue: entry.changeValue,
      }),
      createdAt: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("leaderboard_entries")
      .upsert(leaderboardEntries, {
        onConflict: "memberId,type",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("保存排行榜数据失败:", error);
    } else {
      console.log(`保存了 ${entries.length} 条排行榜数据`);
    }
  } catch (error) {
    console.error("保存排行榜数据失败:", error);
    // 不抛出错误，避免影响主流程
  }
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
