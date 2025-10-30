import { PrismaClient } from '@prisma/client';
import { NotificationService } from './notification-service';
import { EmailService } from './email-service';
import { SMSService } from './sms-service';
import { WeChatService } from './wechat-service';
import { TemplateEngine } from './template-engine';
import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority,
  NotificationStatus 
} from '@prisma/client';

export interface CreateNotificationRequest {
  memberId: string;
  type: NotificationType;
  title?: string;
  content?: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  templateData?: Record<string, any>;
  dedupKey?: string;
  batchId?: string;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  error?: string;
  externalId?: string;
  cost?: number;
}

export interface NotificationResult {
  id: string;
  status: NotificationStatus;
  results: NotificationDeliveryResult[];
  sentChannels: NotificationChannel[];
  failedChannels: NotificationChannel[];
}

export class NotificationManager {
  private prisma: PrismaClient;
  private notificationService: NotificationService;
  private emailService: EmailService;
  private smsService: SMSService;
  private wechatService: WeChatService;
  private templateEngine: TemplateEngine;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.notificationService = new NotificationService(prisma);
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.wechatService = new WeChatService();
    this.templateEngine = new TemplateEngine(prisma);
  }

  /**
   * 创建并发送通知
   */
  async createNotification(request: CreateNotificationRequest): Promise<NotificationResult> {
    // 1. 获取用户偏好设置
    const preferences = await this.getUserPreferences(request.memberId);
    
    // 2. 检查通知是否启用
    if (!this.shouldSendNotification(request.type, preferences)) {
      throw new Error('Notification type is disabled for user');
    }

    // 3. 应用模板渲染
    const { title, content } = await this.renderTemplate(
      request.type,
      request.title,
      request.content,
      request.templateData
    );

    // 4. 确定发送渠道
    const channels = await this.resolveChannels(
      request.type,
      request.channels,
      request.priority,
      preferences
    );

    // 5. 频率控制和去重
    const deduplicationResult = await this.applyDeduplication(
      request.memberId,
      request.type,
      request.dedupKey,
      request.batchId
    );

    if (deduplicationResult.isDeduped) {
      // 如果被去重，返回现有通知
      return await this.getNotificationResult(deduplicationResult.existingNotificationId!);
    }

    // 6. 创建通知记录
    const notification = await this.notificationService.create({
      memberId: request.memberId,
      type: request.type,
      title,
      content,
      priority: request.priority || NotificationPriority.MEDIUM,
      channels: JSON.stringify(channels),
      metadata: request.metadata,
      actionUrl: request.actionUrl,
      actionText: request.actionText,
      dedupKey: request.dedupKey,
      batchId: request.batchId,
    });

    // 7. 异步发送通知
    this.sendNotificationAsync(notification.id).catch(error => {
      console.error('Failed to send notification:', error);
    });

    // 8. 返回初始结果
    return {
      id: notification.id,
      status: notification.status,
      results: [],
      sentChannels: [],
      failedChannels: [],
    };
  }

  /**
   * 批量创建通知
   */
  async createBulkNotifications(
    requests: CreateNotificationRequest[]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    // 按批次处理以避免数据库连接池耗尽
    const batchSize = 50;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(request => this.createNotification(request))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to create notification ${i + index}:`, result.reason);
        }
      });
    }
    
    return results;
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(
    memberId: string,
    options: {
      type?: NotificationType;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
      includeRead?: boolean;
    } = {}
  ) {
    return await this.notificationService.getUserNotifications(memberId, options);
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, memberId: string): Promise<void> {
    await this.notificationService.markAsRead(notificationId, memberId);
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(memberId: string): Promise<void> {
    await this.notificationService.markAllAsRead(memberId);
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, memberId: string): Promise<void> {
    await this.notificationService.delete(notificationId, memberId);
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(memberId: string): Promise<number> {
    return await this.notificationService.getUnreadCount(memberId);
  }

  /**
   * 异步发送通知
   */
  private async sendNotificationAsync(notificationId: string): Promise<void> {
    try {
      // 更新状态为发送中
      await this.notificationService.updateStatus(notificationId, NotificationStatus.SENDING);

      // 获取通知详情
      const notification = await this.notificationService.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      // 获取用户偏好
      const preferences = await this.getUserPreferences(notification.memberId);

      // 检查勿扰时间
      if (this.isInQuietHours(preferences) && notification.priority !== NotificationPriority.URGENT) {
        // 如果在勿扰时间且非紧急，延迟发送
        await this.scheduleNotification(notificationId, preferences);
        return;
      }

      // 执行发送
      const channels = JSON.parse(notification.channels) as NotificationChannel[];
      const results: NotificationDeliveryResult[] = [];

      for (const channel of channels) {
        try {
          const result = await this.sendViaChannel(
            notification,
            channel,
            preferences
          );
          results.push(result);
        } catch (error) {
          console.error(`Failed to send via ${channel}:`, error);
          results.push({
            channel,
            status: NotificationStatus.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // 更新发送结果
      await this.updateDeliveryResults(notificationId, results);

      // 判断整体状态
      const hasSuccess = results.some(r => r.status === NotificationStatus.SENT);
      const hasFailure = results.some(r => r.status === NotificationStatus.FAILED);

      const finalStatus = hasSuccess 
        ? (hasFailure ? NotificationStatus.SENT : NotificationStatus.SENT) // 部分成功也算成功
        : NotificationStatus.FAILED;

      await this.notificationService.updateStatus(notificationId, finalStatus);

      // 如果有失败的，安排重试
      if (hasFailure && notification.retryCount < notification.maxRetries) {
        await this.scheduleRetry(notificationId);
      }

    } catch (error) {
      console.error('Error in sendNotificationAsync:', error);
      await this.notificationService.updateStatus(notificationId, NotificationStatus.FAILED);
    }
  }

  /**
   * 通过指定渠道发送通知
   */
  private async sendViaChannel(
    notification: any,
    channel: NotificationChannel,
    preferences: any
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      let externalId: string | undefined;
      let cost: number | undefined;

      switch (channel) {
        case NotificationChannel.IN_APP:
          // 应用内通知直接标记为成功
          externalId = notification.id;
          break;

        case NotificationChannel.EMAIL:
          if (!preferences.emailEnabled) {
            throw new Error('Email notifications disabled');
          }
          externalId = await this.emailService.send(
            notification.memberId,
            notification.title,
            notification.content
          );
          cost = 0.1; // 假设邮件成本
          break;

        case NotificationChannel.SMS:
          if (!preferences.phoneEnabled) {
            throw new Error('SMS notifications disabled');
          }
          externalId = await this.smsService.send(
            preferences.phoneNumber,
            notification.content
          );
          cost = 0.05; // 假设短信成本
          break;

        case NotificationChannel.WECHAT:
          if (!preferences.wechatSubscribed) {
            throw new Error('WeChat notifications disabled');
          }
          externalId = await this.wechatService.sendTemplateMessage(
            preferences.wechatOpenId,
            notification.type,
            notification.title,
            notification.content
          );
          break;

        case NotificationChannel.PUSH:
          if (!preferences.pushEnabled) {
            throw new Error('Push notifications disabled');
          }
          externalId = await this.sendPushNotification(
            preferences.pushToken,
            notification.title,
            notification.content,
            notification.actionUrl
          );
          break;

        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      const processingTime = Date.now() - startTime;

      // 记录发送日志
      await this.logDelivery({
        notificationId: notification.id,
        channel,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        externalId,
        cost,
        processingTime,
      });

      return {
        channel,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        externalId,
        cost,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // 记录失败日志
      await this.logDelivery({
        notificationId: notification.id,
        channel,
        status: NotificationStatus.FAILED,
        errorCode: 'SEND_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      });

      throw error;
    }
  }

  /**
   * 获取用户偏好设置
   */
  private async getUserPreferences(memberId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { memberId },
    });

    if (!preferences) {
      // 创建默认偏好设置
      preferences = await this.prisma.notificationPreference.create({
        data: {
          memberId,
          enableNotifications: true,
          dailyMaxNotifications: 50,
          dailyMaxSMS: 5,
          dailyMaxEmail: 20,
        },
      });
    }

    return preferences;
  }

  /**
   * 检查是否应该发送通知
   */
  private shouldSendNotification(type: NotificationType, preferences: any): boolean {
    if (!preferences.enableNotifications) {
      return false;
    }

    const typeSettings = JSON.parse(preferences.typeSettings);
    return typeSettings[type] !== false;
  }

  /**
   * 渲染通知模板
   */
  private async renderTemplate(
    type: NotificationType,
    customTitle?: string,
    customContent?: string,
    templateData?: Record<string, any>
  ): Promise<{ title: string; content: string }> {
    if (customTitle && customContent) {
      // 使用自定义内容
      return {
        title: this.templateEngine.renderText(customTitle, templateData),
        content: this.templateEngine.renderText(customContent, templateData),
      };
    }

    // 使用模板
    return await this.templateEngine.renderNotification(type, templateData);
  }

  /**
   * 解析发送渠道
   */
  private async resolveChannels(
    type: NotificationType,
    requestedChannels?: NotificationChannel[],
    priority?: NotificationPriority,
    preferences?: any
  ): Promise<NotificationChannel[]> {
    if (requestedChannels && requestedChannels.length > 0) {
      return requestedChannels;
    }

    // 根据用户偏好和优先级确定渠道
    const channelPreferences = JSON.parse(preferences?.channelPreferences || '{}');
    const defaultChannels = channelPreferences[type] || [NotificationChannel.IN_APP];

    // 紧急通知使用所有可用渠道
    if (priority === NotificationPriority.URGENT) {
      return [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        ...(preferences?.wechatSubscribed ? [NotificationChannel.WECHAT] : []),
        ...(preferences?.pushEnabled ? [NotificationChannel.PUSH] : []),
      ];
    }

    return defaultChannels;
  }

  /**
   * 应用去重逻辑
   */
  private async applyDeduplication(
    memberId: string,
    type: NotificationType,
    dedupKey?: string,
    batchId?: string
  ): Promise<{ isDeduped: boolean; existingNotificationId?: string }> {
    if (!dedupKey && !batchId) {
      return { isDeduped: false };
    }

    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        memberId,
        type,
        OR: [
          { dedupKey },
          { batchId },
        ],
        status: {
          in: [NotificationStatus.PENDING, NotificationStatus.SENDING, NotificationStatus.SENT],
        },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5分钟内的通知
        },
      },
    });

    if (existingNotification) {
      return { 
        isDeduped: true, 
        existingNotificationId: existingNotification.id 
      };
    }

    return { isDeduped: false };
  }

  /**
   * 检查是否在勿扰时间
   */
  private isInQuietHours(preferences: any): boolean {
    if (!preferences.globalQuietHoursStart || !preferences.globalQuietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const start = preferences.globalQuietHoursStart;
    const end = preferences.globalQuietHoursEnd;

    if (start <= end) {
      // 同一天内的时间段
      return currentHour >= start && currentHour < end;
    } else {
      // 跨天的时间段（如22:00-8:00）
      return currentHour >= start || currentHour < end;
    }
  }

  /**
   * 延迟发送通知
   */
  private async scheduleNotification(notificationId: string, preferences: any): Promise<void> {
    // 计算下一个可发送时间
    const now = new Date();
    const currentHour = now.getHours();
    const endHour = preferences.globalQuietHoursEnd || 8;
    
    let scheduledTime: Date;
    if (currentHour < endHour) {
      // 今天已经过了勿扰时间
      scheduledTime = new Date(now);
      scheduledTime.setHours(endHour, 0, 0, 0);
    } else {
      // 明天
      scheduledTime = new Date(now);
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(endHour, 0, 0, 0);
    }

    // 这里应该集成任务队列（如Bull、Agenda等）
    // 暂时使用setTimeout作为简单实现
    const delay = scheduledTime.getTime() - now.getTime();
    setTimeout(() => {
      this.sendNotificationAsync(notificationId);
    }, delay);
  }

  /**
   * 安排重试
   */
  private async scheduleRetry(notificationId: string): Promise<void> {
    const notification = await this.notificationService.findById(notificationId);
    if (!notification) return;

    const retryDelay = Math.pow(2, notification.retryCount) * 60 * 1000; // 指数退避
    const nextRetryAt = new Date(Date.now() + retryDelay);

    await this.notificationService.scheduleRetry(notificationId, nextRetryAt);

    setTimeout(() => {
      this.sendNotificationAsync(notificationId);
    }, retryDelay);
  }

  /**
   * 更新发送结果
   */
  private async updateDeliveryResults(
    notificationId: string,
    results: NotificationDeliveryResult[]
  ): Promise<void> {
    const deliveryResults: Record<string, string> = {};
    results.forEach(result => {
      deliveryResults[result.channel] = result.status;
    });

    await this.notificationService.updateDeliveryResults(
      notificationId,
      JSON.stringify(deliveryResults)
    );
  }

  /**
   * 记录发送日志
   */
  private async logDelivery(logData: {
    notificationId: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    sentAt?: Date;
    errorCode?: string;
    errorMessage?: string;
    externalId?: string;
    cost?: number;
    processingTime?: number;
  }): Promise<void> {
    await this.prisma.notificationLog.create({
      data: {
        notificationId: logData.notificationId,
        channel: logData.channel,
        status: logData.status,
        sentAt: logData.sentAt,
        errorCode: logData.errorCode,
        errorMessage: logData.errorMessage,
        externalId: logData.externalId,
        cost: logData.cost,
        processingTime: logData.processingTime,
      },
    });
  }

  /**
   * 发送推送通知（占位实现）
   */
  private async sendPushNotification(
    token: string,
    title: string,
    content: string,
    actionUrl?: string
  ): Promise<string> {
    // 这里应该集成推送服务（如Firebase、OneSignal等）
    console.log('Push notification:', { token, title, content, actionUrl });
    return `push_${Date.now()}`;
  }

  /**
   * 获取通知结果
   */
  private async getNotificationResult(notificationId: string): Promise<NotificationResult> {
    const notification = await this.notificationService.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    const logs = await this.prisma.notificationLog.findMany({
      where: { notificationId },
    });

    const results: NotificationDeliveryResult[] = logs.map(log => ({
      channel: log.channel,
      status: log.status,
      sentAt: log.sentAt || undefined,
      error: log.errorMessage || undefined,
      externalId: log.externalId || undefined,
      cost: log.cost || undefined,
    }));

    const sentChannels = results
      .filter(r => r.status === NotificationStatus.SENT)
      .map(r => r.channel);

    const failedChannels = results
      .filter(r => r.status === NotificationStatus.FAILED)
      .map(r => r.channel);

    return {
      id: notification.id,
      status: notification.status,
      results,
      sentChannels,
      failedChannels,
    };
  }
}
