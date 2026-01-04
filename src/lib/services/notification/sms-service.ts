import crypto from "crypto";

export interface SMSConfig {
  provider: "aliyun" | "tencent" | "huawei" | "mock";
  accessKey: string;
  secretKey: string;
  signName: string;
  templateCode?: string;
  endpoint?: string;
  region?: string;
}

export interface SMSMessage {
  phone: string;
  content: string;
  templateCode?: string;
  templateParams?: Record<string, string>;
}

export interface SMSSendResult {
  messageId: string;
  status: "sent" | "failed";
  error?: string;
  cost?: number;
  provider?: string;
}

export class SMSService {
  private config: SMSConfig;
  private isConfigured: boolean = false;

  constructor(config?: SMSConfig) {
    this.config = config || this.getDefaultConfig();
    this.validateConfig();
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (this.config.provider === "mock") {
      this.isConfigured = true;
      return;
    }

    if (!this.config.accessKey || !this.config.secretKey) {
      console.warn("SMS service credentials not configured");
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
  }

  /**
   * 发送短信
   */
  async send(phone: string, content: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error("SMS service is not configured");
    }

    if (!this.validatePhone(phone)) {
      throw new Error("Invalid phone number format");
    }

    try {
      let messageId: string;

      switch (this.config.provider) {
      case "aliyun":
        messageId = await this.sendAliyunSMS(phone, content);
        break;
      case "tencent":
        messageId = await this.sendTencentSMS(phone, content);
        break;
      case "huawei":
        messageId = await this.sendHuaweiSMS(phone, content);
        break;
      case "mock":
        messageId = await this.sendMockSMS(phone, content);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }

      return messageId;
    } catch (error) {
      console.error("Failed to send SMS:", error);
      throw error;
    }
  }

  /**
   * 发送模板短信
   */
  async sendTemplate(
    phone: string,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error("SMS service is not configured");
    }

    try {
      let messageId: string;

      switch (this.config.provider) {
      case "aliyun":
        messageId = await this.sendAliyunTemplateSMS(
          phone,
          templateCode,
          templateParams,
        );
        break;
      case "tencent":
        messageId = await this.sendTencentTemplateSMS(
          phone,
          templateCode,
          templateParams,
        );
        break;
      case "huawei":
        messageId = await this.sendHuaweiTemplateSMS(
          phone,
          templateCode,
          templateParams,
        );
        break;
      case "mock":
        messageId = await this.sendMockTemplateSMS(
          phone,
          templateCode,
          templateParams,
        );
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${this.config.provider}`);
      }

      return messageId;
    } catch (error) {
      console.error("Failed to send template SMS:", error);
      throw error;
    }
  }

  /**
   * 批量发送短信
   */
  async sendBatch(messages: SMSMessage[]): Promise<SMSSendResult[]> {
    const results: SMSSendResult[] = [];

    // 分批处理以避免触发发送限制
    const batchSize = 50;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (message) => {
          try {
            const messageId = message.templateCode
              ? await this.sendTemplate(
                message.phone,
                message.templateCode,
                message.templateParams || {},
              )
              : await this.send(message.phone, message.content);

            return {
              messageId,
              status: "sent" as const,
              cost: this.getSMSCost(),
              provider: this.config.provider,
            };
          } catch (error) {
            return {
              messageId: "",
              status: "failed" as const,
              error: error instanceof Error ? error.message : "Unknown error",
              provider: this.config.provider,
            };
          }
        }),
      );

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            messageId: "",
            status: "failed",
            error: result.reason.message || "Unknown error",
            provider: this.config.provider,
          });
        }
      });

      // 批次间延迟
      if (i + batchSize < messages.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * 验证手机号格式
   */
  validatePhone(phone: string): boolean {
    // 中国手机号正则表达式
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 格式化手机号
   */
  formatPhone(phone: string): string {
    // 移除所有非数字字符
    return phone.replace(/\D/g, "");
  }

  /**
   * 获取短信发送统计
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
   * 阿里云短信发送
   */
  private async sendAliyunSMS(phone: string, content: string): Promise<string> {
    // 这里应该集成阿里云短信SDK
    console.log("Aliyun SMS:", {
      phone,
      content,
      signName: this.config.signName,
    });

    // 模拟发送
    const messageId = `aliyun_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 腾讯云短信发送
   */
  private async sendTencentSMS(
    phone: string,
    content: string,
  ): Promise<string> {
    // 这里应该集成腾讯云短信SDK
    console.log("Tencent SMS:", {
      phone,
      content,
      signName: this.config.signName,
    });

    // 模拟发送
    const messageId = `tencent_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 华为云短信发送
   */
  private async sendHuaweiSMS(phone: string, content: string): Promise<string> {
    // 这里应该集成华为云短信SDK
    console.log("Huawei SMS:", {
      phone,
      content,
      signName: this.config.signName,
    });

    // 模拟发送
    const messageId = `huawei_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 模拟短信发送
   */
  private async sendMockSMS(phone: string, content: string): Promise<string> {
    console.log("Mock SMS:", {
      phone,
      content,
      signName: this.config.signName,
    });

    // 模拟延迟
    await this.delay(100);

    const messageId = `mock_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 阿里云模板短信发送
   */
  private async sendAliyunTemplateSMS(
    phone: string,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<string> {
    console.log("Aliyun Template SMS:", {
      phone,
      templateCode,
      templateParams,
    });

    const messageId = `aliyun_tpl_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 腾讯云模板短信发送
   */
  private async sendTencentTemplateSMS(
    phone: string,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<string> {
    console.log("Tencent Template SMS:", {
      phone,
      templateCode,
      templateParams,
    });

    const messageId = `tencent_tpl_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 华为云模板短信发送
   */
  private async sendHuaweiTemplateSMS(
    phone: string,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<string> {
    console.log("Huawei Template SMS:", {
      phone,
      templateCode,
      templateParams,
    });

    const messageId = `huawei_tpl_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 模拟模板短信发送
   */
  private async sendMockTemplateSMS(
    phone: string,
    templateCode: string,
    templateParams: Record<string, string>,
  ): Promise<string> {
    console.log("Mock Template SMS:", { phone, templateCode, templateParams });

    await this.delay(100);

    const messageId = `mock_tpl_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return messageId;
  }

  /**
   * 获取短信成本
   */
  private getSMSCost(): number {
    // 不同提供商的短信成本不同
    const costs: Record<string, number> = {
      aliyun: 0.045,
      tencent: 0.055,
      huawei: 0.04,
      mock: 0,
    };

    return costs[this.config.provider] || 0.05;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): SMSConfig {
    return {
      provider: (process.env.SMS_PROVIDER as any) || "mock",
      accessKey: process.env.SMS_ACCESS_KEY || "",
      secretKey: process.env.SMS_SECRET_KEY || "",
      signName: process.env.SMS_SIGN_NAME || "健康管家",
      templateCode: process.env.SMS_TEMPLATE_CODE || "",
      endpoint: process.env.SMS_ENDPOINT,
      region: process.env.SMS_REGION || "cn-hangzhou",
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
  reconfigure(config: SMSConfig): void {
    this.config = config;
    this.validateConfig();
  }

  /**
   * 检查服务状态
   */
  getStatus(): {
    isConfigured: boolean;
    provider: string;
    } {
    return {
      isConfigured: this.isConfigured,
      provider: this.config.provider,
    };
  }

  /**
   * 获取支持的模板列表
   */
  async getTemplates(): Promise<
    Array<{
      code: string;
      name: string;
      content: string;
      variables: string[];
    }>
    > {
    // 这里应该调用提供商API获取模板列表
    // 暂时返回模拟数据
    return [
      {
        code: "CHECK_IN_REMINDER",
        name: "打卡提醒",
        content: "Hi ${userName}, 该记录${mealType}了！",
        variables: ["userName", "mealType"],
      },
      {
        code: "GOAL_ACHIEVEMENT",
        name: "目标达成",
        content: "恭喜！您已达成目标：${goalTitle}",
        variables: ["goalTitle"],
      },
      {
        code: "HEALTH_ALERT",
        name: "健康异常提醒",
        content: "检测到您的${healthMetric}出现异常，建议关注。",
        variables: ["healthMetric"],
      },
    ];
  }

  /**
   * 检查手机号是否在发送限制中
   */
  async checkRateLimit(phone: string): Promise<{
    allowed: boolean;
    remainingCount?: number;
    resetTime?: Date;
  }> {
    // 这里应该实现频率限制逻辑
    // 暂时总是允许
    return {
      allowed: true,
      remainingCount: 10,
    };
  }

  /**
   * 生成短信验证码
   */
  generateVerificationCode(length: number = 6): string {
    const chars = "0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 发送验证码短信
   */
  async sendVerificationCode(phone: string, code: string): Promise<string> {
    const content = `【${this.config.signName}】您的验证码是：${code}，5分钟内有效。`;
    return await this.send(phone, content);
  }
}

// 导出单例实例
export const smsService = new SMSService();
