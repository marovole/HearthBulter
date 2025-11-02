import { EnhancedPerformanceMonitor, AlertLevel } from './performance-monitor-v2';

// 告警通知渠道
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  DINGTALK = 'dingtalk',
  WECHAT = 'wechat',
  SMS = 'sms',
  WEBHOOK = 'webhook',
}

// 告警配置接口
interface AlertConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  thresholds: {
    responseTime: {
      warning: number;
      error: number;
      critical: number;
    };
    memoryUsage: {
      warning: number;
      error: number;
      critical: number;
    };
    errorRate: {
      warning: number;
      error: number;
      critical: number;
    };
  };
  cooldown: {
    [key: string]: number; // 冷却时间（秒）
  };
  recipients: {
    [level in AlertLevel]: string[];
  };
}

// 通知接口
interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

// 告警系统
export class AlertSystem {
  private static instance: AlertSystem;
  private config: AlertConfig;
  private lastSentTimes: Map<string, number> = new Map();
  private cooldownPeriods: Map<string, number> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadConfig();
  }

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  /**
   * 发送告警
   */
  async sendAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): Promise<NotificationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    const results: NotificationResult[] = [];
    const alertKey = this.generateAlertKey(alert);

    // 检查冷却时间
    if (!this.checkCooldown(alertKey)) {
      return [{
        success: false,
        channel: NotificationChannel.EMAIL,
        error: 'Alert is in cooldown period',
      }];
    }

    const channels = this.config.channels.filter(channel =>
      this.shouldSendToChannel(alert.level, channel)
    );

    for (const channel of channels) {
      try {
        const result = await this.sendToChannel(channel, alert);
        results.push(result);

        if (result.success) {
          this.updateLastSentTime(alertKey);
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel}:`, error);
        results.push({
          success: false,
          channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 发送到特定渠道
   */
  private async sendToChannel(
    channel: NotificationChannel,
    alert: {
      level: AlertLevel;
      title: string;
      message: string;
      source: string;
      context: Record<string, any>;
    }
  ): Promise<NotificationResult> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.sendEmailAlert(alert);
      case NotificationChannel.SLACK:
        return this.sendSlackAlert(alert);
      case NotificationChannel.DINGTALK:
        return this.sendDingTalkAlert(alert);
      case NotificationChannel.WEBHOOK:
        return this.sendWebhookAlert(alert);
      default:
        return {
          success: false,
          channel,
          error: `Unsupported notification channel: ${channel}`,
        };
    }
  }

  /**
   * 发送邮件告警
   */
  private async sendEmailAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): Promise<NotificationResult> {
    try {
      // 这里集成邮件发送服务
      const recipients = this.config.recipients[alert.level] || [];

      if (recipients.length === 0) {
        return {
          success: false,
          channel: NotificationChannel.EMAIL,
          error: 'No recipients configured for this alert level',
        };
      }

      const emailContent = this.formatEmailAlert(alert);

      // 模拟邮件发送
      console.log('📧 Email Alert:', {
        to: recipients,
        subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
        body: emailContent,
      });

      return {
        success: true,
        channel: NotificationChannel.EMAIL,
        messageId: `email_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        channel: NotificationChannel.EMAIL,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 发送 Slack 告警
   */
  private async sendSlackAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): Promise<NotificationResult> {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        return {
          success: false,
          channel: NotificationChannel.SLACK,
          error: 'Slack webhook URL not configured',
        };
      }

      const slackMessage = this.formatSlackAlert(alert);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channel: NotificationChannel.SLACK,
        messageId: result.ts,
      };
    } catch (error) {
      return {
        success: false,
        channel: NotificationChannel.SLACK,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 发送钉钉告警
   */
  private async sendDingTalkAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): Promise<NotificationResult> {
    try {
      const webhookUrl = process.env.DINGTALK_WEBHOOK_URL;
      if (!webhookUrl) {
        return {
          success: false,
          channel: NotificationChannel.DINGTALK,
          error: 'DingTalk webhook URL not configured',
        };
      }

      const dingTalkMessage = this.formatDingTalkAlert(alert);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dingTalkMessage),
      });

      if (!response.ok) {
        throw new Error(`DingTalk API error: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channel: NotificationChannel.DINGTALK,
        messageId: result.errcode === 0 ? result.result?.task_id : undefined,
      };
    } catch (error) {
      return {
        success: false,
        channel: NotificationChannel.DINGTALK,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 发送 Webhook 告警
   */
  private async sendWebhookAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): Promise<NotificationResult> {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (!webhookUrl) {
        return {
          success: false,
          channel: NotificationChannel.WEBHOOK,
          error: 'Webhook URL not configured',
        };
      }

      const webhookPayload = {
        alert: {
          level: alert.level,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          timestamp: new Date().toISOString(),
          context: alert.context,
        },
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HealthButler-AlertSystem/1.0',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return {
        success: true,
        channel: NotificationChannel.WEBHOOK,
        messageId: `webhook_${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        channel: NotificationChannel.WEBHOOK,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 格式化邮件告警
   */
  private formatEmailAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): string {
    const timestamp = new Date().toLocaleString('zh-CN');

    return `
告警级别: ${alert.level.toUpperCase()}
告警标题: ${alert.title}
告警来源: ${alert.source}
告警时间: ${timestamp}

告警内容:
${alert.message}

上下文信息:
${Object.entries(alert.context)
  .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
  .join('\n')}

---
此邮件由 Health Butler 系统自动发送
    `.trim();
  }

  /**
   * 格式化 Slack 告警
   */
  private formatSlackAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): any {
    const color = this.getSlackColor(alert.level);
    const emoji = this.getSlackEmoji(alert.level);

    return {
      attachments: [
        {
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: '级别',
              value: alert.level.toUpperCase(),
              short: true,
            },
            {
              title: '来源',
              value: alert.source,
              short: true,
            },
            {
              title: '时间',
              value: new Date().toLocaleString('zh-CN'),
              short: true,
            },
          ],
          footer: 'Health Butler Alert System',
          ts: Date.now(),
        },
      ],
    };
  }

  /**
   * 格式化钉钉告警
   */
  private formatDingTalkAlert(alert: {
    level: AlertLevel;
    title: string;
    message: string;
    source: string;
    context: Record<string, any>;
  }): any {
    const color = this.getDingTalkColor(alert.level);

    return {
      msgtype: 'markdown',
      markdown: {
        title: `【${alert.level.toUpperCase()}】${alert.title}`,
        text: alert.message,
      },
      at: {
        atMobiles: ['all'],
      },
    };
  }

  /**
   * 获取 Slack 颜色
   */
  private getSlackColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return '#dc3545'; // red
      case AlertLevel.ERROR:
        return '#f59e0b'; // orange
      case AlertLevel.WARNING:
        return '#ffc107'; // yellow
      case AlertLevel.INFO:
      default:
        return '#28a745'; // green
    }
  }

  /**
   * 获取 Slack emoji
   */
  private getSlackEmoji(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return '🚨';
      case AlertLevel.ERROR:
        return '❌';
      case AlertLevel.WARNING:
        return '⚠️';
      case AlertLevel.INFO:
      default:
        return 'ℹ️';
    }
  }

  /**
   * 获取钉钉颜色
   */
  private getDingTalkColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return 'red';
      case AlertLevel.ERROR:
        return 'orange';
      case AlertLevel.WARNING:
        return 'yellow';
      case AlertLevel.INFO:
      default:
        return 'green';
    }
  }

  /**
   * 检查是否应该发送到特定渠道
   */
  private shouldSendToChannel(level: AlertLevel, channel: NotificationChannel): boolean {
    const channelPreferences = {
      [AlertLevel.CRITICAL]: [
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        NotificationChannel.SLACK,
        NotificationChannel.DINGTALK,
      ],
      [AlertLevel.ERROR]: [
        NotificationChannel.EMAIL,
        NotificationChannel.SLACK,
        NotificationChannel.WEBHOOK,
      ],
      [AlertLevel.WARNING]: [
        NotificationChannel.EMAIL,
        NotificationChannel.SLACK,
      ],
      [AlertLevel.INFO]: [
        NotificationChannel.EMAIL,
        NotificationChannel.WEBHOOK,
      ],
    };

    return channelPreferences[level].includes(channel);
  }

  /**
   * 生成告警键
   */
  private generateAlertKey(alert: {
    level: AlertLevel;
    title: string;
    source: string;
    context: Record<string, any>;
  }): string {
    return `${alert.level}_${alert.source}_${alert.title}_${JSON.stringify(alert.context)}`;
  }

  /**
   * 检查冷却时间
   */
  private checkCooldown(alertKey: string): boolean {
    const lastSentTime = this.lastSentTimes.get(alertKey);
    const cooldownPeriod = this.config.cooldown[alertKey] || this.config.cooldown.default || 300; // 默认5分钟

    if (!lastSentTime) {
      return true;
    }

    return Date.now() - lastSentTime > cooldownPeriod * 1000;
  }

  /**
   * 更新最后发送时间
   */
  private updateLastSentTime(alertKey: string): void {
    this.lastSentTimes.set(alertKey, Date.now());
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AlertConfig {
    return {
      enabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.WEBHOOK],
      thresholds: {
        responseTime: {
          warning: 500,
          error: 1000,
          critical: 2000,
        },
        memoryUsage: {
          warning: 0.7,
          error: 0.85,
          critical: 0.95,
        },
        errorRate: {
          warning: 0.05,
          error: 0.1,
          critical: 0.2,
        },
      },
      cooldown: {
        default: 300, // 5分钟
        critical: 60, // 1分钟
        error: 180, // 3分钟
      },
      recipients: {
        [AlertLevel.INFO]: [],
        [AlertLevel.WARNING]: [],
        [AlertLevel.ERROR]: [],
        [AlertLevel.CRITICAL]: [], // 从环境变量读取
      },
    };
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      // 从环境变量加载配置
      const envConfig = {
        enabled: process.env.ALERT_SYSTEM_ENABLED === 'true',
        slackWebhook: process.env.SLACK_WEBHOOK_URL,
        dingtalkWebhook: process.env.DINGTALK_WEBHOOK_URL,
        webhookUrl: process.env.ALERT_WEBHOOK_URL,
        recipients: {
          critical: process.env.ALERT_RECIPIENTS_CRITICAL?.split(',') || [],
          error: process.env.ALERT_RECIPIENTS_ERROR?.split(',') || [],
          warning: process.env.ALERT_RECIPIENTS_WARNING?.split(',') || [],
          info: process.env.ALERT_RECIPIENTS_INFO?.split(',') || [],
        },
      };

      // 更新配置
      this.config = {
        ...this.config,
        ...envConfig,
        recipients: {
          [AlertLevel.CRITICAL]: envConfig.recipients.critical,
          [AlertLevel.ERROR]: envConfig.recipients.error,
          [AlertLevel.WARNING]: envConfig.recipients.warning,
          [AlertLevel.INFO]: envConfig.recipients.info,
        },
      };
    } catch (error) {
      console.error('Failed to load alert config:', error);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    // 这里可以将配置保存到文件或数据库
    console.log('Alert config updated:', this.config);
  }

  /**
   * 获取配置
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * 测试告警系统
   */
  async testAlert(): Promise<NotificationResult[]> {
    const testAlert = {
      level: AlertLevel.INFO,
      title: '测试告警',
      message: '这是一个测试告警，用于验证告警系统是否正常工作。',
      source: 'test',
      context: {
        timestamp: new Date().toISOString(),
        test: true,
      },
    };

    return this.sendAlert(testAlert);
  }
}

export default AlertSystem.getInstance();