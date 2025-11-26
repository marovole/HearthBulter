/**
 * 数据库访问层 - Supabase Only 模式
 *
 * 本文件已从 Prisma Client 迁移到 Supabase Adapter。
 * 所有数据库操作现在通过 Supabase PostgreSQL 进行。
 *
 * 迁移日期: 2025-11-18
 * OpenSpec Change: refactor-database-layer-to-supabase
 */

import {
  validateEnvironmentVariables,
  validateOptionalEnvironmentVariables,
} from '../env-validator';
import {
  supabaseAdapter,
  testDatabaseConnection as supabaseTestConnection,
  ensureDatabaseConnection as supabaseEnsureConnection,
} from './supabase-adapter';

// 检测是否在构建阶段
// Cloudflare Workers 环境：CF_PAGES 变量存在时为运行时
const isBuildTime =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build' ||
  (typeof process.env.CF_PAGES === 'undefined' &&
    process.env.VERCEL_ENV === undefined &&
    process.env.DATABASE_URL === undefined);

// 验证环境变量（仅在运行时执行，构建时跳过）
if (!globalThis.__envValidated && !isBuildTime) {
  try {
    validateEnvironmentVariables();
    validateOptionalEnvironmentVariables();
    globalThis.__envValidated = true;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    // 生产环境仅警告，不阻止启动（避免在 Workers 环境出问题）
    // if (process.env.NODE_ENV === 'production') {
    //   throw error;
    // }
  }
}

// 导出 Supabase Adapter 作为 prisma（向后兼容）
export const prisma = supabaseAdapter;

// 为兼容性导出 db 别名
export const db = supabaseAdapter;

// 数据库健康检查函数（Supabase 版本）
export const testDatabaseConnection = supabaseTestConnection;

// 确保数据库连接的包装函数（Supabase 版本）
export const ensureDatabaseConnection = supabaseEnsureConnection;

// 推荐使用的异步获取方法
export async function getDB() {
  return supabaseAdapter;
}

// 兼容层：导出 getPrismaClient 别名，但返回 Supabase Adapter
// 保持向后兼容，所有旧代码仍然可以工作
export async function getPrismaClient() {
  return supabaseAdapter;
}
