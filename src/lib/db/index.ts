import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { validateEnvironmentVariables, validateOptionalEnvironmentVariables } from '../env-validator';

// Cloudflare Workers 兼容性配置
// Neon Serverless Driver 需要 WebSocket
if (typeof WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = WebSocket;
} else {
  // 如果环境不支持 WebSocket，使用全局对象
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

// 检测是否在构建阶段
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    process.env.npm_lifecycle_event === 'build' ||
                    process.env.VERCEL_ENV === undefined && process.env.DATABASE_URL === undefined;

// 验证环境变量（仅在运行时执行，构建时跳过）
// 暂时禁用以诊断 fs.readdir 错误
// if (!globalThis.__envValidated && !isBuildTime) {
//   try {
//     validateEnvironmentVariables();
//     validateOptionalEnvironmentVariables();
//     globalThis.__envValidated = true;
//   } catch (error) {
//     console.error(error instanceof Error ? error.message : String(error));
//     if (process.env.NODE_ENV === 'production') {
//       throw error; // 生产环境运行时，环境变量错误应该阻止启动
//     }
//   }
// }

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
  },
});

// 数据库健康检查函数
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const instance = getPrismaClient();
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

// 为兼容性导出 db 别名
export const db = prisma;
