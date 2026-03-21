// ============================================================================
// 智能触发引擎
// 综合多因子计算触发分数，决定是否生成周计划
// ============================================================================

import { prisma } from "@/lib/db";
import {
  TriggerResult,
  TriggerConfig,
  TriggerFactor,
  CalendarEvent,
  ConsumptionData,
  InventoryStatus,
  BehaviorPattern,
  DEFAULT_TRIGGER_CONFIG,
} from "./types";
import { calculateCalendarFactor } from "./factors/calendar-factor";
import { calculateConsumptionFactor } from "./factors/consumption-factor";
import { calculateInventoryFactor } from "./factors/inventory-factor";
import { calculateBehaviorFactor } from "./factors/behavior-factor";

export class SmartTriggerEngine {
  private config: TriggerConfig;

  constructor(config: TriggerConfig = DEFAULT_TRIGGER_CONFIG) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // 计算用户触发分数
  // --------------------------------------------------------------------------

  async calculateTriggerScore(userId: string): Promise<TriggerResult> {
    const cooldownCheck = await this.checkCooldown(userId);
    if (cooldownCheck.inCooldown) {
      return {
        userId,
        shouldTrigger: false,
        totalScore: 0,
        threshold: this.config.threshold,
        factors: [],
        suggestedAction: "none",
        cooldownUntil: cooldownCheck.cooldownUntil,
      };
    }

    const [calendarData, consumptionData, inventoryData, behaviorData] = await Promise.all([
      this.getCalendarData(userId),
      this.getConsumptionData(userId),
      this.getInventoryData(userId),
      this.getBehaviorData(userId),
    ]);

    const factors: TriggerFactor[] = [
      calculateCalendarFactor(calendarData),
      calculateConsumptionFactor(consumptionData),
      calculateInventoryFactor(inventoryData),
      calculateBehaviorFactor(behaviorData),
    ];

    const totalScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);

    const shouldTrigger = totalScore >= this.config.threshold;
    const suggestedAction = this.determineSuggestedAction(totalScore, factors);

    return {
      userId,
      shouldTrigger,
      totalScore,
      threshold: this.config.threshold,
      factors,
      suggestedAction,
    };
  }

  // --------------------------------------------------------------------------
  // 批量处理用户
  // --------------------------------------------------------------------------

  async processAllUsers(): Promise<TriggerResult[]> {
    const users = await prisma.user.findMany<{ id: string }>({
      where: { deletedAt: null },
      select: { id: true },
    });

    const results: TriggerResult[] = [];

    for (const user of users) {
      try {
        const result = await this.calculateTriggerScore(user.id);
        results.push(result);

        if (result.shouldTrigger) {
          await this.logTrigger(result);
        }
      } catch (error) {
        console.error(`Failed to process user ${user.id}:`, error);
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // 记录触发日志
  // --------------------------------------------------------------------------

  async logTrigger(result: TriggerResult): Promise<void> {
    await prisma.smartTriggerLog.create({
      data: {
        userId: result.userId,
        triggerType: result.suggestedAction,
        triggerScore: result.totalScore,
        factors: result.factors as any,
        triggered: result.shouldTrigger,
        cooldownUntil: new Date(Date.now() + this.config.cooldownDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private async checkCooldown(
    userId: string
  ): Promise<{ inCooldown: boolean; cooldownUntil?: Date }> {
    const lastTrigger = await prisma.smartTriggerLog.findFirst<{ cooldownUntil?: Date }>({
      where: {
        userId,
        triggered: true,
        cooldownUntil: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastTrigger?.cooldownUntil) {
      return { inCooldown: true, cooldownUntil: lastTrigger.cooldownUntil };
    }

    return { inCooldown: false };
  }

  private async getCalendarData(_userId: string): Promise<CalendarEvent[]> {
    return [];
  }

  private async getConsumptionData(userId: string): Promise<ConsumptionData> {
    const orders = await prisma.order.findMany<{ id: string; createdAt: Date }>({
      where: {
        platformAccount: { userId },
        status: "DELIVERED",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (orders.length === 0) {
      return {
        averageOrderInterval: 7,
        daysSinceLastOrder: 999,
      };
    }

    const lastOrderDate = orders[0]!.createdAt;
    const daysSinceLastOrder = Math.floor(
      (Date.now() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    let averageOrderInterval = 7;
    if (orders.length >= 2) {
      const intervals: number[] = [];
      for (let i = 0; i < orders.length - 1; i++) {
        const interval = Math.floor(
          (orders[i]!.createdAt.getTime() - orders[i + 1]!.createdAt.getTime()) /
            (24 * 60 * 60 * 1000)
        );
        intervals.push(interval);
      }
      averageOrderInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    }

    return {
      lastOrderDate,
      averageOrderInterval,
      daysSinceLastOrder,
    };
  }

  private async getInventoryData(userId: string): Promise<InventoryStatus> {
    const member = await prisma.familyMember.findFirst<{ id: string }>({
      where: { userId },
    });

    if (!member) {
      return {
        lowStockItems: 0,
        expiringItems: 0,
        totalItems: 0,
        criticalItems: [],
      };
    }

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const inventory = await prisma.inventoryItem.findMany<{
      id: string;
      name: string;
      status: string;
      expiryDate?: Date;
    }>({
      where: {
        memberId: member.id,
        deletedAt: null,
      },
    });

    const lowStockItems = inventory.filter((item) => item.status === "LOW_STOCK").length;
    const expiringItems = inventory.filter(
      (item) => item.expiryDate && item.expiryDate <= weekFromNow
    ).length;

    const criticalItems = inventory
      .filter((item) => item.status === "LOW_STOCK" || item.status === "OUT_OF_STOCK")
      .slice(0, 5)
      .map((item) => item.name);

    return {
      lowStockItems,
      expiringItems,
      totalItems: inventory.length,
      criticalItems,
    };
  }

  private async getBehaviorData(userId: string): Promise<BehaviorPattern> {
    const pattern = await prisma.userBehaviorPattern.findUnique<{
      preferredShoppingDay?: number;
      typicalOrderSize?: number;
    }>({
      where: { userId },
    });

    if (!pattern) {
      return {
        isWeekendShopper: false,
        averageLeadTime: 24,
      };
    }

    return {
      preferredShoppingDay: pattern.preferredShoppingDay ?? undefined,
      typicalOrderSize: pattern.typicalOrderSize ?? undefined,
      isWeekendShopper: pattern.preferredShoppingDay === 0 || pattern.preferredShoppingDay === 6,
      averageLeadTime: 24,
    };
  }

  private determineSuggestedAction(
    score: number,
    _factors: TriggerFactor[]
  ): "generate_plan" | "send_reminder" | "none" {
    if (score >= this.config.threshold) {
      return "generate_plan";
    }

    if (score >= this.config.threshold * 0.7) {
      return "send_reminder";
    }

    return "none";
  }
}

export const smartTriggerEngine = new SmartTriggerEngine();
