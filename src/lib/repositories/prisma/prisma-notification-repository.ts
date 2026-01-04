/**
 * Prisma Notification Repository
 *
 * 通知系统的 Prisma 实现,支持双写验证框架
 * 实现了 NotificationRepository 接口的所有 15 个方法
 *
 * @module prisma-notification-repository
 */

import {
  Prisma,
  type Notification as PrismaNotification,
  type NotificationPreference as PrismaNotificationPreference,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeParseArray, safeParseObject } from "@/lib/utils/json-helpers";
import type { PaginatedResult, PaginationInput } from "../types/common";
import type { NotificationRepository } from "../interfaces/notification-repository";
import type {
  CreateNotificationDTO,
  NotificationChannel,
  NotificationDTO,
  NotificationListQuery,
  NotificationLogDTO,
  NotificationPreferenceDTO,
  NotificationRecipientDTO,
  NotificationStatus,
  NotificationType,
  ScheduledNotificationDTO,
} from "../types/notification";

/**
 * 默认通知渠道
 */
const DEFAULT_CHANNELS: NotificationChannel[] = ["IN_APP"];

/**
 * 通知类型列表
 */
const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "CHECK_IN_REMINDER",
  "TASK_NOTIFICATION",
  "EXPIRY_ALERT",
  "BUDGET_WARNING",
  "HEALTH_ALERT",
  "GOAL_ACHIEVEMENT",
  "FAMILY_ACTIVITY",
  "SYSTEM_ANNOUNCEMENT",
  "MARKETING",
  "OTHER",
];

/**
 * ScheduledNotification 原始数据行类型
 */
type ScheduledNotificationRow = {
  id: string;
  member_id: string;
  notification_id: string | null;
  payload: unknown;
  scheduled_time: Date;
  status: ScheduledNotificationDTO["status"];
  retry_count: number | null;
};

/**
 * Prisma Notification Repository
 *
 * 使用 Prisma ORM 访问通知数据
 * 支持与 SupabaseNotificationRepository 的双写验证
 */
export class PrismaNotificationRepository implements NotificationRepository {
  private readonly loggerPrefix = "[PrismaNotificationRepository]";

  /**
   * 创建通知记录
   */
  async createNotification(
    payload: CreateNotificationDTO,
  ): Promise<NotificationDTO> {
    try {
      const notification = await prisma.notification.create({
        data: {
          memberId: payload.memberId,
          type: payload.type,
          title: payload.title,
          content: payload.content,
          priority: payload.priority ?? "MEDIUM",
          channels: formatChannelsToJson(payload.channels),
          metadata: payload.metadata ?? Prisma.JsonNull,
          actionUrl: payload.actionUrl ?? null,
          actionText: payload.actionText ?? null,
          dedupKey: payload.dedupKey ?? null,
          batchId: payload.batchId ?? null,
          status: "PENDING",
        },
      });

      return mapNotificationRow(notification);
    } catch (error) {
      return this.handleError("createNotification", error);
    }
  }

  /**
   * 按 ID 获取通知
   */
  async getNotificationById(id: string): Promise<NotificationDTO | null> {
    try {
      const notification = await prisma.notification.findFirst({
        where: { id, deletedAt: null },
      });

      return notification ? mapNotificationRow(notification) : null;
    } catch (error) {
      return this.handleError("getNotificationById", error);
    }
  }

  /**
   * 查询成员的通知列表（支持分页和过滤）
   */
  async listMemberNotifications(
    query: NotificationListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<NotificationDTO>> {
    try {
      const where = buildNotificationWhere(query);
      const offset = pagination?.offset ?? 0;
      const limit = pagination?.limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      const items = notifications.map(mapNotificationRow);

      return {
        items,
        total,
        hasMore: limit ? offset + items.length < total : undefined,
      };
    } catch (error) {
      return this.handleError("listMemberNotifications", error);
    }
  }

  /**
   * 更新通知状态
   */
  async updateStatus(id: string, status: NotificationStatus): Promise<void> {
    try {
      const data: Prisma.NotificationUpdateInput = { status };

      if (status === "SENT") {
        data.sentAt = new Date();
      }

      await prisma.notification.update({ where: { id }, data });
    } catch (error) {
      return this.handleError("updateStatus", error);
    }
  }

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: string, memberId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, memberId, deletedAt: null },
        data: { readAt: new Date() },
      });
    } catch (error) {
      return this.handleError("markAsRead", error);
    }
  }

  /**
   * 批量标记通知为已读
   */
  async markAllAsRead(memberId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: { memberId, readAt: null, deletedAt: null },
        data: { readAt: new Date() },
      });

      return result.count;
    } catch (error) {
      return this.handleError("markAllAsRead", error);
    }
  }

  /**
   * 写入渠道投递日志
   */
  async appendDeliveryLog(log: NotificationLogDTO): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          notificationId: log.notificationId,
          channel: log.channel,
          status: log.status,
          sentAt: log.sentAt ?? new Date(),
          errorMessage: log.detail ?? null,
        },
      });
    } catch (error) {
      return this.handleError("appendDeliveryLog", error);
    }
  }

  /**
   * 获取待发送或重试的通知
   */
  async listPendingNotifications(limit: number): Promise<NotificationDTO[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          status: { in: ["PENDING", "SENDING"] },
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

      return notifications.map(mapNotificationRow);
    } catch (error) {
      return this.handleError("listPendingNotifications", error);
    }
  }

  /**
   * 创建计划通知（延时任务）
   *
   * Note: scheduled_notifications 表不在 Prisma schema 中,使用 raw SQL
   */
  async createScheduledNotification(
    schedule: ScheduledNotificationDTO,
  ): Promise<ScheduledNotificationDTO> {
    try {
      const payloadJson = JSON.stringify(schedule.payload);
      const rows = await prisma.$queryRaw<ScheduledNotificationRow[]>`
        INSERT INTO "scheduled_notifications"
          ("id", "member_id", "notification_id", "payload", "scheduled_time", "status", "retry_count")
        VALUES (
          ${schedule.id},
          ${schedule.memberId},
          ${schedule.notificationId ?? null},
          ${payloadJson}::jsonb,
          ${schedule.scheduledTime},
          ${schedule.status},
          ${schedule.retryCount ?? 0}
        )
        RETURNING *
      `;

      if (!rows.length) {
        throw new Error("Scheduled notification insert failed");
      }

      return mapScheduleRow(rows[0]);
    } catch (error) {
      return this.handleError("createScheduledNotification", error);
    }
  }

  /**
   * 列出到期待派发的计划通知
   */
  async listDueSchedules(
    before: Date,
    limit: number,
  ): Promise<ScheduledNotificationDTO[]> {
    try {
      const rows = await prisma.$queryRaw<ScheduledNotificationRow[]>`
        SELECT *
        FROM "scheduled_notifications"
        WHERE "scheduled_time" <= ${before}
          AND "status" IN ('SCHEDULED', 'PROCESSING')
        ORDER BY "scheduled_time" ASC
        LIMIT ${limit}
      `;

      return rows.map(mapScheduleRow);
    } catch (error) {
      return this.handleError("listDueSchedules", error);
    }
  }

  /**
   * 更新计划任务状态
   */
  async updateScheduleStatus(
    scheduleId: string,
    status: ScheduledNotificationDTO["status"],
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE "scheduled_notifications"
        SET "status" = ${status}
        WHERE "id" = ${scheduleId}
      `;
    } catch (error) {
      return this.handleError("updateScheduleStatus", error);
    }
  }

  /**
   * 查询通知偏好
   */
  async getNotificationPreferences(
    memberId: string,
  ): Promise<NotificationPreferenceDTO | null> {
    try {
      const row = await prisma.notificationPreference.findUnique({
        where: { memberId },
      });

      return row ? mapPreferenceRow(row) : null;
    } catch (error) {
      return this.handleError("getNotificationPreferences", error);
    }
  }

  /**
   * 更新或创建通知偏好
   */
  async upsertNotificationPreferences(
    preference: NotificationPreferenceDTO,
  ): Promise<void> {
    try {
      const channelPreferences = JSON.stringify(
        preference.channelPreferences ?? {},
      );
      const typeSettings = JSON.stringify(
        buildTypeSettings(preference.mutedTypes),
      );
      const quietHoursStart = parseQuietHourToInt(preference.quietHours?.start);
      const quietHoursEnd = parseQuietHourToInt(preference.quietHours?.end);

      await prisma.notificationPreference.upsert({
        where: { memberId: preference.memberId },
        create: {
          memberId: preference.memberId,
          channelPreferences,
          typeSettings,
          globalQuietHoursStart: quietHoursStart,
          globalQuietHoursEnd: quietHoursEnd,
        },
        update: {
          channelPreferences,
          typeSettings,
          globalQuietHoursStart: quietHoursStart,
          globalQuietHoursEnd: quietHoursEnd,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      return this.handleError("upsertNotificationPreferences", error);
    }
  }

  /**
   * 获取通知接收者信息
   */
  async getNotificationRecipient(
    memberId: string,
  ): Promise<NotificationRecipientDTO | null> {
    try {
      const recipient = await prisma.familyMember.findUnique({
        where: { id: memberId },
        include: {
          user: { select: { email: true } },
          notificationPreference: true,
        },
      });

      if (!recipient) {
        return null;
      }

      const preferences = recipient.notificationPreference
        ? mapPreferenceRow(recipient.notificationPreference)
        : undefined;

      return {
        memberId: recipient.id,
        email: recipient.user?.email ?? undefined,
        phone: recipient.notificationPreference?.phoneNumber ?? undefined,
        wechatOpenId:
          recipient.notificationPreference?.wechatOpenId ?? undefined,
        pushTokens: normalizePushTokens(
          recipient.notificationPreference?.pushToken,
        ),
        preferences,
      };
    } catch (error) {
      return this.handleError("getNotificationRecipient", error);
    }
  }

  /**
   * 删除通知（软删除）
   */
  async deleteNotification(
    notificationId: string,
    memberId: string,
  ): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, memberId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      return this.handleError("deleteNotification", error);
    }
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error: unknown): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`${this.loggerPrefix} ${operation} failed`, error);
    throw new Error(`NotificationRepository.${operation} failed: ${message}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 构建通知查询的 WHERE 条件
 */
function buildNotificationWhere(
  query: NotificationListQuery,
): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = {
    memberId: query.memberId,
    deletedAt: null,
  };

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (!query.includeRead) {
    where.readAt = null;
  }

  if (query.channel) {
    // 在 JSON 字符串中搜索渠道
    where.channels = {
      contains: `"${query.channel}"`,
    };
  }

  return where;
}

/**
 * 映射 Prisma Notification 到 DTO
 */
function mapNotificationRow(row: PrismaNotification): NotificationDTO {
  const parsedChannels = safeParseArray<NotificationChannel>(
    row.channels,
    DEFAULT_CHANNELS,
  );
  const channels =
    parsedChannels.length > 0 ? parsedChannels : DEFAULT_CHANNELS;

  return {
    id: row.id,
    memberId: row.memberId,
    type: row.type as NotificationType,
    title: row.title,
    content: row.content,
    priority: row.priority,
    channels,
    metadata:
      row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : undefined,
    actionUrl: row.actionUrl ?? undefined,
    actionText: row.actionText ?? undefined,
    dedupKey: row.dedupKey ?? undefined,
    batchId: row.batchId ?? undefined,
    status: row.status,
    readAt: row.readAt,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  };
}

/**
 * 映射 Prisma NotificationPreference 到 DTO
 */
function mapPreferenceRow(
  row: PrismaNotificationPreference,
): NotificationPreferenceDTO {
  const quietHours =
    row.globalQuietHoursStart !== null && row.globalQuietHoursEnd !== null
      ? {
          start: formatIntToHour(row.globalQuietHoursStart),
          end: formatIntToHour(row.globalQuietHoursEnd),
          timezone: "UTC",
        }
      : undefined;

  const typeSettings = safeParseObject<Record<string, boolean>>(
    row.typeSettings,
  );
  const mutedTypes = extractMutedTypes(typeSettings);

  return {
    memberId: row.memberId,
    channelPreferences: safeParseObject(
      row.channelPreferences,
    ) as NotificationPreferenceDTO["channelPreferences"],
    quietHours,
    mutedTypes: mutedTypes.length > 0 ? mutedTypes : undefined,
    lastUpdatedAt: row.updatedAt,
  };
}

/**
 * 映射 ScheduledNotification 原始行到 DTO
 */
function mapScheduleRow(
  row: ScheduledNotificationRow,
): ScheduledNotificationDTO {
  return {
    id: row.id,
    notificationId: row.notification_id ?? undefined,
    memberId: row.member_id,
    payload: parseSchedulePayload(row.payload),
    scheduledTime: new Date(row.scheduled_time),
    status: row.status,
    retryCount: row.retry_count ?? 0,
  };
}

/**
 * 构建类型设置对象（所有类型默认启用,根据 mutedTypes 禁用）
 */
function buildTypeSettings(
  mutedTypes?: NotificationType[],
): Record<NotificationType, boolean> {
  const mutedSet = new Set(mutedTypes ?? []);
  return ALL_NOTIFICATION_TYPES.reduce(
    (acc, type) => {
      acc[type] = !mutedSet.has(type);
      return acc;
    },
    {} as Record<NotificationType, boolean>,
  );
}

/**
 * 从类型设置中提取被禁用的类型
 */
function extractMutedTypes(
  settings: Record<string, boolean>,
): NotificationType[] {
  return Object.entries(settings)
    .filter(([, enabled]) => !enabled)
    .map(([key]) => key as NotificationType)
    .filter((type) => ALL_NOTIFICATION_TYPES.includes(type));
}

/**
 * 格式化渠道数组为 JSON 字符串
 */
function formatChannelsToJson(channels?: NotificationChannel[]): string {
  const normalized =
    channels && channels.length > 0
      ? Array.from(new Set(channels))
      : DEFAULT_CHANNELS;
  return JSON.stringify(normalized);
}

/**
 * 解析 quiet hour 字符串为整数 (e.g., "22:00" -> 22)
 */
function parseQuietHourToInt(value?: string): number | null {
  if (!value) return null;

  const match = value.match(/^(\d{1,2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour < 24 ? hour : null;
}

/**
 * 格式化整数为 quiet hour 字符串 (e.g., 22 -> "22:00")
 */
function formatIntToHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

/**
 * 标准化 push tokens (可能是字符串或 JSON 数组)
 */
function normalizePushTokens(raw?: string | null): string[] | undefined {
  if (!raw) return undefined;

  const parsed = safeParseArray<string>(raw);
  const tokens = parsed.filter(
    (value): value is string => typeof value === "string",
  );

  return tokens.length > 0 ? tokens : [raw];
}

/**
 * 解析计划通知的 payload
 */
function parseSchedulePayload(value: unknown): CreateNotificationDTO {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as CreateNotificationDTO;
    } catch {
      return value as unknown as CreateNotificationDTO;
    }
  }

  return value as CreateNotificationDTO;
}
