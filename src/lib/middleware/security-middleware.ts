import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logging/structured-logger";

// 安全头配置
interface SecurityHeadersConfig {
  strictTransportSecurity?: {
    maxAge: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  contentSecurityPolicy?: {
    directives: Record<string, string[]>;
  };
  xFrameOptions?: "DENY" | "SAMEORIGIN" | "ALLOW-FROM";
  xContentTypeOptions?: boolean;
  xXssProtection?: boolean;
  referrerPolicy?:
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  permissionsPolicy?: Record<string, boolean>;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginOpenerPolicy?: boolean;
  crossOriginResourcePolicy?: "same-origin" | "same-site" | "cross-origin";
}

// 默认安全头配置
const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  strictTransportSecurity: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
      ],
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "connect-src": [
        "'self'",
        "https://api.nal.usda.gov",
        "https://*.upstash.io",
      ],
      "frame-src": ["'none'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
      "upgrade-insecure-requests": [],
    },
  },
  xFrameOptions: "DENY",
  xContentTypeOptions: true,
  xXssProtection: true,
  referrerPolicy: "strict-origin-when-cross-origin",
  permissionsPolicy: {
    camera: false,
    microphone: false,
    geolocation: false,
    payment: false,
    usb: false,
    magnetometer: false,
    gyroscope: false,
    accelerometer: false,
  },
  crossOriginEmbedderPolicy: false, // 根据实际需求启用
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: "same-origin",
};

// 开发环境配置（较宽松）
const DEVELOPMENT_SECURITY_CONFIG: SecurityHeadersConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  contentSecurityPolicy: {
    directives: {
      ...DEFAULT_SECURITY_CONFIG.contentSecurityPolicy!.directives,
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "ws:",
        "wss:",
      ],
      "connect-src": [
        "'self'",
        "https://api.nal.usda.gov",
        "https://*.upstash.io",
        "ws:",
        "wss:",
        "http://localhost:*",
        "https://localhost:*",
      ],
    },
  },
  strictTransportSecurity: undefined, // 开发环境不启用HSTS
};

// API 路由配置（更宽松）
const API_SECURITY_CONFIG: SecurityHeadersConfig = {
  ...DEFAULT_SECURITY_CONFIG,
  contentSecurityPolicy: undefined, // API路由不需要CSP
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
};

/**
 * 安全中间件类
 */
export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private config: SecurityHeadersConfig;

  private constructor() {
    this.config = this.getEnvironmentConfig();
  }

  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  /**
   * 获取环境对应的配置
   */
  private getEnvironmentConfig(): SecurityHeadersConfig {
    const env = process.env.NODE_ENV || "development";

    if (env === "development") {
      return DEVELOPMENT_SECURITY_CONFIG;
    }

    return DEFAULT_SECURITY_CONFIG;
  }

  /**
   * 生成CSP头字符串
   */
  private generateCSPHeader(directives: Record<string, string[]>): string {
    return Object.entries(directives)
      .map(([key, values]) => {
        const value = values.length > 0 ? values.join(" ") : "'none'";
        return `${key} ${value}`;
      })
      .join("; ");
  }

  /**
   * 应用安全头
   */
  applySecurityHeaders(
    request: NextRequest,
    response: NextResponse,
  ): NextResponse {
    const pathname = request.nextUrl.pathname;
    const isApiRoute = pathname.startsWith("/api/");
    const config = isApiRoute ? API_SECURITY_CONFIG : this.config;

    try {
      // Strict-Transport-Security (HSTS)
      if (
        config.strictTransportSecurity &&
        process.env.NODE_ENV === "production"
      ) {
        const hsts = config.strictTransportSecurity;
        let hstsValue = `max-age=${hsts.maxAge}`;

        if (hsts.includeSubDomains) {
          hstsValue += "; includeSubDomains";
        }

        if (hsts.preload) {
          hstsValue += "; preload";
        }

        response.headers.set("Strict-Transport-Security", hstsValue);
      }

      // Content-Security-Policy
      if (config.contentSecurityPolicy) {
        const cspValue = this.generateCSPHeader(
          config.contentSecurityPolicy.directives,
        );
        response.headers.set("Content-Security-Policy", cspValue);
      }

      // X-Frame-Options
      if (config.xFrameOptions) {
        response.headers.set("X-Frame-Options", config.xFrameOptions);
      }

      // X-Content-Type-Options
      if (config.xContentTypeOptions) {
        response.headers.set("X-Content-Type-Options", "nosniff");
      }

      // X-XSS-Protection
      if (config.xXssProtection) {
        response.headers.set("X-XSS-Protection", "1; mode=block");
      }

      // Referrer-Policy
      if (config.referrerPolicy) {
        response.headers.set("Referrer-Policy", config.referrerPolicy);
      }

      // Permissions-Policy
      if (config.permissionsPolicy) {
        const permissionsValue = Object.entries(config.permissionsPolicy)
          .filter(([_, enabled]) => enabled)
          .map(([feature]) => `${feature}=()`)
          .join(", ");

        if (permissionsValue) {
          response.headers.set("Permissions-Policy", permissionsValue);
        }
      }

      // Cross-Origin Embedder Policy
      if (config.crossOriginEmbedderPolicy) {
        response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      }

      // Cross-Origin Opener Policy
      if (config.crossOriginOpenerPolicy) {
        response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      }

      // Cross-Origin Resource Policy
      if (config.crossOriginResourcePolicy) {
        response.headers.set(
          "Cross-Origin-Resource-Policy",
          config.crossOriginResourcePolicy,
        );
      }

      // 额外的安全头
      response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
      response.headers.set("X-Download-Options", "noopen");
      response.headers.set("X-Robots-Tag", "noindex, nofollow");

      // 移除泄露服务器信息的头
      response.headers.delete("Server");
      response.headers.delete("X-Powered-By");

      // 记录安全头应用
      logger.debug("安全头已应用", {
        type: "security",
        pathname,
        headersCount: Array.from(response.headers.keys()).filter(
          (key) =>
            key.includes("Security") ||
            key.includes("X-") ||
            key.includes("Content-Security") ||
            key.includes("Permissions") ||
            key.includes("Cross-Origin"),
        ).length,
      });

      return response;
    } catch (error) {
      logger.error("应用安全头失败", error as Error, {
        type: "security",
        pathname,
      });

      // 确保基本安全头仍然被应用
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("X-Frame-Options", "DENY");

      return response;
    }
  }

  /**
   * 检查请求安全性
   */
  validateRequest(request: NextRequest): {
    safe: boolean;
    reasons: string[];
    riskLevel: "low" | "medium" | "high";
  } {
    const reasons: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    const origin = request.headers.get("origin") || "";
    const xForwardedFor = request.headers.get("x-forwarded-for") || "";
    const xRealIp = request.headers.get("x-real-ip") || "";

    // 检查可疑User-Agent
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      reasons.push("可疑的User-Agent");
      riskLevel = "medium";
    }

    // 检查异常的Referer
    if (referer && !this.isValidReferer(referer, request.url)) {
      reasons.push("异常的Referer头");
      riskLevel = "medium";
    }

    // 检查Origin头（对于API请求）
    if (
      request.nextUrl.pathname.startsWith("/api/") &&
      origin &&
      !this.isValidOrigin(origin)
    ) {
      reasons.push("无效的Origin头");
      riskLevel = "high";
    }

    // 检查IP地址
    const clientIp = xRealIp || xForwardedFor?.split(",")[0] || "unknown";
    if (this.isSuspiciousIp(clientIp)) {
      reasons.push("可疑的IP地址");
      riskLevel = "high";
    }

    // 检查请求方法
    const method = request.method;
    const allowedMethods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
    ];
    if (!allowedMethods.includes(method)) {
      reasons.push(`不支持的HTTP方法: ${method}`);
      riskLevel = "high";
    }

    // 检查请求大小（对于POST/PUT请求）
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      // 50MB
      reasons.push("请求体过大");
      riskLevel = "medium";
    }

    const safe = reasons.length === 0;

    if (!safe) {
      logger.warn("检测到可疑请求", {
        type: "security",
        url: request.url,
        method,
        userAgent,
        clientIp,
        reasons,
        riskLevel,
      });
    }

    return { safe, reasons, riskLevel };
  }

  /**
   * 验证Referer
   */
  private isValidReferer(referer: string, currentUrl: string): boolean {
    try {
      const refererUrl = new URL(referer);
      const currentHost = new URL(currentUrl).hostname;

      // 允许同源Referer
      if (refererUrl.hostname === currentHost) {
        return true;
      }

      // 允许的Referer白名单
      const allowedReferers = [
        "localhost",
        "127.0.0.1",
        process.env.NEXTAUTH_URL?.split("/")[2],
      ].filter(Boolean);

      return allowedReferers.some((allowed) =>
        refererUrl.hostname.includes(allowed),
      );
    } catch {
      return false;
    }
  }

  /**
   * 验证Origin
   */
  private isValidOrigin(origin: string): boolean {
    try {
      const originUrl = new URL(origin);
      const allowedOrigins = [
        "http://localhost:3000",
        "https://localhost:3000",
        process.env.NEXTAUTH_URL,
        process.env.ALLOWED_ORIGIN,
      ].filter(Boolean);

      return allowedOrigins.some((allowed) => {
        if (!allowed) return false;
        const allowedUrl = new URL(allowed);
        return allowedUrl.hostname === originUrl.hostname;
      });
    } catch {
      return false;
    }
  }

  /**
   * 检查是否为可疑IP
   */
  private isSuspiciousIp(ip: string): boolean {
    // 这里可以集成IP黑名单服务
    const suspiciousRanges = [
      "10.0.0.", // 示例：私有网络
      "192.168.", // 示例：私有网络
    ];

    return suspiciousRanges.some((range) => ip.startsWith(range));
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("安全头配置已更新", {
      type: "security",
    });
  }

  /**
   * 获取配置
   */
  getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }
}

// 创建单例实例
export const securityMiddleware = SecurityMiddleware.getInstance();

/**
 * Next.js中间件函数
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 验证请求安全性
  const validation = securityMiddleware.validateRequest(request);

  if (!validation.safe && validation.riskLevel === "high") {
    // 高风险请求直接拒绝
    logger.warn("拒绝高风险请求", {
      type: "security",
      url: request.url,
      reasons: validation.reasons,
    });

    return NextResponse.json({ error: "请求被安全策略拒绝" }, { status: 403 });
  }

  // 应用安全头
  return securityMiddleware.applySecurityHeaders(request, response);
}

export default securityMiddleware;
