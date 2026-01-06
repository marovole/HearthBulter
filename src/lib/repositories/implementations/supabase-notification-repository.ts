/**
 * Supabase 通知 Repository 实现
 *
 * 基于 Supabase PostgreSQL 实现通知系统的数据访问层，
 * 提供通知 CRUD、批量操作、渠道投递日志、计划任务管理等功能。
 *
 * @module supabase-notification-repository
 */

import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import type { NotificationRepository } from "../interfaces/notification-repository";
import type {
  CreateNotificationDTO,
  NotificationDTO,
  NotificationListQuery,
  NotificationLogDTO,
  NotificationPreferenceDTO,
  NotificationStatus,
  ScheduledNotificationDTO,
} from "../types/notification";
import type { PaginatedResult, PaginationInput } from "../types/common";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationPreferenceRow =
  Database["public"]["Tables"]["notification_preferences"]["Row"];
type ScheduledNotificationRow =
  Database["public"]["Tables"]["scheduled_notifications"]["Row"];

/**
 * Supabase 通知 Repository 实现
 *
 * 特性：
 * - 类型安全的数据映射
 * - 批量标记已读
 * - 计划任务调度
 * - 渠道投递日志
 * - 通知偏好管理
 */
export class SupabaseNotificationRepository implements NotificationRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = "[SupabaseNotificationRepository]";

  constructor(
    client: SupabaseClient<Database> = SupabaseClientManager.getInstance(),
  ) {
    this.client = client;
  }

  /**
   * 创建通知记录
   */
  async createNotification(
    payload: CreateNotificationDTO,
  ): Promise<NotificationDTO> {
    const row = this.mapNotificationDtoToRow(payload);
    const { data, error } = await this.client
      .from("notifications")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      this.handleError("createNotification", error);
    }

    return this.mapNotificationRow(data!);
  }

  /**
   * 按 ID 获取通知
   */
  async getNotificationById(id: string): Promise<NotificationDTO | null> {
    const { data, error } = await this.client
      .from("notifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getNotificationById", error);
    }

    return data ? this.mapNotificationRow(data) : null;
  }

  /**
   * 查询成员的通知列表
   *
   * 支持按类型、状态、渠道过滤，可选择是否包含已读通知
   */
  async listMemberNotifications(
    query: NotificationListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<NotificationDTO>> {
    let listQuery = this.client
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("member_id", query.memberId)
      .order("created_at", { ascending: false });

    // 应用过滤条件
    if (query.type) listQuery = listQuery.eq("type", query.type);
    if (query.status) listQuery = listQuery.eq("status", query.status);
    if (!query.includeRead) listQuery = listQuery.is("read_at", null);
    if (query.channel)
      listQuery = listQuery.contains("channels", [query.channel]);

    // 应用分页
    if (pagination?.limit) {
      const from = pagination.offset ?? 0;
      const to = from + pagination.limit - 1;
      listQuery = listQuery.range(from, to);
    }

    const { data, count, error } = await listQuery;
    if (error) this.handleError("listMemberNotifications", error);

    const items = (data || []).map((row) => this.mapNotificationRow(row));

    return {
      items,
      total: count ?? items.length,
      hasMore: pagination?.limit
        ? (pagination.offset ?? 0) + items.length < (count ?? 0)
        : false,
    };
  }

  /**
   * 更新通知状态
   */
  async updateStatus(id: string, status: NotificationStatus): Promise<void> {
    const update: Partial<NotificationRow> = { status };
    if (status === "SENT") {
      update.sent_at = new Date().toISOString();
    }

    const { error } = await this.client
      .from("notifications")
      .update(update)
      .eq("id", id);
    if (error) this.handleError("updateStatus", error);
  }

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: string, memberId: string): Promise<void> {
    const { error } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("member_id", memberId);

    if (error) this.handleError("markAsRead", error);
  }

  /**
   * 批量标记通知为已读
   *
   * @returns 已更新的通知数量
   */
  async markAllAsRead(memberId: string): Promise<number> {
    const { data, error } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("member_id", memberId)
      .is("read_at", null)
      .select("id");

    if (error) this.handleError("markAllAsRead", error);

    return data?.length ?? 0;
  }

  /**
   * 写入渠道投递日志
   */
  async appendDeliveryLog(log: NotificationLogDTO): Promise<void> {
    const { error } = await this.client.from("notification_logs").insert({
      notification_id: log.notificationId,
      channel: log.channel,
      status: log.status,
      detail: log.detail ?? null,
      sent_at: log.sentAt ? log.sentAt.toISOString() : new Date().toISOString(),
    });

    if (error) this.handleError("appendDeliveryLog", error);
  }

  /**
   * 获取待发送或重试的通知
   */
  async listPendingNotifications(limit: number): Promise<NotificationDTO[]> {
    const { data, error } = await this.client
      .from("notifications")
      .select("*")
      .in("status", ["PENDING", "SENDING"])
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) this.handleError("listPendingNotifications", error);

    return (data || []).map((row) => this.mapNotificationRow(row));
  }

  /**
   * 创建计划通知（延时任务）
   */
  async createScheduledNotification(
    schedule: ScheduledNotificationDTO,
  ): Promise<ScheduledNotificationDTO> {
    const { data, error } = await this.client
      .from("scheduled_notifications")
      .insert({
        notification_id: schedule.notificationId ?? null,
        member_id: schedule.memberId,
        payload: schedule.payload as any,
        scheduled_time: schedule.scheduledTime.toISOString(),
        status: schedule.status,
        retry_count: schedule.retryCount ?? 0,
      })
      .select("*")
      .single();

    if (error) this.handleError("createScheduledNotification", error);

    return this.mapScheduleRow(data!);
  }

  /**
   * 列出到期待派发的计划通知
   */
  async listDueSchedules(
    before: Date,
    limit: number,
  ): Promise<ScheduledNotificationDTO[]> {
    const { data, error } = await this.client
      .from("scheduled_notifications")
      .select("*")
      .lte("scheduled_time", before.toISOString())
      .in("status", ["SCHEDULED", "PROCESSING"])
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    if (error) this.handleError("listDueSchedules", error);

    return (data || []).map((row) => this.mapScheduleRow(row));
  }

  /**
   * 更新计划任务状态
   */
  async updateScheduleStatus(
    scheduleId: string,
    status: ScheduledNotificationDTO["status"],
  ): Promise<void> {
    const { error } = await this.client
      .from("scheduled_notifications")
      .update({ status })
      .eq("id", scheduleId);

    if (error) this.handleError("updateScheduleStatus", error);
  }

  /**
   * 查询通知偏好
   */
  async getNotificationPreferences(
    memberId: string,
  ): Promise<NotificationPreferenceDTO | null> {
    const { data, error } = await this.client
      .from("notification_preferences")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getNotificationPreferences", error);
    }

    return data ? this.mapPreferenceRow(data) : null;
  }

  /**
   * 更新或创建通知偏好
   */
  async upsertNotificationPreferences(
    preference: NotificationPreferenceDTO,
  ): Promise<void> {
    const { error } = await this.client.from("notification_preferences").upsert(
      {
        member_id: preference.memberId,
        channel_preferences: preference.channelPreferences ?? null,
        quiet_hours: preference.quietHours ?? null,
        muted_types: preference.mutedTypes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    );

    if (error) this.handleError("upsertNotificationPreferences", error);
  }

  /**
   * 数据映射：CreateNotificationDTO → NotificationRow
   */
  private mapNotificationDtoToRow(
    dto: CreateNotificationDTO,
  ): Partial<NotificationRow> {
    return {
      member_id: dto.memberId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      priority: dto.priority ?? "MEDIUM",
      channels: dto.channels ?? ["IN_APP"],
      metadata: dto.metadata ?? null,
      action_url: dto.actionUrl ?? null,
      action_text: dto.actionText ?? null,
      dedup_key: dto.dedupKey ?? null,
      batch_id: dto.batchId ?? null,
      status: "PENDING",
    };
  }

  /**
   * 数据映射：NotificationRow → NotificationDTO
   */
  private mapNotificationRow(row: NotificationRow): NotificationDTO {
    return {
      id: row.id,
      memberId: row.member_id,
      type: row.type as NotificationDTO["type"],
      title: row.title,
      content: row.content,
      priority: row.priority as NotificationDTO["priority"],
      channels: (row.channels as NotificationDTO["channels"]) ?? ["IN_APP"],
      metadata: row.metadata ?? undefined,
      actionUrl: row.action_url ?? undefined,
      actionText: row.action_text ?? undefined,
      dedupKey: row.dedup_key ?? undefined,
      batchId: row.batch_id ?? undefined,
      status: row.status as NotificationDTO["status"],
      readAt: row.read_at ? new Date(row.read_at) : null,
      sentAt: row.sent_at ? new Date(row.sent_at) : null,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * 数据映射：ScheduledNotificationRow → ScheduledNotificationDTO
   */
  private mapScheduleRow(
    row: ScheduledNotificationRow,
  ): ScheduledNotificationDTO {
    return {
      id: row.id,
      notificationId: row.notification_id ?? undefined,
      memberId: row.member_id,
      payload: row.payload as CreateNotificationDTO,
      scheduledTime: new Date(row.scheduled_time),
      status: row.status as ScheduledNotificationDTO["status"],
      retryCount: row.retry_count ?? 0,
    };
  }

  /**
   * 数据映射：NotificationPreferenceRow → NotificationPreferenceDTO
   */
  private mapPreferenceRow(
    row: NotificationPreferenceRow,
  ): NotificationPreferenceDTO {
    return {
      memberId: row.member_id,
      channelPreferences: (row.channel_preferences ??
        undefined) as NotificationPreferenceDTO["channelPreferences"],
      quietHours: (row.quiet_hours ??
        undefined) as NotificationPreferenceDTO["quietHours"],
      mutedTypes: (row.muted_types ??
        undefined) as NotificationPreferenceDTO["mutedTypes"],
      lastUpdatedAt: new Date(row.updated_at),
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? "Unknown Supabase error";
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`NotificationRepository.${operation} failed: ${message}`);
  }
}
