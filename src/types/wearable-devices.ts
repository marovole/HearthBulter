/**
 * 可穿戴设备相关类型定义
 */

import type {
  DeviceType,
  PlatformType,
  SyncStatus,
  DevicePermission,
  HealthDataType,
  HealthDataSource,
} from '@prisma/client';

/**
 * 设备连接输入类型
 */
export interface DeviceConnectionInput {
  memberId: string;
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  manufacturer: string;
  model?: string;
  firmwareVersion?: string;
  platform: PlatformType;
  accessToken?: string;
  refreshToken?: string;
  permissions: DevicePermission[];
  dataTypes: HealthDataType[];
  syncInterval?: number;
}

/**
 * 设备连接信息类型
 */
export interface DeviceConnectionInfo {
  id: string;
  memberId: string;
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string;
  manufacturer: string;
  model?: string;
  firmwareVersion?: string;
  platform: PlatformType;
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  syncInterval: number;
  permissions: DevicePermission[];
  dataTypes: HealthDataType[];
  isActive: boolean;
  isAutoSync: boolean;
  connectionDate: Date;
  lastError?: string;
  errorCount: number;
  retryCount: number;
}

/**
 * 健康数据输入类型
 */
export interface HealthDataInput {
  memberId: string;
  deviceConnectionId?: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  measuredAt: Date;
  source: HealthDataSource;
  notes?: string;
}

/**
 * Apple HealthKit 数据类型
 */
export interface AppleHealthData {
  steps?: number;
  heartRate?: number;
  caloriesBurned?: number;
  distance?: number;
  activeMinutes?: number;
  exerciseType?: string;
  exerciseDuration?: number;
  date: Date;
}

/**
 * 华为Health 数据类型
 */
export interface HuaweiHealthData {
  steps?: number;
  heartRate?: number;
  caloriesBurned?: number;
  sleepDuration?: number;
  sleepQuality?: number;
  weight?: number;
  bodyFat?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  date: Date;
}

/**
 * 同步结果类型
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  errors: string[];
  lastSyncDate: Date;
}

/**
 * 设备权限映射
 */
export const DEVICE_PERMISSION_LABELS: Record<DevicePermission, string> = {
  READ_STEPS: '读取步数',
  READ_HEART_RATE: '读取心率',
  READ_CALORIES: '读取卡路里',
  READ_SLEEP: '读取睡眠数据',
  READ_WEIGHT: '读取体重',
  READ_BLOOD_PRESSURE: '读取血压',
  READ_DISTANCE: '读取距离',
  READ_ACTIVE_MINUTES: '读取活动时间',
  READ_EXERCISE: '读取运动记录',
};

/**
 * 设备类型映射
 */
export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  SMARTWATCH: '智能手表',
  FITNESS_BAND: '健身手环',
  SMART_SCALE: '智能体重秤',
  BLOOD_PRESSURE_MONITOR: '血压计',
  GLUCOSE_METER: '血糖仪',
  SMART_RING: '智能戒指',
  OTHER: '其他设备',
};

/**
 * 平台类型映射
 */
export const PLATFORM_TYPE_LABELS: Record<PlatformType, string> = {
  APPLE_HEALTHKIT: 'Apple HealthKit',
  HUAWEI_HEALTH: '华为Health',
  GOOGLE_FIT: 'Google Fit',
  XIAOMI_HEALTH: '小米运动健康',
  SAMSUNG_HEALTH: 'Samsung Health',
  GARMIN_CONNECT: 'Garmin Connect',
  FITBIT: 'Fitbit',
  OTHER_PLATFORM: '其他平台',
};

/**
 * 同步状态映射
 */
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  PENDING: '等待同步',
  SYNCING: '同步中',
  SUCCESS: '同步成功',
  FAILED: '同步失败',
  DISABLED: '已禁用',
};

/**
 * 健康数据类型映射
 */
export const HEALTH_DATA_TYPE_LABELS: Record<HealthDataType, string> = {
  STEPS: '步数',
  HEART_RATE: '心率',
  CALORIES_BURNED: '消耗卡路里',
  SLEEP_DURATION: '睡眠时长',
  SLEEP_QUALITY: '睡眠质量',
  WEIGHT: '体重',
  BODY_FAT: '体脂率',
  MUSCLE_MASS: '肌肉量',
  BLOOD_PRESSURE: '血压',
  DISTANCE: '距离',
  ACTIVE_MINUTES: '活动时间',
  EXERCISE_TYPE: '运动类型',
  EXERCISE_DURATION: '运动时长',
  RESTING_HEART_RATE: '静息心率',
  FLOORS_CLIMBED: '爬楼层数',
  STANDING_HOURS: '站立时间',
};

/**
 * 去重窗口时间（小时）
 */
export const DEDUPLICATION_WINDOWS: Record<HealthDataType, number> = {
  STEPS: 1,
  HEART_RATE: 1,
  CALORIES_BURNED: 24,
  SLEEP_DURATION: 24,
  SLEEP_QUALITY: 24,
  WEIGHT: 2,
  BODY_FAT: 2,
  MUSCLE_MASS: 2,
  BLOOD_PRESSURE: 2,
  DISTANCE: 1,
  ACTIVE_MINUTES: 1,
  EXERCISE_TYPE: 24,
  EXERCISE_DURATION: 24,
  RESTING_HEART_RATE: 12,
  FLOORS_CLIMBED: 12,
  STANDING_HOURS: 12,
};
