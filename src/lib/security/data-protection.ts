import crypto from 'crypto';
import { logger } from '@/lib/logging/structured-logger';
import { securityAudit } from './security-audit';

// 数据分类
export enum DataClassification {
  PUBLIC = 'public',           // 公开数据
  INTERNAL = 'internal',       // 内部数据
  CONFIDENTIAL = 'confidential', // 机密数据
  RESTRICTED = 'restricted',   // 限制数据
}

// 敏感数据类型
export enum SensitiveDataType {
  PERSONAL_INFO = 'personal_info',         // 个人信息
  HEALTH_DATA = 'health_data',             // 健康数据
  FINANCIAL_INFO = 'financial_info',       // 财务信息
  AUTH_CREDENTIALS = 'auth_credentials',   // 认证凭据
  CONTACT_INFO = 'contact_info',           // 联系信息
  LOCATION_DATA = 'location_data',         // 位置数据
}

// 加密配置
interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  tagSize: number;
  keyRotationDays: number;
}

// 数据脱敏配置
interface MaskingConfig {
  type: 'partial' | 'full' | 'hash' | 'tokenize';
  visibleChars: number;
  maskChar: string;
  preserveFormat: boolean;
}

// 数据保留策略
interface RetentionPolicy {
  classification: DataClassification;
  maxAgeDays: number;
  autoDelete: boolean;
  archivalLocation?: string;
}

// 加密结果
interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag?: string;
  keyId: string;
  algorithm: string;
}

/**
 * 数据保护管理器
 */
export class DataProtectionManager {
  private static instance: DataProtectionManager;
  private encryptionKey: Buffer;
  private keyId: string;
  private keyRotationDate: Date;
  private retentionPolicies: Map<DataClassification, RetentionPolicy> = new Map();

  private constructor() {
    this.initializeEncryption();
    this.setupRetentionPolicies();
    this.startKeyRotation();
  }

  static getInstance(): DataProtectionManager {
    if (!DataProtectionManager.instance) {
      DataProtectionManager.instance = new DataProtectionManager();
    }
    return DataProtectionManager.instance;
  }

  /**
   * 初始化加密
   */
  private initializeEncryption(): void {
    try {
      const keyString = process.env.ENCRYPTION_KEY;
      if (!keyString) {
        throw new Error('ENCRYPTION_KEY环境变量未设置');
      }

      this.encryptionKey = Buffer.from(keyString, 'base64');
      this.keyId = this.generateKeyId();
      this.keyRotationDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90天后

      logger.info('数据保护加密初始化完成', {
        type: 'data_protection',
        keyId: this.keyId,
        algorithm: 'aes-256-gcm',
        keyRotationDate: this.keyRotationDate,
      });

    } catch (error) {
      logger.error('数据保护加密初始化失败', error as Error, {
        type: 'data_protection',
      });
      throw error;
    }
  }

  /**
   * 设置保留策略
   */
  private setupRetentionPolicies(): void {
    const policies: RetentionPolicy[] = [
      {
        classification: DataClassification.PUBLIC,
        maxAgeDays: -1, // 永久保留
        autoDelete: false,
      },
      {
        classification: DataClassification.INTERNAL,
        maxAgeDays: 2555, // 7年
        autoDelete: true,
        archivalLocation: 'cold_storage',
      },
      {
        classification: DataClassification.CONFIDENTIAL,
        maxAgeDays: 1825, // 5年
        autoDelete: true,
        archivalLocation: 'secure_archive',
      },
      {
        classification: DataClassification.RESTRICTED,
        maxAgeDays: 1095, // 3年
        autoDelete: true,
        archivalLocation: 'secure_archive',
      },
    ];

    policies.forEach(policy => {
      this.retentionPolicies.set(policy.classification, policy);
    });

    logger.info('数据保留策略已设置', {
      type: 'data_protection',
      policiesCount: policies.length,
    });
  }

  /**
   * 启动密钥轮换
   */
  private startKeyRotation(): void {
    // 每天检查一次是否需要轮换密钥
    setInterval(() => {
      if (new Date() > this.keyRotationDate) {
        this.rotateKey();
      }
    }, 24 * 60 * 60 * 1000); // 每天检查
  }

  /**
   * 轮换密钥
   */
  private async rotateKey(): Promise<void> {
    try {
      logger.info('开始密钥轮换', {
        type: 'data_protection',
        oldKeyId: this.keyId,
      });

      // 生成新密钥
      const newKey = crypto.randomBytes(32);
      const newKeyId = this.generateKeyId();

      // 这里应该实现密钥轮换逻辑
      // 1. 保存新密钥
      // 2. 重新加密现有数据
      // 3. 更新密钥引用
      // 4. 删除旧密钥

      this.encryptionKey = newKey;
      this.keyId = newKeyId;
      this.keyRotationDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      logger.info('密钥轮换完成', {
        type: 'data_protection',
        newKeyId: this.keyId,
        nextRotation: this.keyRotationDate,
      });

      securityAudit.logEvent({
        type: 'configuration_change' as any,
        severity: 'medium' as any,
        title: '加密密钥轮换',
        description: `成功轮换加密密钥，新密钥ID: ${this.keyId}`,
        outcome: 'success',
        metadata: {
          oldKeyId: this.keyId,
          newKeyId: this.keyId,
          rotationDate: new Date(),
        },
      });

    } catch (error) {
      logger.error('密钥轮换失败', error as Error, {
        type: 'data_protection',
      });

      securityAudit.logSecurityViolation(
        '密钥轮换失败',
        `加密密钥轮换过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        'high',
        {
          keyId: this.keyId,
          error: error instanceof Error ? error.message : '未知错误',
        }
      );
    }
  }

  /**
   * 生成密钥ID
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * 加密数据
   */
  encrypt(plaintext: string, associatedData?: string): EncryptionResult {
    try {
      const iv = crypto.randomBytes(12); // GCM推荐的IV大小
      const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
      cipher.setAAD(Buffer.from(associatedData || ''));

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const tag = cipher.getAuthTag();

      const result: EncryptionResult = {
        encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyId: this.keyId,
        algorithm: 'aes-256-gcm',
      };

      logger.debug('数据加密完成', {
        type: 'data_protection',
        keyId: this.keyId,
        dataLength: plaintext.length,
        associatedData: !!associatedData,
      });

      return result;

    } catch (error) {
      logger.error('数据加密失败', error as Error, {
        type: 'data_protection',
      });

      throw new Error(`加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解密数据
   */
  decrypt(encryptedData: EncryptionResult, associatedData?: string): string {
    try {
      // 检查密钥ID
      if (encryptedData.keyId !== this.keyId) {
        logger.warn('使用旧密钥解密数据', {
          type: 'data_protection',
          expectedKeyId: this.keyId,
          providedKeyId: encryptedData.keyId,
        });
      }

      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag || '', 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAAD(Buffer.from(associatedData || ''));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('数据解密完成', {
        type: 'data_protection',
        keyId: encryptedData.keyId,
        dataLength: decrypted.length,
        associatedData: !!associatedData,
      });

      return decrypted;

    } catch (error) {
      logger.error('数据解密失败', error as Error, {
        type: 'data_protection',
        keyId: encryptedData.keyId,
      });

      securityAudit.logSecurityViolation(
        '数据解密失败',
        `解密数据时发生错误，可能存在数据篡改: ${error instanceof Error ? error.message : '未知错误'}`,
        'high',
        {
          keyId: encryptedData.keyId,
          error: error instanceof Error ? error.message : '未知错误',
        }
      );

      throw new Error(`解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 脱敏数据
   */
  maskSensitiveData(data: string, dataType: SensitiveDataType, config?: Partial<MaskingConfig>): string {
    try {
      const maskingConfig: MaskingConfig = {
        type: 'partial',
        visibleChars: 4,
        maskChar: '*',
        preserveFormat: true,
        ...config,
      };

      let masked: string;

      switch (maskingConfig.type) {
      case 'partial':
        masked = this.partialMask(data, maskingConfig);
        break;
      case 'full':
        masked = maskingConfig.maskChar.repeat(data.length);
        break;
      case 'hash':
        masked = crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
        break;
      case 'tokenize':
        masked = this.tokenizeData(data, dataType);
        break;
      default:
        masked = this.partialMask(data, maskingConfig);
      }

      logger.debug('数据脱敏完成', {
        type: 'data_protection',
        dataType,
        maskingType: maskingConfig.type,
        originalLength: data.length,
      });

      return masked;

    } catch (error) {
      logger.error('数据脱敏失败', error as Error, {
        type: 'data_protection',
        dataType,
      });

      // 脱敏失败时返回完全掩码
      return '*'.repeat(data.length);
    }
  }

  /**
   * 部分脱敏
   */
  private partialMask(data: string, config: MaskingConfig): string {
    if (data.length <= config.visibleChars) {
      return config.maskChar.repeat(data.length);
    }

    const start = data.substring(0, config.visibleChars);
    const end = config.visibleChars > 0 ? data.substring(data.length - config.visibleChars) : '';
    const middle = config.maskChar.repeat(Math.max(1, data.length - config.visibleChars * 2));

    return config.preserveFormat ? `${start}${middle}${end}` : middle;
  }

  /**
   * 令牌化数据
   */
  private tokenizeData(data: string, dataType: SensitiveDataType): string {
    const hmac = crypto.createHmac('sha256', this.encryptionKey);
    hmac.update(`${dataType}:${data}`);
    return `token_${hmac.digest('hex').substring(0, 16)}`;
  }

  /**
   * 分类数据
   */
  classifyData(data: any, context?: Record<string, any>): DataClassification {
    // 根据数据内容和上下文进行分类
    if (this.isPublicData(data, context)) {
      return DataClassification.PUBLIC;
    }

    if (this.isRestrictedData(data, context)) {
      return DataClassification.RESTRICTED;
    }

    if (this.isConfidentialData(data, context)) {
      return DataClassification.CONFIDENTIAL;
    }

    return DataClassification.INTERNAL;
  }

  /**
   * 检查是否为公开数据
   */
  private isPublicData(data: any, context?: Record<string, any>): boolean {
    // 公开数据的判断逻辑
    const publicFields = ['name', 'description', 'category', 'createdAt'];
    const hasOnlyPublicFields = Object.keys(data).every(key => publicFields.includes(key));

    return hasOnlyPublicFields && !this.containsSensitiveData(data);
  }

  /**
   * 检查是否为限制数据
   */
  private isRestrictedData(data: any, context?: Record<string, any>): boolean {
    // 限制数据的判断逻辑
    const restrictedPatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /ssn/i,
      /credit.*card/i,
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return restrictedPatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * 检查是否为机密数据
   */
  private isConfidentialData(data: any, context?: Record<string, any>): boolean {
    // 机密数据的判断逻辑
    const confidentialFields = ['email', 'phone', 'address', 'health', 'medical'];
    const hasConfidentialFields = Object.keys(data).some(key =>
      confidentialFields.some(field => key.toLowerCase().includes(field))
    );

    return hasConfidentialFields || this.containsHealthData(data);
  }

  /**
   * 检查是否包含敏感数据
   */
  private containsSensitiveData(data: any): boolean {
    const sensitivePatterns = [
      /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/, // 信用卡号
      /\d{3}[-\s]?\d{2}[-\s]?\d{4}/, // SSN
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // 邮箱
    ];

    const dataString = JSON.stringify(data);
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * 检查是否包含健康数据
   */
  private containsHealthData(data: any): boolean {
    const healthKeywords = [
      'health', 'medical', 'condition', 'diagnosis', 'treatment',
      'medication', 'allergy', 'symptom', 'blood', 'pressure',
      'weight', 'height', 'calorie', 'nutrition', 'diet',
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return healthKeywords.some(keyword => dataString.includes(keyword));
  }

  /**
   * 应用数据保留策略
   */
  async applyRetentionPolicy(
    data: any,
    classification: DataClassification,
    createdAt: Date
  ): Promise<{
    shouldDelete: boolean;
    shouldArchive: boolean;
    action: 'keep' | 'archive' | 'delete';
    reason: string;
  }> {
    const policy = this.retentionPolicies.get(classification);
    if (!policy) {
      return {
        shouldDelete: false,
        shouldArchive: false,
        action: 'keep',
        reason: '无保留策略',
      };
    }

    const now = new Date();
    const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    if (policy.maxAgeDays > 0 && ageInDays > policy.maxAgeDays) {
      if (policy.autoDelete) {
        logger.info('数据自动删除', {
          type: 'data_protection',
          classification,
          ageInDays,
          maxAge: policy.maxAgeDays,
        });

        securityAudit.logEvent({
          type: 'data_modification' as any,
          severity: 'medium' as any,
          title: '数据自动删除',
          description: `根据保留策略删除${classification}类数据`,
          outcome: 'success',
          metadata: {
            classification,
            ageInDays,
            maxAge: policy.maxAgeDays,
          },
        });

        return {
          shouldDelete: true,
          shouldArchive: false,
          action: 'delete',
          reason: `超过保留期限 ${policy.maxAgeDays} 天`,
        };
      } else if (policy.archivalLocation) {
        logger.info('数据自动归档', {
          type: 'data_protection',
          classification,
          ageInDays,
          maxAge: policy.maxAgeDays,
          archivalLocation: policy.archivalLocation,
        });

        return {
          shouldDelete: false,
          shouldArchive: true,
          action: 'archive',
          reason: `超过保留期限，移至归档位置: ${policy.archivalLocation}`,
        };
      }
    }

    return {
      shouldDelete: false,
      shouldArchive: false,
      action: 'keep',
      reason: '在保留期限内',
    };
  }

  /**
   * 生成数据保护报告
   */
  generateDataProtectionReport(): {
    encryptionKeyId: string;
    keyRotationDate: Date;
    retentionPolicies: Array<{
      classification: DataClassification;
      maxAgeDays: number;
      autoDelete: boolean;
    }>;
    recommendations: string[];
    } {
    const recommendations = [
      '定期检查和更新数据分类规则',
      '监控加密密钥的使用情况',
      '审查数据保留策略的适用性',
      '实施定期的数据保护培训',
      '建立数据泄露响应计划',
    ];

    return {
      encryptionKeyId: this.keyId,
      keyRotationDate: this.keyRotationDate,
      retentionPolicies: Array.from(this.retentionPolicies.entries()).map(([classification, policy]) => ({
        classification,
        maxAgeDays: policy.maxAgeDays,
        autoDelete: policy.autoDelete,
      })),
      recommendations,
    };
  }

  /**
   * 获取加密配置
   */
  getEncryptionConfig(): EncryptionConfig {
    return {
      algorithm: 'aes-256-gcm',
      keySize: 256,
      ivSize: 12,
      tagSize: 16,
      keyRotationDays: 90,
    };
  }

  /**
   * 验证数据完整性
   */
  verifyIntegrity(data: string, signature: string): boolean {
    try {
      const hmac = crypto.createHmac('sha256', this.encryptionKey);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        securityAudit.logSecurityViolation(
          '数据完整性验证失败',
          '数据签名验证失败，可能存在数据篡改',
          'high',
          {
            dataLength: data.length,
            providedSignature: `${signature.substring(0, 16)}...`,
          }
        );
      }

      return isValid;

    } catch (error) {
      logger.error('数据完整性验证失败', error as Error, {
        type: 'data_protection',
      });

      return false;
    }
  }

  /**
   * 生成数据签名
   */
  generateSignature(data: string): string {
    const hmac = crypto.createHmac('sha256', this.encryptionKey);
    hmac.update(data);
    return hmac.digest('hex');
  }
}

// 创建单例实例
export const dataProtection = DataProtectionManager.getInstance();

// 导出便捷方法
export const encryptData = (data: string, associatedData?: string) => dataProtection.encrypt(data, associatedData);
export const decryptData = (encryptedData: any, associatedData?: string) => dataProtection.decrypt(encryptedData, associatedData);
export const maskData = (data: string, dataType: SensitiveDataType, config?: Partial<MaskingConfig>) =>
  dataProtection.maskSensitiveData(data, dataType, config);
export const classifyData = (data: any, context?: Record<string, any>) => dataProtection.classifyData(data, context);

export default dataProtection;
