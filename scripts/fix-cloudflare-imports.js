const fs = require('fs');
const path = require('path');

console.log('🔧 修复 Cloudflare 文件中的 Node.js 导入...\n');

// 模块到 stub 的映射
const moduleToStub = {
  'async_hooks': '../node-stubs/async_hooks.js',
  'process': '../node-stubs/process.js',
  'stream': '../node-stubs/stream.js',
  'buffer': '../node-stubs/buffer.js',
  'crypto': '../node-stubs/crypto.js',
  'querystring': '../node-stubs/querystring.js',
  'path': '../node-stubs/path.js',
};

const filesToFix = [
  '.open-next/cloudflare/init.js',
  '.open-next/cloudflare/skew-protection.js',
  '.open-next/middleware/handler.mjs'
];

let totalFixed = 0;

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  ${file} 不存在，跳过`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixed = 0;
  
  // 替换每个需要 stub 的模块导入
  Object.entries(moduleToStub).forEach(([moduleName, stubPath]) => {
    // 匹配: import xxx from "moduleName"
    // 或: import { xxx } from "moduleName"
    const importPattern = new RegExp(
      `(import\\s+(?:{[^}]+}|\\w+)\\s+from\\s+["'])${moduleName}(["'])`,
      'g'
    );
    
    if (importPattern.test(content)) {
      content = content.replace(importPattern, `$1${stubPath}$2`);
      fileFixed++;
    }
  });
  
  if (fileFixed > 0) {
    // 备份
    if (!fs.existsSync(filePath + '.stub-backup')) {
      fs.copyFileSync(filePath, filePath + '.stub-backup');
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ ${file}: 修复了 ${fileFixed} 个导入`);
    totalFixed += fileFixed;
  } else {
    console.log(`  - ${file}: 无需修复`);
  }
});

console.log(`\n✅ 总共修复了 ${totalFixed} 个导入`);

if (totalFixed > 0) {
  console.log('\n💡 提示: 现在可以尝试运行 wrangler pages dev 测试');
}
