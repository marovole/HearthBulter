// @ts-nocheck
/**
 * 成就系统服务
 * 管理成就触发、解锁和奖励发放
 */

import { addDays, isAfter, startOfDay, differenceInDays } from "date-fns";
import type {
  Achievement,
  AchievementRarity,
  FamilyMember,
  AchievementReward,
  AchievementCondition,
} from "@prisma/client";
// AchievementType needs to be imported as value because it's used at runtime
import { AchievementType } from "@prisma/client";
import { ACHIEVEMENT_TYPE_CONFIGS } from "@/types/social-sharing";
import { prisma } from "@/lib/db";

/**
 * 成就触发器
 */
export interface AchievementTrigger {
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: AchievementRarity;
  points: number;
  conditions: AchievementCondition[];
  checkFunction: (memberId: string, data?: any) => Promise<boolean>;
}

/**
 * 成就系统类
 */
export class AchievementSystem {
  private static instance: AchievementSystem;
  private achievementTriggers: Map<AchievementType, AchievementTrigger> =
    new Map();

  static getInstance(): AchievementSystem {
    if (!AchievementSystem.instance) {
      AchievementSystem.instance = new AchievementSystem();
      AchievementSystem.instance.initializeTriggers();
    }
    return AchievementSystem.instance;
  }

  /**
   * 初始化成就触发器
   */
  private initializeTriggers(): void {
    const triggers: AchievementTrigger[] = [
      // 首次登录
      {
        type: AchievementType.FIRST_LOGIN,
        name: "初次体验",
        description: "完成首次登录，开启健康之旅",
        icon: "🎯",
        color: "#3b82f6",
        rarity: "COMMON",
        points: 10,
        conditions: [{ metric: "loginCount", operator: "gte", value: 1 }],
        checkFunction: this.checkFirstLogin.bind(this),
      },

      // 连续打卡7天
      {
        type: AchievementType.SEVEN_DAY_STREAK,
        name: "坚持一周",
        description: "连续7天记录健康数据",
        icon: "🔥",
        color: "#ef4444",
        rarity: "UNCOMMON",
        points: 50,
        conditions: [{ metric: "checkinStreak", operator: "gte", value: 7 }],
        checkFunction: this.checkSevenDayStreak.bind(this),
      },

      // 月度健康达人
      {
        type: AchievementType.MONTHLY_CHAMPION,
        name: "月度健康达人",
        description: "一个月内健康评分达到90分以上",
        icon: "👑",
        color: "#f59e0b",
        rarity: "RARE",
        points: 200,
        conditions: [
          { metric: "monthlyHealthScore", operator: "gte", value: 90 },
        ],
        checkFunction: this.checkMonthlyChampion.bind(this),
      },

      // 减重目标达成
      {
        type: AchievementType.WEIGHT_GOAL_ACHIEVED,
        name: "减重成功",
        description: "成功达到设定的减重目标",
        icon: "🎯",
        color: "#10b981",
        rarity: "UNCOMMON",
        points: 100,
        conditions: [
          { metric: "weightGoalAchieved", operator: "eq", value: 1 },
        ],
        checkFunction: this.checkWeightGoalAchieved.bind(this),
      },

      // 食谱达人
      {
        type: AchievementType.RECIPE_MASTER,
        name: "美食大师",
        description: "创建10个以上健康食谱",
        icon: "👨‍🍳",
        color: "#8b5cf6",
        rarity: "RARE",
        points: 150,
        conditions: [{ metric: "recipeCount", operator: "gte", value: 10 }],
        checkFunction: this.checkRecipeMaster.bind(this),
      },

      // 社交达人
      {
        type: AchievementType.SOCIAL_BUTTERFLY,
        name: "社交达人",
        description: "分享健康内容超过20次",
        icon: "🦋",
        color: "#ec4899",
        rarity: "EPIC",
        points: 300,
        conditions: [{ metric: "shareCount", operator: "gte", value: 20 }],
        checkFunction: this.checkSocialButterfly.bind(this),
      },

      // 完美一周
      {
        type: AchievementType.PERFECT_WEEK,
        name: "完美一周",
        description: "一周内所有健康指标达标",
        icon: "⭐",
        color: "#22c55e",
        rarity: "RARE",
        points: 180,
        conditions: [{ metric: "weekPerfectScore", operator: "eq", value: 1 }],
        checkFunction: this.checkPerfectWeek.bind(this),
      },

      // 早起达人
      {
        type: AchievementType.EARLY_BIRD,
        name: "早起达人",
        description: "连续30天早上7点前记录早餐",
        icon: "🐦",
        color: "#06b6d4",
        rarity: "UNCOMMON",
        points: 80,
        conditions: [
          { metric: "earlyBreakfastStreak", operator: "gte", value: 30 },
        ],
        checkFunction: this.checkEarlyBird.bind(this),
      },

      // 卡路里管理大师
      {
        type: AchievementType.CALORIE_CHAMPION,
        name: "卡路里管理大师",
        description: "连续30天每日卡路里摄入在目标范围内",
        icon: "🏃",
        color: "#84cc16",
        rarity: "EPIC",
        points: 250,
        conditions: [
          { metric: "calorieAccuracyDays", operator: "gte", value: 30 },
        ],
        checkFunction: this.checkCalorieChampion.bind(this),
      },

      // 邀请达人
      {
        type: AchievementType.INVITE_MASTER,
        name: "邀请达人",
        description: "成功邀请5位好友注册",
        icon: "👥",
        color: "#f97316",
        rarity: "RARE",
        points: 200,
        conditions: [{ metric: "inviteCount", operator: "gte", value: 5 }],
        checkFunction: this.checkInviteMaster.bind(this),
      },
    ];

    triggers.forEach((trigger) => {
      this.achievementTriggers.set(trigger.type, trigger);
    });
  }

  /**
   * 检查用户成就
   */
  async checkAchievements(
    memberId: string,
    eventType: string,
    data?: any,
  ): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];

    // 获取用户已解锁的成就
    const existingAchievements = await prisma.achievement.findMany({
      where: { memberId },
      select: { type: true },
    });
    const unlockedTypes = new Set(existingAchievements.map((a) => a.type));

    // 检查所有成就触发器
    for (const [
      achievementType,
      trigger,
    ] of this.achievementTriggers.entries()) {
      // 跳过已解锁的成就
      if (unlockedTypes.has(achievementType)) {
        continue;
      }

      try {
        const isUnlocked = await trigger.checkFunction(memberId, data);
        if (isUnlocked) {
          const achievement = await this.unlockAchievement(
            memberId,
            trigger,
            eventType,
            data,
          );
          unlockedAchievements.push(achievement);
        }
      } catch (error) {
        console.error(`检查成就 ${achievementType} 时出错:`, error);
      }
    }

    return unlockedAchievements;
  }

  /**
   * 解锁成就
   */
  async unlockAchievement(
    memberId: string,
    trigger: AchievementTrigger,
    eventType: string,
    data?: any,
  ): Promise<Achievement> {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { name: true },
    });

    if (!member) {
      throw new Error("用户未找到");
    }

    // 创建成就记录
    const achievement = await prisma.achievement.create({
      data: {
        memberId,
        type: trigger.type,
        name: trigger.name,
        description: trigger.description,
        icon: trigger.icon,
        color: trigger.color,
        rarity: trigger.rarity,
        points: trigger.points,
        unlockedAt: new Date(),
        unlockedVia: eventType as any,
      },
    });

    // 发放奖励
    await this.grantReward(memberId, {
      type: "points",
      value: trigger.points,
      description: `成就"${trigger.name}"奖励`,
    });

    // 发送通知
    await this.sendAchievementNotification(memberId, achievement, member.name);

    return achievement;
  }

  /**
   * 发放成就奖励
   */
  private async grantReward(
    memberId: string,
    reward: AchievementReward,
  ): Promise<void> {
    switch (reward.type) {
      case "points":
        // 这里可以集成到积分系统
        console.log(`用户${memberId}获得${reward.value}积分`);
        break;

      case "vip_days":
        // 这里可以集成到VIP系统
        console.log(`用户${memberId}获得${reward.value}天VIP`);
        break;

      case "title":
        // 这里可以集成到称号系统
        console.log(`用户${memberId}获得称号"${reward.value}"`);
        break;

      default:
        console.log(`未知奖励类型: ${reward.type}`);
    }
  }

  /**
   * 发送成就通知
   */
  private async sendAchievementNotification(
    memberId: string,
    achievement: Achievement,
    memberName: string,
  ): Promise<void> {
    // 这里可以集成到通知系统
    console.log(`用户${memberName}(${memberId})解锁成就: ${achievement.name}`);

    // 可以发送邮件、推送等
    // await notificationService.send({
    //   userId: memberId,
    //   type: 'ACHIEVEMENT_UNLOCKED',
    //   title: '🎉 成就解锁！',
    //   content: `恭喜您解锁了"${achievement.name}"成就，获得${achievement.points}积分！`,
    //   data: { achievement }
    // })
  }

  /**
   * 获取用户成就列表
   */
  async getMemberAchievements(memberId: string): Promise<Achievement[]> {
    return await prisma.achievement.findMany({
      where: { memberId },
      orderBy: [{ rarity: "desc" }, { unlockedAt: "desc" }],
    });
  }

  /**
   * 获取成就统计
   */
  async getAchievementStats(memberId: string): Promise<any> {
    const achievements = await prisma.achievement.findMany({
      where: { memberId },
    });

    const stats = {
      total: achievements.length,
      totalPoints: achievements.reduce((sum, a) => sum + a.points, 0),
      byRarity: {
        COMMON: 0,
        UNCOMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
      },
      byType: {} as Record<AchievementType, number>,
    };

    achievements.forEach((achievement) => {
      stats.byRarity[achievement.rarity]++;
      stats.byType[achievement.type] =
        (stats.byType[achievement.type] || 0) + 1;
    });

    return stats;
  }

  // 成就检查函数
  private async checkFirstLogin(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.loginCount) return false;
    return data.loginCount === 1;
  }

  private async checkSevenDayStreak(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.checkinStreak) return false;
    return data.checkinStreak >= 7;
  }

  private async checkMonthlyChampion(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.monthlyHealthScore) return false;
    return data.monthlyHealthScore >= 90;
  }

  private async checkWeightGoalAchieved(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.weightGoalAchieved) return false;
    return data.weightGoalAchieved === true;
  }

  private async checkRecipeMaster(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.recipeCount) return false;
    return data.recipeCount >= 10;
  }

  private async checkSocialButterfly(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.shareCount) return false;
    return data.shareCount >= 20;
  }

  private async checkPerfectWeek(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.weekPerfectScore) return false;
    return data.weekPerfectScore === true;
  }

  private async checkEarlyBird(memberId: string, data?: any): Promise<boolean> {
    if (!data?.earlyBreakfastStreak) return false;
    return data.earlyBreakfastStreak >= 30;
  }

  private async checkCalorieChampion(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.calorieAccuracyDays) return false;
    return data.calorieAccuracyDays >= 30;
  }

  private async checkInviteMaster(
    memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.inviteCount) return false;
    return data.inviteCount >= 5;
  }

  /**
   * 计算连续打卡天数
   */
  async calculateCheckinStreak(memberId: string): Promise<number> {
    const today = startOfDay(new Date());
    const healthData = await prisma.healthData.findMany({
      where: {
        memberId,
        measuredAt: {
          gte: subDays(today, 100), // 查询最近100天的数据
        },
      },
      orderBy: { measuredAt: "desc" },
    });

    if (healthData.length === 0) return 0;

    const dates = new Set(
      healthData.map((d) => startOfDay(new Date(d.measuredAt)).toISOString()),
    );

    let streak = 0;
    let currentDate = today;

    while (dates.has(currentDate.toISOString())) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }

    return streak;
  }

  /**
   * 触发事件检查
   */
  async triggerEvent(
    memberId: string,
    eventType: string,
    data?: any,
  ): Promise<Achievement[]> {
    return this.checkAchievements(memberId, eventType, data);
  }

  /**
   * 获取可用成就列表
   */
  getAvailableAchievements(): AchievementTrigger[] {
    return Array.from(this.achievementTriggers.values());
  }

  /**
   * 获取成就配置
   */
  getAchievementConfig(type: AchievementType): AchievementTrigger | undefined {
    return this.achievementTriggers.get(type);
  }
}

// 导出单例实例
export const achievementSystem = AchievementSystem.getInstance();

// 导出工具函数
export async function checkMemberAchievements(
  memberId: string,
  eventType: string,
  data?: any,
): Promise<Achievement[]> {
  const system = AchievementSystem.getInstance();
  return system.checkAchievements(memberId, eventType, data);
}

export async function unlockMemberAchievement(
  memberId: string,
  type: AchievementType,
  eventType: string,
): Promise<Achievement> {
  const system = AchievementSystem.getInstance();
  const trigger = system.getAchievementConfig(type);
  if (!trigger) {
    throw new Error(`成就类型 ${type} 未配置`);
  }
  return system.unlockAchievement(memberId, trigger, eventType);
}

export async function getMemberAchievementList(
  memberId: string,
): Promise<Achievement[]> {
  const system = AchievementSystem.getInstance();
  return system.getMemberAchievements(memberId);
}

export async function getMemberAchievementStats(
  memberId: string,
): Promise<any> {
  const system = AchievementSystem.getInstance();
  return system.getAchievementStats(memberId);
}

/**
 * 分享成就功能
 * 创建成就分享记录并增加分享次数
 */
export async function shareAchievement(
  achievementId: string,
  memberId: string,
  options: {
    customMessage?: string;
    privacyLevel?: "PUBLIC" | "FRIENDS" | "PRIVATE";
  } = {},
): Promise<{
  success: boolean;
  shareId?: string;
  shareUrl?: string;
  error?: string;
}> {
  try {
    // 验证成就是否存在且属于该用户
    const achievement = await prisma.achievement.findFirst({
      where: {
        id: achievementId,
        memberId,
        isUnlocked: true,
      },
    });

    if (!achievement) {
      return {
        success: false,
        error: "成就不存在或未解锁",
      };
    }

    // 创建分享记录
    const share = await prisma.achievementShare.create({
      data: {
        achievementId,
        memberId,
        customMessage: options.customMessage,
        privacyLevel: options.privacyLevel || "PUBLIC",
        shareUrl: `/share/achievement/${achievementId}`, // 临时URL，实际应该生成token
      },
    });

    // 增加成就的分享次数
    await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        shareCount: {
          increment: 1,
        },
      },
    });

    // 生成分享URL（这里简化处理）
    const shareUrl = `/share/achievement/${share.id}`;

    return {
      success: true,
      shareId: share.id,
      shareUrl,
    };
  } catch (error) {
    console.error("分享成就失败:", error);
    return {
      success: false,
      error: "分享失败",
    };
  }
}
