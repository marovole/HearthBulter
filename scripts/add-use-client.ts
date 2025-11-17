#!/usr/bin/env tsx

/**
 * 批量为页面添加 'use client' 指令
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

function addUseClient(filePath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), filePath)

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  文件不存在: ${filePath}`)
      return false
    }

    let content = fs.readFileSync(fullPath, 'utf-8')

    // 检查是否已经有 'use client'
    if (content.trimStart().startsWith("'use client'") || content.trimStart().startsWith('"use client"')) {
      console.log(`⏭️  跳过（已有 'use client'）: ${filePath}`)
      return false
    }

    // 在文件开头添加 'use client'
    content = `'use client'\n\n${content}`

    fs.writeFileSync(fullPath, content, 'utf-8')
    console.log(`✅ 已添加: ${filePath}`)
    return true
  } catch (error) {
    console.error(`❌ 处理失败 ${filePath}:`, error)
    return false
  }
}

console.log('🚀 开始批量添加 \'use client\' 指令...\n')

let successCount = 0
let skipCount = 0

for (const file of pageFiles) {
  const result = addUseClient(file)
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
