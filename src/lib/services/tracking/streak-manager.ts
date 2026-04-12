/**
 * 连续打卡管理服务
 * 负责追踪用户的连续打卡天数、徽章管理和激励机制
 */

import { convexClient, api } from "@/lib/convex-client";

type Id<TableName extends string> = string & { __tableName: TableName };

type TrackingStreakRecord = {
  memberId: Id<"familyMembers">;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  lastCheckIn?: number;
  badges: string;
};

type DailyNutritionTargetRecord = {
  date: number;
  isCompleted?: boolean;
  actualCalories?: number;
  actualProtein?: number;
  actualCarbs?: number;
  actualFat?: number;
};

type FamilyMemberRecord = {
  _id: Id<"familyMembers">;
  id?: string;
  name: string;
  avatar?: string;
};

function toMemberId(memberId: string): Id<"familyMembers"> {
  return memberId as Id<"familyMembers">;
}

function toFamilyId(familyId: string): Id<"families"> {
  return familyId as Id<"families">;
}

function parseBadgeIds(badges: string): string[] {
  try {
    const parsed = JSON.parse(badges);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
}

// 徽章定义
export const BADGES: Badge[] = [
  {
    id: "7-days",
    name: "初出茅庐",
    description: "连续打卡7天",
    icon: "🌱",
    requirement: 7,
  },
  {
    id: "30-days",
    name: "坚持不懈",
    description: "连续打卡30天",
    icon: "🔥",
    requirement: 30,
  },
  {
    id: "100-days",
    name: "百日筑基",
    description: "连续打卡100天",
    icon: "💪",
    requirement: 100,
  },
  {
    id: "365-days",
    name: "年度冠军",
    description: "连续打卡365天",
    icon: "👑",
    requirement: 365,
  },
];

/**
 * 获取成员的连续打卡记录
 */
export async function getTrackingStreak(memberId: string) {
  const memberIdRef = toMemberId(memberId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let streak = (await convexClient.query(api.analytics.getTrackingStreak, {
    memberId: memberIdRef,
  })) as any as TrackingStreakRecord | null;

  if (!streak) {
    await convexClient.mutation(api.analytics.upsertTrackingStreak, {
      memberId: memberIdRef,
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      badges: "[]",
    });

    streak = {
      memberId: memberIdRef,
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      badges: "[]",
    };
  }

  const badgeIds = parseBadgeIds(streak.badges);
  const earnedBadges = BADGES.filter((b) => badgeIds.includes(b.id));
  const nextBadge = BADGES.find((b) => !badgeIds.includes(b.id));

  return {
    ...streak,
    badges: earnedBadges,
    nextBadge,
    daysUntilNextBadge: nextBadge ? Math.max(0, nextBadge.requirement - streak.currentStreak) : 0,
  };
}

/**
 * 获取所有徽章列表
 */
export function getAllBadges() {
  return BADGES;
}

/**
 * 检查是否需要发送断连提醒
 */
export async function checkStreakReminder(memberId: string): Promise<boolean> {
  const memberIdRef = toMemberId(memberId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streak = (await convexClient.query(api.analytics.getTrackingStreak, {
    memberId: memberIdRef,
  })) as any as TrackingStreakRecord | null;

  if (!streak || !streak.lastCheckIn || streak.currentStreak < 7) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const lastCheckIn = new Date(streak.lastCheckIn);
  lastCheckIn.setHours(0, 0, 0, 0);

  const todayLogs = await convexClient.query(api.analytics.countMealLogs, {
    memberId: memberIdRef,
    startDate: today.getTime(),
    endDate: tomorrow.getTime(),
  });

  return todayLogs === 0 && lastCheckIn.getTime() < today.getTime();
}

/**
 * 获取打卡统计（周、月、年）
 */
export async function getCheckInStats(
  memberId: string,
  period: "week" | "month" | "year" = "week"
) {
  const memberIdRef = toMemberId(memberId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  let totalDays = 7;

  switch (period) {
    case "week":
      startDate.setDate(today.getDate() - 6); // 最近7天
      totalDays = 7;
      break;
    case "month":
      startDate.setDate(today.getDate() - 29); // 最近30天
      totalDays = 30;
      break;
    case "year":
      startDate.setDate(today.getDate() - 364); // 最近365天
      totalDays = 365;
      break;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targets = (await convexClient.query(api.analytics.listDailyNutritionTargets, {
    memberId: memberIdRef,
    startDate: startDate.getTime(),
    endDate: today.getTime(),
  })) as any as DailyNutritionTargetRecord[];

  const completedTargets = targets.filter((target) => target.isCompleted === true);
  const checkInDays = completedTargets.length;
  const checkInRate = (checkInDays / totalDays) * 100;

  return {
    period,
    totalDays,
    checkInDays,
    checkInRate: Math.round(checkInRate * 10) / 10,
    missedDays: totalDays - checkInDays,
  };
}

/**
 * 获取打卡日历（某月的打卡情况）
 */
export async function getCheckInCalendar(memberId: string, year: number, month: number) {
  const memberIdRef = toMemberId(memberId);

  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targets = (await convexClient.query(api.analytics.listDailyNutritionTargets, {
    memberId: memberIdRef,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
  })) as any as DailyNutritionTargetRecord[];

  const calendar: Array<{
    date: Date;
    isChecked: boolean;
    isCompleted: boolean;
    nutrition?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }> = [];

  const daysInMonth = endDate.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const target = targets.find((item) => {
      const itemDate = new Date(item.date);
      return itemDate.getDate() === day && itemDate.getMonth() === month - 1;
    });

    calendar.push({
      date,
      isChecked: !!target,
      isCompleted: target?.isCompleted === true,
      nutrition: target
        ? {
            calories: target.actualCalories ?? 0,
            protein: target.actualProtein ?? 0,
            carbs: target.actualCarbs ?? 0,
            fat: target.actualFat ?? 0,
          }
        : undefined,
    });
  }

  return {
    year,
    month,
    calendar,
  };
}

/**
 * 获取打卡排行榜（家庭成员间的对比）
 */
export async function getFamilyStreakLeaderboard(familyId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = (await convexClient.query(api.families.listMembers, {
    familyId: toFamilyId(familyId),
  })) as any as FamilyMemberRecord[];

  const leaderboard = await Promise.all(
    members.map(async (member) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const streak = (await convexClient.query(api.analytics.getTrackingStreak, {
        memberId: member._id,
      })) as any as TrackingStreakRecord | null;

      return {
        memberId: member.id ?? (member._id as string),
        name: member.name,
        avatar: member.avatar,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        totalDays: streak?.totalDays ?? 0,
        badges: streak ? parseBadgeIds(streak.badges) : [],
      };
    })
  );

  return leaderboard.sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) {
      return b.currentStreak - a.currentStreak;
    }
    return b.totalDays - a.totalDays;
  });
}

/**
 * 检查并解锁新徽章
 */
export async function checkAndUnlockBadges(memberId: string) {
  const memberIdRef = toMemberId(memberId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streak = (await convexClient.query(api.analytics.getTrackingStreak, {
    memberId: memberIdRef,
  })) as any as TrackingStreakRecord | null;

  if (!streak) return [];

  const currentBadges = parseBadgeIds(streak.badges);
  const newBadges: Badge[] = [];

  // 检查每个徽章是否符合条件
  BADGES.forEach((badge) => {
    if (!currentBadges.includes(badge.id) && streak.currentStreak >= badge.requirement) {
      currentBadges.push(badge.id);
      newBadges.push(badge);
    }
  });

  // 如果有新徽章，更新数据库
  if (newBadges.length > 0) {
    await convexClient.mutation(api.analytics.upsertTrackingStreak, {
      memberId: memberIdRef,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalDays: streak.totalDays,
      lastCheckIn: streak.lastCheckIn,
      badges: JSON.stringify(currentBadges),
    });
  }

  return newBadges;
}
