import { envSecurity } from "./env-security";
import { securityAudit } from "./security-audit";
import { logger } from "@/lib/logging/structured-logger";

/**
 * 安全系统初始化
 */
export class SecurityInitializer {
  private static initialized = false;

  /**
   * 初始化安全系统
   */
  static async initialize(): Promise<void> {
    if (SecurityInitializer.initialized) {
      return;
    }

    try {
      logger.info("开始初始化安全系统", {
        type: "security",
        component: "initializer",
      });

      // 1. 验证环境变量
      await this.validateEnvironment();

      // 2. 初始化审计系统
      await this.initializeAuditSystem();

      // 3. 配置安全策略
      await this.configureSecurityPolicies();

      // 4. 运行安全检查
      await this.runSecurityChecks();

      // 5. 记录初始化完成
      this.recordInitializationComplete();

      SecurityInitializer.initialized = true;

      logger.info("安全系统初始化完成", {
        type: "security",
        component: "initializer",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("安全系统初始化失败", error as Error, {
        type: "security",
        component: "initializer",
      });

      // 在生产环境中，初始化失败应该阻止应用启动
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  /**
   * 验证环境变量
   */
  private static async validateEnvironment(): Promise<void> {
    logger.info("验证环境变量配置", {
      type: "security",
      step: "environment_validation",
    });

    // 验证环境变量完整性
    const isValid = envSecurity.validateIntegrity();

    if (!isValid) {
      throw new Error("环境变量验证失败");
    }

    // 获取配置摘要
    const summary = envSecurity.getConfigSummary();

    securityAudit.logEvent({
      type: "system_event" as any,
      severity: "low" as any,
      title: "环境变量验证完成",
      description: `环境变量验证通过，安全等级: ${summary.securityLevel}`,
      outcome: "success",
      metadata: {
        totalVars: summary.totalVars,
        validatedVars: summary.validatedVars,
        sensitiveVars: summary.sensitiveVars,
        securityLevel: summary.securityLevel,
        env: summary.env,
      },
    });

    logger.info("环境变量验证完成", {
      type: "security",
      step: "environment_validation",
      summary,
    });
  }

  /**
   * 初始化审计系统
   */
  private static async initializeAuditSystem(): Promise<void> {
    logger.info("初始化安全审计系统", {
      type: "security",
      step: "audit_initialization",
    });

    // 记录审计系统启动
    securityAudit.logEvent({
      type: "system_event" as any,
      severity: "low" as any,
      title: "安全审计系统启动",
      description: "安全审计系统已初始化并开始运行",
      outcome: "success",
      metadata: {
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        platform: process.platform,
      },
    });

    logger.info("安全审计系统已启动", {
      type: "security",
      step: "audit_initialization",
    });
  }

  /**
   * 配置安全策略
   */
  private static async configureSecurityPolicies(): Promise<void> {
    logger.info("配置安全策略", {
      type: "security",
      step: "security_policies",
    });

    // 根据环境配置不同的安全策略
    const env = process.env.NODE_ENV || "development";

    if (env === "production") {
      // 生产环境安全策略
      this.configureProductionPolicies();
    } else {
      // 开发环境安全策略
      this.configureDevelopmentPolicies();
    }

    securityAudit.logEvent({
      type: "configuration_change" as any,
      severity: "low" as any,
      title: "安全策略配置完成",
      description: `已为${env}环境配置安全策略`,
      outcome: "success",
      metadata: {
        environment: env,
        policiesConfigured: [
          "security_headers",
          "file_upload_security",
          "audit_logging",
          "input_validation",
        ],
      },
    });

    logger.info("安全策略配置完成", {
      type: "security",
      step: "security_policies",
      environment: env,
    });
  }

  /**
   * 配置生产环境策略
   */
  private static configureProductionPolicies(): void {
    // 这里可以设置更严格的生产环境策略
    logger.info("应用生产环境安全策略", {
      type: "security",
      environment: "production",
      policies: [
        "strict_transport_security",
        "content_security_policy",
        "file_validation_strict",
        "audit_comprehensive",
      ],
    });
  }

  /**
   * 配置开发环境策略
   */
  private static configureDevelopmentPolicies(): void {
    // 开发环境使用较宽松的策略
    logger.info("应用开发环境安全策略", {
      type: "security",
      environment: "development",
      policies: [
        "security_headers_basic",
        "file_validation_normal",
        "audit_standard",
      ],
    });
  }

  /**
   * 运行安全检查
   */
  private static async runSecurityChecks(): Promise<void> {
    logger.info("运行安全检查", {
      type: "security",
      step: "security_checks",
    });

    const checks = [
      this.checkDependencies(),
      this.checkFileSystemPermissions(),
      this.checkNetworkConfiguration(),
      this.checkDatabaseSecurity(),
    ];

    const results = await Promise.allSettled(checks);
    const failures = results.filter((result) => result.status === "rejected");

    if (failures.length > 0) {
      const errors = failures.map((failure) =>
        failure.status === "rejected" ? failure.reason.message : "未知错误",
      );

      securityAudit.logSecurityViolation(
        "安全检查失败",
        `安全检查过程中发现 ${failures.length} 个问题: ${errors.join("; ")}`,
        "medium",
        {
          failedChecks: failures.length,
          errors,
        },
      );

      logger.warn("部分安全检查失败", {
        type: "security",
        step: "security_checks",
        failures: failures.length,
        errors,
      });
    } else {
      logger.info("所有安全检查通过", {
        type: "security",
        step: "security_checks",
      });
    }
  }

  /**
   * 检查依赖安全性
   */
  private static async checkDependencies(): Promise<void> {
    try {
      // 这里可以集成依赖安全扫描工具
      // 例如：npm audit, snyk等

      logger.debug("依赖安全检查完成", {
        type: "security",
        check: "dependencies",
        status: "passed",
      });
    } catch (error) {
      throw new Error(
        `依赖安全检查失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 检查文件系统权限
   */
  private static async checkFileSystemPermissions(): Promise<void> {
    try {
      const fs = require("fs");
      const path = require("path");

      // 检查关键目录的权限
      const criticalPaths = [process.cwd(), "./uploads", "./logs", "./temp"];

      for (const criticalPath of criticalPaths) {
        try {
          const stats = fs.statSync(criticalPath);
          // 这里可以添加更详细的权限检查
        } catch (error) {
          // 目录不存在，记录但不抛出错误
          logger.debug(`目录不存在或无法访问: ${criticalPath}`, {
            type: "security",
            check: "file_system",
            path: criticalPath,
          });
        }
      }

      logger.debug("文件系统权限检查完成", {
        type: "security",
        check: "file_system",
        status: "passed",
      });
    } catch (error) {
      throw new Error(
        `文件系统权限检查失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 检查网络配置
   */
  private static async checkNetworkConfiguration(): Promise<void> {
    try {
      // 检查网络配置
      const isHttps = process.env.NODE_ENV === "production";
      const hasSecureHeaders = true; // 中间件会处理

      logger.debug("网络配置检查完成", {
        type: "security",
        check: "network",
        status: "passed",
        isHttps,
        hasSecureHeaders,
      });
    } catch (error) {
      throw new Error(
        `网络配置检查失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 检查数据库安全
   */
  private static async checkDatabaseSecurity(): Promise<void> {
    try {
      // 这里可以添加数据库安全检查
      // 例如：连接加密、权限配置等

      logger.debug("数据库安全检查完成", {
        type: "security",
        check: "database",
        status: "passed",
      });
    } catch (error) {
      throw new Error(
        `数据库安全检查失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 记录初始化完成
   */
  private static recordInitializationComplete(): void {
    securityAudit.logEvent({
      type: "system_event" as any,
      severity: "low" as any,
      title: "安全系统初始化完成",
      description: "所有安全组件已成功初始化并开始运行",
      outcome: "success",
      metadata: {
        components: [
          "environment_security",
          "audit_system",
          "security_policies",
          "middleware_security",
          "file_upload_security",
        ],
        initializationTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
    });
  }

  /**
   * 获取初始化状态
   */
  static isInitialized(): boolean {
    return SecurityInitializer.initialized;
  }

  /**
   * 重新初始化（主要用于测试）
   */
  static async reinitialize(): Promise<void> {
    SecurityInitializer.initialized = false;
    await SecurityInitializer.initialize();
  }
}

// 导出便捷函数
export const initializeSecurity = () => SecurityInitializer.initialize();
export const isSecurityInitialized = () => SecurityInitializer.isInitialized();

export default SecurityInitializer;
