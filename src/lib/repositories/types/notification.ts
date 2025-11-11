/**
 * 通知域 DTO 类型定义
 *
 * 本模块定义通知系统相关的数据传输对象，包括：
 * - 通知记录
 * - 通知日志
 * - 通知偏好
 * - 计划任务
 *
 * @module notification
 */

import { z } from 'zod';

/**
 * 通知渠道枚举
 */
export const notificationChannelSchema = z.enum(['IN_APP', 'EMAIL', 'SMS', 'WECHAT', 'PUSH']);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/**
 * 通知优先级枚举
 */
export const notificationPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;

/**
 * 通知状态枚举
 */
export const notificationStatusSchema = z.enum(['PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED']);
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

/**
 * 通知类型枚举
 */
export const notificationTypeSchema = z.enum([
  'CHECK_IN_REMINDER',
  'TASK_NOTIFICATION',
  'EXPIRY_ALERT',
  'BUDGET_WARNING',
  'HEALTH_ALERT',
  'GOAL_ACHIEVEMENT',
  'FAMILY_ACTIVITY',
  'SYSTEM_ANNOUNCEMENT',
  'MARKETING',
  'OTHER',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

/**
 * 通知记录 Schema
 */
export const notificationSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  priority: notificationPrioritySchema.default('MEDIUM'),
  channels: z.array(notificationChannelSchema).default(['IN_APP']),
  metadata: z.record(z.any()).optional(),
  actionUrl: z.string().url().optional(),
  actionText: z.string().max(50).optional(),
  dedupKey: z.string().optional(),
  batchId: z.string().uuid().optional(),
  status: notificationStatusSchema.default('PENDING'),
  readAt: z.coerce.date().optional().nullable(),
  sentAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date(),
});

export type NotificationDTO = z.infer<typeof notificationSchema>;

/**
 * 创建通知 Schema
 */
export const createNotificationSchema = notificationSchema
  .omit({ id: true, status: true, readAt: true, sentAt: true, createdAt: true })
  .partial({ priority: true, channels: true });

export type CreateNotificationDTO = z.infer<typeof createNotificationSchema>;

/**
 * 通知日志 Schema
 */
export const notificationLogSchema = z.object({
  id: z.string().uuid().optional(),
  notificationId: z.string().uuid(),
  channel: notificationChannelSchema,
  status: notificationStatusSchema,
  detail: z.string().optional(),
  sentAt: z.coerce.date().optional(),
});

export type NotificationLogDTO = z.infer<typeof notificationLogSchema>;

/**
 * 通知偏好 Schema
 */
export const notificationPreferenceSchema = z.object({
  memberId: z.string().uuid(),
  channelPreferences: z.record(notificationChannelSchema, z.boolean()).optional(),
  quietHours: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string(),
    })
    .optional(),
  mutedTypes: z.array(notificationTypeSchema).optional(),
  lastUpdatedAt: z.coerce.date(),
});

export type NotificationPreferenceDTO = z.infer<typeof notificationPreferenceSchema>;

/**
 * 通知列表查询 Schema
 */
export const notificationListQuerySchema = z.object({
  memberId: z.string().uuid(),
  type: notificationTypeSchema.optional(),
  status: notificationStatusSchema.optional(),
  channel: notificationChannelSchema.optional(),
  includeRead: z.boolean().default(false).optional(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/**
 * 计划通知 Schema
 */
export const scheduledNotificationSchema = z.object({
  id: z.string().uuid(),
  notificationId: z.string().uuid().optional(),
  memberId: z.string().uuid(),
  payload: createNotificationSchema,
  scheduledTime: z.coerce.date(),
  status: z.enum(['SCHEDULED', 'PROCESSING', 'DISPATCHED', 'FAILED']).default('SCHEDULED'),
  retryCount: z.number().int().nonnegative().default(0),
});

export type ScheduledNotificationDTO = z.infer<typeof scheduledNotificationSchema>;

/**
 * 通知接收者信息 Schema
 */
export const notificationRecipientSchema = z.object({
  memberId: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  wechatOpenId: z.string().optional(),
  pushTokens: z.array(z.string()).optional(),
  preferences: notificationPreferenceSchema.optional(),
});

export type NotificationRecipientDTO = z.infer<typeof notificationRecipientSchema>;
