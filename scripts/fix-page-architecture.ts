#!/usr/bin/env tsx
// @ts-nocheck - glob 模块版本冲突，临时跳过类型检查

import fs from 'fs'
import path from 'path'
import glob from 'glob'

// 检测文件是否使用了客户端 hooks
function usesClientHooks(content: string): boolean {
  const clientHooks = [
    'useState',
    'useEffect',
    'useSession',
    'useRouter',
    'usePathname',
    'useSearchParams',
    'useContext',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
  ]

  return clientHooks.some((hook) => {
    const pattern = new RegExp(`\\b${hook}\\s*\\(`, 'm')
    return pattern.test(content)
  })
}

// 检测文件是否使用了服务器端函数
function usesServerFunctions(content: string): boolean {
  const serverFunctions = [
    'await auth\\(',
    'from \'@/lib/auth\'',
    'prisma\\.',
    'cookies\\(',
    'headers\\(',
  ]

  return serverFunctions.some((pattern) => {
    const regex = new RegExp(pattern, 'm')
    return regex.test(content)
  })
}

// 检测是否已经是 async 函数
function isAsyncComponent(content: string): boolean {
  return /export\s+default\s+async\s+function/.test(content)
}

// 检测是否已有 'use client'
function hasUseClient(content: string): boolean {
  return /^['"]use client['"]/.test(content.trimStart())
}

function fixPageArchitecture(filePath: string): { action: string; reason: string } | null {
  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    const relativePath = path.relative(process.cwd(), filePath)

    // 已经有 'use client' - 确保移除 async
    if (hasUseClient(content)) {
      if (isAsyncComponent(content)) {
        content = content.replace(
          /export\s+default\s+async\s+function/,
          'export default function'
        )
        fs.writeFileSync(filePath, content, 'utf-8')
        return { action: '移除 async（客户端组件）', reason: relativePath }
      }
      return null
    }

    const hasHooks = usesClientHooks(content)
    const hasServerFunc = usesServerFunctions(content)
    const isAsync = isAsyncComponent(content)

    // 情况 1：使用 hooks 但没有服务器函数 -> 添加 'use client'
    if (hasHooks && !hasServerFunc) {
      // 移除 async 如果存在
      if (isAsync) {
        content = content.replace(
          /export\s+default\s+async\s+function/,
          'export default function'
        )
      }

      // 移除 dynamic 配置（客户端组件不需要）
      content = content.replace(/export\s+const\s+dynamic\s+=\s+['"]force-dynamic['"]\s*\n\s*\n?/g, '')

      // 添加 'use client' 在文件开头
      content = `'use client'\n\n${content}`

      fs.writeFileSync(filePath, content, 'utf-8')
      return { action: '添加 use client（纯客户端）', reason: relativePath }
    }

    // 情况 2：使用服务器函数但没有 hooks -> 保持服务器组件
    if (hasServerFunc && !hasHooks) {
      // 确保是 async
      if (!isAsync) {
        content = content.replace(
          /export\s+default\s+function/,
          'export default async function'
        )
      }

      // 确保有 dynamic 配置
      if (!content.includes("export const dynamic = 'force-dynamic'")) {
        const exportMatch = content.match(/(^|\n)(export\s+default\s+)/m)
        if (exportMatch && exportMatch.index !== undefined) {
          const insertPosition = exportMatch.index + (exportMatch[1] ? exportMatch[1].length : 0)
          const before = content.slice(0, insertPosition)
          const after = content.slice(insertPosition)
          content = before + `export const dynamic = 'force-dynamic'\n\n` + after
        }
      }

      fs.writeFileSync(filePath, content, 'utf-8')
      return { action: '确保 async + dynamic（服务器组件）', reason: relativePath }
    }

    // 情况 3：同时使用服务器函数和 hooks -> 需要拆分（暂时标记为客户端）
    if (hasServerFunc && hasHooks) {
      console.warn(`⚠️  需要手动拆分（同时使用服务器和客户端功能）: ${relativePath}`)

      // 暂时采用客户端方案
      if (isAsync) {
        content = content.replace(
          /export\s+default\s+async\s+function/,
          'export default function'
        )
      }

      content = content.replace(/export\s+const\s+dynamic\s+=\s+['"]force-dynamic['"]\s*\n\s*\n?/g, '')
      content = `'use client'\n\n${content}`

      fs.writeFileSync(filePath, content, 'utf-8')
      return { action: '添加 use client（需手动优化）', reason: relativePath }
    }

    // 情况 4：都不使用 -> 保持服务器组件（默认）
    return null
  } catch (error) {
    console.error(`❌ 处理失败 ${filePath}:`, error)
    return null
  }
}

const files: string[] = glob.sync('src/app/**/page.tsx')

console.log(`🔍 找到 ${files.length} 个页面文件\n`)
console.log('📊 分析并修复页面架构...\n')

const results = {
  useClient: [] as string[],
  serverComponent: [] as string[],
  needsSplit: [] as string[],
  skipped: 0,
}

files.forEach((file: string) => {
  const fullPath = path.join(process.cwd(), file)
  const result = fixPageArchitecture(fullPath)

  if (result) {
    if (result.action.includes('use client')) {
      if (result.action.includes('需手动优化')) {
        results.needsSplit.push(result.reason)
        console.log(`⚠️  ${result.action}: ${result.reason}`)
      } else {
        results.useClient.push(result.reason)
        console.log(`✅ ${result.action}: ${result.reason}`)
      }
    } else {
      results.serverComponent.push(result.reason)
      console.log(`✅ ${result.action}: ${result.reason}`)
    }
  } else {
    results.skipped++
  }
})

console.log('\n' + '─'.repeat(60))
console.log('📊 处理结果:')
console.log(`  ✅ 客户端组件: ${results.useClient.length}`)
console.log(`  ✅ 服务器组件: ${results.serverComponent.length}`)
console.log(`  ⚠️  需要手动拆分: ${results.needsSplit.length}`)
console.log(`  ⏭️  跳过: ${results.skipped}`)
console.log(`  📄 总计: ${files.length}`)

if (results.needsSplit.length > 0) {
  console.log('\n⚠️  以下页面需要手动拆分成服务器 + 客户端组件:')
  results.needsSplit.forEach((file) => console.log(`  - ${file}`))
}
