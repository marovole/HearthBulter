// ============================================================================
// 行为习惯因子 (20%)
// 基于用户购物习惯优化触发时机
// ============================================================================

import { TriggerFactor, BehaviorPattern } from "../types";

export function calculateBehaviorFactor(pattern: BehaviorPattern): TriggerFactor {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  let score = 0;
  const reasons: string[] = [];

  if (pattern.preferredShoppingDay !== undefined) {
    const daysUntilPreferred = (pattern.preferredShoppingDay - currentDay + 7) % 7;

    if (daysUntilPreferred === 0) {
      score += 0.5;
      reasons.push("Today is your usual shopping day");
    } else if (daysUntilPreferred === 1) {
      score += 0.3;
      reasons.push("Tomorrow is your usual shopping day");
    } else if (daysUntilPreferred <= 2) {
      score += 0.2;
      reasons.push(`${daysUntilPreferred} days until usual shopping day`);
    }
  }

  if (pattern.isWeekendShopper) {
    if (currentDay === 5 || currentDay === 6) {
      score += 0.3;
      reasons.push("Weekend approaching - good time to plan");
    }
  }

  if (currentHour >= 9 && currentHour <= 11) {
    score += 0.1;
    reasons.push("Morning - optimal planning time");
  } else if (currentHour >= 18 && currentHour <= 20) {
    score += 0.1;
    reasons.push("Evening - good time to review needs");
  }

  if (pattern.averageLeadTime > 0) {
    const leadTimeDays = Math.ceil(pattern.averageLeadTime / 24);
    if (leadTimeDays >= 2) {
      score += 0.1;
      reasons.push(`Plan ${leadTimeDays} days ahead for delivery`);
    }
  }

  score = Math.min(score, 1.0);

  return {
    name: "behavior",
    weight: 0.2,
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : "No specific behavior patterns detected",
  };
}
