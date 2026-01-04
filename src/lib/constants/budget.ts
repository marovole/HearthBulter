/**
 * Budget Constants
 *
 * 预算管理相关的常量定义
 * @module constants/budget
 */

/**
 * 预算预警阈值（百分比）
 */
export const BUDGET_ALERT_THRESHOLDS = {
  /** 80% 预警阈值 - 接近预算上限 */
  WARNING_80: 80,
  /** 100% 预警阈值 - 达到预算上限 */
  WARNING_100: 100,
  /** 110% 预警阈值 - 超支预警 */
  OVERSPEND_110: 110,
} as const;

/**
 * 日均预算超标系数
 * 当日均支出超过日均预算的此倍数时，触发预警
 */
export const DAILY_BUDGET_EXCESS_FACTOR = 1.2;

/**
 * 预算状态
 */
export const BUDGET_STATUS = {
  /** 健康状态 - 使用率低于80% */
  HEALTHY: 'HEALTHY',
  /** 警告状态 - 使用率80%-100% */
  WARNING: 'WARNING',
  /** 超支状态 - 使用率超过100% */
  OVER_BUDGET: 'OVER_BUDGET',
} as const;

/**
 * 通知优先级映射
 * 基于预算阈值确定通知优先级
 */
export const BUDGET_NOTIFICATION_PRIORITY = {
  /** 110%及以上触发紧急通知 */
  URGENT_THRESHOLD: 110,
  /** 100%及以上触发高优先级通知 */
  HIGH_THRESHOLD: 100,
  /** 80%及以上触发中等优先级通知 */
  MEDIUM_THRESHOLD: 80,
} as const;

/**
 * 通知渠道配置
 */
export const BUDGET_NOTIFICATION_CHANNELS = {
  /** 紧急通知渠道 - 全渠道推送 */
  URGENT: ['in_app', 'email', 'sms'],
  /** 高优先级渠道 - 应用内+邮件 */
  HIGH: ['in_app', 'email'],
  /** 普通渠道 - 仅应用内 */
  NORMAL: ['in_app'],
} as const;

/**
 * 默认预算配置
 */
export const DEFAULT_BUDGET_CONFIG = {
  /** 默认月预算（元） */
  MONTHLY_BUDGET: 1500,
  /** 默认日预算计算基数（天） */
  DAYS_IN_MONTH: 30,
} as const;
