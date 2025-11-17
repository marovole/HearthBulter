#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import glob from 'glob'

function addDynamicExport(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf-8')

    // 检查是否已经有 dynamic 导出
    if (content.includes("export const dynamic = 'force-dynamic'")) {
      return false
    }

    // 找到第一个 export function 或 export default 的位置
    const exportMatch = content.match(/(^|\n)(export\s+(default\s+)?function|export\s+default\s+)/m)

    if (exportMatch && exportMatch.index !== undefined) {
      const insertPosition = exportMatch.index + (exportMatch[1] ? exportMatch[1].length : 0)
      const before = content.slice(0, insertPosition)
      const after = content.slice(insertPosition)

      content = before + `export const dynamic = 'force-dynamic'\n\n` + after
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log(`✅ 已添加: ${filePath}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`❌ 处理失败 ${filePath}:`, error)
    return false
  }
}

// 查找所有 page.tsx 文件
const files = glob.sync('src/app/**/page.tsx')

console.log(`🔍 找到 ${files.length} 个页面文件\n`)

let successCount = 0
let skipCount = 0

files.forEach((file) => {
  const fullPath = path.join(process.cwd(), file)
  const result = addDynamicExport(fullPath)
  if (result) {
    successCount++
  } else {
    skipCount++
  }
})

console.log('\n' + '─'.repeat(50))
console.log(`📊 处理完成:`)
console.log(`  ✅ 成功添加: ${successCount} 个文件`)
console.log(`  ⏭️  跳过: ${skipCount} 个文件`)
