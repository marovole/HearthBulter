/**
 * 数据库访问层 - Neon Serverless PostgreSQL
 *
 * 本文件已从 Supabase 迁移到 Neon Serverless PostgreSQL。
 * 所有数据库操作现在通过 neonAdapter 进行。
 *
 * 迁移日期: 2026-01-21
 * Migration: Supabase to Neon Phase 5
 */

import {
  validateEnvironmentVariables,
  validateOptionalEnvironmentVariables,
} from "../env-validator";
import { neonAdapter, testDatabaseConnection, ensureDatabaseConnection } from "./neon-adapter";

const isBuildTime =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build" ||
  (typeof process.env.CF_PAGES === "undefined" &&
    process.env.VERCEL_ENV === undefined &&
    process.env.DATABASE_URL === undefined);

const globalEnv = globalThis as typeof globalThis & {
  __envValidated?: boolean;
};

if (!globalEnv.__envValidated && !isBuildTime) {
  try {
    validateEnvironmentVariables();
    validateOptionalEnvironmentVariables();
    globalEnv.__envValidated = true;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
  }
}

export const prisma = neonAdapter;

export const db = neonAdapter;

export { testDatabaseConnection, ensureDatabaseConnection };

export async function getDB() {
  return neonAdapter;
}

export async function getPrismaClient() {
  return neonAdapter;
}

export { neonAdapter };
