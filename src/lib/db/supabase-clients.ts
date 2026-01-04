/**
 * Supabase 多层客户端管理
 *
 * 实现最小权限原则，区分不同场景的访问需求：
 * 1. 匿名客户端 - 公开数据访问
 * 2. 用户客户端 - 带用户 JWT 的访问（受 RLS 限制）
 * 3. 服务客户端 - 后台任务（需要记录使用原因）
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-database';
import { logger } from '@/lib/logger';

// 客户端使用类型
export type ClientType = 'anon' | 'user' | 'service';

// 服务客户端使用原因
export type ServiceClientReason =
  | 'scheduled_task'
  | 'background_job'
  | 'data_migration'
  | 'admin_operation'
  | 'system_notification'
  | 'analytics_aggregation';

interface ClientUsageLog {
  clientType: ClientType;
  reason?: ServiceClientReason;
  timestamp: Date;
  caller?: string;
}

// 客户端使用日志（开发环境调试用）
const clientUsageLogs: ClientUsageLog[] = [];
const MAX_LOGS = 1000;

function logClientUsage(log: ClientUsageLog): void {
  if (process.env.NODE_ENV === 'development') {
    clientUsageLogs.push(log);
    if (clientUsageLogs.length > MAX_LOGS) {
      clientUsageLogs.shift();
    }
  }

  if (log.clientType === 'service') {
    logger.info('Service client accessed', {
      reason: log.reason,
      caller: log.caller,
      timestamp: log.timestamp.toISOString(),
    });
  }
}

/**
 * 获取 Supabase URL
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('SUPABASE_URL 环境变量未设置');
  }
  return url;
}

/**
 * 获取匿名客户端
 * 用于公开数据访问，受 RLS 策略限制
 */
export function getAnonClient(): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量未设置');
  }

  logClientUsage({
    clientType: 'anon',
    timestamp: new Date(),
  });

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'health-butler',
        'x-client-type': 'anon',
      },
    },
  });
}

/**
 * 获取用户级客户端
 * 使用用户的 JWT 进行访问，受 RLS 策略限制
 *
 * @param userJwt 用户的 JWT Token（从 session 获取）
 */
export function getUserClient(userJwt: string): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量未设置');
  }

  if (!userJwt) {
    throw new Error('用户 JWT 不能为空');
  }

  logClientUsage({
    clientType: 'user',
    timestamp: new Date(),
  });

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'health-butler',
        'x-client-type': 'user',
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
}

/**
 * 获取服务级客户端
 * 使用 Service Key，绕过 RLS 策略
 *
 * 注意：仅限后台任务使用，必须提供使用原因
 *
 * @param reason 使用原因（必须）
 * @param caller 调用方标识（可选，用于追踪）
 */
export function getServiceClient(
  reason: ServiceClientReason,
  caller?: string,
): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_KEY 环境变量未设置');
  }

  // 记录服务客户端使用
  logClientUsage({
    clientType: 'service',
    reason,
    caller,
    timestamp: new Date(),
  });

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'health-butler',
        'x-client-type': 'service',
        'x-service-reason': reason,
        ...(caller && { 'x-service-caller': caller }),
      },
    },
  });
}

/**
 * 获取默认客户端（向后兼容）
 *
 * @deprecated 请使用 getAnonClient、getUserClient 或 getServiceClient
 */
export function getDefaultClient(): SupabaseClient<Database> {
  logger.warn('使用了 getDefaultClient()，请迁移到具体的客户端类型');

  const url = getSupabaseUrl();
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error('Supabase key 环境变量未设置');
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'health-butler',
        'x-client-type': 'legacy',
      },
    },
  });
}

/**
 * 获取客户端使用统计（开发环境）
 */
export function getClientUsageStats(): {
  total: number;
  byType: Record<ClientType, number>;
  serviceReasons: Record<ServiceClientReason, number>;
} {
  const stats = {
    total: clientUsageLogs.length,
    byType: {
      anon: 0,
      user: 0,
      service: 0,
    } as Record<ClientType, number>,
    serviceReasons: {} as Record<ServiceClientReason, number>,
  };

  for (const log of clientUsageLogs) {
    stats.byType[log.clientType]++;
    if (log.clientType === 'service' && log.reason) {
      stats.serviceReasons[log.reason] =
        (stats.serviceReasons[log.reason] || 0) + 1;
    }
  }

  return stats;
}

/**
 * 清除客户端使用日志
 */
export function clearClientUsageLogs(): void {
  clientUsageLogs.length = 0;
}
