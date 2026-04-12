/**
 * 数据库访问层 - Convex
 *
 * 本文件已迁移到 Convex。
 * 所有数据库操作现在通过 convexClient 进行。
 *
 * 迁移日期: 2026-04-12
 */

// Convex 已成为唯一数据源
// 所有数据访问通过 @/lib/convex-client

export { convexClient } from "./convex-client";

// 为了保持向后兼容，导出空对象
// 所有代码应直接导入 convexClient
export const prisma = null;
export const db = null;
export const neonAdapter = null;

export async function getDB() {
  throw new Error("Neon database has been removed. Use convexClient instead.");
}

export async function getPrismaClient() {
  throw new Error("Prisma has been removed. Use convexClient instead.");
}

export async function testDatabaseConnection() {
  // Convex 不需要显式连接测试
  return true;
}

export async function ensureDatabaseConnection() {
  // Convex 不需要显式连接确保
  return true;
}
