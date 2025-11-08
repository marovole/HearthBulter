#!/usr/bin/env node

/**
 * 包大小检查脚本
 * 用于检查Cloudflare Workers构建输出的大小
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_SIZE_LIMIT = 25 * 1024 * 1024; // 25MB
const WORKER_SIZE_LIMIT = 1 * 1024 * 1024;  // 1MB

console.log('📊 Cloudflare Workers包大小检查');
console.log('==================================');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkBuildOutput() {
  const buildDir = path.join(__dirname, '..', '.open-next');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ 构建输出目录不存在');
    return false;
  }

  console.log('📁 构建输出目录:', buildDir);
  
  // 检查主要文件大小
  const files = [
    { path: '_worker.js', limit: WORKER_SIZE_LIMIT },
    { path: 'worker.js', limit: WORKER_SIZE_LIMIT },
    { path: 'server-functions/default/handler.mjs', limit: BUNDLE_SIZE_LIMIT }
  ];

  let totalSize = 0;
  let hasIssues = false;

  files.forEach(file => {
    const filePath = path.join(buildDir, file.path);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      totalSize += size;
      
      const percentage = (size / file.limit * 100).toFixed(1);
      const status = size <= file.limit ? '✅' : '❌';
      const color = size <= file.limit ? '\x1b[32m' : '\x1b[31m';
      
      console.log(`${color}${status} ${file.path}: ${formatBytes(size)} / ${formatBytes(file.limit)} (${percentage}%)\x1b[0m`);
      
      if (size > file.limit) {
        hasIssues = true;
        console.log(`   ⚠️  超出限制: ${formatBytes(size - file.limit)}`);
      }
    } else {
      console.log(`⚠️  文件不存在: ${file.path}`);
    }
  });

  // 检查整个构建目录
  const getDirectorySize = (dirPath) => {
    let size = 0;
    try {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      });
    } catch (error) {
      // 忽略无法读取的文件
    }
    return size;
  };

  const totalBuildSize = getDirectorySize(buildDir);
  console.log(`\n📦 总构建大小: ${formatBytes(totalBuildSize)}`);
  
  // 检查特定大型文件
  console.log('\n🔍 大型文件检查:');
  const largeFiles = findLargeFiles(buildDir, 1024 * 1024); // 大于1MB的文件
  
  if (largeFiles.length > 0) {
    console.log('发现以下大型文件:');
    largeFiles.forEach(file => {
      console.log(`  - ${file.path}: ${formatBytes(file.size)}`);
    });
  } else {
    console.log('✅ 未发现超过1MB的大型文件');
  }

  return !hasIssues;
}

function findLargeFiles(dirPath, minSize) {
  const largeFiles = [];
  
  function scanDirectory(currentPath) {
    try {
      const files = fs.readdirSync(currentPath);
      
      files.forEach(file => {
        const filePath = path.join(currentPath, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            scanDirectory(filePath);
          } else if (stats.size > minSize) {
            largeFiles.push({
              path: path.relative(path.join(__dirname, '..', '.open-next'), filePath),
              size: stats.size
            });
          }
        } catch (error) {
          // 忽略无法读取的文件
        }
      });
    } catch (error) {
      // 忽略无法读取的目录
    }
  }
  
  scanDirectory(dirPath);
  return largeFiles.sort((a, b) => b.size - a.size); // 按大小排序
}

function provideOptimizationSuggestions(largeFiles) {
  console.log('\n💡 优化建议:');
  
  const hasPrismaWASM = largeFiles.some(f => f.path.includes('wasm'));
  const hasPuppeteer = largeFiles.some(f => f.path.includes('puppeteer'));
  
  if (hasPrismaWASM) {
    console.log('1. Prisma WASM文件过大:');
    console.log('   - 在open-next.config.ts中配置includeDatabases: ["postgresql"]');
    console.log('   - 排除其他数据库引擎的WASM文件');
  }
  
  if (hasPuppeteer) {
    console.log('2. Puppeteer依赖过大:');
    console.log('   - 考虑使用条件导入，在Cloudflare环境中排除');
    console.log('   - 或使用更轻量的替代方案');
  }
  
  console.log('3. 通用优化:');
    console.log('   - 启用代码压缩和tree shaking');
    console.log('   - 移除source map文件');
    console.log('   - 使用代码分割');
}

function main() {
  console.log('');
  
  const isValid = checkBuildOutput();
  
  if (!isValid) {
    console.log('\n❌ 包大小检查失败！需要优化。');
    process.exit(1);
  }
  
  console.log('\n✅ 包大小检查通过！可以部署到Cloudflare Pages。');
  console.log('');
  console.log('🚀 准备部署:');
  console.log('1. 确保所有功能测试通过');
  console.log('2. 配置环境变量');
  console.log('3. 执行部署命令');
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  checkBuildOutput,
  findLargeFiles,
  formatBytes
};
