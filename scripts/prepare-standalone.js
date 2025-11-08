#!/usr/bin/env node

/**
 * 准备 standalone 目录供 OpenNext 使用
 * 将嵌套的 .next 目录复制到正确的位置
 */

const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('⚠️  standalone 目录不存在');
  process.exit(0);
}

console.log('🔧 准备 standalone 目录...');

// 查找实际的 .next 目录
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

// 删除并重新创建目标目录
const targetNextDir = path.join(standaloneDir, '.next');
if (fs.existsSync(targetNextDir)) {
  console.log('🗑️  删除已存在的 .next 目录');
  fs.rmSync(targetNextDir, { recursive: true, force: true });
}

// 复制 .next 目录到正确位置
console.log('📋 复制 .next 目录...');
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.lstatSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(actualNextDir, targetNextDir);
console.log('✅ .next 目录复制完成');

// 同时复制 server.js 和 package.json
const actualServerJs = path.join(path.dirname(actualNextDir), 'server.js');
const targetServerJs = path.join(standaloneDir, 'server.js');
if (fs.existsSync(actualServerJs)) {
  fs.copyFileSync(actualServerJs, targetServerJs);
  console.log('✅ server.js 复制完成');
}

const actualPackageJson = path.join(path.dirname(actualNextDir), 'package.json');
const targetPackageJson = path.join(standaloneDir, 'package.json');
if (fs.existsSync(actualPackageJson)) {
  fs.copyFileSync(actualPackageJson, targetPackageJson);
  console.log('✅ package.json 复制完成');
}

console.log('✅ standalone 目录准备完成');