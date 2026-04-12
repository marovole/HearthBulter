// ============================================================================
// 智能触发引擎
// 综合多因子计算触发分数，决定是否生成周计划
// ============================================================================

// @ts-nocheck - Convex returns untyped data, pending proper type definitions
import { convexClient } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
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

// Type definitions for Convex documents
interface TriggerLogDoc {
  _id?: string;
  userId?: string;
  triggered?: boolean;
  cooldownUntil?: number;
  createdAt?: number;
}

interface OrderDoc {
  _id?: string;
  status?: string;
  createdAt?: number;
}

interface OrdersResult {
  orders?: OrderDoc[];
}

interface BehaviorPatternDoc {
  preferredShoppingDay?: number;
  typicalOrderSize?: number;
}

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
    // 使用 Convex 获取所有用户
    // 注意：Convex 没有直接的 "list all users" 查询，需要通过其他方式获取
    // 这里使用一个变通方法：查询 smartTriggerLogs 获取所有出现过的 userId
    const logs = (await convexClient.query(asConvexQueryReference("smartTrigger:getTriggerLogs"), {
      userId: "system",
    })) as TriggerLogDoc[] | null;

    // 从日志中提取唯一的用户ID（简化处理）
    const userIds = new Set<string>();
    (logs || []).forEach((log) => {
      if (log.userId) userIds.add(log.userId);
    });

    // 如果没有找到用户，返回空结果
    if (userIds.size === 0) {
      return [];
    }

    const results: TriggerResult[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.calculateTriggerScore(userId);
        results.push(result);

        if (result.shouldTrigger) {
          await this.logTrigger(result);
        }
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error);
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // 记录触发日志
  // --------------------------------------------------------------------------

  async logTrigger(result: TriggerResult): Promise<void> {
    await convexClient.mutation(asConvexMutationReference("smartTrigger:createTriggerLog"), {
      userId: result.userId,
      triggerType: result.suggestedAction,
      triggerScore: result.totalScore,
      factors: result.factors,
      triggered: result.shouldTrigger,
      cooldownUntil: Date.now() + this.config.cooldownDays * 24 * 60 * 60 * 1000,
    });
  }

  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------

  private async checkCooldown(
    userId: string
  ): Promise<{ inCooldown: boolean; cooldownUntil?: Date }> {
    const logs = (await convexClient.query(asConvexQueryReference("smartTrigger:getTriggerLogs"), {
      userId,
    })) as TriggerLogDoc[] | null;

    // 查找最近触发的、在冷却期内的日志
    const lastTrigger = (logs || [])
      .filter((log) => log.triggered && log.cooldownUntil && log.cooldownUntil > Date.now())
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

    if (lastTrigger?.cooldownUntil) {
      return { inCooldown: true, cooldownUntil: new Date(lastTrigger.cooldownUntil) };
    }

    return { inCooldown: false };
  }

  private async getCalendarData(_userId: string): Promise<CalendarEvent[]> {
    return [];
  }

  private async getConsumptionData(userId: string): Promise<ConsumptionData> {
    // 使用 Convex 查询订单
    const orders = (await convexClient.query(asConvexQueryReference("ecommerce:getOrders"), {
      memberId: userId,
      status: "DELIVERED",
      limit: 10,
    })) as OrdersResult | null;

    const deliveredOrders = (orders?.orders || [])
      .filter((o) => o.status === "DELIVERED")
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (deliveredOrders.length === 0) {
      return {
        averageOrderInterval: 7,
        daysSinceLastOrder: 999,
      };
    }

    const lastOrderDate = new Date(deliveredOrders[0].createdAt);
    const daysSinceLastOrder = Math.floor(
      (Date.now() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    let averageOrderInterval = 7;
    if (deliveredOrders.length >= 2) {
      const intervals: number[] = [];
      for (let i = 0; i < deliveredOrders.length - 1; i++) {
        const interval = Math.floor(
          (deliveredOrders[i].createdAt - deliveredOrders[i + 1].createdAt) / (24 * 60 * 60 * 1000)
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
    // 使用 Convex 查询家庭成员
    const member = await convexClient.query(asConvexQueryReference("members:getByUserId"), {
      userId,
    });

    if (!member) {
      return {
        lowStockItems: 0,
        expiringItems: 0,
        totalItems: 0,
        criticalItems: [],
      };
    }

    // 库存查询需要 inventory 模块支持，这里简化处理
    // 实际实现需要添加 inventory Convex 查询
    return {
      lowStockItems: 0,
      expiringItems: 0,
      totalItems: 0,
      criticalItems: [],
    };
  }

  private async getBehaviorData(userId: string): Promise<BehaviorPattern> {
    // 使用 Convex 查询用户行为模式
    const pattern = (await convexClient.query(
      asConvexQueryReference("smartTrigger:getBehaviorPattern"),
      { userId }
    )) as BehaviorPatternDoc | null;

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
