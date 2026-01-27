// ============================================================================
// 库存状态因子 (25%)
// 检测低库存和即将过期的食材
// ============================================================================

import { TriggerFactor, InventoryStatus } from "../types";

export function calculateInventoryFactor(status: InventoryStatus): TriggerFactor {
  const { lowStockItems, expiringItems, totalItems, criticalItems } = status;

  if (totalItems === 0) {
    return {
      name: "inventory",
      weight: 0.25,
      score: 0.5,
      reason: "No inventory tracked - consider stocking up",
    };
  }

  const lowStockRatio = lowStockItems / totalItems;
  const expiringRatio = expiringItems / totalItems;

  let score = 0;
  const reasons: string[] = [];

  if (criticalItems.length > 0) {
    score += 0.4;
    reasons.push(`${criticalItems.length} critical items low`);
  }

  if (lowStockRatio >= 0.3) {
    score += 0.3;
    reasons.push(`${Math.round(lowStockRatio * 100)}% items low stock`);
  } else if (lowStockRatio >= 0.15) {
    score += 0.15;
    reasons.push(`${lowStockItems} items running low`);
  }

  if (expiringRatio >= 0.2) {
    score += 0.3;
    reasons.push(`${expiringItems} items expiring soon`);
  } else if (expiringItems > 0) {
    score += 0.1;
    reasons.push(`${expiringItems} items to use soon`);
  }

  score = Math.min(score, 1.0);

  return {
    name: "inventory",
    weight: 0.25,
    score,
    reason: reasons.length > 0 ? reasons.join("; ") : "Inventory levels healthy",
  };
}
