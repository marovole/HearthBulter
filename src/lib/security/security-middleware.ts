/**
 * 安全防护中间件
 * 提供SQL注入、XSS、CSRF防护和安全审计
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APIError, createErrorResponse } from '@/lib/errors/api-error';
import { logger } from '@/lib/logger';

export interface SecurityOptions {
  // SQL注入防护
  preventSQLInjection?: boolean;
  customSQLPatterns?: RegExp[];

  // XSS防护
  preventXSS?: boolean;
  allowedHTMLTags?: string[];

  // CSRF防护
  preventCSRF?: boolean;
  csrfTokenExpiry?: number;

  // 频率限制
  enableRateLimit?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
    identifier: 'ip' | 'userId' | 'session';
  };

  // 安全审计
  enableAudit?: boolean;
  auditLevel?: 'basic' | 'detailed';
}

export interface SecurityCheckResult {
  safe: boolean;
  threats?: string[];
  sanitized?: any;
  audit?: SecurityAudit;
}

export interface SecurityAudit {
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  threats: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
}

/**
 * SQL注入检测
 */
export class SQLInjectionDetector {
  private static patterns = [
    // 基础SQL注入模式
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    // 注释符号
    /(--|#|\/\*|\*\/)/,
    // 引号逃逸
    /('|\"|`|\\)/,
    // 数字模式
    /\d+\s*(=|<|>|!=|<>|<=|>=|LIKE|IN|IS)/i,
    // 函数调用
    /\b(CAST|CONVERT|CHAR|ASCII|ORD|SUBSTRING|LEN|LENGTH)\s*\(/i,
    // 延迟攻击
    /\b(WAITFOR|SLEEP|BENCHMARK|PG_SLEEP)\s*\(/i,
    // 条件语句
    /\b(IF|CASE|WHEN|THEN|ELSE|END|OR|AND)\b/i,
    // 存储过程
    /\b(EXEC|SP_EXECUTESQL|EXECUTE)\b/i,
  ];

  static detect(input: string): { detected: boolean; pattern?: string } {
    for (const pattern of this.patterns) {
      if (pattern.test(input)) {
        return { detected: true, pattern: pattern.source };
      }
    }
    return { detected: false };
  }

  static sanitize(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = this.sanitizeString(key);

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = this.sanitize(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  private static sanitizeString(str: any): string {
    if (typeof str !== 'string') {
      return str;
    }

    // 移除SQL注入字符
    return str
      .replace(/['"`;\\]/g, '')
      .replace(
        /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi,
        '',
      )
      .replace(/--|\/\*|\*\/|#/g, '')
      .trim();
  }
}

/**
 * XSS检测和防护
 */
export class XSSDetector {
  private static dangerousPatterns = [
    // 脚本标签
    /<script[^>]*>.*?<\/script>/gi,
    // 事件处理器
    /on\w+\s*=\s*["'][^"']*["']/gi,
    // JavaScript协议
    /javascript:\s*/gi,
    // 表达式
    /expression\s*\(/gi,
    // 链接样式
    /@import\s*["'][^"']*["']/gi,
    // VB脚本
    /vbscript:\s*/gi,
    // 数据URI
    /data:\s*(text|application)\/\w+/gi,
  ];

  static detect(input: string): { detected: boolean; pattern?: string } {
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(input)) {
        return { detected: true, pattern: pattern.source };
      }
    }
    return { detected: false };
  }

  static sanitize(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static sanitizeString(str: any): string {
    if (typeof str !== 'string') {
      return str;
    }

    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }
}

/**
 * CSRF令牌管理
 */
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>();
  private static tokenExpiry = 60 * 60 * 1000; // 1小时

  static generateToken(sessionId: string): string {
    const token = Buffer.from(
      `${sessionId}:${Date.now()}:${Math.random()}`,
    ).toString('base64');

    this.tokens.set(sessionId, {
      token,
      expires: Date.now() + this.tokenExpiry,
    });

    this.cleanExpiredTokens();
    return token;
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);

    if (!stored || stored.token !== token) {
      return false;
    }

    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }

    return true;
  }

  private static cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, data] of this.tokens.entries()) {
      if (now > data.expires) {
        this.tokens.delete(sessionId);
      }
    }
  }
}

/**
 * 请求频率限制
 */
export class RateLimiter {
  private static requests = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private static defaultLimit = {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 60, // 60次请求
  };

  static checkLimit(
    identifier: string,
    limit?: { windowMs: number; maxRequests: number },
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const config = limit || this.defaultLimit;
    const now = Date.now();
    const record = this.requests.get(identifier);

    // 创建新记录或重置过期记录
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      this.cleanExpiredRecords();

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // 检查限制
    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // 增加计数
    record.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  private static cleanExpiredRecords(): void {
    const now = Date.now();
    for (const [identifier, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(identifier);
      }
    }
  }
}

/**
 * 安全中间件类
 */
export class SecurityMiddleware {
  private static instance: SecurityMiddleware;

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  async checkSecurity(
    request: NextRequest,
    options: SecurityOptions = {},
  ): Promise<SecurityCheckResult> {
    const startTime = Date.now();
    const audit: SecurityAudit = {
      timestamp: new Date(),
      ip: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      url: request.url,
      method: request.method,
      threats: [],
      severity: 'low',
      blocked: false,
    };

    try {
      const threats: string[] = [];
      let sanitized = null;

      // 1. SQL注入防护
      if (options.preventSQLInjection !== false) {
        const sqlResult = await this.checkSQLInjection(
          request,
          options.customSQLPatterns,
        );
        if (sqlResult.threats.length > 0) {
          threats.push(...sqlResult.threats);
          audit.threats.push(...sqlResult.threats);
        }
        sanitized = sqlResult.sanitized;
      }

      // 2. XSS防护
      if (options.preventXSS !== false) {
        const xssResult = await this.checkXSS(request);
        if (xssResult.threats.length > 0) {
          threats.push(...xssResult.threats);
          audit.threats.push(...xssResult.threats);
        }
        sanitized = sanitized || xssResult.sanitized;
      }

      // 3. CSRF防护
      if (options.preventCSRF) {
        const csrfResult = await this.checkCSRF(
          request,
          options.csrfTokenExpiry,
        );
        if (!csrfResult.valid) {
          threats.push('CSRF Token Invalid');
          audit.threats.push('CSRF Token Invalid');
        }
      }

      // 4. 频率限制
      if (options.enableRateLimit && options.rateLimit) {
        const rateLimitResult = await this.checkRateLimit(
          request,
          options.rateLimit,
        );
        if (!rateLimitResult.allowed) {
          threats.push('Rate Limit Exceeded');
          audit.threats.push('Rate Limit Exceeded');
        }
      }

      // 计算威胁严重程度
      if (threats.length > 0) {
        audit.severity = this.calculateSeverity(threats, audit);
        audit.blocked =
          audit.severity === 'critical' || audit.severity === 'high';
        audit.threats = threats;
      }

      // 记录审计日志
      if (
        options.enableAudit &&
        (audit.threats.length > 0 || audit.severity !== 'low')
      ) {
        await this.logSecurityAudit(audit, options.auditLevel);
      }

      const duration = Date.now() - startTime;

      return {
        safe: threats.length === 0 || !audit.blocked,
        threats: threats.length > 0 ? threats : undefined,
        sanitized,
        audit,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('安全检查异常', {
        error: error instanceof Error ? error.message : String(error),
        duration,
        url: request.url,
        method: request.method,
        ip: audit.ip,
      });

      return {
        safe: false,
        threats: ['Security Check Failed'],
        audit,
      };
    }
  }

  /**
   * 检查SQL注入
   */
  private async checkSQLInjection(
    request: NextRequest,
    customPatterns?: RegExp[],
  ): Promise<{ threats: string[]; sanitized?: any }> {
    const threats: string[] = [];
    const combinedPatterns = [
      ...SQLInjectionDetector.patterns,
      ...(customPatterns || []),
    ];

    // 检查查询参数
    const { searchParams } = new URL(request.url);
    for (const [key, value] of searchParams) {
      for (const pattern of combinedPatterns) {
        if (pattern.test(value)) {
          threats.push(`SQL Injection in query param: ${key}`);
          break;
        }
      }
    }

    // 检查请求体
    if (request.headers.get('content-type')?.includes('json')) {
      try {
        const body = await request.json();
        const sanitized = SQLInjectionDetector.sanitize(body);
        return { threats, sanitized };
      } catch {
        // 忽略JSON解析错误
      }
    }

    return { threats };
  }

  /**
   * 检查XSS攻击
   */
  private async checkXSS(
    request: NextRequest,
  ): Promise<{ threats: string[]; sanitized?: any }> {
    const threats: string[] = [];

    // 检查查询参数
    const { searchParams } = new URL(request.url);
    for (const [key, value] of searchParams) {
      const xssCheck = XSSDetector.detect(value);
      if (xssCheck.detected) {
        threats.push(`XSS in query param: ${key}`);
      }
    }

    // 检查请求体
    if (request.headers.get('content-type')?.includes('json')) {
      try {
        const body = await request.json();
        const sanitized = XSSDetector.sanitize(body);
        return { threats, sanitized };
      } catch {
        // 忽略JSON解析错误
      }
    }

    return { threats };
  }

  /**
   * 检查CSRF令牌
   */
  private async checkCSRF(
    request: NextRequest,
    tokenExpiry?: number,
  ): Promise<{ valid: boolean }> {
    const sessionId = request.headers.get('x-session-id');
    const csrfToken = request.headers.get('x-csrf-token');

    if (!sessionId || !csrfToken) {
      return { valid: false };
    }

    return {
      valid: CSRFProtection.validateToken(sessionId, csrfToken),
    };
  }

  /**
   * 检查频率限制
   */
  private async checkRateLimit(
    request: NextRequest,
    rateLimit: {
      windowMs: number;
      maxRequests: number;
      identifier: 'ip' | 'userId' | 'session';
    },
  ): Promise<{ allowed: boolean }> {
    let identifier: string;

    switch (rateLimit.identifier) {
      case 'ip':
        identifier = this.getClientIP(request);
        break;
      case 'session':
        identifier = request.headers.get('x-session-id') || 'unknown';
        break;
      case 'userId':
        identifier = request.headers.get('x-user-id') || 'unknown';
        break;
      default:
        identifier = this.getClientIP(request);
    }

    const result = RateLimiter.checkLimit(identifier, {
      windowMs: rateLimit.windowMs,
      maxRequests: rateLimit.maxRequests,
    });

    return { allowed: result.allowed };
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(request: NextRequest): string {
    return (
      (
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
      )
        ?.split(',')[0]
        ?.trim() || '127.0.0.1'
    );
  }

  /**
   * 计算威胁严重程度
   */
  private calculateSeverity(
    threats: string[],
    audit: SecurityAudit,
  ): SecurityAudit['severity'] {
    const criticalThreats = ['SQL Injection', 'Rate Limit Exceeded'];
    const highThreats = ['CSRF Token Invalid', 'XSS Attack'];

    if (
      threats.some((threat) =>
        criticalThreats.some((ct) => threat.includes(ct)),
      )
    ) {
      return 'critical';
    }

    if (
      threats.some((threat) => highThreats.some((ht) => threat.includes(ht)))
    ) {
      return 'high';
    }

    if (threats.length > 3) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 记录安全审计日志
   */
  private async logSecurityAudit(
    audit: SecurityAudit,
    level: 'basic' | 'detailed' = 'basic',
  ): Promise<void> {
    if (audit.blocked) {
      logger.error('安全威胁已拦截', {
        ip: audit.ip,
        url: audit.url,
        method: audit.method,
        threats: audit.threats,
        severity: audit.severity,
        userAgent: audit.userAgent,
      });
    } else {
      logger.warn('安全威胁检测', {
        ip: audit.ip,
        url: audit.url,
        method: audit.method,
        threats: audit.threats,
        severity: audit.severity,
      });
    }
  }
}

// 导出单例实例
export const securityMiddleware = SecurityMiddleware.getInstance();

// 导出便捷方法
export const checkSecurity = (
  request: NextRequest,
  options?: SecurityOptions,
) => securityMiddleware.checkSecurity(request, options);

// 默认安全配置
export const defaultSecurityOptions: SecurityOptions = {
  preventSQLInjection: true,
  preventXSS: true,
  preventCSRF: false, // API通常不需要CSRF
  enableRateLimit: true,
  rateLimit: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100, // 100次请求
    identifier: 'ip',
  },
  enableAudit: true,
  auditLevel: 'detailed',
};

// 创建安全高阶函数
export function withSecurity(
  options: SecurityOptions = defaultSecurityOptions,
  handler: (
    request: NextRequest,
    context: { sanitized?: any; audit?: SecurityAudit },
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> },
  ) => {
    const securityResult = await checkSecurity(request, options);

    if (!securityResult.safe) {
      const error = APIError.badRequest('安全检查失败', {
        threats: securityResult.threats,
        blocked: securityResult.audit?.blocked,
      });
      return createErrorResponse(error);
    }

    return handler(request, {
      sanitized: securityResult.sanitized,
      audit: securityResult.audit,
    });
  };
}
