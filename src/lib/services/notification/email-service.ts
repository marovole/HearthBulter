// @ts-nocheck
// @ts-nocheck
// 动态导入 nodemailer 以支持边缘运行时环境
import type nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
  replyTo?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailSendResult {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
  cost?: number;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;
  private isConfigured: boolean = false;
  private setupPromise: Promise<void> | null = null;

  constructor(config?: EmailConfig) {
    this.config = config || this.getDefaultConfig();
    // 不在构造函数中初始化，而是延迟到第一次使用时
  }

  /**
   * 确保 transporter 已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isConfigured) {
      return;
    }
    if (!this.setupPromise) {
      this.setupPromise = this.setupTransporter();
    }
    await this.setupPromise;
  }

  /**
   * 设置邮件传输器（动态导入以支持边缘运行时）
   */
  private async setupTransporter(): Promise<void> {
    try {
      // 动态导入 nodemailer，避免在构建时或边缘运行时导入失败
      const nodemailerModule = await import("nodemailer");
      const nodemailer = nodemailerModule.default;

      this.transporter = nodemailer.createTransporter({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        from: this.config.from,
        replyTo: this.config.replyTo,
      });

      this.isConfigured = true;
    } catch (error) {
      console.error("Failed to setup email transporter:", error);
      this.isConfigured = false;
    }
  }

  /**
   * 发送邮件
   */
  async send(
    memberId: string,
    subject: string,
    content: string,
    options: {
      html?: boolean;
      attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
      }>;
    } = {},
  ): Promise<string> {
    await this.ensureInitialized();

    if (!this.isConfigured || !this.transporter) {
      throw new Error("Email service is not configured");
    }

    try {
      // 获取用户邮箱地址
      const email = await this.getUserEmail(memberId);
      if (!email) {
        throw new Error("User email not found");
      }

      const message: EmailMessage = {
        to: email,
        subject,
        text: options.html ? undefined : content,
        html: options.html ? this.generateEmailHTML(content) : undefined,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(message);
      return result.messageId;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  /**
   * 发送模板邮件
   */
  async sendTemplate(
    memberId: string,
    templateName: string,
    data: Record<string, any>,
  ): Promise<string> {
    const template = await this.getEmailTemplate(templateName);
    if (!template) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    const subject = this.renderTemplate(template.subject, data);
    const html = this.renderTemplate(template.html, data);

    return await this.send(memberId, subject, html, { html: true });
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(
    emails: Array<{
      memberId: string;
      subject: string;
      content: string;
      html?: boolean;
    }>,
  ): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    // 分批处理以避免触发发送限制
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          try {
            const messageId = await this.send(
              email.memberId,
              email.subject,
              email.content,
              { html: email.html },
            );
            return {
              memberId: email.memberId,
              messageId,
              status: "sent" as const,
              cost: 0.1, // 假设每封邮件成本
            };
          } catch (error) {
            return {
              memberId: email.memberId,
              messageId: "",
              status: "failed" as const,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
      );

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push({
            messageId: result.value.messageId,
            status: result.value.status,
            error: result.value.error,
            cost: result.value.cost,
          });
        } else {
          results.push({
            messageId: "",
            status: "failed",
            error: result.reason.message || "Unknown error",
          });
        }
      });

      // 批次间延迟以避免触发频率限制
      if (i + batchSize < emails.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * 发送带附件的邮件
   */
  async sendWithAttachments(
    memberId: string,
    subject: string,
    content: string,
    attachments: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>,
  ): Promise<string> {
    return await this.send(memberId, subject, content, {
      html: true,
      attachments,
    });
  }

  /**
   * 验证邮件配置
   */
  async verifyConnection(): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email connection verification failed:", error);
      return false;
    }
  }

  /**
   * 获取发送统计
   */
  async getSendStats(days: number = 7): Promise<{
    sent: number;
    failed: number;
    totalCost: number;
  }> {
    // 这里应该从数据库或日志中获取实际统计
    // 暂时返回模拟数据
    return {
      sent: 0,
      failed: 0,
      totalCost: 0,
    };
  }

  /**
   * 获取用户邮箱地址
   */
  private async getUserEmail(memberId: string): Promise<string | null> {
    try {
      // 这里应该查询数据库获取用户邮箱
      // 暂时返回模拟数据
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      return member?.user?.email || null;
    } catch (error) {
      console.error("Failed to get user email:", error);
      return null;
    }
  }

  /**
   * 生成邮件HTML
   */
  private generateEmailHTML(content: string): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>健康管家通知</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #218838;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌱 健康管家</div>
            <p>您的智能健康管理助手</p>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <p>此邮件由健康管家系统自动发送，请勿回复。</p>
            <p>如需帮助，请联系客服支持。</p>
            <p>© 2025 健康管家. 保留所有权利。</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * 获取邮件模板
   */
  private async getEmailTemplate(templateName: string): Promise<{
    subject: string;
    html: string;
  } | null> {
    const templates: Record<string, { subject: string; html: string }> = {
      "check-in-reminder": {
        subject: "📝 打卡提醒 - {{userName}}",
        html: `
          <h2>Hi {{userName}},</h2>
          <p>该记录<strong>{{mealType}}</strong>了！</p>
          <p>保持健康的饮食习惯很重要哦。点击下方按钮开始打卡：</p>
          <a href="{{actionUrl}}" class="button">立即打卡</a>
          <p>祝您健康愉快！</p>
        `,
      },
      "goal-achievement": {
        subject: "🎉 恭喜达成目标 - {{goalTitle}}",
        html: `
          <h2>🎉 恭喜您！</h2>
          <p>您已成功达成目标：<strong>{{goalTitle}}</strong></p>
          <p>您的努力得到了回报，继续保持这种良好的习惯！</p>
          <a href="{{actionUrl}}" class="button">查看详情</a>
          <p>健康管家团队</p>
        `,
      },
      "health-alert": {
        subject: "⚠️ 健康异常提醒",
        html: `
          <h2>⚠️ 健康提醒</h2>
          <p>我们检测到您的<strong>{{healthMetric}}</strong>出现异常：</p>
          <p><em>{{alertMessage}}</em></p>
          <p>建议您及时关注并采取相应措施。如需帮助，请咨询专业医生。</p>
          <a href="{{actionUrl}}" class="button">查看健康数据</a>
        `,
      },
    };

    return templates[templateName] || null;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): EmailConfig {
    return {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      from: process.env.SMTP_FROM || "健康管家 <noreply@healthbutler.com>",
      replyTo: process.env.SMTP_REPLY_TO || "support@healthbutler.com",
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 重新配置服务
   */
  async reconfigure(config: EmailConfig): Promise<void> {
    this.config = config;
    this.isConfigured = false;
    this.setupPromise = null;
    await this.ensureInitialized();
  }

  /**
   * 检查服务状态
   */
  getStatus(): {
    isConfigured: boolean;
    isConnected: boolean;
  } {
    return {
      isConfigured: this.isConfigured,
      isConnected: this.isConfigured, // 简化实现，实际应该检查连接状态
    };
  }
}

// 导出单例实例（延迟初始化以支持边缘运行时）
// 使用 Proxy 来实现延迟初始化，保持 API 兼容性
let emailServiceInstance: EmailService | null = null;

function getEmailServiceInstance(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

export const emailService = new Proxy({} as EmailService, {
  get(target, prop) {
    const instance = getEmailServiceInstance();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
  set(target, prop, value) {
    const instance = getEmailServiceInstance();
    (instance as any)[prop] = value;
    return true;
  },
});
