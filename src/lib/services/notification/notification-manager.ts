/**
 * 通知管理器
 * 统一管理各种通知渠道和类型
 */

import { prisma } from '@/lib/db';
import { emailService } from './email-service';
import { smsService } from './sms-service';
import { wechatService } from './wechat-service';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  content: string;
  channels?: Array<'email' | 'sms' | 'wechat' | 'push'>;
  priority?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
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

export class NotificationManager {
  /**
   * 发送单个通知
   */
  async sendNotification(data: NotificationData): Promise<NotificationResult> {
    try {
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          id: true,
          email: true,
          phone: true,
          wechatOpenId: true,
          notificationPreferences: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // 获取用户的通知偏好
      const preferences = user.notificationPreferences as any || {
        email: true,
        sms: false,
        wechat: true,
        push: true,
      };

      // 确定要发送的渠道
      const channels = data.channels || ['push'];
      const enabledChannels = channels.filter(channel => {
        switch (channel) {
        case 'email':
          return preferences.email && user.email;
        case 'sms':
          return preferences.sms && user.phone;
        case 'wechat':
          return preferences.wechat && user.wechatOpenId;
        case 'push':
          return preferences.push;
        default:
          return false;
        }
      });

      if (enabledChannels.length === 0) {
        return {
          success: false,
          error: 'No enabled channels available',
        };
      }

      // 创建通知记录
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          content: data.content,
          channels: enabledChannels,
          status: 'sent',
          metadata: data.metadata || {},
        },
      });

      // 通过各个渠道发送通知
      const sendPromises = enabledChannels.map(async (channel) => {
        switch (channel) {
        case 'email':
          if (user.email) {
            return await emailService.sendEmail({
              to: user.email,
              subject: data.title,
              text: data.content,
            });
          }
          break;
        case 'sms':
          if (user.phone) {
            return await smsService.sendSMS({
              to: user.phone,
              message: data.content,
            });
          }
          break;
        case 'wechat':
          if (user.wechatOpenId) {
            return await wechatService.sendMessage({
              openId: user.wechatOpenId,
              content: data.content,
            });
          }
          break;
        case 'push':
          // Push notification implementation
          return { success: true, messageId: 'push-message-id' };
        }
      });

      await Promise.allSettled(sendPromises);

      return {
        success: true,
        notificationId: notification.id,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 批量发送通知
   */
  async sendBulkNotifications(dataList: NotificationData[]): Promise<BulkNotificationResult> {
    const results = await Promise.allSettled(
      dataList.map(data => this.sendNotification(data))
    );

    const formattedResults = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const summary = {
      total: formattedResults.length,
      successful: formattedResults.filter(r => r.success).length,
      failed: formattedResults.filter(r => !r.success).length,
    };

    return {
      success: summary.failed === 0,
      results: formattedResults,
      summary,
    };
  }

  /**
   * 计划通知
   */
  async scheduleNotification(data: ScheduledNotificationData): Promise<ScheduleResult> {
    try {
      // 验证计划时间不能是过去
      if (data.scheduledTime <= new Date()) {
        return {
          success: false,
          error: 'Cannot schedule notification in the past',
        };
      }

      // 创建计划通知记录
      const scheduledNotification = await prisma.scheduledNotification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          content: data.content,
          scheduledTime: data.scheduledTime,
          channels: data.channels || ['push'],
          status: 'scheduled',
          metadata: data.metadata || {},
        },
      });

      return {
        success: true,
        scheduleId: scheduledNotification.id,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取用户通知
   */
  async getUserNotifications(
    userId: string,
    options: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<UserNotificationsResult> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          ...(options.type && { type: options.type }),
          ...(options.status && { status: options.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      });

      return {
        success: true,
        notifications: notifications.map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          content: notif.content,
          status: notif.status,
          createdAt: notif.createdAt,
          read: notif.read || false,
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

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(notificationId: string): Promise<NotificationResult> {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return {
        success: true,
        notificationId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<NotificationResult> {
    try {
      // 验证通知属于该用户
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        select: { userId: true },
      });

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found',
        };
      }

      if (notification.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized to delete this notification',
        };
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      return {
        success: true,
        notificationId,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// 创建单例实例
export const notificationManager = new NotificationManager();

// 向后兼容的导出
export const NotificationService = NotificationManager;
