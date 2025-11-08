#!/usr/bin/env node

/**
 * Prisma Bundle 优化脚本
 * 用于在 Cloudflare Workers 构建中排除 Prisma 本地二进制文件
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 优化 Prisma Bundle 大小...');

const openNextDir = path.join(__dirname, '..', '.open-next');
const serverFunctionsDir = path.join(openNextDir, 'server-functions', 'default');

if (!fs.existsSync(serverFunctionsDir)) {
  console.log('⚠️  server-functions 目录不存在，跳过优化');
  process.exit(0);
}

// 需要删除的大型文件和目录
const targetsToRemove = [
  // Prisma 本地二进制文件
  'node_modules/.pnpm/@prisma+client@*.node',
  'node_modules/.pnpm/@prisma+engines@*',
  'node_modules/.prisma/client/libquery_engine-*.node',
  'node_modules/.prisma/client/libquery_engine-*.dylib',
  'node_modules/.prisma/client/libquery_engine-*.so',
  // 大型字体文件
  'node_modules/next/dist/server/capsize-font-metrics.json',
  '**/capsize-font-metrics.json',
  // Meta JSON 文件
  'handler.mjs.meta.json',
  '**/*.meta.json',
  // 其他大型依赖
  'node_modules/puppeteer',
  'node_modules/@sparticuz/chromium',
  'node_modules/chrome-aws-lambda',
  'node_modules/puppeteer-core',
  // WASM 文件
  '**/*.wasm',
  '**/*.wasm-base64.js',
  // 其他不必要的文件
  '**/*.map', // Source maps
  '**/README*',
  '**/CHANGELOG*',
  '**/HISTORY*',
];

let removedCount = 0;
let removedSize = 0;

function findAndRemove(dir, pattern) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.lstatSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归处理子目录
      if (file.includes('prisma') || file.includes('puppeteer') || file.includes('chromium')) {
        // 直接删除整个目录
        try {
          const size = getDirectorySize(fullPath);
          fs.rmSync(fullPath, { recursive: true, force: true });
          removedCount++;
          removedSize += size;
          console.log(`  ✓ 删除目录: ${fullPath} (${formatSize(size)})`);
        } catch (e) {
          console.log(`  ✗ 无法删除目录: ${fullPath}`);
        }
      } else {
        findAndRemove(fullPath, pattern);
      }
    } else {
      // 检查文件是否匹配模式
      const shouldRemove = targetsToRemove.some(target => {
        if (target.includes('*')) {
          const regex = new RegExp(target.replace(/\*/g, '.*'));
          return regex.test(file) || regex.test(fullPath);
        }
        return fullPath.includes(target);
      });
      
      if (shouldRemove) {
        try {
          removedCount++;
          removedSize += stat.size;
          fs.unlinkSync(fullPath);
          console.log(`  ✓ 删除文件: ${fullPath} (${formatSize(stat.size)})`);
        } catch (e) {
          console.log(`  ✗ 无法删除文件: ${fullPath}`);
        }
      }
    }
  });
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.lstatSync(fullPath);
      
      if (stat.isDirectory()) {
        totalSize += getDirectorySize(fullPath);
      } else {
        totalSize += stat.size;
      }
    });
  } catch (e) {
    // 忽略错误
  }
  
  return totalSize;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 执行清理
console.log('📂 清理 server-functions 目录...');
findAndRemove(serverFunctionsDir);

// 清理 middleware 目录（如果存在）
const middlewareDir = path.join(openNextDir, 'middleware');
if (fs.existsSync(middlewareDir)) {
  console.log('📂 清理 middleware 目录...');
  findAndRemove(middlewareDir);
}

console.log(`\n✅ 清理完成！`);
console.log(`   - 删除文件/目录: ${removedCount} 个`);
console.log(`   - 释放空间: ${formatSize(removedSize)}`);

// 压缩 handler.mjs - 已禁用，因为会导致语法错误
// 文件删除已经足够让 bundle 符合大小要求
function compressHandler() {
  const handlerPath = path.join(serverFunctionsDir, 'handler.mjs');
  
  if (!fs.existsSync(handlerPath)) {
    console.log('⚠️  handler.mjs 不存在');
    return;
  }
  
  // 只读取文件大小，不进行压缩
  try {
    const stats = fs.statSync(handlerPath);
    console.log(`📊 handler.mjs 当前大小: ${formatSize(stats.size)}`);
    return stats.size;
  } catch (e) {
    console.log(`  ✗ 读取文件大小失败: ${e.message}`);
    return null;
  }
}

// 重新检查 bundle 大小
const handlerPath = path.join(serverFunctionsDir, 'handler.mjs');
if (fs.existsSync(handlerPath)) {
  // 先压缩文件
  compressHandler();
  
  const stats = fs.statSync(handlerPath);
  console.log(`\n📊 最终 handler.mjs 大小: ${formatSize(stats.size)}`);
  
  if (stats.size > 25 * 1024 * 1024) {
    console.log('⚠️  警告: 文件仍然超过 25MB 限制！');
    process.exit(1);
  } else {
    console.log('✅ Bundle 大小符合要求！');
  }
}