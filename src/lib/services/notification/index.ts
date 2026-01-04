// 通知系统核心服务导出
export { NotificationManager } from './notification-manager';
export { NotificationService } from './notification-service';
export { EmailService } from './email-service';
export { SMSService } from './sms-service';
export { WeChatService } from './wechat-service';
export { TemplateEngine } from './template-engine';
export { NotificationUtils } from './notification-utils';

// 类型导出
export type {
  CreateNotificationRequest,
  NotificationDeliveryResult,
  NotificationResult,
} from './notification-manager';

export type {
  EmailConfig,
  EmailMessage,
  EmailSendResult,
} from './email-service';

export type { SMSConfig, SMSMessage, SMSSendResult } from './sms-service';

export type {
  WeChatConfig,
  WeChatTemplateMessage,
  WeChatSendResult,
} from './wechat-service';

export type { TemplateVariable, RenderedTemplate } from './template-engine';

// 通知工厂类
import { PrismaClient } from '@prisma/client';
import { NotificationManager } from './notification-manager';

export class NotificationFactory {
  private static instance: NotificationManager;

  static getInstance(prisma?: PrismaClient): NotificationManager {
    if (!this.instance) {
      if (!prisma) {
        throw new Error('Prisma client is required for first initialization');
      }
      this.instance = new NotificationManager(prisma);
    }
    return this.instance;
  }

  static createManager(prisma: PrismaClient): NotificationManager {
    return new NotificationManager(prisma);
  }
}

// 通知常量
export const NOTIFICATION_TYPES = {
  CHECK_IN_REMINDER: 'CHECK_IN_REMINDER',
  TASK_NOTIFICATION: 'TASK_NOTIFICATION',
  EXPIRY_ALERT: 'EXPIRY_ALERT',
  BUDGET_WARNING: 'BUDGET_WARNING',
  HEALTH_ALERT: 'HEALTH_ALERT',
  GOAL_ACHIEVEMENT: 'GOAL_ACHIEVEMENT',
  FAMILY_ACTIVITY: 'FAMILY_ACTIVITY',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  MARKETING: 'MARKETING',
  OTHER: 'OTHER',
} as const;

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WECHAT: 'WECHAT',
  PUSH: 'PUSH',
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const NOTIFICATION_STATUSES = {
  PENDING: 'PENDING',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
