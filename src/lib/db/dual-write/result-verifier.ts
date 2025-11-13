/**
 * 结果比对器
 *
 * 提供双写验证框架的结果比对和告警功能，包括：
 * - Diff 计算
 * - 异步记录
 * - 告警触发
 *
 * @module result-verifier
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { compare as jsonPatchCompare, Operation } from 'fast-json-patch';

/**
 * Diff 记录
 */
export interface DiffRecord {
  /** API 端点或操作名称 */
  apiEndpoint: string;
  /** 操作类型 */
  operation: string;
  /** 请求 payload */
  payload?: any;
  /** 请求 ID（可选，用于关联） */
  requestId?: string;
  /** Prisma 结果 */
  prismaResult?: any;
  /** Supabase 结果 */
  supabaseResult?: any;
  /** 主库结果（用于影子读模式） */
  primaryResult?: any;
  /** 影子库结果 */
  shadowResult?: any;
  /** 时间戳 */
  timestamp: string;
}

/**
 * Diff 严重性
 */
export type DiffSeverity = 'info' | 'warning' | 'error';

/**
 * 告警配置
 */
export interface AlertConfig {
  /** 严重性 */
  severity: DiffSeverity;
  /** 告警消息 */
  message: string;
  /** 错误对象（可选） */
  error?: any;
  /** Diff 详情 */
  diff?: Operation[];
}

/**
 * 结果比对器
 *
 * 比对 Prisma 和 Supabase 的结果，
 * 异步记录差异并触发告警
 */
export class ResultVerifier {
  private readonly IGNORE_FIELDS = [
    'id',
    'created_at',
    'createdAt',
    'updated_at',
    'updatedAt',
    'deleted_at',
    'deletedAt',
  ];

  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * 记录 Diff
   *
   * 比对 Prisma 和 Supabase 的结果，
   * 异步写入数据库
   *
   * @param record - Diff 记录
   * @returns Promise（fire-and-forget）
   */
  async recordDiff(record: DiffRecord): Promise<void> {
    const {
      apiEndpoint,
      operation,
      payload,
      requestId,
      prismaResult,
      supabaseResult,
      primaryResult,
      shadowResult,
      timestamp,
    } = record;

    // 计算 diff
    let diff: Operation[] = [];
    let severity: DiffSeverity = 'info';

    try {
      if (prismaResult !== undefined && supabaseResult !== undefined) {
        // 双写场景
        const prismaValue =
          typeof prismaResult === 'object' && 'status' in prismaResult
            ? (prismaResult as PromiseFulfilledResult<any>).status === 'fulfilled'
              ? (prismaResult as PromiseFulfilledResult<any>).value
              : null
            : prismaResult;

        const supabaseValue =
          typeof supabaseResult === 'object' && 'status' in supabaseResult
            ? (supabaseResult as PromiseFulfilledResult<any>).status === 'fulfilled'
              ? (supabaseResult as PromiseFulfilledResult<any>).value
              : null
            : supabaseResult;

        if (prismaValue && supabaseValue) {
          diff = this.calculateDiff(prismaValue, supabaseValue);
          severity = diff.length > 0 ? 'warning' : 'info';
        } else if (!supabaseValue) {
          severity = 'error';
        }
      } else if (primaryResult !== undefined && shadowResult !== undefined) {
        // 影子读场景
        if (primaryResult && shadowResult) {
          diff = this.calculateDiff(primaryResult, shadowResult);
          severity = diff.length > 0 ? 'warning' : 'info';
        }
      }

      // 异步写入数据库（fire-and-forget）
      this.writeDiffToDatabase({
        apiEndpoint,
        operation,
        payload,
        requestId,
        prismaResult,
        supabaseResult,
        diff,
        severity,
        timestamp,
      }).catch((err) => {
        console.error('[ResultVerifier] Failed to write diff:', err);
      });

      // 如果有严重差异，触发告警
      if (severity === 'error' || (severity === 'warning' && diff.length > 5)) {
        this.recordAlert({
          severity,
          message: `Dual write diff detected: ${operation} at ${apiEndpoint}`,
          diff,
        }).catch((err) => {
          console.error('[ResultVerifier] Failed to record alert:', err);
        });
      }
    } catch (err) {
      console.error('[ResultVerifier] Error recording diff:', err);
    }
  }

  /**
   * 计算 Diff
   *
   * 使用 fast-json-patch 比对两个对象
   * 忽略时间戳和 ID 字段
   *
   * @param obj1 - 对象1
   * @param obj2 - 对象2
   * @returns JSON Patch 操作数组
   */
  private calculateDiff(obj1: any, obj2: any): Operation[] {
    const clean = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      const cleaned: any = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        // 忽略特定字段
        if (this.IGNORE_FIELDS.includes(key)) continue;

        if (value && typeof value === 'object') {
          cleaned[key] = clean(value);
        } else {
          cleaned[key] = value;
        }
      }

      return cleaned;
    };

    const cleanedObj1 = clean(obj1);
    const cleanedObj2 = clean(obj2);

    return jsonPatchCompare(cleanedObj1, cleanedObj2);
  }

  /**
   * 写入 Diff 到数据库
   *
   * @param record - Diff 记录
   */
  private async writeDiffToDatabase(record: {
    apiEndpoint: string;
    operation: string;
    payload?: any;
    requestId?: string;
    prismaResult?: any;
    supabaseResult?: any;
    diff: Operation[];
    severity: DiffSeverity;
    timestamp: string;
  }): Promise<void> {
    const { error } = await this.supabase.from('dual_write_diffs').insert({
      api_endpoint: record.apiEndpoint,
      operation: record.operation,
      payload: record.payload,
      request_id: record.requestId,
      prisma_result: record.prismaResult,
      supabase_result: record.supabaseResult,
      diff: record.diff,
      severity: record.severity,
      created_at: record.timestamp,
    });

    if (error) {
      throw new Error(`Failed to write diff to database: ${error.message}`);
    }
  }

  /**
   * 记录告警
   *
   * 当检测到严重差异时触发
   * 目前只是日志输出，可扩展为 Slack/PagerDuty 通知
   *
   * @param alert - 告警配置
   */
  async recordAlert(alert: AlertConfig): Promise<void> {
    console.error('[DualWrite Alert]', {
      severity: alert.severity,
      message: alert.message,
      error: alert.error,
      diffCount: alert.diff?.length || 0,
    });

    // TODO: 发送到 Slack/PagerDuty
    // await this.sendToSlack(alert);

    // TODO: 记录到监控系统
    // await this.sendToDatadog(alert);
  }
}

/**
 * 便捷函数：创建 Result Verifier
 *
 * @param supabase - Supabase 客户端
 * @returns Result Verifier 实例
 */
export function createResultVerifier(supabase: SupabaseClient<Database>): ResultVerifier {
  return new ResultVerifier(supabase);
}
