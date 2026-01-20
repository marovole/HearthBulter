import type { PaginatedResult, PaginationInput } from "../types/common";
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
import type { NotificationRepository } from "../interfaces/notification-repository";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const DEFAULT_LIMIT = 50;

export class ConvexNotificationRepository implements NotificationRepository {
  async createNotification(payload: CreateNotificationDTO): Promise<NotificationDTO> {
    const notificationId = await convexClient.mutation(api.notifications.create, {
      memberId: payload.memberId as Id<"familyMembers">,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      priority: payload.priority ?? "MEDIUM",
      channels: payload.channels ?? ["IN_APP"],
      metadata: payload.metadata,
      actionUrl: payload.actionUrl,
      actionText: payload.actionText,
      dedupKey: payload.dedupKey,
      batchId: payload.batchId,
    });

    const notification = await convexClient.query<Doc<"notifications"> | null>(
      api.notifications.getById,
      { id: notificationId as Id<"notifications"> }
    );

    if (!notification) {
      throw new Error("通知创建失败");
    }

    return mapNotification(notification);
  }

  async getNotificationById(id: string): Promise<NotificationDTO | null> {
    const notification = await convexClient.query<Doc<"notifications"> | null>(
      api.notifications.getById,
      { id: id as Id<"notifications"> }
    );

    return notification ? mapNotification(notification) : null;
  }

  async listMemberNotifications(
    query: NotificationListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<NotificationDTO>> {
    const result = await convexClient.query<{
      data: Doc<"notifications">[];
      total: number;
    }>(api.notifications.list, {
      memberId: query.memberId as Id<"familyMembers">,
      type: query.type,
      status: query.status,
      channel: query.channel,
      includeRead: query.includeRead ?? false,
      offset: pagination?.offset,
      limit: pagination?.limit ?? DEFAULT_LIMIT,
    });

    return {
      items: result.data.map(mapNotification),
      total: result.total,
      hasMore: (pagination?.offset ?? 0) + result.data.length < result.total,
    };
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<void> {
    await convexClient.mutation(api.notifications.updateStatus, {
      id: id as Id<"notifications">,
      status,
    });
  }

  async markAsRead(notificationId: string, _memberId: string): Promise<void> {
    await convexClient.mutation(api.notifications.markAsRead, {
      id: notificationId as Id<"notifications">,
    });
  }

  async markAllAsRead(memberId: string): Promise<number> {
    return await convexClient.mutation<number>(api.notifications.markAllAsRead, {
      memberId: memberId as Id<"familyMembers">,
    });
  }

  async appendDeliveryLog(log: NotificationLogDTO): Promise<void> {
    await convexClient.mutation(api.notifications.appendLog, {
      notificationId: log.notificationId as Id<"notifications">,
      channel: log.channel,
      status: log.status,
      detail: log.detail,
      sentAt: log.sentAt ? log.sentAt.getTime() : undefined,
    });
  }

  async listPendingNotifications(limit: number): Promise<NotificationDTO[]> {
    const items = await convexClient.query<Doc<"notifications">[]>(api.notifications.listPending, {
      limit,
    });

    return items.map(mapNotification);
  }

  async createScheduledNotification(
    schedule: ScheduledNotificationDTO
  ): Promise<ScheduledNotificationDTO> {
    const scheduleId = await convexClient.mutation(api.notifications.createSchedule, {
      memberId: schedule.memberId as Id<"familyMembers">,
      notificationId: schedule.notificationId
        ? (schedule.notificationId as Id<"notifications">)
        : undefined,
      payload: schedule.payload,
      scheduledTime: schedule.scheduledTime.getTime(),
      status: schedule.status ?? "SCHEDULED",
      retryCount: schedule.retryCount ?? 0,
    });

    return {
      ...schedule,
      id: scheduleId as string,
    };
  }

  async listDueSchedules(before: Date, limit: number): Promise<ScheduledNotificationDTO[]> {
    const items = await convexClient.query<Doc<"scheduledNotifications">[]>(
      api.notifications.listDueSchedules,
      { before: before.getTime(), limit }
    );

    return items.map(mapSchedule);
  }

  async updateScheduleStatus(
    scheduleId: string,
    status: ScheduledNotificationDTO["status"]
  ): Promise<void> {
    await convexClient.mutation(api.notifications.updateScheduleStatus, {
      scheduleId: scheduleId as Id<"scheduledNotifications">,
      status,
    });
  }

  async getNotificationPreferences(memberId: string): Promise<NotificationPreferenceDTO | null> {
    const preferences = await convexClient.query<Doc<"notificationPreferences"> | null>(
      api.notifications.getPreferences,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );

    return preferences ? mapPreference(preferences) : null;
  }

  async upsertNotificationPreferences(preference: NotificationPreferenceDTO): Promise<void> {
    await convexClient.mutation(api.notifications.upsertPreferences, {
      memberId: preference.memberId as Id<"familyMembers">,
      channelPreferences: preference.channelPreferences,
      quietHours: preference.quietHours,
      mutedTypes: preference.mutedTypes,
      lastUpdatedAt: preference.lastUpdatedAt.getTime(),
    });
  }

  async getNotificationRecipient(memberId: string): Promise<NotificationRecipientDTO | null> {
    const member = await convexClient.query<Doc<"familyMembers"> | null>(api.members.getById, {
      memberId: memberId as Id<"familyMembers">,
    });

    if (!member) {
      return null;
    }

    const user = member.userId
      ? await convexClient.query<Doc<"users"> | null>(api.users.getById, {
        userId: member.userId,
      })
      : null;

    const preferencesDoc = await convexClient.query<Doc<"notificationPreferences"> | null>(
      api.notifications.getPreferences,
      {
        memberId: memberId as Id<"familyMembers">,
      }
    );
    const preferences = preferencesDoc ? mapPreference(preferencesDoc) : null;

    return {
      memberId: member._id,
      email: user?.email ?? undefined,
      phone: preferencesDoc?.phoneNumber ?? undefined,
      wechatOpenId: preferencesDoc?.wechatOpenId ?? undefined,
      pushTokens: normalizePushTokens(preferencesDoc?.pushToken),
      preferences: preferences ?? undefined,
    };
  }

  async deleteNotification(notificationId: string, _memberId: string): Promise<void> {
    await convexClient.mutation(api.notifications.deleteNotification, {
      id: notificationId as Id<"notifications">,
    });
  }
}

function mapNotification(notification: Doc<"notifications">): NotificationDTO {
  return {
    id: notification._id,
    memberId: notification.memberId,
    type: notification.type as NotificationDTO["type"],
    title: notification.title,
    content: notification.content,
    priority: notification.priority as NotificationDTO["priority"],
    channels: (notification.channels ?? []) as NotificationDTO["channels"],
    metadata: notification.metadata ?? undefined,
    actionUrl: notification.actionUrl ?? undefined,
    actionText: notification.actionText ?? undefined,
    dedupKey: notification.dedupKey ?? undefined,
    batchId: notification.batchId ?? undefined,
    status: notification.status as NotificationDTO["status"],
    readAt: notification.readAt ? new Date(notification.readAt) : null,
    sentAt: notification.sentAt ? new Date(notification.sentAt) : null,
    createdAt: new Date(notification.createdAt),
  };
}

function mapPreference(preference: Doc<"notificationPreferences">): NotificationPreferenceDTO {
  return {
    memberId: preference.memberId,
    channelPreferences: preference.channelPreferences as
      | NotificationPreferenceDTO["channelPreferences"]
      | undefined,
    quietHours: preference.quietHours as NotificationPreferenceDTO["quietHours"] | undefined,
    mutedTypes: (preference.mutedTypes ?? []) as NotificationPreferenceDTO["mutedTypes"],
    lastUpdatedAt: new Date(preference.lastUpdatedAt),
  };
}

function normalizePushTokens(raw?: unknown): string[] | undefined {
  if (!raw) return undefined;

  if (Array.isArray(raw)) {
    const tokens = raw
      .map((value) => {
        if (typeof value === "string") return value;
        if (
          value &&
          typeof value === "object" &&
          "endpoint" in value &&
          typeof (value as { endpoint?: unknown }).endpoint === "string"
        ) {
          return (value as { endpoint: string }).endpoint;
        }
        return null;
      })
      .filter((value): value is string => Boolean(value));

    return tokens.length > 0 ? tokens : undefined;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const tokens = parsed
          .map((value) => {
            if (typeof value === "string") return value;
            if (
              value &&
              typeof value === "object" &&
              "endpoint" in value &&
              typeof (value as { endpoint?: unknown }).endpoint === "string"
            ) {
              return (value as { endpoint: string }).endpoint;
            }
            return null;
          })
          .filter((value): value is string => Boolean(value));

        return tokens.length > 0 ? tokens : undefined;
      }
    } catch {
      return [raw];
    }

    return [raw];
  }

  return undefined;
}

function mapSchedule(schedule: Doc<"scheduledNotifications">): ScheduledNotificationDTO {
  return {
    id: schedule._id,
    notificationId: schedule.notificationId ?? undefined,
    memberId: schedule.memberId,
    payload: schedule.payload as ScheduledNotificationDTO["payload"],
    scheduledTime: new Date(schedule.scheduledTime),
    status: schedule.status as ScheduledNotificationDTO["status"],
    retryCount: schedule.retryCount,
  };
}
