#!/usr/bin/env tsx

/**
 * 为页面添加 dynamic = 'force-dynamic' 以禁用静态生成
 * 解决 React Context SSR 预渲染错误
 */

import fs from 'fs'
import path from 'path'

const pageFiles = [
  'src/app/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/analytics/page.tsx',
  'src/app/dashboard/analytics/reports/page.tsx',
  'src/app/dashboard/budget/page.tsx',
  'src/app/dashboard/devices/page.tsx',
  'src/app/onboarding/page.tsx',
  'src/app/onboarding/welcome/page.tsx',
  'src/app/onboarding/setup/page.tsx',
  'src/app/onboarding/tutorial/page.tsx',
  'src/app/shopping-list/page.tsx',
  'src/app/meal-planning/page.tsx',
  'src/app/health-data/page.tsx',
  'src/app/health-data/add/page.tsx',
  'src/app/health-data/history/page.tsx',
  'src/app/help/page.tsx',
  'src/app/auth/signin/page.tsx',
  'src/app/auth/signup/page.tsx',
]

function addDynamicExport(filePath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), filePath)

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`)
      return false
    }

    let content = fs.readFileSync(fullPath, 'utf-8')

    // 移除 'use client' 如果存在（因为会与服务器端函数冲突）
    if (content.trimStart().startsWith("'use client'")) {
      content = content.replace(/^'use client'\s*\n\s*\n/, '')
      console.log(`   移除了 'use client': ${filePath}`)
    } else if (content.trimStart().startsWith('"use client"')) {
      content = content.replace(/^"use client"\s*\n\s*\n/, '')
      console.log(`   移除了 "use client": ${filePath}`)
    }

    // 检查是否已经有 dynamic 导出
    if (content.includes("export const dynamic = 'force-dynamic'") || content.includes('export const dynamic = "force-dynamic"')) {
      console.log(`⏭️  跳过（已有 dynamic 导出）: ${filePath}`)
      return false
    }

    // 找到第一个 export function 或 export default 的位置
    const exportMatch = content.match(/(export\s+(default\s+)?function|export\s+default\s+)/m)

    if (exportMatch && exportMatch.index !== undefined) {
      // 在 export 之前插入 dynamic 配置
      const insertPosition = exportMatch.index
      const before = content.slice(0, insertPosition)
      const after = content.slice(insertPosition)

      content = before + `export const dynamic = 'force-dynamic'\n\n` + after
    } else {
      // 如果没有找到 export，在文件末尾添加
      content = content + `\nexport const dynamic = 'force-dynamic'\n`
    }

    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`✅ 已添加 dynamic 配置: ${filePath}`)
    return true
  } catch (error) {
    console.error(`❌ 处理失败 ${filePath}:`, error)
    return false
  }
}

console.log('🚀 开始添加 dynamic 配置以禁用静态生成...\n')

let successCount = 0
let skipCount = 0

for (const file of pageFiles) {
  const result = addDynamicExport(file)
  if (result) {
    successCount++
  } else {
    skipCount++
  }
}

console.log('\n' + '─'.repeat(50))
console.log(`📊 处理完成:`)
console.log(`  ✅ 成功添加: ${successCount} 个文件`)
console.log(`  ⏭️  跳过: ${skipCount} 个文件`)
console.log(`  📄 总计: ${pageFiles.length} 个文件`)
