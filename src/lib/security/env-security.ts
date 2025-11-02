import { logger } from '@/lib/logging/structured-logger';

// 敏感环境变量列表
const SENSITIVE_KEYS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'USDA_API_KEY',
  'OPENAI_API_KEY',
  'AWS_SECRET_ACCESS_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_PASSWORD',
  'ALERT_RECIPIENTS_CRITICAL',
  'ALERT_RECIPIENTS_ERROR',
  'SLACK_WEBHOOK_URL',
  'DINGTALK_WEBHOOK_URL',
  'ALERT_WEBHOOK_URL',
];

// 环境变量验证规则
interface EnvValidationRule {
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email';
  minLength?: number;
  pattern?: RegExp;
  description: string;
}

// 环境变量配置模式
interface EnvConfig {
  [key: string]: EnvValidationRule;
}

// 生产环境必需配置
const PRODUCTION_ENV_CONFIG: EnvConfig = {
  NODE_ENV: {
    required: true,
    type: 'string',
    description: '运行环境 (development, production, test)',
  },
  DATABASE_URL: {
    required: true,
    type: 'url',
    description: '数据库连接字符串',
  },
  NEXTAUTH_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    description: 'NextAuth.js 加密密钥',
  },
  NEXTAUTH_URL: {
    required: true,
    type: 'url',
    description: 'NextAuth.js 回调URL',
  },
  USDA_API_KEY: {
    required: true,
    type: 'string',
    minLength: 10,
    description: 'USDA API 密钥',
  },
  UPSTASH_REDIS_REST_URL: {
    required: true,
    type: 'url',
    description: 'Redis 缓存服务URL',
  },
  UPSTASH_REDIS_REST_TOKEN: {
    required: true,
    type: 'string',
    minLength: 10,
    description: 'Redis 认证令牌',
  },
};

// 环境变量安全管理器
export class EnvSecurityManager {
  private static instance: EnvSecurityManager;
  private validatedVars: Set<string> = new Set();
  private config: EnvConfig;

  private constructor() {
    this.config = this.getConfigForEnvironment();
    this.validateCriticalEnvVars();
  }

  static getInstance(): EnvSecurityManager {
    if (!EnvSecurityManager.instance) {
      EnvSecurityManager.instance = new EnvSecurityManager();
    }
    return EnvSecurityManager.instance;
  }

  /**
   * 获取当前环境对应的配置
   */
  private getConfigForEnvironment(): EnvConfig {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
      return PRODUCTION_ENV_CONFIG;
    }

    // 开发环境配置（更宽松）
    return {
      NODE_ENV: {
        required: true,
        type: 'string',
        description: '运行环境',
      },
      DATABASE_URL: {
        required: false,
        type: 'url',
        description: '数据库连接字符串（开发环境可选）',
      },
    };
  }

  /**
   * 验证关键环境变量
   */
  private validateCriticalEnvVars(): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, rule] of Object.entries(this.config)) {
      const value = process.env[key];

      try {
        this.validateEnvVar(key, value, rule);
        this.validatedVars.add(key);
      } catch (error) {
        if (rule.required) {
          errors.push(`必需的环境变量 ${key}: ${error.message}`);
        } else {
          warnings.push(`可选的环境变量 ${key}: ${error.message}`);
        }
      }
    }

    // 检查安全性问题
    this.checkSecurityIssues();

    // 记录验证结果
    if (errors.length > 0) {
      logger.error('环境变量验证失败', new Error(errors.join('; ')), {
        type: 'environment',
        errors,
        warnings,
      });

      // 生产环境下抛出异常
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`环境变量验证失败: ${errors.join('; ')}`);
      }
    } else if (warnings.length > 0) {
      logger.warn('环境变量验证警告', {
        type: 'environment',
        warnings,
      });
    } else {
      logger.info('环境变量验证通过', {
        type: 'environment',
        validatedVars: Array.from(this.validatedVars),
      });
    }
  }

  /**
   * 验证单个环境变量
   */
  private validateEnvVar(key: string, value: string | undefined, rule: EnvValidationRule): void {
    if (rule.required && (!value || value.trim() === '')) {
      throw new Error('必需但未设置或为空');
    }

    if (!value) {
      return; // 可选变量未设置，跳过其他验证
    }

    // 类型验证
    switch (rule.type) {
      case 'url':
        try {
          new URL(value);
        } catch {
          throw new Error('无效的URL格式');
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('无效的邮箱格式');
        }
        break;

      case 'number':
        if (isNaN(Number(value))) {
          throw new Error('无效的数字格式');
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          throw new Error('无效的布尔值格式 (应为 true/false, 1/0)');
        }
        break;
    }

    // 长度验证
    if (rule.minLength && value.length < rule.minLength) {
      throw new Error(`长度不足，最少需要 ${rule.minLength} 个字符`);
    }

    // 正则验证
    if (rule.pattern && !rule.pattern.test(value)) {
      throw new Error('格式不符合要求');
    }
  }

  /**
   * 检查安全性问题
   */
  private checkSecurityIssues(): void {
    const issues: string[] = [];

    // 检查弱密钥
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
      issues.push('NEXTAUTH_SECRET 长度不足，至少需要32个字符');
    }

    // 检查明文密码
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('password')) {
      const match = process.env.DATABASE_URL.match(/password=([^&;]+)/);
      if (match && match[1] === 'password') {
        issues.push('数据库使用了默认弱密码');
      }
    }

    // 检查不安全的协议
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('http://')) {
      issues.push('数据库连接使用了不安全的HTTP协议');
    }

    // 检查开发环境配置
    if (process.env.NODE_ENV === 'production') {
      const devPatterns = ['localhost', '127.0.0.1', 'dev', 'test'];
      for (const pattern of devPatterns) {
        if (process.env.DATABASE_URL?.includes(pattern)) {
          issues.push(`生产环境使用了开发环境配置: ${pattern}`);
          break;
        }
      }
    }

    if (issues.length > 0) {
      logger.warn('发现环境变量安全问题', {
        type: 'security',
        issues,
        severity: issues.length > 2 ? 'high' : 'medium',
      });
    }
  }

  /**
   * 获取环境变量（敏感信息脱敏）
   */
  get(key: string): string | undefined {
    const value = process.env[key];

    if (!value) {
      return undefined;
    }

    // 检查是否有权限访问
    if (SENSITIVE_KEYS.includes(key) && !this.hasAccessToSensitive(key)) {
      logger.warn('未授权访问敏感环境变量', {
        type: 'security',
        key,
        context: 'env_access',
      });
      return '***REDACTED***';
    }

    return value;
  }

  /**
   * 检查是否有权限访问敏感变量
   */
  private hasAccessToSensitive(key: string): boolean {
    // 在生产环境，只有特定的服务可以访问敏感变量
    if (process.env.NODE_ENV === 'production') {
      const allowedServices = ['api', 'auth', 'background'];
      const serviceName = process.env.SERVICE_NAME || 'unknown';
      return allowedServices.includes(serviceName);
    }

    // 开发环境允许访问
    return true;
  }

  /**
   * 获取脱敏后的环境变量信息
   */
  getMaskedEnvInfo(): Record<string, string> {
    const info: Record<string, string> = {};

    for (const key of Object.keys(process.env)) {
      if (SENSITIVE_KEYS.includes(key)) {
        info[key] = this.maskSensitiveValue(process.env[key] || '');
      } else {
        info[key] = process.env[key] || '';
      }
    }

    return info;
  }

  /**
   * 脱敏敏感值
   */
  private maskSensitiveValue(value: string): string {
    if (!value || value.length <= 4) {
      return '***';
    }

    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(Math.max(3, value.length - 4));

    return `${start}${middle}${end}`;
  }

  /**
   * 验证环境变量完整性
   */
  validateIntegrity(): boolean {
    try {
      this.validateCriticalEnvVars();
      return true;
    } catch (error) {
      logger.error('环境变量完整性验证失败', error as Error, {
        type: 'environment',
      });
      return false;
    }
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(): {
    totalVars: number;
    validatedVars: number;
    sensitiveVars: number;
    env: string;
    securityLevel: 'low' | 'medium' | 'high';
  } {
    const totalVars = Object.keys(process.env).length;
    const validatedVars = this.validatedVars.size;
    const sensitiveVars = SENSITIVE_KEYS.filter(key => process.env[key]).length;

    // 计算安全等级
    let securityLevel: 'low' | 'medium' | 'high' = 'low';
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
      if (validatedVars >= Object.keys(PRODUCTION_ENV_CONFIG).length) {
        securityLevel = 'high';
      } else {
        securityLevel = 'medium';
      }
    } else {
      securityLevel = 'medium';
    }

    return {
      totalVars,
      validatedVars,
      sensitiveVars,
      env,
      securityLevel,
    };
  }

  /**
   * 动态更新环境变量（仅限开发环境）
   */
  set(key: string, value: string): void {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('生产环境不允许动态更新环境变量', {
        type: 'security',
        key,
      });
      return;
    }

    process.env[key] = value;
    logger.info('环境变量已更新', {
      type: 'environment',
      key: SENSITIVE_KEYS.includes(key) ? this.maskSensitiveValue(key) : key,
    });
  }
}

// 创建单例实例
export const envSecurity = EnvSecurityManager.getInstance();

// 导出便捷方法
export const getEnv = (key: string) => envSecurity.get(key);
export const validateEnv = () => envSecurity.validateIntegrity();
export const getEnvInfo = () => envSecurity.getMaskedEnvInfo();

export default envSecurity;