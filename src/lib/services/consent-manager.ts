/**
 * 用户同意授权管理服务
 * 处理AI分析、数据处理等操作的用户同意流程
 */

import { supabaseAdapter } from '@/lib/db/supabase-adapter';

export interface ConsentType {
  id: string;
  name: string;
  description: string;
  required: boolean;
  category: 'data_processing' | 'ai_analysis' | 'health_sharing' | 'marketing' | 'research';
  version: string;
  content: {
    summary: string;
    details: string;
    risks?: string;
    benefits?: string;
  };
  validDays: number; // 同意有效期（天数），0表示一次性同意
}

// 数据库用户同意记录
export interface DBUserConsent {
  id: string;
  userId: string;
  consentId: string;
  granted: boolean;
  context?: any;
  ipAddress?: string;
  userAgent?: string;
  grantedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserConsent {
  consentId: string;
  userId: string;
  granted: boolean;
  grantedAt: Date;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  context?: Record<string, any>; // 同意时的上下文信息
}

export interface ConsentRequest {
  type: ConsentType;
  context?: Record<string, any>;
  forceRefresh?: boolean; // 强制重新获取同意，即使已有有效同意
}

export interface ConsentResult {
  granted: boolean;
  consent?: UserConsent;
  expired?: boolean;
  required: boolean;
}

class ConsentManagerService {
  private consentTypes: Map<string, ConsentType> = new Map();

  constructor() {
    this.initializeDefaultConsents();
  }

  /**
   * 初始化默认同意类型
   */
  private initializeDefaultConsents(): void {
    const defaultConsents: ConsentType[] = [
      {
        id: 'ai_health_analysis',
        name: 'AI健康数据分析同意',
        description: '同意使用AI技术分析您的健康数据以提供个性化建议',
        required: true,
        category: 'ai_analysis',
        version: '1.0',
        validDays: 365, // 一年有效
        content: {
          summary: '我们将使用AI技术分析您的健康数据，为您提供个性化的营养和健康建议。',
          details: `
            1. 数据处理：您的健康数据将被匿名化处理，仅用于AI分析
            2. AI分析：使用先进的AI模型分析您的健康状况和饮食习惯
            3. 建议生成：基于分析结果生成个性化健康建议
            4. 数据安全：所有数据传输和存储均采用加密技术保护
            5. 隐私保护：不会向第三方分享您的个人信息
          `,
          risks: 'AI分析可能存在一定误差，建议仅作为参考，不替代专业医疗诊断。',
          benefits: '获得个性化的健康建议，更好地管理饮食和健康状况。',
        },
      },
      {
        id: 'medical_data_processing',
        name: '医疗数据处理同意',
        description: '同意处理和分析您的医疗报告数据',
        required: true,
        category: 'data_processing',
        version: '1.0',
        validDays: 365,
        content: {
          summary: '我们将处理您的医疗报告，为您提供结构化的健康信息。',
          details: `
            1. 数据提取：从医疗报告中提取关键健康指标
            2. 数据结构化：将非结构化数据转换为结构化格式
            3. 隐私保护：敏感信息将被过滤和匿名化
            4. 存储安全：数据采用加密方式安全存储
          `,
          risks: '医疗数据处理过程中可能出现信息提取错误。',
          benefits: '获得清晰的健康数据视图，便于跟踪健康状况变化。',
        },
      },
      {
        id: 'health_data_sharing',
        name: '健康数据分享同意',
        description: '同意在家庭成员间分享健康数据（可选）',
        required: false,
        category: 'health_sharing',
        version: '1.0',
        validDays: 180, // 半年有效
        content: {
          summary: '允许在家庭成员间分享健康数据，便于家庭共同管理健康。',
          details: `
            1. 范围限制：仅在您授权的家庭成员间分享
            2. 数据控制：您可以随时查看、修改或撤销分享权限
            3. 隐私保护：分享的数据不包含敏感个人信息
            4. 目的明确：仅用于家庭健康管理和关怀
          `,
          benefits: '家庭成员可以相互关心健康状况，提供更好的支持。',
        },
      },
      {
        id: 'health_research_participation',
        name: '健康研究参与同意',
        description: '同意参与匿名健康数据研究（可选）',
        required: false,
        category: 'research',
        version: '1.0',
        validDays: 0, // 每次使用时都需要确认
        content: {
          summary: '参与匿名健康数据研究，帮助改进健康建议算法。',
          details: `
            1. 匿名处理：所有数据将被完全匿名化
            2. 研究目的：用于改进AI健康建议算法
            3. 数据范围：仅包含必要的健康指标数据
            4. 退出机制：您可以随时退出研究项目
          `,
          benefits: '帮助改进健康建议质量，为更多人提供更好的服务。',
        },
      },
    ];

    defaultConsents.forEach(consent => {
      this.consentTypes.set(consent.id, consent);
    });
  }

  /**
   * 请求用户同意
   */
  async requestConsent(
    userId: string,
    request: ConsentRequest,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<ConsentResult> {
    const consentType = request.type;
    const existingConsent = await this.getUserConsent(userId, consentType.id);

    // 检查是否已有有效同意
    if (existingConsent && !request.forceRefresh) {
      const isExpired = this.isConsentExpired(existingConsent);
      if (!isExpired) {
        return {
          granted: existingConsent.granted,
          consent: existingConsent,
          required: consentType.required,
        };
      }
    }

    // 需要用户重新同意
    return {
      granted: false,
      expired: !!existingConsent,
      required: consentType.required,
    };
  }

  /**
   * 授予同意
   */
  async grantConsent(
    userId: string,
    consentId: string,
    context?: Record<string, any>,
    clientInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserConsent> {
    const consentType = this.consentTypes.get(consentId);
    if (!consentType) {
      throw new Error(`Unknown consent type: ${consentId}`);
    }

    const consent: UserConsent = {
      consentId,
      userId,
      granted: true,
      grantedAt: new Date(),
      ipAddress: clientInfo?.ipAddress,
      userAgent: clientInfo?.userAgent,
      context,
    };

    // 设置过期时间
    if (consentType.validDays > 0) {
      consent.expiresAt = new Date();
      consent.expiresAt.setDate(consent.expiresAt.getDate() + consentType.validDays);
    }

    // 在实际应用中，这里会保存到数据库
    await this.saveUserConsent(consent);

    return consent;
  }

  /**
   * 撤销同意
   */
  async revokeConsent(userId: string, consentId: string): Promise<void> {
    // 在实际应用中，这里会从数据库删除或标记为撤销
    await this.deleteUserConsent(userId, consentId);
  }

  /**
   * 获取用户的同意记录
   */
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    // 在实际应用中，这里会从数据库查询
    // 这里返回模拟数据
    return [];
  }

  /**
   * 检查用户是否同意了特定类型的操作
   */
  async checkConsent(userId: string, consentId: string): Promise<boolean> {
    const consent = await this.getUserConsent(userId, consentId);
    if (!consent || !consent.granted) {
      return false;
    }

    return !this.isConsentExpired(consent);
  }

  /**
   * 批量检查同意
   */
  async checkMultipleConsents(userId: string, consentIds: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const consentId of consentIds) {
      results[consentId] = await this.checkConsent(userId, consentId);
    }

    return results;
  }

  /**
   * 获取同意类型
   */
  getConsentType(consentId: string): ConsentType | undefined {
    return this.consentTypes.get(consentId);
  }

  /**
   * 获取所有同意类型
   */
  getAllConsentTypes(): ConsentType[] {
    return Array.from(this.consentTypes.values());
  }

  /**
   * 获取特定类别的同意类型
   */
  getConsentTypesByCategory(category: ConsentType['category']): ConsentType[] {
    return Array.from(this.consentTypes.values()).filter(
      consent => consent.category === category
    );
  }

  /**
   * 检查同意是否过期
   */
  private isConsentExpired(consent: UserConsent): boolean {
    if (!consent.expiresAt) {
      return false; // 永久有效
    }
    return new Date() > consent.expiresAt;
  }

  /**
   * 获取用户同意（数据库操作）
   */
  private async getUserConsent(userId: string, consentId: string): Promise<UserConsent | null> {
    try {
      const dbConsent = await supabaseAdapter.userConsent.findUnique({
        where: {
          userId,
          consentId,
        },
      });

      if (!dbConsent) {
        return null;
      }

      // 转换数据库记录为UserConsent格式
      return {
        consentId: dbConsent.consentId,
        userId: dbConsent.userId,
        granted: dbConsent.granted,
        grantedAt: dbConsent.grantedAt,
        expiresAt: dbConsent.expiresAt,
        ipAddress: dbConsent.ipAddress,
        userAgent: dbConsent.userAgent,
        context: dbConsent.context,
      };
    } catch (error) {
      console.error('Failed to get user consent:', error);
      return null;
    }
  }

  /**
   * 保存用户同意（数据库操作）
   */
  private async saveUserConsent(consent: UserConsent): Promise<void> {
    try {
      await supabaseAdapter.userConsent.upsert({
        where: {
          userId: consent.userId,
          consentId: consent.consentId,
        },
        update: {
          granted: consent.granted,
          context: consent.context,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt,
        },
        create: {
          userId: consent.userId,
          consentId: consent.consentId,
          granted: consent.granted,
          context: consent.context,
          ipAddress: consent.ipAddress,
          userAgent: consent.userAgent,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt,
        },
      });
    } catch (error) {
      console.error('Failed to save user consent:', error);
      throw new Error('保存用户同意失败');
    }
  }

  /**
   * 删除用户同意（数据库操作）
   */
  private async deleteUserConsent(userId: string, consentId: string): Promise<void> {
    try {
      await supabaseAdapter.userConsent.delete({
        where: {
          userId,
          consentId,
        },
      });
    } catch (error) {
      console.error('Failed to delete user consent:', error);
      throw new Error('删除用户同意失败');
    }
  }
}

// 导出单例实例
export const consentManager = new ConsentManagerService();

// 导出工具函数
export async function requireConsent(
  userId: string,
  consentId: string,
  context?: Record<string, any>
): Promise<boolean> {
  const consentType = consentManager.getConsentType(consentId);
  if (!consentType) {
    throw new Error(`Unknown consent type: ${consentId}`);
  }

  const result = await consentManager.requestConsent(userId, {
    type: consentType,
    context,
  });

  return result.granted;
}

export async function grantUserConsent(
  userId: string,
  consentId: string,
  context?: Record<string, any>
): Promise<void> {
  await consentManager.grantConsent(userId, consentId, context);
}

export function getConsentType(consentId: string): ConsentType | undefined {
  return consentManager.getConsentType(consentId);
}
