import type { PrismaClient as PrismaClientType } from '@prisma/client';
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
    // 生产环境仅警告，不阻止启动（避免在 Workers 环境出问题）
    // if (process.env.NODE_ENV === 'production') {
    //   throw error;
    // }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
};

// 延迟初始化 Prisma Client 以支持边缘运行时
let prismaInstance: PrismaClientType | undefined;

async function getPrismaClient(): Promise<PrismaClientType> {
  if (!prismaInstance) {
    if (globalForPrisma.prisma) {
      prismaInstance = globalForPrisma.prisma;
    } else {
      // 动态导入以避免在模块加载时触发 fs 操作
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaNeon } = await import('@prisma/adapter-neon');
      const { Pool, neonConfig } = await import('@neondatabase/serverless');

      // Cloudflare Workers 兼容性配置
      if (typeof WebSocket !== 'undefined') {
        neonConfig.webSocketConstructor = WebSocket;
      } else {
        neonConfig.webSocketConstructor = globalThis.WebSocket;
      }

      // 使用 Neon Serverless Driver 以支持 Cloudflare Workers
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL is not defined');
      }

      const pool = new Pool({ connectionString });
      const adapter = new PrismaNeon(pool);

      prismaInstance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });

      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = prismaInstance;
      }
    }
  }
  return prismaInstance;
}

// 使用 Proxy 实现延迟初始化，但所有数据库操作必须是异步的
export const prisma = new Proxy({} as PrismaClientType, {
  get(target, prop) {
    // 对于常见的 Prisma 方法，返回异步包装
    return new Proxy(() => {}, {
      async apply(_targetFunc, _thisArg, args) {
        const instance = await getPrismaClient();
        const value = (instance as any)[prop];
        if (typeof value === 'function') {
          return value.apply(instance, args);
        }
        return value;
      },
      get(_targetProp, innerProp) {
        return async (...args: any[]) => {
          const instance = await getPrismaClient();
          const method = (instance as any)[prop];
          if (method && typeof method[innerProp] === 'function') {
            return method[innerProp].apply(method, args);
          }
          return method[innerProp];
        };
      }
    });
  }
});

// 数据库健康检查函数
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const instance = await getPrismaClient();
    await instance.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return false;
  }
}

// 确保数据库连接的包装函数
export async function ensureDatabaseConnection(): Promise<void> {
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    throw new Error('数据库连接失败，请检查DATABASE_URL配置');
  }
}

// 推荐使用的异步获取方法（避免 Proxy 复杂性）
export async function getDB() {
  return getPrismaClient();
}

// 为兼容性导出 db 别名
export const db = prisma;
