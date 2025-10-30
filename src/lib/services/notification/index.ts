// 通知系统核心服务导出
export { NotificationManager } from './notification-manager';
export { NotificationService } from './notification-service';
export { EmailService } from './email-service';
export { SMSService } from './sms-service';
export { WeChatService } from './wechat-service';
export { TemplateEngine } from './template-engine';

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

export type {
  SMSConfig,
  SMSMessage,
  SMSSendResult,
} from './sms-service';

export type {
  WeChatConfig,
  WeChatTemplateMessage,
  WeChatSendResult,
} from './wechat-service';

export type {
  TemplateVariable,
  RenderedTemplate,
} from './template-engine';

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

// 通知工具函数
export const NotificationUtils = {
  /**
   * 格式化通知时间
   */
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN');
  },

  /**
   * 获取通知优先级颜色
   */
  getPriorityColor(priority: string): string {
    const colors = {
      LOW: '#6c757d',
      MEDIUM: '#28a745',
      HIGH: '#ffc107',
      URGENT: '#dc3545',
    };
    return colors[priority as keyof typeof colors] || '#6c757d';
  },

  /**
   * 获取通知类型图标
   */
  getTypeIcon(type: string): string {
    const icons = {
      CHECK_IN_REMINDER: '📝',
      TASK_NOTIFICATION: '📋',
      EXPIRY_ALERT: '⏰',
      BUDGET_WARNING: '💰',
      HEALTH_ALERT: '⚠️',
      GOAL_ACHIEVEMENT: '🎉',
      FAMILY_ACTIVITY: '👨‍👩‍👧‍👦',
      SYSTEM_ANNOUNCEMENT: '📢',
      MARKETING: '🎯',
      OTHER: '📄',
    };
    return icons[type as keyof typeof icons] || '📄';
  },

  /**
   * 获取通知类型名称
   */
  getTypeName(type: string): string {
    const names = {
      CHECK_IN_REMINDER: '打卡提醒',
      TASK_NOTIFICATION: '任务通知',
      EXPIRY_ALERT: '过期提醒',
      BUDGET_WARNING: '预算预警',
      HEALTH_ALERT: '健康异常',
      GOAL_ACHIEVEMENT: '目标达成',
      FAMILY_ACTIVITY: '家庭活动',
      SYSTEM_ANNOUNCEMENT: '系统公告',
      MARKETING: '营销通知',
      OTHER: '其他',
    };
    return names[type as keyof typeof names] || '未知类型';
  },

  /**
   * 生成去重键
   */
  generateDedupKey(memberId: string, type: string, data?: any): string {
    const base = `${memberId}_${type}`;
    if (data) {
      const dataStr = JSON.stringify(data);
      const hash = require('crypto').createHash('md5').update(dataStr).digest('hex');
      return `${base}_${hash}`;
    }
    return base;
  },

  /**
   * 生成批量ID
   */
  generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * 验证通知内容
   */
  validateNotificationContent(title: string, content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!title || title.trim().length === 0) {
      errors.push('标题不能为空');
    }

    if (title.length > 100) {
      errors.push('标题长度不能超过100个字符');
    }

    if (!content || content.trim().length === 0) {
      errors.push('内容不能为空');
    }

    if (content.length > 1000) {
      errors.push('内容长度不能超过1000个字符');
    }

    // 检查敏感词
    const sensitiveWords = ['违禁词1', '违禁词2']; // 实际应该从配置中读取
    const hasSensitiveWords = sensitiveWords.some(word => 
      title.includes(word) || content.includes(word)
    );

    if (hasSensitiveWords) {
      errors.push('内容包含敏感词');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * 格式化通知内容
   */
  formatContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  },

  /**
   * 检查是否在勿扰时间内
   */
  isInQuietHours(startHour: number, endHour: number): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    if (startHour <= endHour) {
      return currentHour >= startHour && currentHour < endHour;
    } else {
      return currentHour >= startHour || currentHour < endHour;
    }
  },

  /**
   * 计算下次重试时间
   */
  calculateNextRetryTime(retryCount: number): Date {
    const delay = Math.pow(2, retryCount) * 60 * 1000; // 指数退避：2^retryCount 分钟
    return new Date(Date.now() + delay);
  },

  /**
   * 获取通知统计摘要
   */
  getStatsSummary(stats: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<string, any>;
  }): {
    total: number;
    successRate: number;
    failureRate: number;
    pendingRate: number;
    topTypes: Array<{ type: string; count: number; percentage: number }>;
  } {
    const successRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;
    const failureRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0;
    const pendingRate = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;

    // 计算各类型占比
    const topTypes = Object.entries(stats.byType)
      .map(([type, data]: [string, any]) => ({
        type,
        count: data.total,
        percentage: stats.total > 0 ? (data.total / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: stats.total,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      pendingRate: Math.round(pendingRate * 100) / 100,
      topTypes,
    };
  },
};
