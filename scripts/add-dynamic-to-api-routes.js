#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 为所有使用 auth() 的 API 路由添加 export const dynamic = "force-dynamic"...\n');

// 使用 grep 找到所有使用 auth() 的 API 路由文件
const grepCommand = `grep -r "from '@/lib/auth'" src/app/api --files-with-matches`;

let files;
try {
  const output = execSync(grepCommand, { encoding: 'utf-8' });
  files = output.trim().split('\n').filter(f => f.endsWith('.ts') && !f.includes('.test.'));
} catch (error) {
  console.log('❌ 未找到使用 auth() 的文件');
  process.exit(1);
}

console.log(`📁 找到 ${files.length} 个 API 路由文件\n`);

let modifiedCount = 0;
let skippedCount = 0;
let errorCount = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');

    // 检查是否已经有 export const dynamic
    if (content.includes('export const dynamic')) {
      console.log(`⏭️  跳过（已存在）: ${file}`);
      skippedCount++;
      return;
    }

    // 找到第一个非注释的 import 语句之后的位置
    const lines = content.split('\n');
    let insertIndex = -1;
    let foundFirstImport = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过空行和注释
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
        continue;
      }

      // 找到第一个 import 语句
      if (line.startsWith('import ')) {
        foundFirstImport = true;
        continue;
      }

      // 在所有 import 之后插入
      if (foundFirstImport && !line.startsWith('import ')) {
        insertIndex = i;
        break;
      }
    }

    if (insertIndex === -1) {
      console.log(`⚠️  警告: 无法找到插入位置: ${file}`);
      errorCount++;
      return;
    }

    // 在找到的位置插入配置
    lines.splice(insertIndex, 0, '', '// Force dynamic rendering for auth()', 'export const dynamic = \'force-dynamic\';');

    const newContent = lines.join('\n');
    fs.writeFileSync(file, newContent, 'utf-8');

    console.log(`✅ 修改: ${file}`);
    modifiedCount++;

  } catch (error) {
    console.log(`❌ 错误处理文件 ${file}:`, error.message);
    errorCount++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 处理完成:');
console.log(`  ✅ 修改: ${modifiedCount} 个文件`);
console.log(`  ⏭️  跳过: ${skippedCount} 个文件（已存在配置）`);
console.log(`  ❌ 错误: ${errorCount} 个文件`);
console.log('='.repeat(60) + '\n');

if (modifiedCount > 0) {
  console.log('✨ 成功为所有 API 路由添加动态渲染配置！');
  console.log('💡 下一步: 运行 pnpm build:cloudflare 测试构建');
}
