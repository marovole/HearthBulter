import {
  addDays,
  isAfter,
  startOfDay,
  differenceInDays,
  subDays,
} from "date-fns";
import {
  ACHIEVEMENT_TYPE_CONFIGS,
  AchievementType,
  type AchievementCondition,
  type AchievementRarity,
  type AchievementReward,
  type SharePrivacyLevel,
} from "@/types/social-sharing";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

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

export interface AchievementRecord {
  id: string;
  memberId: string;
  type: AchievementType;
  title: string;
  description: string;
  iconUrl?: string;
  imageUrl?: string;
  rarity: AchievementRarity;
  points: number;
  isUnlocked: boolean;
  unlockedAt?: number;
  metadata?: Record<string, unknown>;
}

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

  private initializeTriggers(): void {
    const triggers: AchievementTrigger[] = [
      {
        type: AchievementType.CHECK_IN_STREAK,
        name: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.CHECK_IN_STREAK].label,
        description:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.CHECK_IN_STREAK].description,
        icon: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.CHECK_IN_STREAK].icon,
        color: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.CHECK_IN_STREAK].color,
        rarity:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.CHECK_IN_STREAK].rarity,
        points:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.CHECK_IN_STREAK].points,
        conditions: [{ metric: "checkinStreak", operator: "gte", value: 7 }],
        checkFunction: this.checkSevenDayStreak.bind(this),
      },
      {
        type: AchievementType.WEIGHT_LOSS,
        name: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.WEIGHT_LOSS].label,
        description:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.WEIGHT_LOSS].description,
        icon: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.WEIGHT_LOSS].icon,
        color: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.WEIGHT_LOSS].color,
        rarity: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.WEIGHT_LOSS].rarity,
        points: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.WEIGHT_LOSS].points,
        conditions: [
          { metric: "weightGoalAchieved", operator: "eq", value: 1 },
        ],
        checkFunction: this.checkWeightGoalAchieved.bind(this),
      },
      {
        type: AchievementType.NUTRITION_GOAL,
        name: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.NUTRITION_GOAL].label,
        description:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.NUTRITION_GOAL].description,
        icon: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.NUTRITION_GOAL].icon,
        color: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.NUTRITION_GOAL].color,
        rarity: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.NUTRITION_GOAL].rarity,
        points: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.NUTRITION_GOAL].points,
        conditions: [
          { metric: "calorieAccuracyDays", operator: "gte", value: 30 },
        ],
        checkFunction: this.checkCalorieChampion.bind(this),
      },
      {
        type: AchievementType.EXERCISE_TARGET,
        name: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.EXERCISE_TARGET].label,
        description:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.EXERCISE_TARGET].description,
        icon: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.EXERCISE_TARGET].icon,
        color: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.EXERCISE_TARGET].color,
        rarity:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.EXERCISE_TARGET].rarity,
        points:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.EXERCISE_TARGET].points,
        conditions: [{ metric: "weekPerfectScore", operator: "eq", value: 1 }],
        checkFunction: this.checkPerfectWeek.bind(this),
      },
      {
        type: AchievementType.HEALTH_MILESTONE,
        name: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.HEALTH_MILESTONE].label,
        description:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.HEALTH_MILESTONE]
            .description,
        icon: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.HEALTH_MILESTONE].icon,
        color: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.HEALTH_MILESTONE].color,
        rarity:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.HEALTH_MILESTONE].rarity,
        points:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.HEALTH_MILESTONE].points,
        conditions: [
          { metric: "monthlyHealthScore", operator: "gte", value: 90 },
        ],
        checkFunction: this.checkMonthlyChampion.bind(this),
      },
      {
        type: AchievementType.COMMUNITY_CONTRIBUTION,
        name: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.COMMUNITY_CONTRIBUTION]
          .label,
        description:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.COMMUNITY_CONTRIBUTION]
            .description,
        icon: ACHIEVEMENT_TYPE_CONFIGS[AchievementType.COMMUNITY_CONTRIBUTION]
          .icon,
        color:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.COMMUNITY_CONTRIBUTION]
            .color,
        rarity:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.COMMUNITY_CONTRIBUTION]
            .rarity,
        points:
          ACHIEVEMENT_TYPE_CONFIGS[AchievementType.COMMUNITY_CONTRIBUTION]
            .points,
        conditions: [{ metric: "shareCount", operator: "gte", value: 20 }],
        checkFunction: this.checkSocialButterfly.bind(this),
      },
    ];

    triggers.forEach((trigger) => {
      this.achievementTriggers.set(trigger.type, trigger);
    });
  }

  async checkAchievements(
    memberId: string,
    eventType: string,
    data?: any,
  ): Promise<AchievementRecord[]> {
    const unlockedAchievements: AchievementRecord[] = [];

    const existingAchievements = await convexClient.query<
      Array<Record<string, unknown>>
    >(api.achievements.listByMember, {
      memberId: memberId as Id<"familyMembers">,
    });
    const unlockedTypes = new Set(
      existingAchievements.map(
        (achievement) => achievement.type as AchievementType,
      ),
    );

    for (const [
      achievementType,
      trigger,
    ] of this.achievementTriggers.entries()) {
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

  async unlockAchievement(
    memberId: string,
    trigger: AchievementTrigger,
    eventType: string,
    data?: any,
  ): Promise<AchievementRecord> {
    const member = await convexClient.query<Record<string, unknown> | null>(
      api.members.getById,
      { memberId: memberId as Id<"familyMembers"> },
    );

    if (!member) {
      throw new Error("用户未找到");
    }

    const now = Date.now();
    const achievementId = await convexClient.mutation<string>(
      api.achievements.createAchievement,
      {
        memberId: memberId as Id<"familyMembers">,
        type: trigger.type,
        title: trigger.name,
        description: trigger.description,
        iconUrl: trigger.icon,
        rarity: trigger.rarity,
        points: trigger.points,
        isUnlocked: true,
        unlockedAt: now,
        metadata: {
          color: trigger.color,
          unlockedVia: eventType,
          payload: data ?? null,
        },
      },
    );

    const createdAchievement = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.achievements.getById, {
      id: achievementId as Id<"achievements">,
    });

    if (!createdAchievement) {
      throw new Error("成就创建失败");
    }

    await this.grantReward(memberId, {
      type: "points",
      value: trigger.points,
      description: `成就"${trigger.name}"奖励`,
    });

    await this.sendAchievementNotification(
      memberId,
      this.normalizeAchievement(createdAchievement),
      member.name as string,
    );

    return this.normalizeAchievement(createdAchievement);
  }

  private async grantReward(
    memberId: string,
    reward: AchievementReward,
  ): Promise<void> {
    switch (reward.type) {
    case "points":
      console.log(`用户${memberId}获得${reward.value}积分`);
      break;
    case "vip_days":
      console.log(`用户${memberId}获得${reward.value}天VIP`);
      break;
    case "title":
      console.log(`用户${memberId}获得称号"${reward.value}"`);
      break;
    default:
      console.log(`未知奖励类型: ${reward.type}`);
    }
  }

  private async sendAchievementNotification(
    memberId: string,
    achievement: AchievementRecord,
    memberName: string,
  ): Promise<void> {
    console.log(`用户${memberName}(${memberId})解锁成就: ${achievement.title}`);
  }

  async getMemberAchievements(memberId: string): Promise<AchievementRecord[]> {
    const achievements = await convexClient.query<
      Array<Record<string, unknown>>
    >(api.achievements.listByMember, {
      memberId: memberId as Id<"familyMembers">,
    });

    return achievements.map((achievement) =>
      this.normalizeAchievement(achievement),
    );
  }

  async getAchievementStats(
    memberId: string,
  ): Promise<Record<string, unknown>> {
    const achievements = await this.getMemberAchievements(memberId);

    const stats = {
      total: achievements.length,
      totalPoints: achievements.reduce((sum, a) => sum + a.points, 0),
      byRarity: {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
        DIAMOND: 0,
      } as Record<AchievementRarity, number>,
      byType: {} as Record<AchievementType, number>,
    };

    achievements.forEach((achievement) => {
      stats.byRarity[achievement.rarity] =
        (stats.byRarity[achievement.rarity] ?? 0) + 1;
      stats.byType[achievement.type] =
        (stats.byType[achievement.type] ?? 0) + 1;
    });

    return stats;
  }

  private async checkFirstLogin(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.loginCount) return false;
    return data.loginCount === 1;
  }

  private async checkSevenDayStreak(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.checkinStreak) return false;
    return data.checkinStreak >= 7;
  }

  private async checkMonthlyChampion(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.monthlyHealthScore) return false;
    return data.monthlyHealthScore >= 90;
  }

  private async checkWeightGoalAchieved(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.weightGoalAchieved) return false;
    return data.weightGoalAchieved === true;
  }

  private async checkRecipeMaster(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.recipeCount) return false;
    return data.recipeCount >= 10;
  }

  private async checkSocialButterfly(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.shareCount) return false;
    return data.shareCount >= 20;
  }

  private async checkPerfectWeek(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.weekPerfectScore) return false;
    return data.weekPerfectScore === true;
  }

  private async checkEarlyBird(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.earlyBreakfastStreak) return false;
    return data.earlyBreakfastStreak >= 30;
  }

  private async checkCalorieChampion(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.calorieAccuracyDays) return false;
    return data.calorieAccuracyDays >= 30;
  }

  private async checkInviteMaster(
    _memberId: string,
    data?: any,
  ): Promise<boolean> {
    if (!data?.inviteCount) return false;
    return data.inviteCount >= 5;
  }

  async calculateCheckinStreak(memberId: string): Promise<number> {
    const today = startOfDay(new Date());
    const startDate = subDays(today, 100).getTime();

    const healthData = await convexClient.query<Array<Record<string, unknown>>>(
      api.health.listByMemberDateRange,
      {
        memberId: memberId as Id<"familyMembers">,
        startDate,
      },
    );

    if (healthData.length === 0) return 0;

    const dates = new Set(
      healthData.map((record) =>
        startOfDay(new Date(record.measuredAt as number)).toISOString(),
      ),
    );

    let streak = 0;
    let currentDate = today;

    while (dates.has(currentDate.toISOString())) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }

    return streak;
  }

  async triggerEvent(
    memberId: string,
    eventType: string,
    data?: any,
  ): Promise<AchievementRecord[]> {
    return this.checkAchievements(memberId, eventType, data);
  }

  getAvailableAchievements(): AchievementTrigger[] {
    return Array.from(this.achievementTriggers.values());
  }

  getAchievementConfig(type: AchievementType): AchievementTrigger | undefined {
    return this.achievementTriggers.get(type);
  }

  private normalizeAchievement(
    record: Record<string, unknown>,
  ): AchievementRecord {
    return {
      id: record._id as string,
      memberId: record.memberId as string,
      type: record.type as AchievementType,
      title: record.title as string,
      description: record.description as string,
      iconUrl: record.iconUrl as string | undefined,
      imageUrl: record.imageUrl as string | undefined,
      rarity: record.rarity as AchievementRarity,
      points: record.points as number,
      isUnlocked: record.isUnlocked as boolean,
      unlockedAt: record.unlockedAt as number | undefined,
      metadata: record.metadata as Record<string, unknown> | undefined,
    };
  }
}

export const achievementSystem = AchievementSystem.getInstance();

export async function checkMemberAchievements(
  memberId: string,
  eventType: string,
  data?: any,
): Promise<AchievementRecord[]> {
  const system = AchievementSystem.getInstance();
  return system.checkAchievements(memberId, eventType, data);
}

export async function unlockMemberAchievement(
  memberId: string,
  type: AchievementType,
  eventType: string,
): Promise<AchievementRecord> {
  const system = AchievementSystem.getInstance();
  const trigger = system.getAchievementConfig(type);
  if (!trigger) {
    throw new Error(`成就类型 ${type} 未配置`);
  }
  return system.unlockAchievement(memberId, trigger, eventType);
}

export async function getMemberAchievementList(
  memberId: string,
): Promise<AchievementRecord[]> {
  const system = AchievementSystem.getInstance();
  return system.getMemberAchievements(memberId);
}

export async function getMemberAchievementStats(
  memberId: string,
): Promise<Record<string, unknown>> {
  const system = AchievementSystem.getInstance();
  return system.getAchievementStats(memberId);
}

export async function shareAchievement(
  achievementId: string,
  memberId: string,
  options: {
    customMessage?: string;
    privacyLevel?: SharePrivacyLevel;
  } = {},
): Promise<{
  success: boolean;
  shareId?: string;
  shareUrl?: string;
  error?: string;
}> {
  try {
    const achievement = await convexClient.query<Record<
      string,
      unknown
    > | null>(api.achievements.getById, {
      id: achievementId as Id<"achievements">,
    });

    if (!achievement || achievement.memberId !== memberId) {
      return { success: false, error: "成就不存在或未解锁" };
    }

    if (!achievement.isUnlocked) {
      return { success: false, error: "成就不存在或未解锁" };
    }

    await convexClient.mutation(api.achievements.updateAchievement, {
      id: achievementId as Id<"achievements">,
      patch: {
        isShared: true,
        sharedAt: Date.now(),
        metadata: {
          ...(achievement.metadata as Record<string, unknown> | undefined),
          customMessage: options.customMessage ?? undefined,
          privacyLevel: options.privacyLevel ?? undefined,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("分享成就失败:", error);
    return {
      success: false,
      error: "分享失败",
    };
  }
}
