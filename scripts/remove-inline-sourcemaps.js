#!/usr/bin/env node

/**
 * 删除 handler.mjs 中的内联 source maps
 * 这些 source maps 占用大量空间但不会影响功能
 */

const fs = require('fs');
const path = require('path');

const serverFunctionsDir = path.join(__dirname, '..', '.open-next', 'server-functions', 'default');
const handlerPath = path.join(serverFunctionsDir, 'handler.mjs');

if (!fs.existsSync(handlerPath)) {
  console.log('⚠️  handler.mjs 不存在');
  process.exit(1);
}

console.log('🔧 删除内联 source maps...');

// 读取文件
const content = fs.readFileSync(handlerPath, 'utf8');

// 删除内联 source maps（格式：//# sourceMappingURL=data:application/json;base64,...）
const cleanedContent = content.replace(/\n\/\/\# sourceMappingURL=data:application\/json[^\n]*/g, '');

// 写入清理后的内容
fs.writeFileSync(handlerPath, cleanedContent);

// 检查新的大小
const newSize = fs.statSync(handlerPath).size;
const oldSize = content.length;

console.log(`📊 原始大小: ${(oldSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`📊 清理后大小: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`✅ 释放空间: ${((oldSize - newSize) / 1024 / 1024).toFixed(2)} MB`);

if (newSize > 25 * 1024 * 1024) {
  console.log('⚠️  警告: 文件仍然超过 25MB 限制！');
  process.exit(1);
} else {
  console.log('✅ Bundle 大小符合要求！');
}