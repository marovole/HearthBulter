/**
 * 通知 Repository 接口
 *
 * 定义通知系统所需的数据访问契约，包括：
 * - 通知 CRUD 操作
 * - 批量操作
 * - 渠道投递日志
 * - 计划任务管理
 * - 通知偏好
 *
 * @module notification-repository
 */

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

/**
 * 通知 Repository 接口
 *
 * 抽象了通知系统所需的所有数据访问操作，
 * 支持多渠道通知、计划任务、用户偏好管理
 */
export interface NotificationRepository {
  /**
   * 创建通知记录
   *
   * @param payload - 通知创建参数
   * @returns 创建的通知对象
   */
  createNotification(payload: CreateNotificationDTO): Promise<NotificationDTO>;

  /**
   * 按 ID 获取通知
   *
   * @param id - 通知ID
   * @returns 通知对象，不存在时返回 null
   */
  getNotificationById(id: string): Promise<NotificationDTO | null>;

  /**
   * 查询成员的通知列表
   *
   * 支持按类型、状态、渠道过滤，
   * 可选择是否包含已读通知
   *
   * @param query - 查询条件
   * @param pagination - 分页参数
   * @returns 分页的通知列表
   */
  listMemberNotifications(
    query: NotificationListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<NotificationDTO>>;

  /**
   * 更新通知状态
   *
   * @param id - 通知ID
   * @param status - 新状态
   */
  updateStatus(id: string, status: NotificationStatus): Promise<void>;

  /**
   * 标记单条通知为已读
   *
   * @param notificationId - 通知ID
   * @param memberId - 成员ID（用于验证权限）
   */
  markAsRead(notificationId: string, memberId: string): Promise<void>;

  /**
   * 批量标记通知为已读
   *
   * @param memberId - 成员ID
   * @returns 已更新的通知数量
   */
  markAllAsRead(memberId: string): Promise<number>;

  /**
   * 写入渠道投递日志
   *
   * 记录通知在各渠道（Email/SMS/微信等）的投递结果
   *
   * @param log - 投递日志
   */
  appendDeliveryLog(log: NotificationLogDTO): Promise<void>;

  /**
   * 获取待发送或重试的通知
   *
   * @param limit - 返回数量限制
   * @returns 待发送通知列表
   */
  listPendingNotifications(limit: number): Promise<NotificationDTO[]>;

  /**
   * 创建计划通知（延时任务）
   *
   * @param schedule - 计划通知对象
   * @returns 创建的计划通知
   */
  createScheduledNotification(
    schedule: ScheduledNotificationDTO,
  ): Promise<ScheduledNotificationDTO>;

  /**
   * 列出到期待派发的计划通知
   *
   * @param before - 截止时间
   * @param limit - 返回数量限制
   * @returns 待派发计划通知列表
   */
  listDueSchedules(
    before: Date,
    limit: number,
  ): Promise<ScheduledNotificationDTO[]>;

  /**
   * 更新计划任务状态
   *
   * @param scheduleId - 计划任务ID
   * @param status - 新状态
   */
  updateScheduleStatus(
    scheduleId: string,
    status: ScheduledNotificationDTO["status"],
  ): Promise<void>;

  /**
   * 查询通知偏好
   *
   * @param memberId - 成员ID
   * @returns 通知偏好对象，不存在时返回 null
   */
  getNotificationPreferences(
    memberId: string,
  ): Promise<NotificationPreferenceDTO | null>;

  /**
   * 更新或创建通知偏好
   *
   * @param preference - 通知偏好对象
   */
  upsertNotificationPreferences(
    preference: NotificationPreferenceDTO,
  ): Promise<void>;

  /**
   * 获取通知接收者信息
   *
   * @param memberId - 成员ID
   * @returns 通知接收者对象，不存在时返回 null
   */
  getNotificationRecipient(
    memberId: string,
  ): Promise<NotificationRecipientDTO | null>;

  /**
   * 删除通知
   *
   * @param notificationId - 通知ID
   * @param memberId - 成员ID（用于权限验证）
   */
  deleteNotification(notificationId: string, memberId: string): Promise<void>;
}
