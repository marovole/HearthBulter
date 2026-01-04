import { randomUUID } from 'crypto';
import type {
  NotificationRepository,
  NotificationRecipientDTO,
} from '@/lib/repositories/interfaces/notification-repository';
import type {
  CreateNotificationDTO,
  NotificationChannel,
  NotificationPreferenceDTO,
  NotificationPriority,
  NotificationStatus,
  ScheduledNotificationDTO,
} from '@/lib/repositories/types/notification';
import { emailService, EmailService } from './email-service';
import { smsService, SMSService } from './sms-service';
import { wechatService, WeChatService } from './wechat-service';

export interface NotificationData {
  userId: string; // memberId
  type: string;
  title: string;
  content: string;
  channels?: Array<NotificationChannel | Lowercase<NotificationChannel>>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
}

export interface ScheduledNotificationData extends NotificationData {
  scheduledTime: Date;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  messageId?: string;
  error?: string;
}

export interface BulkNotificationResult {
  success: boolean;
  results: NotificationResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface ScheduleResult {
  success: boolean;
  scheduleId?: string;
  error?: string;
}

export interface UserNotificationsResult {
  success: boolean;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    status: string;
    createdAt: Date;
    read: boolean;
  }>;
  error?: string;
}

interface ChannelDispatchResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt: Date;
}

export class NotificationManager {
  private readonly email: EmailService;
  private readonly sms: SMSService;
  private readonly wechat: WeChatService;

  private readonly defaultChannelPrefs: Record<NotificationChannel, boolean> = {
    IN_APP: true,
    EMAIL: true,
    SMS: false,
    WECHAT: true,
    PUSH: true,
  };

  constructor(
    private readonly repository: NotificationRepository,
    services: {
      emailService?: EmailService;
      smsService?: SMSService;
      wechatService?: WeChatService;
    } = {},
  ) {
    this.email = services.emailService ?? emailService;
    this.sms = services.smsService ?? smsService;
    this.wechat = services.wechatService ?? wechatService;
  }

  async sendNotification(data: NotificationData): Promise<NotificationResult> {
    const memberId = data.userId;
    let notificationId: string | undefined;

    try {
      const recipient =
        await this.repository.getNotificationRecipient(memberId);
      if (!recipient) {
        return { success: false, error: 'User not found' };
      }

      const preferences =
        recipient.preferences ??
        (await this.repository.getNotificationPreferences(memberId)) ??
        undefined;

      const resolvedChannels = this.resolveChannels(data.channels);
      const enabledChannels = this.filterEnabledChannels(
        resolvedChannels,
        recipient,
        preferences,
      );

      if (!enabledChannels.length) {
        return { success: false, error: 'No enabled channels available' };
      }

      const payload = this.buildNotificationPayload(
        memberId,
        data,
        enabledChannels,
      );
      const notification = await this.repository.createNotification(payload);
      notificationId = notification.id;

      const deliveryResults = await Promise.all(
        enabledChannels.map((channel) =>
          channel === 'IN_APP'
            ? Promise.resolve<ChannelDispatchResult>({
                channel,
                success: true,
                sentAt: new Date(),
              })
            : this.dispatchChannel(channel, recipient, data),
        ),
      );

      const hasFailure = deliveryResults.some((result) => !result.success);
      await this.repository.updateStatus(
        notificationId,
        hasFailure ? 'FAILED' : 'SENT',
      );

      await Promise.all(
        deliveryResults.map((result) =>
          this.repository.appendDeliveryLog({
            notificationId: notificationId!,
            channel: result.channel,
            status: result.success ? 'SENT' : 'FAILED',
            detail: result.error,
            sentAt: result.sentAt,
          }),
        ),
      );

      return {
        success: !hasFailure,
        notificationId,
        messageId: deliveryResults.find((r) => r.success && r.messageId)
          ?.messageId,
        error: hasFailure ? 'One or more channels failed' : undefined,
      };
    } catch (error) {
      if (notificationId) {
        await this.safeUpdateStatus(notificationId, 'FAILED');
      }
      return {
        success: false,
        notificationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBulkNotifications(
    dataList: NotificationData[],
  ): Promise<BulkNotificationResult> {
    const results = await Promise.allSettled(
      dataList.map((data) => this.sendNotification(data)),
    );

    const normalized = results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : { success: false, error: result.reason?.message ?? 'Unknown error' },
    );

    return {
      success: normalized.every((r) => r.success),
      results: normalized,
      summary: {
        total: normalized.length,
        successful: normalized.filter((r) => r.success).length,
        failed: normalized.filter((r) => !r.success).length,
      },
    };
  }

  async scheduleNotification(
    data: ScheduledNotificationData,
  ): Promise<ScheduleResult> {
    if (data.scheduledTime <= new Date()) {
      return {
        success: false,
        error: 'Cannot schedule notification in the past',
      };
    }

    try {
      const memberId = data.userId;
      const recipient =
        await this.repository.getNotificationRecipient(memberId);
      if (!recipient) {
        return { success: false, error: 'User not found' };
      }

      const preferences =
        recipient.preferences ??
        (await this.repository.getNotificationPreferences(memberId)) ??
        undefined;

      const channels = this.filterEnabledChannels(
        this.resolveChannels(data.channels),
        recipient,
        preferences,
      );

      if (!channels.length) {
        return { success: false, error: 'No enabled channels available' };
      }

      const schedulePayload: ScheduledNotificationDTO = {
        id: randomUUID(),
        memberId,
        notificationId: undefined,
        payload: this.buildNotificationPayload(memberId, data, channels),
        scheduledTime: data.scheduledTime,
        status: 'SCHEDULED',
        retryCount: 0,
      };

      const schedule =
        await this.repository.createScheduledNotification(schedulePayload);
      return { success: true, scheduleId: schedule.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getUserNotifications(
    userId: string,
    options: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<UserNotificationsResult> {
    try {
      const page = await this.repository.listMemberNotifications(
        {
          memberId: userId,
          type: options.type as any,
          status: options.status as NotificationStatus,
          includeRead: true,
        },
        {
          limit: options.limit,
          offset: options.offset,
        },
      );

      return {
        success: true,
        notifications: page.items.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          content: item.content,
          status: item.status,
          createdAt: item.createdAt,
          read: Boolean(item.readAt),
        })),
      };
    } catch (error) {
      return {
        success: false,
        notifications: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async markNotificationAsRead(
    notificationId: string,
  ): Promise<NotificationResult> {
    try {
      const notification =
        await this.repository.getNotificationById(notificationId);
      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      await this.repository.markAsRead(notificationId, notification.memberId);
      return { success: true, notificationId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResult> {
    try {
      await this.repository.deleteNotification(notificationId, userId);
      return { success: true, notificationId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async dispatchChannel(
    channel: NotificationChannel,
    recipient: NotificationRecipientDTO,
    data: NotificationData,
  ): Promise<ChannelDispatchResult> {
    const sentAt = new Date();

    try {
      let messageId: string | undefined;

      switch (channel) {
        case 'EMAIL':
          messageId = await this.email.send(
            recipient.memberId ?? data.userId,
            data.title,
            data.content,
            { html: true },
          );
          break;
        case 'SMS':
          if (!recipient.phone) throw new Error('User phone not bound');
          messageId = await this.sms.send(recipient.phone, data.content);
          break;
        case 'WECHAT':
          if (!recipient.wechatOpenId) throw new Error('User WeChat not bound');
          messageId = await this.wechat.sendMessage(
            recipient.wechatOpenId,
            data.content,
          );
          break;
        case 'PUSH':
          messageId = await this.sendPush(recipient, data);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      return { channel, success: true, messageId, sentAt };
    } catch (error) {
      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sentAt,
      };
    }
  }

  private resolveChannels(
    requested?: Array<NotificationChannel | Lowercase<NotificationChannel>>,
  ): NotificationChannel[] {
    const normalized = (requested ?? ['push'])
      .map((channel) => this.normalizeChannel(channel))
      .filter((channel): channel is NotificationChannel => Boolean(channel));

    if (!normalized.includes('IN_APP')) {
      normalized.push('IN_APP');
    }

    return Array.from(new Set(normalized));
  }

  private normalizeChannel(
    channel?: NotificationChannel | Lowercase<NotificationChannel>,
  ): NotificationChannel | null {
    if (!channel) return null;

    const upper = channel.toUpperCase();
    switch (upper) {
      case 'EMAIL':
        return 'EMAIL';
      case 'SMS':
        return 'SMS';
      case 'WECHAT':
        return 'WECHAT';
      case 'PUSH':
        return 'PUSH';
      case 'IN_APP':
        return 'IN_APP';
      default:
        return null;
    }
  }

  private filterEnabledChannels(
    channels: NotificationChannel[],
    recipient: NotificationRecipientDTO,
    preferences?: NotificationPreferenceDTO,
  ): NotificationChannel[] {
    const preferenceMap = {
      ...this.defaultChannelPrefs,
      ...(preferences?.channelPreferences ?? {}),
    };

    return channels.filter((channel) => {
      if (channel === 'IN_APP') return true;

      if (!preferenceMap[channel]) return false;

      switch (channel) {
        case 'EMAIL':
          return Boolean(recipient.email);
        case 'SMS':
          return Boolean(recipient.phone);
        case 'WECHAT':
          return Boolean(recipient.wechatOpenId);
        case 'PUSH':
          return Boolean(recipient.pushTokens?.length);
        default:
          return false;
      }
    });
  }

  private buildNotificationPayload(
    memberId: string,
    data: NotificationData,
    channels: NotificationChannel[],
  ): CreateNotificationDTO {
    return {
      memberId,
      type: data.type as any,
      title: data.title,
      content: data.content,
      priority: this.mapPriority(data.priority),
      channels,
      metadata: data.metadata,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
    };
  }

  private mapPriority(
    priority?: NotificationData['priority'],
  ): NotificationPriority {
    switch (priority) {
      case 'low':
        return 'LOW';
      case 'high':
        return 'HIGH';
      case 'urgent':
        return 'URGENT';
      default:
        return 'MEDIUM';
    }
  }

  private async safeUpdateStatus(
    notificationId: string,
    status: NotificationStatus,
  ): Promise<void> {
    try {
      await this.repository.updateStatus(notificationId, status);
    } catch (error) {
      console.error('[NotificationManager] failed to update status', error);
    }
  }

  private async sendPush(
    recipient: NotificationRecipientDTO,
    data: NotificationData,
  ): Promise<string> {
    if (!recipient.pushTokens?.length) {
      throw new Error('User has no registered push token');
    }

    // TODO: integrate actual push provider
    return `push_${Date.now()}`;
  }
}

// 注意：单例实例已弃用，请使用 ServiceContainer 或直接构造函数创建实例

// 向后兼容的导出已移除 - 请使用 service-container 获取实例
// import { getDefaultContainer } from '@/lib/container/service-container';
// const manager = getDefaultContainer().getNotificationManager();

// 向后兼容的 NotificationService 别名已移除 - 会与 notification-service.ts 冲突
// export const NotificationService = NotificationManager;
