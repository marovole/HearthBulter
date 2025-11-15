/**
 * Analytics 领域类型定义
 *
 * 这些类型从 Prisma Client 中迁移出来，以消除对 @prisma/client 的依赖
 * 定义应与 prisma/schema.prisma 中的 enum 保持同步
 */

/**
 * 趋势数据类型
 *
 * 用于标识不同的健康和营养指标，支持时序数据分析和趋势预测
 */
export type TrendDataType =
  /** 体重 (kg) */
  | 'WEIGHT'
  /** 体脂率 (%) */
  | 'BODY_FAT'
  /** 肌肉量 (kg) */
  | 'MUSCLE_MASS'
  /** 血压 (mmHg) */
  | 'BLOOD_PRESSURE'
  /** 心率 (bpm) */
  | 'HEART_RATE'
  /** 卡路里 (kcal) */
  | 'CALORIES'
  /** 蛋白质 (g) */
  | 'PROTEIN'
  /** 碳水化合物 (g) */
  | 'CARBS'
  /** 脂肪 (g) */
  | 'FAT'
  /** 运动时长 (分钟) */
  | 'EXERCISE'
  /** 睡眠时长 (小时) */
  | 'SLEEP'
  /** 饮水量 (ml) */
  | 'WATER'
  /** 健康评分 (0-100) */
  | 'HEALTH_SCORE';

/**
 * 异常类型
 *
 * 标识健康数据中检测到的异常模式
 */
export type AnomalyType =
  /** 突然变化（单次大幅波动） */
  | 'SUDDEN_CHANGE'
  /** 营养失衡（营养摄入不均衡） */
  | 'NUTRITION_IMBALANCE'
  /** 目标偏离（偏离既定健康目标） */
  | 'GOAL_DEVIATION'
  /** 阈值超限（超出预设阈值范围） */
  | 'THRESHOLD_EXCEEDED'
  /** 数据缺失（应记录但未记录的数据） */
  | 'MISSING_DATA';

/**
 * 异常严重程度
 *
 * 用于分类健康异常的风险等级
 */
export type AnomalySeverity =
  /** 低风险 */
  | 'LOW'
  /** 中风险 */
  | 'MEDIUM'
  /** 高风险 */
  | 'HIGH'
  /** 危急风险（需要立即处理） */
  | 'CRITICAL';

/**
 * 趋势数据类型中文名称映射
 */
export const TrendDataTypeNames: Record<TrendDataType, string> = {
  WEIGHT: '体重',
  BODY_FAT: '体脂率',
  MUSCLE_MASS: '肌肉量',
  BLOOD_PRESSURE: '血压',
  HEART_RATE: '心率',
  CALORIES: '卡路里',
  PROTEIN: '蛋白质',
  CARBS: '碳水化合物',
  FAT: '脂肪',
  EXERCISE: '运动时长',
  SLEEP: '睡眠时长',
  WATER: '饮水量',
  HEALTH_SCORE: '健康评分',
};

/**
 * 趋势数据类型单位映射
 */
export const TrendDataTypeUnits: Record<TrendDataType, string> = {
  WEIGHT: 'kg',
  BODY_FAT: '%',
  MUSCLE_MASS: 'kg',
  BLOOD_PRESSURE: 'mmHg',
  HEART_RATE: 'bpm',
  CALORIES: 'kcal',
  PROTEIN: 'g',
  CARBS: 'g',
  FAT: 'g',
  EXERCISE: '分钟',
  SLEEP: '小时',
  WATER: 'ml',
  HEALTH_SCORE: '分',
};
