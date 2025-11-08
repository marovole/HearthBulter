#!/usr/bin/env node

/**
 * 压缩 handler.mjs - 删除注释、空白等
 * 这是最后的手段，因为可能会破坏代码
 */

const fs = require('fs');
const path = require('path');

const serverFunctionsDir = path.join(__dirname, '..', '.open-next', 'server-functions', 'default');
const handlerPath = path.join(serverFunctionsDir, 'handler.mjs');

if (!fs.existsSync(handlerPath)) {
  console.log('⚠️  handler.mjs 不存在');
  process.exit(1);
}

console.log('🔧 压缩 handler.mjs...');

// 读取文件
const content = fs.readFileSync(handlerPath, 'utf8');

// 删除单行注释（保留 import/export 语句）
let cleaned = content.replace(/^(?!\s*(import|export))[^'"]*\/\/.*$/gm, '$1');

// 删除多行注释
// cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

// 压缩空白
// cleaned = cleaned.replace(/\s+/g, ' ');

// 写入清理后的内容
fs.writeFileSync(handlerPath, cleaned);

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