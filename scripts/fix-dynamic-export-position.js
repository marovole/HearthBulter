#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复 export const dynamic 的插入位置...\n');

// 找到所有包含错误插入的文件
const grepCommand = `grep -r "export const dynamic = 'force-dynamic';" src/app/api --files-with-matches`;

let files;
try {
  const output = execSync(grepCommand, { encoding: 'utf-8' });
  files = output.trim().split('\n').filter(f => f.endsWith('.ts') && !f.includes('.test.'));
} catch (error) {
  console.log('❌ 未找到文件');
  process.exit(1);
}

console.log(`📁 找到 ${files.length} 个文件\n`);

let fixedCount = 0;
let errorCount = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');

    // 检查是否有语法错误：export const dynamic 在 import 语句内部
    // 这种情况会有模式：import { ... export const dynamic ...
    const hasError = /import\s+\{[^}]*export\s+const\s+dynamic/s.test(content);

    if (!hasError) {
      return;
    }

    // 移除所有 "// Force dynamic rendering for auth()" 和 "export const dynamic = 'force-dynamic';" 行
    let lines = content.split('\n');
    lines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed !== '// Force dynamic rendering for auth()' &&
             trimmed !== "export const dynamic = 'force-dynamic';";
    });

    // 找到所有 import 语句结束的位置
    let lastImportIndex = -1;
    let inImport = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 跳过注释
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
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
      }
    }

    if (lastImportIndex === -1) {
      console.log(`⚠️  警告: 未找到 import 语句: ${file}`);
      errorCount++;
      return;
    }

    // 在最后一个 import 语句之后插入
    lines.splice(lastImportIndex + 1, 0, '', '// Force dynamic rendering for auth()', 'export const dynamic = \'force-dynamic\';');

    const newContent = lines.join('\n');
    fs.writeFileSync(file, newContent, 'utf-8');

    console.log(`✅ 修复: ${file}`);
    fixedCount++;

  } catch (error) {
    console.log(`❌ 错误处理文件 ${file}:`, error.message);
    errorCount++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 处理完成:');
console.log(`  ✅ 修复: ${fixedCount} 个文件`);
console.log(`  ❌ 错误: ${errorCount} 个文件`);
console.log('='.repeat(60) + '\n');

if (fixedCount > 0) {
  console.log('✨ 成功修复所有文件！');
}
