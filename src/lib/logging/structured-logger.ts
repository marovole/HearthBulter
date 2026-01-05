import { performance } from "perf_hooks";

// 日志级别
export enum LogLevel {
  TRACE = "trace",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

// 日志接口
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  logger?: string;
  service?: string;
  requestId?: string;
  userId?: string;
  session?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
  correlationId?: string;
}

// 日志上下文
interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
  service?: string;
  version?: string;
  environment?: string;
}

// 结构化日志器
export class StructuredLogger {
  private static instance: StructuredLogger;
  private serviceName: string = "health-butler";
  private version: string = process.env.APP_VERSION || "1.0.0";
  private environment: string = process.env.NODE_ENV || "development";

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * 记录日志
   */
  log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      ...context,
      metadata,
    };

    // 根据级别决定输出方式
    if (this.shouldLogToConsole(level)) {
      this.logToConsole(logEntry);
    }

    // 异步写入日志文件或发送到日志服务
    this.persistLog(logEntry);
  }

  /**
   * TRACE 级别日志
   */
  trace(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.TRACE, message, context, metadata);
  }

  /**
   * DEBUG 级别日志
   */
  debug(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * INFO 级别日志
   */
  info(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  /**
   * WARN 级别日志
   */
  warn(
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  /**
   * ERROR 级别日志
   */
  error(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const errorData = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log(
      LogLevel.ERROR,
      message,
      { ...context, error: errorData },
      metadata,
    );
  }

  /**
   * FATAL 级别日志
   */
  fatal(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const errorData = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log(
      LogLevel.FATAL,
      message,
      { ...context, error: errorData },
      metadata,
    );

    // 致命错误应该立即退出进程
    process.exit(1);
  }

  /**
   * HTTP 请求日志
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const level = this.getLogLevelFromStatus(statusCode);
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;

    this.log(
      level,
      message,
      {
        ...context,
        method,
        url,
        statusCode,
        duration,
      },
      metadata,
    );
  }

  /**
   * 数据库操作日志
   */
  logDatabase(
    operation: string,
    table: string,
    duration: number,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `DB ${operation} on ${table} (${duration}ms)`;

    this.log(level, message, context, {
      ...metadata,
      operation,
      table,
      duration,
      type: "database",
    });
  }

  /**
   * 缓存操作日志
   */
  logCache(
    operation: "hit" | "miss" | "set" | "delete",
    key: string,
    duration?: number,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const level = operation === "miss" ? LogLevel.INFO : LogLevel.DEBUG;
    const message = `Cache ${operation}: ${key}${duration ? ` (${duration}ms)` : ""}`;

    this.log(level, message, context, {
      ...metadata,
      operation,
      key,
      duration,
      type: "cache",
    });
  }

  /**
   * 安全事件日志
   */
  logSecurity(
    event: string,
    level: LogLevel = LogLevel.WARN,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const message = `Security Event: ${event}`;

    this.log(level, message, context, {
      ...metadata,
      event,
      type: "security",
    });
  }

  /**
   * 性能指标日志
   */
  logPerformance(
    metric: string,
    value: number,
    unit: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    const level = this.getPerformanceLogLevel(metric, value);
    const message = `Performance ${metric}: ${value} ${unit}`;

    this.log(level, message, context, {
      ...metadata,
      metric,
      value,
      unit,
      type: "performance",
    });
  }

  /**
   * 业务事件日志
   */
  logBusiness(
    event: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(LogLevel.INFO, `Business Event: ${event}`, context, {
      ...metadata,
      event,
      type: "business",
    });
  }

  /**
   * 用户操作日志
   */
  logUserAction(
    action: string,
    userId: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ): void {
    this.log(
      LogLevel.INFO,
      `User Action: ${action}`,
      {
        ...context,
        userId,
      },
      {
        ...metadata,
        action,
        type: "user_action",
      },
    );
  }

  /**
   * 创建带上下文的子日志器
   */
  child(context: LogContext): StructuredLogger {
    return {
      trace: (message: string, metadata?: Record<string, any>) =>
        this.trace(message, context, metadata),
      debug: (message: string, metadata?: Record<string, any>) =>
        this.debug(message, context, metadata),
      info: (message: string, metadata?: Record<string, any>) =>
        this.info(message, context, metadata),
      warn: (message: string, metadata?: Record<string, any>) =>
        this.warn(message, context, metadata),
      error: (message: string, error?: Error, metadata?: Record<string, any>) =>
        this.error(message, error, context, metadata),
      fatal: (message: string, error?: Error, metadata?: Record<string, any>) =>
        this.fatal(message, error, context, metadata),
      logRequest: (
        method: string,
        url: string,
        statusCode: number,
        duration: number,
        metadata?: Record<string, any>,
      ) =>
        this.logRequest(method, url, statusCode, duration, context, metadata),
      logDatabase: (
        operation: string,
        table: string,
        duration: number,
        metadata?: Record<string, any>,
      ) => this.logDatabase(operation, table, duration, context, metadata),
      logCache: (
        operation: "hit" | "miss" | "set" | "delete",
        key: string,
        duration?: number,
        metadata?: Record<string, any>,
      ) => this.logCache(operation, key, duration, context, metadata),
      logSecurity: (
        event: string,
        level?: LogLevel,
        metadata?: Record<string, any>,
      ) => this.logSecurity(event, level, context, metadata),
      logPerformance: (
        metric: string,
        value: number,
        unit: string,
        metadata?: Record<string, any>,
      ) => this.logPerformance(metric, value, unit, context, metadata),
      logBusiness: (event: string, metadata?: Record<string, any>) =>
        this.logBusiness(event, context, metadata),
      logUserAction: (
        action: string,
        userId: string,
        metadata?: Record<string, any>,
      ) => this.logUserAction(action, userId, context, metadata),
    } as StructuredLogger;
  }

  /**
   * 输出到控制台
   */
  private logToConsole(logEntry: LogEntry): void {
    const { timestamp, level, message, ...rest } = logEntry;
    const logData = { timestamp, level, message, ...rest };

    // 根据级别选择控制台方法
    switch (level) {
      case LogLevel.TRACE:
        console.trace(logData);
        break;
      case LogLevel.DEBUG:
        console.debug(logData);
        break;
      case LogLevel.INFO:
        console.info(logData);
        break;
      case LogLevel.WARN:
        console.warn(logData);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logData);
        break;
      default:
        console.log(logData);
    }
  }

  /**
   * 持久化日志
   */
  private persistLog(logEntry: LogEntry): void {
    // 这里可以实现日志持久化到文件、数据库或日志服务
    // 为了演示，我们只是记录到控制台，生产环境应该集成专业的日志服务

    // 可以集成以下服务：
    // - Winston (文件日志)
    // - Pino (高性能日志)
    // - Loggly、Logz.io (云日志服务)
    // - ELK Stack (Elasticsearch + Logstash + Kibana)
    // - 阿里云日志服务

    // 示例：写入到文件
    // this.writeToFile(logEntry);

    // 示例：发送到日志服务
    // this.sendToLogService(logEntry);

    // 异步处理，避免阻塞主流程
    setImmediate(() => {
      this.processLogEntry(logEntry);
    });
  }

  /**
   * 处理日志条目
   */
  private async processLogEntry(logEntry: LogEntry): Promise<void> {
    try {
      // 这里可以实现：
      // 1. 日志轮转
      // 2. 日志压缩
      // 3. 日志聚合
      // 4. 发送到远程日志服务
      // 5. 日志分析

      // 检查是否需要发送到外部服务
      if (this.shouldSendToExternalService(logEntry)) {
        await this.sendToExternalService(logEntry);
      }

      // 检查是否需要本地存储
      if (this.shouldStoreLocally(logEntry)) {
        await this.storeLocally(logEntry);
      }
    } catch (error) {
      console.error("Failed to process log entry:", error);
    }
  }

  /**
   * 发送到外部日志服务
   */
  private async sendToExternalService(logEntry: LogEntry): Promise<void> {
    // 集成外部日志服务（如 Loggly、Logz.io、ELK 等）
    // 这里只是示例，实际实现需要根据选择的日志服务调整
  }

  /**
   * 本地存储日志
   */
  private async storeLocally(logEntry: LogEntry): Promise<void> {
    // 本地文件存储（开发环境）
    if (this.environment === "development") {
      // 可以写入到文件系统
      // 注意：生产环境应该使用专业的日志服务
    }
  }

  /**
   * 判断是否应该输出到控制台
   */
  private shouldLogToConsole(level: LogLevel): boolean {
    const levelPriorities = {
      [LogLevel.TRACE]: 0,
      [LogLevel.DEBUG]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.WARN]: 3,
      [LogLevel.ERROR]: 4,
      [LogLevel.FATAL]: 5,
    };

    const currentLevelPriority = levelPriorities[this.getLogLevel()];
    const configLevelPriority = levelPriorities[LogLevel.INFO];

    return currentLevelPriority >= configLevelPriority;
  }

  /**
   * 判断是否应该发送到外部服务
   */
  private shouldSendToExternalService(logEntry: LogEntry): boolean {
    // 生产环境且级别足够重要
    return (
      this.environment === "production" &&
      [LogLevel.ERROR, LogLevel.FATAL, LogLevel.WARN].includes(logEntry.level)
    );
  }

  /**
   * 判断是否应该本地存储
   */
  private shouldStoreLocally(logEntry: LogEntry): boolean {
    // 开发环境或者重要日志
    return (
      this.environment === "development" ||
      [LogLevel.ERROR, LogLevel.FATAL].includes(logEntry.level)
    );
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(): LogLevel {
    return this.environment === "development" ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * 根据状态码获取日志级别
   */
  private getLogLevelFromStatus(statusCode: number): LogLevel {
    if (statusCode >= 500) return LogLevel.ERROR;
    if (statusCode >= 400) return LogLevel.WARN;
    if (statusCode >= 300) return LogLevel.INFO;
    return LogLevel.DEBUG;
  }

  /**
   * 根据指标获取日志级别
   */
  private getPerformanceLogLevel(metric: string, value: number): LogLevel {
    // 根据不同指标设置不同阈值
    switch (metric) {
      case "response_time":
        if (value > 2000) return LogLevel.ERROR;
        if (value > 1000) return LogLevel.WARN;
        return LogLevel.INFO;
      case "memory_usage":
        if (value > 90) return LogLevel.ERROR;
        if (value > 70) return LogLevel.WARN;
        return LogLevel.INFO;
      case "cpu_usage":
        if (value > 90) return LogLevel.ERROR;
        if (value > 70) return LogLevel.WARN;
        return LogLevel.INFO;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 捕获未处理的异常
    process.on("uncaughtException", (error) => {
      this.fatal("Uncaught Exception", error);
    });

    // 捕获未处理的 Promise 拒绝
    process.on("unhandledRejection", (reason, promise) => {
      this.fatal("Unhandled Rejection", new Error(String(reason)), {
        promise: promise?.toString(),
        stack: new Error().stack,
      });
    });

    // 优雅关闭处理
    process.on("SIGTERM", () => {
      this.info("Received SIGTERM, shutting down gracefully");
      process.exit(0);
    });

    process.on("SIGINT", () => {
      this.info("Received SIGINT, shutting down gracefully");
      process.exit(0);
    });
  }

  /**
   * 获取服务信息
   */
  getServiceInfo(): { service: string; version: string; environment: string } {
    return {
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
    };
  }
}

// 创建默认日志实例
export const logger = StructuredLogger.getInstance();

// 导出常用便捷方法
export const log = {
  trace: (
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ) => logger.trace(message, context, metadata),
  debug: (
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ) => logger.debug(message, context, metadata),
  info: (
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ) => logger.info(message, context, metadata),
  warn: (
    message: string,
    context?: LogContext,
    metadata?: Record<string, any>,
  ) => logger.warn(message, context, metadata),
  error: (
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>,
  ) => logger.error(message, error, context, metadata),
  fatal: (
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, any>,
  ) => logger.fatal(message, error, context, metadata),
};

export default logger;
