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

// 延迟初始化 Prisma Client 以支持边缘运行时
let prismaInstance: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    if (globalForPrisma.prisma) {
      prismaInstance = globalForPrisma.prisma;
    } else {
      prismaInstance = new PrismaClient();
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = prismaInstance;
      }
    }
  }
  return prismaInstance;
}

// 使用 Proxy 实现延迟初始化，保持 API 兼容性
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const instance = getPrismaClient();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  set(target, prop, value) {
    const instance = getPrismaClient();
    (instance as any)[prop] = value;
    return true;
  }
});

// 为兼容性导出 db 别名
export const db = prisma;
