/**
 * 数据库连接测试脚本
 * 用于验证 Supabase 数据库连接是否正常
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 测试数据库连接...')
    
    // 测试连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功！')
    
    // 检查表是否存在
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `
    
    console.log(`📊 数据库表数量: ${tables.length}`)
    
    if (tables.length > 0) {
      console.log('📋 现有表:')
      tables.forEach(table => {
        console.log(`  - ${table.tablename}`)
      })
    } else {
      console.log('⚠️  数据库为空，需要运行迁移')
    }
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    console.log('\n💡 请检查:')
    console.log('  1. DATABASE_URL 环境变量是否正确设置')
    console.log('  2. 数据库密码是否正确')
    console.log('  3. 网络连接是否正常')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

