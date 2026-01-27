// ============================================================================
// 消费周期因子 (25%)
// 基于历史订单周期预测下次购物时机
// ============================================================================

import { TriggerFactor, ConsumptionData } from "../types";

export function calculateConsumptionFactor(data: ConsumptionData): TriggerFactor {
  const { lastOrderDate, averageOrderInterval, daysSinceLastOrder } = data;

  if (!lastOrderDate || averageOrderInterval <= 0) {
    return {
      name: "consumption",
      weight: 0.25,
      score: 0.3,
      reason: "No order history - suggesting initial order",
    };
  }

  const cycleProgress = daysSinceLastOrder / averageOrderInterval;

  let score = 0;
  let reason = "";

  if (cycleProgress >= 1.2) {
    score = 1.0;
    reason = `Overdue by ${Math.round((cycleProgress - 1) * averageOrderInterval)} days`;
  } else if (cycleProgress >= 1.0) {
    score = 0.9;
    reason = "At typical reorder point";
  } else if (cycleProgress >= 0.8) {
    score = 0.7;
    reason = `${Math.round((1 - cycleProgress) * averageOrderInterval)} days until typical reorder`;
  } else if (cycleProgress >= 0.6) {
    score = 0.4;
    reason = "Approaching reorder window";
  } else {
    score = 0.1;
    reason = "Recently ordered - no action needed";
  }

  return {
    name: "consumption",
    weight: 0.25,
    score,
    reason,
  };
}
