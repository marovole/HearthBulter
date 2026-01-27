// ============================================================================
// 智能触发引擎类型定义
// ============================================================================

export interface TriggerFactor {
  name: string;
  weight: number;
  score: number;
  reason: string;
}

export interface TriggerResult {
  userId: string;
  shouldTrigger: boolean;
  totalScore: number;
  threshold: number;
  factors: TriggerFactor[];
  suggestedAction: "generate_plan" | "send_reminder" | "none";
  cooldownUntil?: Date;
}

export interface TriggerConfig {
  threshold: number;
  cooldownDays: number;
  weights: {
    calendar: number;
    consumption: number;
    inventory: number;
    behavior: number;
  };
}

export interface CalendarEvent {
  date: Date;
  type: "holiday" | "birthday" | "gathering" | "custom";
  guestCount?: number;
  dietaryRequirements?: string[];
}

export interface ConsumptionData {
  lastOrderDate?: Date;
  averageOrderInterval: number;
  daysSinceLastOrder: number;
}

export interface InventoryStatus {
  lowStockItems: number;
  expiringItems: number;
  totalItems: number;
  criticalItems: string[];
}

export interface BehaviorPattern {
  preferredShoppingDay?: number;
  typicalOrderSize?: number;
  isWeekendShopper: boolean;
  averageLeadTime: number;
}

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  threshold: 0.6,
  cooldownDays: 7,
  weights: {
    calendar: 0.3,
    consumption: 0.25,
    inventory: 0.25,
    behavior: 0.2,
  },
};
