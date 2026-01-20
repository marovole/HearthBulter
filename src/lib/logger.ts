/**
 * 统一日志记录服务
 * 替换console.log，提供结构化日志记录
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

/**
 * 日志服务类
 */
class Logger {
  private static instance: Logger;
  private userId?: string;
  private sessionId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 设置用户上下文
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 格式化日志条目
   */
  private formatLog(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  /**
   * 输出日志
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
  ): void {
    const entry = this.formatLog(level, message, context);

    // 开发环境输出到控制台
    if (process.env.NODE_ENV === "development") {
      const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
      const contextStr = context ? ` ${JSON.stringify(context)}` : "";
      switch (level) {
      case "debug":
      case "info":
        console.log(`${prefix} ${message}${contextStr}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case "error":
        console.error(`${prefix} ${message}${contextStr}`);
        break;
      }
    }

    // 生产环境可以发送到日志服务
    if (process.env.NODE_ENV === "production") {
      this.sendToLogService(entry);
    }
  }

  /**
   * 发送到日志服务（生产环境）
   */
  private sendToLogService(entry: LogEntry): void {
    // 这里可以实现发送到外部日志服务
    // 例如：Sentry, LogRocket, 自定义日志服务等
    // 目前只记录到控制台
    console.error("PRODUCTION LOG:", entry);
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log("debug", message, context);
  }

  /**
   * 信息日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.log("info", message, context);
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log("warn", message, context);
  }

  /**
   * 错误日志
   */
  error(message: string, context?: Record<string, any>): void {
    this.log("error", message, context);
  }

  /**
   * 性能日志
   */
  performance(
    operation: string,
    duration: number,
    context?: Record<string, any>,
  ): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      type: "performance",
      ...context,
    });
  }

  /**
   * 用户行为日志
   */
  userAction(action: string, context?: Record<string, any>): void {
    this.info(`User Action: ${action}`, {
      action,
      type: "user_action",
      ...context,
    });
  }

  /**
   * API请求日志
   */
  apiRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: Record<string, any>,
  ): void {
    this.info(`API: ${method} ${url} - ${status} (${duration}ms)`, {
      method,
      url,
      status,
      duration,
      type: "api_request",
      ...context,
    });
  }

  /**
   * 业务事件日志
   */
  businessEvent(event: string, context?: Record<string, any>): void {
    this.info(`Business Event: ${event}`, {
      event,
      type: "business_event",
      ...context,
    });
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 导出默认实例（兼容性）
export default logger;
