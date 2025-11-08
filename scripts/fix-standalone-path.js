#!/usr/bin/env node

/**
 * 修复 Next.js standalone 输出路径问题
 * Next.js standalone 会创建嵌套目录，但 OpenNext 期望扁平结构
 */

const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
const targetDir = path.join(standaloneDir, '.next');

if (!fs.existsSync(standaloneDir)) {
  console.log('⚠️  standalone 目录不存在');
  process.exit(0);
}

console.log('🔧 修复 standalone 路径...');

// 查找实际的 .next 目录（在嵌套路径中）
function findNextDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.lstatSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item === '.next') {
        return fullPath;
      }
      const found = findNextDir(fullPath);
      if (found) return found;
    }
  }
  return null;
}

const actualNextDir = findNextDir(standaloneDir);

if (!actualNextDir) {
  console.log('⚠️  找不到 .next 目录');
  process.exit(0);
}

console.log(`📂 找到 .next 目录: ${actualNextDir}`);

// 如果目标位置不存在，创建符号链接
if (!fs.existsSync(targetDir)) {
  console.log(`🔗 创建符号链接: ${targetDir} -> ${actualNextDir}`);
  fs.symlinkSync(actualNextDir, targetDir, 'dir');
  console.log('✅ 符号链接创建成功');
} else {
  console.log('✅ 符号链接已存在');
}

// 同时检查 server 目录
const serverDir = path.join(standaloneDir, 'server');
if (!fs.existsSync(serverDir)) {
  const actualServerDir = path.join(path.dirname(actualNextDir), 'server');
  if (fs.existsSync(actualServerDir)) {
    console.log(`🔗 创建 server 符号链接: ${serverDir} -> ${actualServerDir}`);
    fs.symlinkSync(actualServerDir, serverDir, 'dir');
  }
}