/**
 * Analytics Constants
 *
 * 趋势分析和数据分析相关的常量定义
 * @module constants/analytics
 */

/**
 * 趋势斜率阈值，用于判断趋势是否稳定
 * 当斜率绝对值小于此值时，判定为 STABLE
 */
export const TREND_SLOPE_THRESHOLD = 0.01;

/**
 * 移动平均默认窗口大小（天数）
 * 用于平滑时序数据，消除短期波动
 */
export const MOVING_AVERAGE_WINDOW = 7;

/**
 * 默认预测天数
 * 基于线性回归预测未来趋势的天数
 */
export const DEFAULT_PREDICTION_DAYS = 7;

/**
 * 变化百分比阈值
 * 同比/环比变化小于此值时，判定为 STABLE
 */
export const CHANGE_PERCENT_THRESHOLD = 1;

/**
 * 毫秒转天数的常量
 * 1天 = 24小时 * 60分钟 * 60秒 * 1000毫秒
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 健康评分相关常量
 */
export const HEALTH_SCORE = {
  /** 最低分数 */
  MIN: 0,
  /** 最高分数 */
  MAX: 100,
  /** 良好阈值 */
  GOOD_THRESHOLD: 80,
  /** 警告阈值 */
  WARNING_THRESHOLD: 60,
} as const;
