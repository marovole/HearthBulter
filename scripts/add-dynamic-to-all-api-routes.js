#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 为所有 API 路由添加 export const dynamic = "force-dynamic"...\n');

// 找到所有 API 路由文件
const grepCommand = `find src/app/api -name "route.ts" -type f`;

let files;
try {
  const output = execSync(grepCommand, { encoding: 'utf-8' });
  files = output.trim().split('\n').filter(f => f && !f.includes('.test.'));
} catch (error) {
  console.log('❌ 未找到文件');
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

    const lines = content.split('\n');
    let insertIndex = -1;
    let inImport = false;
    let braceCount = 0;
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 跳过注释和文档注释
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '/**') {
        continue;
      }

      // 检测 import 语句
      if (trimmed.startsWith('import ')) {
        inImport = true;

        // 计算括号
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        // 单行 import 或者括号已平衡
        if (!line.includes('{') || braceCount === 0) {
          lastImportIndex = i;
          inImport = false;
        }
      } else if (inImport) {
        // 在多行 import 内部
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        if (braceCount === 0) {
          lastImportIndex = i;
          inImport = false;
        }
      } else if (lastImportIndex !== -1 && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        // 找到第一个非 import、非注释、非空行的位置
        insertIndex = i;
        break;
      }
    }

    // 如果没有找到合适的位置，在最后一个 import 后面插入
    if (insertIndex === -1 && lastImportIndex !== -1) {
      insertIndex = lastImportIndex + 1;
    }

    // 如果还是没找到，在文件开头插入（在第一个非注释行之前）
    if (insertIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          insertIndex = i;
          break;
        }
      }
    }

    if (insertIndex === -1) {
      console.log(`⚠️  警告: 无法找到插入位置: ${file}`);
      errorCount++;
      return;
    }

    // 在找到的位置插入配置
    lines.splice(insertIndex, 0, '', '// Force dynamic rendering', 'export const dynamic = \'force-dynamic\';');

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
}
