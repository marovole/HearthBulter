// ============================================================================
// 智能触发引擎模块导出
// ============================================================================

export * from "./types";
export { SmartTriggerEngine, smartTriggerEngine } from "./trigger-engine";
export { calculateCalendarFactor } from "./factors/calendar-factor";
export { calculateConsumptionFactor } from "./factors/consumption-factor";
export { calculateInventoryFactor } from "./factors/inventory-factor";
export { calculateBehaviorFactor } from "./factors/behavior-factor";
