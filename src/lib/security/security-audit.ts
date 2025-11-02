import { logger } from '@/lib/logging/structured-logger';
import { envSecurity } from './env-security';
import crypto from 'crypto';

// 安全事件类型
export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  FILE_UPLOAD = 'file_upload',
  API_ACCESS = 'api_access',
  CONFIGURATION_CHANGE = 'configuration_change',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation',
  SYSTEM_EVENT = 'system_event',
}

// 安全事件严重级别
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 安全事件接口
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  title: string;
  description: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: 'success' | 'failure' | 'blocked';
  metadata: Record<string, any>;
  correlationId?: string;
}

// 审计报告类型
interface AuditReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<SecuritySeverity, number>;
    uniqueUsers: number;
    uniqueIPs: number;
    topRiskyIPs: Array<{
      ip: string;
      eventCount: number;
      riskScore: number;
    }>;
    criticalEvents: SecurityEvent[];
  };
  trends: {
    eventVolume: Array<{
      date: string;
      count: number;
    }>;
    threatLevel: Array<{
      date: string;
      level: number;
    }>;
  };
  generatedAt: Date;
}

/**
 * 安全审计系统
 */
export class SecurityAuditSystem {
  private static instance: SecurityAuditSystem;
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // 内存中最多保留的事件数
  private correlationIdMap = new Map<string, string>();

  private constructor() {
    this.startPeriodicCleanup();
    this.loadExistingEvents();
  }

  static getInstance(): SecurityAuditSystem {
    if (!SecurityAuditSystem.instance) {
      SecurityAuditSystem.instance = new SecurityAuditSystem();
    }
    return SecurityAuditSystem.instance;
  }

  /**
   * 记录安全事件
   */
  logEvent(event: {
    type: SecurityEventType;
    severity: SecuritySeverity;
    title: string;
    description: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    outcome: 'success' | 'failure' | 'blocked';
    metadata?: Record<string, any>;
    correlationId?: string;
  }): string {
    const eventId = this.generateEventId();
    const correlationId = event.correlationId || this.getOrCreateCorrelationId(event.userId, event.sessionId);

    const securityEvent: SecurityEvent = {
      id: eventId,
      timestamp: new Date(),
      ...event,
      metadata: event.metadata || {},
      correlationId,
    };

    // 添加到内存存储
    this.events.push(securityEvent);

    // 限制事件数量
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents * 0.8); // 保留80%
    }

    // 记录到日志
    this.logSecurityEvent(securityEvent);

    // 检查是否需要立即告警
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.handleCriticalEvent(securityEvent);
    }

    // 异步持久化
    setImmediate(() => {
      this.persistEvent(securityEvent);
    });

    return eventId;
  }

  /**
   * 记录认证事件
   */
  logAuthentication(
    userId: string,
    action: 'login' | 'logout' | 'register' | 'password_change' | 'password_reset',
    outcome: 'success' | 'failure',
    metadata?: Record<string, any>,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.AUTHENTICATION,
      severity: outcome === 'failure' ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      title: `用户${action === 'login' ? '登录' : action === 'logout' ? '登出' : action === 'register' ? '注册' : action === 'password_change' ? '密码修改' : '密码重置'}`,
      description: `用户 ${userId} ${action} ${outcome === 'success' ? '成功' : '失败'}`,
      userId,
      action,
      outcome,
      metadata,
      ...context,
    });
  }

  /**
   * 记录授权事件
   */
  logAuthorization(
    userId: string,
    resource: string,
    action: string,
    outcome: 'success' | 'failure' | 'blocked',
    metadata?: Record<string, any>,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.AUTHORIZATION,
      severity: outcome === 'blocked' ? SecuritySeverity.HIGH :
                 outcome === 'failure' ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      title: `访问${outcome === 'success' ? '成功' : outcome === 'failure' ? '失败' : '被拒绝'}`,
      description: `用户 ${userId} 尝试 ${action} 资源 ${resource}`,
      userId,
      resource,
      action,
      outcome,
      metadata,
      ...context,
    });
  }

  /**
   * 记录数据访问事件
   */
  logDataAccess(
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete' | 'export',
    outcome: 'success' | 'failure',
    metadata?: Record<string, any>,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.DATA_ACCESS,
      severity: action === 'delete' && outcome === 'success' ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      title: `数据${action === 'read' ? '读取' : action === 'write' ? '写入' : action === 'delete' ? '删除' : '导出'}`,
      description: `用户 ${userId} ${action} 数据 ${resource}`,
      userId,
      resource,
      action,
      outcome,
      metadata,
      ...context,
    });
  }

  /**
   * 记录文件上传事件
   */
  logFileUpload(
    userId: string,
    filename: string,
    outcome: 'success' | 'failure' | 'blocked',
    metadata?: Record<string, any>,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.FILE_UPLOAD,
      severity: outcome === 'blocked' ? SecuritySeverity.HIGH :
                 outcome === 'failure' ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      title: `文件上传${outcome === 'success' ? '成功' : outcome === 'failure' ? '失败' : '被拒绝'}`,
      description: `用户 ${userId} 上传文件 ${filename}`,
      userId,
      resource: filename,
      action: 'upload',
      outcome,
      metadata,
      ...context,
    });
  }

  /**
   * 记录API访问事件
   */
  logApiAccess(
    endpoint: string,
    method: string,
    outcome: 'success' | 'failure' | 'blocked',
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.API_ACCESS,
      severity: outcome === 'blocked' ? SecuritySeverity.HIGH :
                 outcome === 'failure' ? SecuritySeverity.MEDIUM : SecuritySeverity.LOW,
      title: `API访问${outcome === 'success' ? '成功' : outcome === 'failure' ? '失败' : '被拒绝'}`,
      description: `${method} ${endpoint}`,
      resource: endpoint,
      action: method,
      outcome,
      metadata,
      ...context,
    });
  }

  /**
   * 记录可疑活动
   */
  logSuspiciousActivity(
    title: string,
    description: string,
    severity: SecuritySeverity = SecuritySeverity.MEDIUM,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity,
      title,
      description,
      outcome: 'blocked',
      metadata,
      ...context,
    });
  }

  /**
   * 记录安全违规
   */
  logSecurityViolation(
    title: string,
    description: string,
    severity: SecuritySeverity = SecuritySeverity.HIGH,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): string {
    return this.logEvent({
      type: SecurityEventType.SECURITY_VIOLATION,
      severity,
      title,
      description,
      outcome: 'blocked',
      metadata,
      ...context,
    });
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * 获取或创建关联ID
   */
  private getOrCreateCorrelationId(userId?: string, sessionId?: string): string {
    const key = userId || sessionId || 'anonymous';

    if (!this.correlationIdMap.has(key)) {
      this.correlationIdMap.set(key, `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
    }

    return this.correlationIdMap.get(key)!;
  }

  /**
   * 记录安全事件到日志
   */
  private logSecurityEvent(event: SecurityEvent): void {
    const logLevel = event.severity === SecuritySeverity.CRITICAL ? 'error' :
                    event.severity === SecuritySeverity.HIGH ? 'warn' : 'info';

    logger[logLevel](`[SECURITY] ${event.title}`, {
      type: 'security_audit',
      eventId: event.id,
      eventType: event.type,
      severity: event.severity,
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      outcome: event.outcome,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
      correlationId: event.correlationId,
    });
  }

  /**
   * 处理关键事件
   */
  private handleCriticalEvent(event: SecurityEvent): void {
    logger.error('检测到关键安全事件', new Error(event.description), {
      type: 'security_critical',
      eventId: event.id,
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      ipAddress: event.ipAddress,
      metadata: event.metadata,
    });

    // 这里可以集成告警系统
    // 例如：发送邮件、短信、Slack通知等
  }

  /**
   * 持久化事件
   */
  private async persistEvent(event: SecurityEvent): Promise<void> {
    try {
      // 这里可以将事件保存到数据库、文件或日志服务
      // 为了演示，我们只是记录到控制台
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT]', JSON.stringify(event, null, 2));
      }
    } catch (error) {
      logger.error('持久化安全事件失败', error as Error, {
        type: 'security_audit',
        eventId: event.id,
      });
    }
  }

  /**
   * 加载现有事件
   */
  private loadExistingEvents(): void {
    try {
      // 这里可以从持久化存储加载现有事件
      // 为了演示，我们只是添加一个示例事件
      if (this.events.length === 0) {
        this.logEvent({
          type: SecurityEventType.SYSTEM_EVENT,
          severity: SecuritySeverity.LOW,
          title: '安全审计系统启动',
          description: '安全审计系统已初始化并开始运行',
          outcome: 'success',
          metadata: {
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
          },
        });
      }
    } catch (error) {
      logger.error('加载现有安全事件失败', error as Error, {
        type: 'security_audit',
      });
    }
  }

  /**
   * 生成审计报告
   */
  generateReport(type: 'daily' | 'weekly' | 'monthly' | 'custom', customPeriod?: { start: Date; end: Date }): AuditReport {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (type) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (!customPeriod) {
          throw new Error('自定义报告需要提供时间范围');
        }
        start = customPeriod.start;
        end = customPeriod.end;
        break;
    }

    const filteredEvents = this.events.filter(event =>
      event.timestamp >= start && event.timestamp <= end
    );

    const report: AuditReport = {
      id: `report_${Date.now()}`,
      type,
      period: { start, end },
      summary: this.generateSummary(filteredEvents),
      trends: this.generateTrends(filteredEvents, start, end),
      generatedAt: now,
    };

    // 记录报告生成
    logger.info('安全审计报告已生成', {
      type: 'security_audit',
      reportId: report.id,
      reportType: type,
      eventCount: report.summary.totalEvents,
      criticalEvents: report.summary.criticalEvents.length,
    });

    return report;
  }

  /**
   * 生成报告摘要
   */
  private generateSummary(events: SecurityEvent[]) {
    const eventsByType: Record<SecurityEventType, number> = {} as any;
    const eventsBySeverity: Record<SecuritySeverity, number> = {} as any;
    const uniqueUsers = new Set<string>();
    const uniqueIPs = new Set<string>();
    const ipEventCount = new Map<string, number>();

    // 初始化计数器
    Object.values(SecurityEventType).forEach(type => {
      eventsByType[type] = 0;
    });
    Object.values(SecuritySeverity).forEach(severity => {
      eventsBySeverity[severity] = 0;
    });

    // 统计事件
    events.forEach(event => {
      eventsByType[event.type]++;
      eventsBySeverity[event.severity]++;

      if (event.userId) uniqueUsers.add(event.userId);
      if (event.ipAddress) {
        uniqueIPs.add(event.ipAddress);
        ipEventCount.set(event.ipAddress, (ipEventCount.get(event.ipAddress) || 0) + 1);
      }
    });

    // 计算风险IP
    const topRiskyIPs = Array.from(ipEventCount.entries())
      .map(([ip, count]) => ({
        ip,
        eventCount: count,
        riskScore: this.calculateRiskScore(ip, count, events),
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    const criticalEvents = events.filter(event => event.severity === SecuritySeverity.CRITICAL);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      uniqueUsers: uniqueUsers.size,
      uniqueIPs: uniqueIPs.size,
      topRiskyIPs,
      criticalEvents,
    };
  }

  /**
   * 计算风险分数
   */
  private calculateRiskScore(ip: string, eventCount: number, events: SecurityEvent[]): number {
    const ipEvents = events.filter(event => event.ipAddress === ip);

    let score = eventCount * 10; // 基础分数

    // 根据事件严重级别加权
    ipEvents.forEach(event => {
      switch (event.severity) {
        case SecuritySeverity.CRITICAL:
          score += 100;
          break;
        case SecuritySeverity.HIGH:
          score += 50;
          break;
        case SecuritySeverity.MEDIUM:
          score += 20;
          break;
        case SecuritySeverity.LOW:
          score += 5;
          break;
      }
    });

    // 根据事件类型加权
    const failureCount = ipEvents.filter(e => e.outcome === 'failure' || e.outcome === 'blocked').length;
    score += failureCount * 30;

    return score;
  }

  /**
   * 生成趋势数据
   */
  private generateTrends(events: SecurityEvent[], start: Date, end: Date) {
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const eventVolume: Array<{ date: string; count: number }> = [];
    const threatLevel: Array<{ date: string; level: number }> = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const dayEvents = events.filter(event => {
        const eventDate = event.timestamp.toISOString().split('T')[0];
        return eventDate === dateStr;
      });

      eventVolume.push({
        date: dateStr,
        count: dayEvents.length,
      });

      // 计算威胁等级 (0-100)
      let level = 0;
      dayEvents.forEach(event => {
        switch (event.severity) {
          case SecuritySeverity.CRITICAL:
            level += 25;
            break;
          case SecuritySeverity.HIGH:
            level += 10;
            break;
          case SecuritySeverity.MEDIUM:
            level += 3;
            break;
          case SecuritySeverity.LOW:
            level += 1;
            break;
        }
      });

      threatLevel.push({
        date: dateStr,
        level: Math.min(100, level),
      });
    }

    return { eventVolume, threatLevel };
  }

  /**
   * 清理过期事件
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      this.events = this.events.filter(event =>
        event.timestamp.getTime() > oneWeekAgo ||
        event.severity === SecuritySeverity.CRITICAL
      );

      // 清理过期的关联ID
      const oldCorrelationIds: string[] = [];
      for (const [key, id] of this.correlationIdMap.entries()) {
        const relatedEvents = this.events.filter(event => event.correlationId === id);
        if (relatedEvents.length === 0) {
          oldCorrelationIds.push(key);
        }
      }

      oldCorrelationIds.forEach(key => {
        this.correlationIdMap.delete(key);
      });

      logger.info('安全审计事件清理完成', {
        type: 'security_audit',
        remainingEvents: this.events.length,
        correlationIds: this.correlationIdMap.size,
      });
    }, 24 * 60 * 60 * 1000); // 每天清理一次
  }

  /**
   * 获取事件统计
   */
  getStats(timeRange?: { start: Date; end: Date }) {
    let events = this.events;

    if (timeRange) {
      events = events.filter(event =>
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(event => event.timestamp >= last24h);

    return {
      totalEvents: events.length,
      recentEvents: recentEvents.length,
      criticalEvents: events.filter(e => e.severity === SecuritySeverity.CRITICAL).length,
      highRiskEvents: events.filter(e => e.severity === SecuritySeverity.HIGH).length,
      uniqueUsers: new Set(events.filter(e => e.userId).map(e => e.userId!)).size,
      uniqueIPs: new Set(events.filter(e => e.ipAddress).map(e => e.ipAddress!)).size,
    };
  }
}

// 创建单例实例
export const securityAudit = SecurityAuditSystem.getInstance();

// 导出便捷方法
export const logAuth = (userId: string, action: string, outcome: string, metadata?: any, context?: any) =>
  securityAudit.logAuthentication(userId, action as any, outcome as any, metadata, context);

export const logAccess = (userId: string, resource: string, action: string, outcome: string, metadata?: any, context?: any) =>
  securityAudit.logAuthorization(userId, resource, action, outcome as any, metadata, context);

export const logSuspicious = (title: string, description: string, severity?: SecuritySeverity, metadata?: any, context?: any) =>
  securityAudit.logSuspiciousActivity(title, description, severity, metadata, context);

export default securityAudit;