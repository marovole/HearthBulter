/**
 * Device Repository Types
 *
 * 设备连接领域的类型定义（基于 Prisma schema）
 *
 * @module device-types
 */

import { z } from 'zod';

// ==================== Enums ====================

export const deviceTypeSchema = z.enum([
  'SMARTWATCH',
  'FITNESS_BAND',
  'SMART_SCALE',
  'BLOOD_PRESSURE_MONITOR',
  'GLUCOSE_METER',
  'SMART_RING',
  'OTHER',
]);
export type DeviceTypeDTO = z.infer<typeof deviceTypeSchema>;

export const platformTypeSchema = z.enum([
  'APPLE_HEALTHKIT',
  'HUAWEI_HEALTH',
  'GOOGLE_FIT',
  'XIAOMI_HEALTH',
  'SAMSUNG_HEALTH',
  'GARMIN_CONNECT',
  'FITBIT',
  'OTHER_PLATFORM',
]);
export type PlatformTypeDTO = z.infer<typeof platformTypeSchema>;

export const syncStatusSchema = z.enum([
  'PENDING',
  'SYNCING',
  'SUCCESS',
  'FAILED',
  'DISABLED',
]);
export type SyncStatusDTO = z.infer<typeof syncStatusSchema>;

export const devicePermissionSchema = z.enum([
  'READ_STEPS',
  'READ_HEART_RATE',
  'READ_CALORIES',
  'READ_SLEEP',
  'READ_WEIGHT',
  'READ_BLOOD_PRESSURE',
  'READ_DISTANCE',
  'READ_ACTIVE_MINUTES',
  'READ_EXERCISE',
]);
export type DevicePermissionDTO = z.infer<typeof devicePermissionSchema>;

export const healthDataTypeSchema = z.enum([
  'STEPS',
  'HEART_RATE',
  'CALORIES_BURNED',
  'SLEEP_DURATION',
  'SLEEP_QUALITY',
  'WEIGHT',
  'BODY_FAT',
  'MUSCLE_MASS',
  'BLOOD_PRESSURE',
  'DISTANCE',
  'ACTIVE_MINUTES',
  'EXERCISE_TYPE',
  'EXERCISE_DURATION',
  'RESTING_HEART_RATE',
  'FLOORS_CLIMBED',
  'STANDING_HOURS',
]);
export type HealthDataTypeDTO = z.infer<typeof healthDataTypeSchema>;

// ==================== Device Connection ====================

/**
 * 设备连接 Schema
 */
export const deviceConnectionSchema = z.object({
  id: z.string().cuid(),
  memberId: z.string().cuid(),
  deviceId: z.string(),
  deviceType: deviceTypeSchema,
  deviceName: z.string(),
  manufacturer: z.string(),
  model: z.string().nullable(),
  firmwareVersion: z.string().nullable(),
  platform: platformTypeSchema,
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  lastSyncAt: z.coerce.date().nullable(),
  syncStatus: syncStatusSchema,
  syncInterval: z.number().int().default(1800),
  permissions: z.array(devicePermissionSchema),
  dataTypes: z.array(healthDataTypeSchema),
  isActive: z.boolean().default(true),
  isAutoSync: z.boolean().default(true),
  connectionDate: z.coerce.date(),
  disconnectionDate: z.coerce.date().nullable(),
  lastError: z.string().nullable(),
  errorCount: z.number().int().default(0),
  retryCount: z.number().int().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DeviceConnectionDTO = z.infer<typeof deviceConnectionSchema>;

/**
 * 设备连接创建输入
 */
export const deviceConnectionCreateInputSchema = z.object({
  memberId: z.string().cuid(),
  deviceId: z.string(),
  deviceType: deviceTypeSchema,
  deviceName: z.string(),
  manufacturer: z.string(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  platform: platformTypeSchema,
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  permissions: z.array(devicePermissionSchema),
  dataTypes: z.array(healthDataTypeSchema),
  syncInterval: z.number().int().default(1800),
});
export type DeviceConnectionCreateInputDTO = z.infer<
  typeof deviceConnectionCreateInputSchema
>;

/**
 * 设备连接更新输入
 */
export const deviceConnectionUpdateInputSchema = z.object({
  deviceName: z.string().optional(),
  model: z.string().nullable().optional(),
  firmwareVersion: z.string().nullable().optional(),
  accessToken: z.string().nullable().optional(),
  refreshToken: z.string().nullable().optional(),
  lastSyncAt: z.coerce.date().nullable().optional(),
  syncStatus: syncStatusSchema.optional(),
  syncInterval: z.number().int().optional(),
  permissions: z.array(devicePermissionSchema).optional(),
  dataTypes: z.array(healthDataTypeSchema).optional(),
  isActive: z.boolean().optional(),
  isAutoSync: z.boolean().optional(),
  disconnectionDate: z.coerce.date().nullable().optional(),
  lastError: z.string().nullable().optional(),
  errorCount: z.number().int().optional(),
  retryCount: z.number().int().optional(),
});
export type DeviceConnectionUpdateInputDTO = z.infer<
  typeof deviceConnectionUpdateInputSchema
>;

/**
 * 设备连接过滤条件
 */
export const deviceConnectionFilterSchema = z.object({
  memberId: z.string().cuid().optional(),
  platform: platformTypeSchema.optional(),
  isActive: z.boolean().optional(),
  syncStatus: syncStatusSchema.optional(),
  deviceType: deviceTypeSchema.optional(),
});
export type DeviceConnectionFilterDTO = z.infer<
  typeof deviceConnectionFilterSchema
>;
