import crypto from 'crypto';
import axios from 'axios';

export interface WeChatConfig {
  appId: string;
  appSecret: string;
  token?: string;
  encodingAESKey?: string;
  accessToken?: string;
  accessTokenExpiresAt?: Date;
}

export interface WeChatTemplateMessage {
  touser: string;
  template_id: string;
  url?: string;
  data: Record<
    string,
    {
      value: string;
      color?: string;
    }
  >;
}

export interface WeChatSendResult {
  messageId: string;
  status: 'sent' | 'failed';
  error?: string;
  cost?: number;
}

export class WeChatService {
  private config: WeChatConfig;
  private isConfigured: boolean = false;

  constructor(config?: WeChatConfig) {
    this.config = config || this.getDefaultConfig();
    this.validateConfig();
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.appId || !this.config.appSecret) {
      console.warn('WeChat service credentials not configured');
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
  }

  /**
   * 发送模板消息
   */
  async sendTemplateMessage(
    openId: string,
    type: string,
    title: string,
    content: string,
    url?: string,
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('WeChat service is not configured');
    }

    try {
      const accessToken = await this.getAccessToken();
      const templateId = await this.getTemplateId(type);

      const message: WeChatTemplateMessage = {
        touser: openId,
        template_id: templateId,
        url: url || 'https://healthbutler.com/notifications',
        data: this.formatTemplateData(title, content),
      };

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
        message,
      );

      if (response.data.errcode === 0) {
        return response.data.msgid;
      } else {
        throw new Error(
          `WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`,
        );
      }
    } catch (error) {
      console.error('Failed to send WeChat template message:', error);
      throw error;
    }
  }

  /**
   * 发送普通消息
   */
  async sendMessage(
    openId: string,
    content: string,
    type: 'text' | 'image' | 'news' = 'text',
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('WeChat service is not configured');
    }

    try {
      const accessToken = await this.getAccessToken();

      const message: any = {
        touser: openId,
        msgtype: type,
      };

      switch (type) {
        case 'text':
          message.text = { content };
          break;
        case 'image':
          message.image = { media_id: content };
          break;
        case 'news':
          message.news = { articles: content };
          break;
      }

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
        message,
      );

      if (response.data.errcode === 0) {
        return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      } else {
        throw new Error(
          `WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`,
        );
      }
    } catch (error) {
      console.error('Failed to send WeChat message:', error);
      throw error;
    }
  }

  /**
   * 批量发送模板消息
   */
  async sendBatchTemplateMessages(
    messages: Array<{
      openId: string;
      type: string;
      title: string;
      content: string;
      url?: string;
    }>,
  ): Promise<WeChatSendResult[]> {
    const results: WeChatSendResult[] = [];

    // 分批处理
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (msg) => {
          try {
            const messageId = await this.sendTemplateMessage(
              msg.openId,
              msg.type,
              msg.title,
              msg.content,
              msg.url,
            );

            return {
              messageId,
              status: 'sent' as const,
              cost: 0, // 微信模板消息免费
            };
          } catch (error) {
            return {
              messageId: '',
              status: 'failed' as const,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        }),
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            messageId: '',
            status: 'failed',
            error: result.reason.message || 'Unknown error',
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
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 检查缓存的token是否有效
    if (
      this.config.accessToken &&
      this.config.accessTokenExpiresAt &&
      this.config.accessTokenExpiresAt > new Date()
    ) {
      return this.config.accessToken;
    }

    try {
      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.config.appId}&secret=${this.config.appSecret}`,
      );

      if (response.data.access_token) {
        this.config.accessToken = response.data.access_token;
        this.config.accessTokenExpiresAt = new Date(
          Date.now() + response.data.expires_in * 1000 - 60000,
        ); // 提前1分钟过期
        return this.config.accessToken;
      } else {
        throw new Error(`Failed to get access token: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('Failed to get WeChat access token:', error);
      throw error;
    }
  }

  /**
   * 获取模板ID
   */
  private async getTemplateId(type: string): Promise<string> {
    const templateMap: Record<string, string> = {
      CHECK_IN_REMINDER:
        process.env.WECHAT_TEMPLATE_CHECK_IN || 'TEMPLATE_CHECK_IN_ID',
      TASK_NOTIFICATION: process.env.WECHAT_TEMPLATE_TASK || 'TEMPLATE_TASK_ID',
      EXPIRY_ALERT: process.env.WECHAT_TEMPLATE_EXPIRY || 'TEMPLATE_EXPIRY_ID',
      BUDGET_WARNING:
        process.env.WECHAT_TEMPLATE_BUDGET || 'TEMPLATE_BUDGET_ID',
      HEALTH_ALERT: process.env.WECHAT_TEMPLATE_HEALTH || 'TEMPLATE_HEALTH_ID',
      GOAL_ACHIEVEMENT: process.env.WECHAT_TEMPLATE_GOAL || 'TEMPLATE_GOAL_ID',
      FAMILY_ACTIVITY:
        process.env.WECHAT_TEMPLATE_FAMILY || 'TEMPLATE_FAMILY_ID',
      SYSTEM_ANNOUNCEMENT:
        process.env.WECHAT_TEMPLATE_SYSTEM || 'TEMPLATE_SYSTEM_ID',
      MARKETING:
        process.env.WECHAT_TEMPLATE_MARKETING || 'TEMPLATE_MARKETING_ID',
      OTHER: process.env.WECHAT_TEMPLATE_OTHER || 'TEMPLATE_OTHER_ID',
    };

    const templateId = templateMap[type];
    if (!templateId) {
      throw new Error(`Template ID not found for type: ${type}`);
    }

    return templateId;
  }

  /**
   * 格式化模板数据
   */
  private formatTemplateData(
    title: string,
    content: string,
  ): Record<string, { value: string; color?: string }> {
    return {
      first: {
        value: title,
        color: '#173177',
      },
      keyword1: {
        value: new Date().toLocaleString('zh-CN'),
        color: '#173177',
      },
      keyword2: {
        value: '健康管家',
        color: '#173177',
      },
      remark: {
        value: content,
        color: '#173177',
      },
    };
  }

  /**
   * 验证服务器签名
   */
  verifySignature(
    signature: string,
    timestamp: string,
    nonce: string,
  ): boolean {
    if (!this.config.token) {
      return false;
    }

    const token = this.config.token;
    const tmpStr = [token, timestamp, nonce].sort().join('');
    const hash = crypto.createHash('sha1').update(tmpStr).digest('hex');

    return hash === signature;
  }

  /**
   * 解密微信消息
   */
  decryptMessage(
    encryptedMsg: string,
    msgSignature: string,
    timestamp: string,
    nonce: string,
  ): any {
    if (!this.config.encodingAESKey) {
      throw new Error('Encoding AES key not configured');
    }

    // 验证签名
    const token = this.config.token || '';
    const tmpStr = [token, timestamp, nonce, encryptedMsg].sort().join('');
    const hash = crypto.createHash('sha1').update(tmpStr).digest('hex');

    if (hash !== msgSignature) {
      throw new Error('Invalid message signature');
    }

    // 解密消息（这里需要实现微信消息解密算法）
    // 暂时返回模拟数据
    return {
      content: 'Decrypted message content',
      fromUser: 'test_openid',
      createTime: timestamp,
      msgType: 'text',
    };
  }

  /**
   * 加密回复消息
   */
  encryptReplyMessage(message: string, nonce: string): string {
    if (!this.config.encodingAESKey) {
      throw new Error('Encoding AES key not configured');
    }

    // 这里需要实现微信消息加密算法
    // 暂时返回模拟数据
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const encrypted = `encrypted_${message}_${nonce}_${timestamp}`;

    return encrypted;
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openId: string): Promise<{
    openid: string;
    nickname: string;
    sex: number;
    province: string;
    city: string;
    country: string;
    headimgurl: string;
    privilege: string[];
    unionid?: string;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openId}&lang=zh_CN`,
      );

      if (response.data.errcode === 0) {
        return response.data;
      } else {
        throw new Error(`Failed to get user info: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('Failed to get WeChat user info:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否订阅
   */
  async checkSubscription(openId: string): Promise<boolean> {
    try {
      const userInfo = await this.getUserInfo(openId);
      // 关注状态：1表示关注，0表示未关注
      return userInfo.subscribe === 1;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
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
   * 获取默认配置
   */
  private getDefaultConfig(): WeChatConfig {
    return {
      appId: process.env.WECHAT_APP_ID || '',
      appSecret: process.env.WECHAT_APP_SECRET || '',
      token: process.env.WECHAT_TOKEN,
      encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
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
  reconfigure(config: WeChatConfig): void {
    this.config = config;
    this.validateConfig();
  }

  /**
   * 检查服务状态
   */
  async getStatus(): Promise<{
    isConfigured: boolean;
    hasValidToken: boolean;
    apiAccessible: boolean;
  }> {
    const status = {
      isConfigured: this.isConfigured,
      hasValidToken: false,
      apiAccessible: false,
    };

    if (!this.isConfigured) {
      return status;
    }

    try {
      const token = await this.getAccessToken();
      status.hasValidToken = !!token;

      // 测试API访问
      await axios.get(
        `https://api.weixin.qq.com/cgi-bin/getcallbackip?access_token=${token}`,
      );
      status.apiAccessible = true;
    } catch (error) {
      console.error('WeChat service status check failed:', error);
    }

    return status;
  }

  /**
   * 创建菜单
   */
  async createMenu(menu: any): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`,
        menu,
      );

      if (response.data.errcode !== 0) {
        throw new Error(`Failed to create menu: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('Failed to create WeChat menu:', error);
      throw error;
    }
  }

  /**
   * 获取菜单
   */
  async getMenu(): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/menu/get?access_token=${accessToken}`,
      );

      if (response.data.errcode === 0) {
        return response.data.menu;
      } else {
        throw new Error(`Failed to get menu: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('Failed to get WeChat menu:', error);
      throw error;
    }
  }

  /**
   * 删除菜单
   */
  async deleteMenu(): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${accessToken}`,
      );

      if (response.data.errcode !== 0) {
        throw new Error(`Failed to delete menu: ${response.data.errmsg}`);
      }
    } catch (error) {
      console.error('Failed to delete WeChat menu:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const wechatService = new WeChatService();
