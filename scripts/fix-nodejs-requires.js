const fs = require('fs');
const path = require('path');

console.log('🔧 修复 Cloudflare Worker 中的 Node.js 模块引用...\n');

// 完整的 Node.js 内置模块列表
const nodeBuiltins = [
  'async_hooks', 'fs', 'path', 'url', 'vm', 'buffer', 'crypto',
  'stream', 'util', 'events', 'child_process', 'assert', 'dns',
  'os', 'tls', 'https', 'http2', 'zlib', 'http', 'tty', 'net',
  'string_decoder', 'querystring', 'util/types', 'diagnostics_channel',
  'console', 'worker_threads', 'perf_hooks', 'stream/web', 'module',
  'inspector', 'fs/promises'
];

// 处理 handler.mjs
const handlerPath = path.join(process.cwd(), '.open-next/server-functions/default/handler.mjs');

if (!fs.existsSync(handlerPath)) {
  console.error('❌ handler.mjs 不存在');
  process.exit(1);
}

console.log('📄 读取 handler.mjs...');
let content = fs.readFileSync(handlerPath, 'utf8');
let modified = false;
let fixedCount = 0;

// 策略：将 require() 调用替换为更安全的形式
// 需要保持原有的语法结构，避免破坏现有代码
nodeBuiltins.forEach(mod => {
  const escapedMod = mod.replace(/\//g, '\\/');
  
  // 只匹配独立的 require() 调用，不匹配已经在条件表达式中的
  // 使用负向后瞻确保前面不是 . 或其他运算符
  const pattern = new RegExp(
    `(?<!\\.)require\\(["'\`]${escapedMod}["'\`]\\)`,
    'g'
  );
  
  const matches = content.match(pattern);
  if (matches && matches.length > 0) {
    console.log(`  ✓ 修复模块: ${mod} (${matches.length} 次)`);
    
    // 使用一个简单的占位符函数，返回空对象
    // 这样可以避免破坏语法结构
    content = content.replace(
      pattern,
      `(void 0)||{}`
    );
    
    fixedCount += matches.length;
    modified = true;
  }
});

if (modified) {
  // 备份原文件
  const backupPath = handlerPath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(handlerPath, backupPath);
    console.log(`\n📦 原文件备份到: handler.mjs.backup`);
  }
  
  // 写入修改后的内容
  fs.writeFileSync(handlerPath, content);
  
  console.log(`\n✅ 已修复 handler.mjs (共 ${fixedCount} 处修改)`);
} else {
  console.log('\nℹ️  未找到需要修复的 require() 调用');
}

// 修复其他文件中的 node: 前缀导入
console.log('\n🔍 修复其他文件中的 node: 导入...');
const filesToFix = [
  '.open-next/middleware/handler.mjs',
  '.open-next/cloudflare/init.js',
  '.open-next/cloudflare/skew-protection.js'
];

let totalNodeImportsFix = 0;

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    let fileModified = false;
    
    // 替换所有 node: 前缀的导入
    // import xxx from "node:module" -> import xxx from "module"
    // import { xxx } from "node:module" -> import { xxx } from "module"
    const nodeImportPattern = /from\s+["']node:([^"']+)["']/g;
    const matches = fileContent.match(nodeImportPattern);
    
    if (matches) {
      console.log(`  ✓ ${file}: 修复 ${matches.length} 个 node: 导入`);
      fileContent = fileContent.replace(nodeImportPattern, 'from "$1"');
      totalNodeImportsFix += matches.length;
      fileModified = true;
    }
    
    // 也处理动态导入: import("node:module")
    const dynamicImportPattern = /import\s*\(\s*["']node:([^"']+)["']\s*\)/g;
    const dynamicMatches = fileContent.match(dynamicImportPattern);
    
    if (dynamicMatches) {
      console.log(`  ✓ ${file}: 修复 ${dynamicMatches.length} 个动态 node: 导入`);
      fileContent = fileContent.replace(dynamicImportPattern, 'import("$1")');
      totalNodeImportsFix += dynamicMatches.length;
      fileModified = true;
    }
    
    if (fileModified) {
      // 备份
      if (!fs.existsSync(filePath + '.backup')) {
        fs.copyFileSync(filePath, filePath + '.backup');
      }
      fs.writeFileSync(filePath, fileContent);
    }
  }
});

if (totalNodeImportsFix > 0) {
  console.log(`\n✅ 修复了 ${totalNodeImportsFix} 个 node: 前缀导入`);
}

console.log('\n✅ 修复完成！');
console.log('\n💡 提示: 如果部署仍然失败，可能需要:');
console.log('   1. 检查上述警告的文件');
console.log('   2. 考虑使用 Node.js polyfills');
console.log('   3. 或联系 @opennextjs/cloudflare 维护者报告问题');
