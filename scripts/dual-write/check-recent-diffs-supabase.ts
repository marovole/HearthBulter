#!/usr/bin/env tsx

/**
 * 使用 Supabase 客户端检查最近的双写 Diff 记录
 * 用于监控 Prisma 和 Supabase 数据一致性
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../../src/types/supabase-database'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function checkRecentDiffs() {
  try {
    console.log('📊 检查最近 24 小时的双写 Diff 记录...\n')

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: diffs, error } = await supabase
      .from('dual_write_diffs')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('❌ 查询失败:', error)
      return
    }

    console.log(`✅ 找到 ${diffs?.length || 0} 条 diff 记录\n`)

    if (!diffs || diffs.length === 0) {
      console.log('🎉 没有发现数据不一致！')
      return
    }

    // 按严重程度统计
    const severityCounts = {
      info: 0,
      warning: 0,
      error: 0,
    }

    // 按 API 端点统计
    const endpointCounts: Record<string, number> = {}

    diffs.forEach((diff) => {
      severityCounts[diff.severity]++
      endpointCounts[diff.api_endpoint] = (endpointCounts[diff.api_endpoint] || 0) + 1
    })

    console.log('📈 按严重程度统计:')
    console.log(`  - Info: ${severityCounts.info}`)
    console.log(`  - Warning: ${severityCounts.warning}`)
    console.log(`  - Error: ${severityCounts.error}`)
    console.log('')

    console.log('📍 按 API 端点统计:')
    Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([endpoint, count]) => {
        console.log(`  - ${endpoint}: ${count} 次`)
      })
    console.log('')

    // 显示最近 5 条 diff 详情
    console.log('🔍 最近 5 条 diff 记录:\n')
    diffs.slice(0, 5).forEach((diff, index) => {
      console.log(`${index + 1}. [${diff.severity.toUpperCase()}] ${diff.api_endpoint}`)
      console.log(`   操作: ${diff.operation}`)
      console.log(`   时间: ${diff.created_at}`)
      if (diff.diff) {
        const diffStr = JSON.stringify(diff.diff)
        console.log(`   差异: ${diffStr.substring(0, 100)}${diffStr.length > 100 ? '...' : ''}`)
      }
      console.log('')
    })

    // 警告检查
    console.log('─'.repeat(50))
    if (severityCounts.error > 0) {
      console.log(`⚠️  发现 ${severityCounts.error} 条 ERROR 级别的 diff，请立即检查！`)
    } else if (severityCounts.warning > 0) {
      console.log(`⚠️  发现 ${severityCounts.warning} 条 WARNING 级别的 diff，建议关注`)
    } else {
      console.log('✅ 所有 diff 均为 INFO 级别，双写运行正常')
    }
  } catch (error) {
    console.error('❌ 发生错误:', error)
    throw error
  }
}

checkRecentDiffs()
