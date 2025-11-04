import { PrismaClient } from '@prisma/client';
import { validateEnvironmentVariables, validateOptionalEnvironmentVariables } from '../env-validator';

// 检测是否在构建阶段
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    process.env.npm_lifecycle_event === 'build' ||
                    process.env.VERCEL_ENV === undefined && process.env.DATABASE_URL === undefined;

// 验证环境变量（仅在运行时执行，构建时跳过）
if (!globalThis.__envValidated && !isBuildTime) {
  try {
    validateEnvironmentVariables();
    validateOptionalEnvironmentVariables();
    globalThis.__envValidated = true;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    if (process.env.NODE_ENV === 'production') {
      throw error; // 生产环境运行时，环境变量错误应该阻止启动
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 为兼容性导出 db 别名
export const db = prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
