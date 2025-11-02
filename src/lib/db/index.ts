import { PrismaClient } from '@prisma/client'
import { validateEnvironmentVariables, validateOptionalEnvironmentVariables } from '../env-validator'

// 验证环境变量（仅在首次导入时执行一次）
if (!globalThis.__envValidated) {
  try {
    validateEnvironmentVariables()
    validateOptionalEnvironmentVariables()
    globalThis.__envValidated = true
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    if (process.env.NODE_ENV === 'production') {
      throw error // 生产环境中，环境变量错误应该阻止启动
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma