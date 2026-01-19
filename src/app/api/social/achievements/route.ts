import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { achievementSystem } from "@/lib/services/social/achievement-system";
import { AchievementRarity, AchievementType } from "@/types/social-sharing";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const type = searchParams.get("type");
    const rarity = searchParams.get("rarity");
    const all = searchParams.get("all") === "true";

    if (all) {
      const availableAchievements =
        achievementSystem.getAvailableAchievements();

      return NextResponse.json({
        success: true,
        data: {
          achievements: availableAchievements.map((trigger) => ({
            type: trigger.type,
            name: trigger.name,
            description: trigger.description,
            icon: trigger.icon,
            color: trigger.color,
            rarity: trigger.rarity,
            points: trigger.points,
            conditions: trigger.conditions,
            isUnlocked: false,
          })),
        },
      });
    }

    const targetMemberIds: Id<"familyMembers">[] = [];

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

      targetMemberIds.push(memberId as Id<"familyMembers">);
    } else {
      const accessibleMembers = await convexClient.query<
        Array<{ _id: Id<"familyMembers"> }>
      >(api.members.listAccessibleByClerkId, {
        clerkId: session.user.id,
      });
      targetMemberIds.push(...accessibleMembers.map((member) => member._id));
    }

    if (targetMemberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          achievements: [],
          stats: buildAchievementStats([]),
          filters: { type, rarity, memberId },
        },
      });
    }

    const userAchievements = await convexClient.query<
      Array<Record<string, unknown>>
    >(api.achievements.listByMembers, {
      memberIds: targetMemberIds,
      type: type || undefined,
      rarity: rarity || undefined,
    });

    const stats = buildAchievementStats(userAchievements);

    return NextResponse.json({
      success: true,
      data: {
        achievements: userAchievements,
        stats,
        filters: {
          type,
          rarity,
          memberId,
        },
      },
    });
  } catch (error) {
    console.error("获取成就列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, type, reason, adminCode } = body;

    const isAdmin = await checkAdminPermission(session.user.id, adminCode);
    if (!isAdmin) {
      return NextResponse.json({ error: "无管理员权限" }, { status: 403 });
    }

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

    const existingAchievement = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.achievements.findByMemberTypeLevel, {
      memberId: memberId as Id<"familyMembers">,
      type: type as string,
      level: 1,
    });

    if (existingAchievement) {
      return NextResponse.json({ error: "该成就已经解锁" }, { status: 409 });
    }

    const achievementType = (
      Object.values(AchievementType) as string[]
    ).includes(type)
      ? (type as AchievementType)
      : AchievementType.CHECK_IN_STREAK;

    const achievement = await achievementSystem.unlockAchievement(
      memberId,
      {
        type: achievementType,
        name: "手动解锁",
        description: reason || "管理员手动解锁",
        icon: "🏆",
        color: "#f59e0b",
        rarity: AchievementRarity.GOLD,
        points: 100,
        conditions: [],
        checkFunction: async () => true,
      },
      "MANUAL_UNLOCK",
      { reason, adminId: session.user.id },
    );

    return NextResponse.json({
      success: true,
      data: {
        achievement,
        message: "成就解锁成功",
      },
    });
  } catch (error) {
    console.error("手动解锁成就失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 },
    );
  }
}

function buildAchievementStats(achievements: Array<Record<string, unknown>>) {
  const stats = {
    total: achievements.length,
    totalPoints: achievements.reduce(
      (sum, achievement) => sum + (achievement.points as number),
      0,
    ),
    byRarity: {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0,
      DIAMOND: 0,
    } as Record<AchievementRarity, number>,
    byType: {} as Record<AchievementType, number>,
    recentUnlocks: achievements
      .slice()
      .sort(
        (a, b) =>
          ((b.unlockedAt as number | undefined) ?? 0) -
          ((a.unlockedAt as number | undefined) ?? 0),
      )
      .slice(0, 5),
  };

  achievements.forEach((achievement) => {
    const rarityKey = achievement.rarity as AchievementRarity;
    if (stats.byRarity[rarityKey] !== undefined) {
      stats.byRarity[rarityKey] += 1;
    }

    const typeKey = achievement.type as AchievementType;
    stats.byType[typeKey] = (stats.byType[typeKey] ?? 0) + 1;
  });

  return stats;
}

async function checkAdminPermission(
  _userId: string,
  adminCode?: string,
): Promise<boolean> {
  if (!adminCode) {
    return false;
  }

  const validAdminCodes = process.env.ADMIN_CODES?.split(",") || [];
  return validAdminCodes.includes(adminCode);
}
