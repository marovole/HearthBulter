// @ts-nocheck - neonAdapter returns untyped data, pending proper type definitions
/**
 * 连续打卡管理服务
 * 负责追踪用户的连续打卡天数、徽章管理和激励机制
 */

import { db } from "@/lib/db";

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
  let streak = await db.trackingStreak.findUnique({
    where: { memberId },
  });

  if (!streak) {
    // 如果不存在，创建初始记录
    streak = await db.trackingStreak.create({
      data: {
        memberId,
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        badges: "[]",
      },
    });
  }

  // 解析徽章
  const badges = JSON.parse(streak.badges) as string[];
  const earnedBadges = BADGES.filter((b) => badges.includes(b.id));
  const nextBadge = BADGES.find((b) => !badges.includes(b.id));

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
  const streak = await db.trackingStreak.findUnique({
    where: { memberId },
  });

  if (!streak || !streak.lastCheckIn || streak.currentStreak < 7) {
    return false; // 连续打卡少于7天，不需要提醒
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCheckIn = new Date(streak.lastCheckIn);
  lastCheckIn.setHours(0, 0, 0, 0);

  // 检查今天是否已经打卡
  const todayLogs = await db.mealLog.count({
    where: {
      memberId,
      date: {
        gte: today,
      },
      deletedAt: null,
    },
  });

  // 如果今天还没打卡，且连续打卡天数>=7天，需要提醒
  return todayLogs === 0 && lastCheckIn.getTime() < today.getTime();
}

/**
 * 获取打卡统计（周、月、年）
 */
export async function getCheckInStats(
  memberId: string,
  period: "week" | "month" | "year" = "week"
) {
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

  // 获取期间的打卡记录
  const targets = await db.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: today,
      },
      isCompleted: true,
    },
  });

  const checkInDays = targets.length;
  const checkInRate = (checkInDays / totalDays) * 100;

  return {
    period,
    totalDays,
    checkInDays,
    checkInRate: Math.round(checkInRate * 10) / 10, // 保留一位小数
    missedDays: totalDays - checkInDays,
  };
}

/**
 * 获取打卡日历（某月的打卡情况）
 */
export async function getCheckInCalendar(memberId: string, year: number, month: number) {
  // 获取月份的第一天和最后一天
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  // 获取该月的所有打卡记录
  const targets = await db.dailyNutritionTarget.findMany({
    where: {
      memberId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // 创建日历数据结构
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
    const target = targets.find((t) => t.date.getDate() === day && t.date.getMonth() === month - 1);

    calendar.push({
      date,
      isChecked: !!target,
      isCompleted: target?.isCompleted || false,
      nutrition: target
        ? {
            calories: target.actualCalories,
            protein: target.actualProtein,
            carbs: target.actualCarbs,
            fat: target.actualFat,
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
  // 获取家庭所有成员
  const members = await db.familyMember.findMany({
    where: {
      familyId,
      deletedAt: null,
    },
    include: {
      trackingStreak: true,
    },
  });

  // 按当前连续打卡天数排序
  const leaderboard = members
    .map((member) => ({
      memberId: member.id,
      name: member.name,
      avatar: member.avatar,
      currentStreak: member.trackingStreak?.currentStreak || 0,
      longestStreak: member.trackingStreak?.longestStreak || 0,
      totalDays: member.trackingStreak?.totalDays || 0,
      badges: member.trackingStreak ? (JSON.parse(member.trackingStreak.badges) as string[]) : [],
    }))
    .sort((a, b) => {
      // 先按当前连续天数排序，如果相同则按总天数排序
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      return b.totalDays - a.totalDays;
    });

  return leaderboard;
}

/**
 * 检查并解锁新徽章
 */
export async function checkAndUnlockBadges(memberId: string) {
  const streak = await db.trackingStreak.findUnique({
    where: { memberId },
  });

  if (!streak) return [];

  const currentBadges = JSON.parse(streak.badges) as string[];
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
    await db.trackingStreak.update({
      where: { memberId },
      data: {
        badges: JSON.stringify(currentBadges),
      },
    });
  }

  return newBadges;
}
