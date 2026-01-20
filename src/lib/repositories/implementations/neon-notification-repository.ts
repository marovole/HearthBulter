/**
 * Neon 通知 Repository 实现
 *
 * 基于 Neon PostgreSQL + neonAdapter 实现通知系统的数据访问层
 *
 * @module neon-notification-repository
 */

import { neonAdapter } from "@/lib/db/neon-adapter";
import type { NotificationRepository } from "../interfaces/notification-repository";
import type {
  CreateNotificationDTO,
  NotificationDTO,
  NotificationListQuery,
  NotificationLogDTO,
  NotificationPreferenceDTO,
  NotificationRecipientDTO,
  NotificationStatus,
  ScheduledNotificationDTO,
} from "../types/notification";
import type { PaginatedResult, PaginationInput } from "../types/common";

interface NotificationRow {
  id: string;
  memberId: string;
  type: string;
  title: string;
  content: string;
  priority: string;
  channels: string[];
  metadata: Record<string, unknown> | null;
  actionUrl: string | null;
  actionText: string | null;
  dedupKey: string | null;
  batchId: string | null;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface NotificationPreferenceRow {
  memberId: string;
  channelPreferences: Record<string, unknown> | null;
  quietHours: Record<string, unknown> | null;
  mutedTypes: string[] | null;
  updatedAt: string;
  phoneNumber?: string | null;
  wechatOpenId?: string | null;
  pushToken?: string | null;
}

interface ScheduledNotificationRow {
  id: string;
  notificationId: string | null;
  memberId: string;
  payload: Record<string, unknown>;
  scheduledTime: string;
  status: string;
  retryCount: number;
}

export class NeonNotificationRepository implements NotificationRepository {
  private readonly loggerPrefix = "[NeonNotificationRepository]";

  async createNotification(payload: CreateNotificationDTO): Promise<NotificationDTO> {
    const data = await neonAdapter.notification.create<NotificationRow>({
      data: {
        memberId: payload.memberId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        priority: payload.priority ?? "MEDIUM",
        channels: payload.channels ?? ["IN_APP"],
        metadata: payload.metadata ?? null,
        actionUrl: payload.actionUrl ?? null,
        actionText: payload.actionText ?? null,
        dedupKey: payload.dedupKey ?? null,
        batchId: payload.batchId ?? null,
        status: "PENDING",
      },
    });

    return this.mapNotificationRow(data);
  }

  async getNotificationById(id: string): Promise<NotificationDTO | null> {
    const data = await neonAdapter.notification.findUnique<NotificationRow>({
      where: { id },
    });

    return data ? this.mapNotificationRow(data) : null;
  }

  async listMemberNotifications(
    query: NotificationListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<NotificationDTO>> {
    const where: Record<string, unknown> = { memberId: query.memberId };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (!query.includeRead) where.readAt = null;

    const data = await neonAdapter.notification.findMany<NotificationRow>({
      where,
      orderBy: { createdAt: "desc" },
      take: pagination?.limit,
      skip: pagination?.offset,
    });

    const total = await neonAdapter.notification.count({ where });

    const items = data
      .filter((row) => {
        if (query.channel && Array.isArray(row.channels)) {
          return row.channels.includes(query.channel);
        }
        return true;
      })
      .map((row) => this.mapNotificationRow(row));

    return {
      items,
      total,
      hasMore: pagination?.limit ? (pagination.offset ?? 0) + items.length < total : false,
    };
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (status === "SENT") {
      updateData.sentAt = new Date();
    }

    await neonAdapter.notification.update({
      where: { id },
      data: updateData,
    });
  }

  async markAsRead(notificationId: string, memberId: string): Promise<void> {
    const notification = await neonAdapter.notification.findFirst<{
      id: string;
      memberId: string;
    }>({
      where: { id: notificationId, memberId },
    });

    if (notification) {
      await neonAdapter.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });
    }
  }

  async markAllAsRead(memberId: string): Promise<number> {
    const unread = await neonAdapter.notification.findMany<{ id: string }>({
      where: { memberId, readAt: null },
    });

    for (const notification of unread) {
      await neonAdapter.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      });
    }

    return unread.length;
  }

  async appendDeliveryLog(log: NotificationLogDTO): Promise<void> {
    await neonAdapter.notificationLog.create({
      data: {
        notificationId: log.notificationId,
        channel: log.channel,
        status: log.status,
        detail: log.detail ?? null,
        sentAt: log.sentAt ?? new Date(),
      },
    });
  }

  async listPendingNotifications(limit: number): Promise<NotificationDTO[]> {
    const data = await neonAdapter.notification.findMany<NotificationRow>({
      where: { status: { in: ["PENDING", "SENDING"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return data.map((row) => this.mapNotificationRow(row));
  }

  async createScheduledNotification(
    schedule: ScheduledNotificationDTO
  ): Promise<ScheduledNotificationDTO> {
    const data = await neonAdapter.$queryRaw<ScheduledNotificationRow>(
      `INSERT INTO scheduled_notifications 
       (notification_id, member_id, payload, scheduled_time, status, retry_count) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        schedule.notificationId ?? null,
        schedule.memberId,
        JSON.stringify(schedule.payload),
        schedule.scheduledTime.toISOString(),
        schedule.status,
        schedule.retryCount ?? 0,
      ]
    );

    const row = data[0];
    if (!row) {
      throw new Error("Failed to create scheduled notification");
    }
    return {
      id: row.id,
      notificationId: row.notificationId ?? undefined,
      memberId: row.memberId,
      payload: row.payload as CreateNotificationDTO,
      scheduledTime: new Date(row.scheduledTime),
      status: row.status as ScheduledNotificationDTO["status"],
      retryCount: row.retryCount ?? 0,
    };
  }

  async listDueSchedules(before: Date, limit: number): Promise<ScheduledNotificationDTO[]> {
    const data = await neonAdapter.$queryRaw<ScheduledNotificationRow>(
      `SELECT * FROM scheduled_notifications 
       WHERE scheduled_time <= $1 AND status IN ('SCHEDULED', 'PROCESSING')
       ORDER BY scheduled_time ASC LIMIT $2`,
      [before.toISOString(), limit]
    );

    return data.map((row) => ({
      id: row.id,
      notificationId: row.notificationId ?? undefined,
      memberId: row.memberId,
      payload: row.payload as CreateNotificationDTO,
      scheduledTime: new Date(row.scheduledTime),
      status: row.status as ScheduledNotificationDTO["status"],
      retryCount: row.retryCount ?? 0,
    }));
  }

  async updateScheduleStatus(
    scheduleId: string,
    status: ScheduledNotificationDTO["status"]
  ): Promise<void> {
    await neonAdapter.$executeRaw(
      "UPDATE scheduled_notifications SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, scheduleId]
    );
  }

  async getNotificationPreferences(memberId: string): Promise<NotificationPreferenceDTO | null> {
    const data = await neonAdapter.notificationPreference.findFirst<NotificationPreferenceRow>({
      where: { memberId },
    });

    return data ? this.mapPreferenceRow(data) : null;
  }

  async upsertNotificationPreferences(preference: NotificationPreferenceDTO): Promise<void> {
    await neonAdapter.notificationPreference.upsert({
      where: { memberId: preference.memberId },
      create: {
        memberId: preference.memberId,
        channelPreferences: preference.channelPreferences ?? null,
        quietHours: preference.quietHours ?? null,
        mutedTypes: preference.mutedTypes ?? null,
      },
      update: {
        channelPreferences: preference.channelPreferences ?? null,
        quietHours: preference.quietHours ?? null,
        mutedTypes: preference.mutedTypes ?? null,
      },
    });
  }

  async getNotificationRecipient(memberId: string): Promise<NotificationRecipientDTO | null> {
    const member = await neonAdapter.familyMember.findFirst<{
      id: string;
      userId: string;
    }>({
      where: { id: memberId },
    });

    if (!member) return null;

    const user = await neonAdapter.user.findFirst<{ email: string | null }>({
      where: { id: member.userId },
    });

    const preferences =
      await neonAdapter.notificationPreference.findFirst<NotificationPreferenceRow>({
        where: { memberId },
      });

    return {
      memberId,
      email: user?.email ?? undefined,
      phone: preferences?.phoneNumber ?? undefined,
      wechatOpenId: preferences?.wechatOpenId ?? undefined,
      pushTokens: preferences?.pushToken
        ? this.normalizePushTokens(preferences.pushToken)
        : undefined,
      preferences: preferences ? this.mapPreferenceRow(preferences) : undefined,
    };
  }

  async deleteNotification(notificationId: string, memberId: string): Promise<void> {
    const notification = await neonAdapter.notification.findFirst<{
      id: string;
      memberId: string;
    }>({
      where: { id: notificationId, memberId },
    });

    if (notification) {
      await neonAdapter.notification.delete({
        where: { id: notificationId },
      });
    }
  }

  private mapNotificationRow(row: NotificationRow): NotificationDTO {
    return {
      id: row.id,
      memberId: row.memberId,
      type: row.type as NotificationDTO["type"],
      title: row.title,
      content: row.content,
      priority: row.priority as NotificationDTO["priority"],
      channels: (row.channels as NotificationDTO["channels"]) ?? ["IN_APP"],
      metadata: row.metadata ?? undefined,
      actionUrl: row.actionUrl ?? undefined,
      actionText: row.actionText ?? undefined,
      dedupKey: row.dedupKey ?? undefined,
      batchId: row.batchId ?? undefined,
      status: row.status as NotificationDTO["status"],
      readAt: row.readAt ? new Date(row.readAt) : null,
      sentAt: row.sentAt ? new Date(row.sentAt) : null,
      createdAt: new Date(row.createdAt),
    };
  }

  private mapPreferenceRow(row: NotificationPreferenceRow): NotificationPreferenceDTO {
    return {
      memberId: row.memberId,
      channelPreferences: row.channelPreferences as NotificationPreferenceDTO["channelPreferences"],
      quietHours: row.quietHours as NotificationPreferenceDTO["quietHours"],
      mutedTypes: row.mutedTypes as NotificationPreferenceDTO["mutedTypes"],
      lastUpdatedAt: new Date(row.updatedAt),
    };
  }

  private normalizePushTokens(raw?: string | null): string[] | undefined {
    if (!raw) return undefined;

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return [raw];
    }
  }
}
