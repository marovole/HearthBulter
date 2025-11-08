#!/usr/bin/env node

/**
 * 极端Bundle优化脚本
 * 针对Cloudflare Workers免费版3MB限制
 */

const fs = require('fs');
const path = require('path');

const FREE_WORKER_LIMIT = 3 * 1024 * 1024; // 3MB
const TARGET_SIZE = 2.5 * 1024 * 1024; // 目标2.5MB，留有余地

console.log('🔥 极端Bundle优化（针对3MB限制）');
console.log('=====================================');

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function extremeOptimization() {
  const workerPath = path.join(__dirname, '..', '.open-next', 'worker.js');
  const handlerPath = path.join(__dirname, '..', '.open-next', 'server-functions', 'default', 'handler.mjs');
  
  if (!fs.existsSync(workerPath) || !fs.existsSync(handlerPath)) {
    console.log('❌ 必要的构建文件不存在');
    return false;
  }

  console.log('📊 原始文件大小：');
  console.log(`- worker.js: ${formatBytes(fs.statSync(workerPath).size)}`);
  console.log(`- handler.mjs: ${formatBytes(fs.statSync(handlerPath).size)}`);

  console.log('\n🎯 开始极端优化...');

  let totalSaved = 0;

  // 1. 删除所有source map文件（激进）
  const savedMaps = deleteAllSourceMaps();
  totalSaved += savedMaps;

  // 2. 删除不必要的依赖
  const savedDeps = removeUnnecessaryDependencies();
  totalSaved += savedDeps;

  // 3. 压缩和简化代码
  const savedCompression = compressCode();
  totalSaved += savedCompression;

  // 4. 分割大型bundle
  const savedSplit = splitLargeBundle();
  totalSaved += savedSplit;

  console.log(`\n✅ 优化完成！总共节省: ${formatBytes(totalSaved)}`);

  // 检查最终大小
  return checkFinalSizes();
}

function deleteAllSourceMaps() {
  console.log('🗑️  删除所有source map文件...');
  let saved = 0;
  
  const buildDir = path.join(__dirname, '..', '.open-next', 'server-functions', 'default');
  
  function deleteMaps(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            deleteMaps(filePath);
          } else if (file.endsWith('.map')) {
            saved += stats.size;
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          // 忽略错误
        }
      });
    } catch (error) {
      // 忽略错误
    }
  }
  
  deleteMaps(buildDir);
  console.log(`   ✅ 节省: ${formatBytes(saved)}`);
  return saved;
}

function removeUnnecessaryDependencies() {
  console.log('🎯 删除不必要的依赖...');
  let saved = 0;
  
  const buildDir = path.join(__dirname, '..', '.open-next', 'server-functions', 'default');
  
  // 要删除的大型依赖模式
  const patterns = [
    'node_modules/**/*.map',
    'node_modules/**/test/**',
    'node_modules/**/tests/**',
    'node_modules/**/docs/**',
    'node_modules/**/examples/**',
    'node_modules/**/benchmark/**',
    'node_modules/**/perf/**',
    'node_modules/**/*.md',
    'node_modules/**/*.txt',
    'node_modules/**/*.d.ts',
    // 特定的大型依赖
    'node_modules/.pnpm/next@*/node_modules/next/dist/server/capsize-font-metrics.json',
    'node_modules/next/dist/server/capsize-font-metrics.json',
  ];
  
  patterns.forEach(pattern => {
    const deleted = deleteByPattern(buildDir, pattern);
    saved += deleted;
  });
  
  console.log(`   ✅ 节省: ${formatBytes(saved)}`);
  return saved;
}

function deleteByPattern(dir, pattern) {
  let saved = 0;
  
  function scanAndDelete(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            scanAndDelete(filePath);
          } else if (file.match(pattern) || filePath.match(pattern)) {
            if (stats.size > 10000) { // 只删除大于10KB的文件
              saved += stats.size;
              console.log(`   删除: ${path.relative(dir, filePath)} (${formatBytes(stats.size)})`);
              fs.unlinkSync(filePath);
            }
          }
        } catch (error) {
          // 忽略错误
        }
      });
    } catch (error) {
      // 忽略错误
    }
  }
  
  scanAndDelete(dir);
  return saved;
}

function compressCode() {
  console.log('🗜️  压缩代码...');
  let saved = 0;
  
  const handlerPath = path.join(__dirname, '..', '.open-next', 'server-functions', 'default', 'handler.mjs');
  
  if (fs.existsSync(handlerPath)) {
    const originalSize = fs.statSync(handlerPath).size;
    
    if (originalSize > 10 * 1024 * 1024) { // 大于10MB才处理
      console.log(`   原始大小: ${formatBytes(originalSize)}`);
      
      let content = fs.readFileSync(handlerPath, 'utf8');
      
      // 激进的压缩策略
      content = content
        .replace(/console\.(log|warn|error|info)\([^)]*\);?/g, '') // 删除所有console语句
        .replace(/\/\*[\s\S]*?\*\//g, '') // 删除多行注释
        .replace(/\/\/.*$/gm, '') // 删除单行注释
        .replace(/\n\s*\n\s*\n/g, '\n') // 删除多余空行
        .replace(/\t/g, ' ') // 替换制表符为空格
        .replace(/ {2,}/g, ' ') // 合并多余空格
        .replace(/;\s*}/g, '}') // 优化分号
        .trim();
      
      // 写入压缩后的内容
      fs.writeFileSync(handlerPath, content);
      
      const newSize = fs.statSync(handlerPath).size;
      saved = originalSize - newSize;
      
      console.log(`   压缩后大小: ${formatBytes(newSize)}`);
      console.log(`   ✅ 节省: ${formatBytes(saved)}`);
    }
  }
  
  return saved;
}

function splitLargeBundle() {
  console.log('✂️  分割大型bundle...');
  let saved = 0;
  
  // 创建轻量级替代方案
  const lightWorkerPath = path.join(__dirname, '..', '.open-next', 'worker-light.mjs');
  
  const lightWorkerContent = `// 轻量级Worker实现
// 针对3MB限制优化

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 基础健康检查
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: 'lightweight'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 基础API响应
    if (url.pathname === '/api/status') {
      return new Response(JSON.stringify({
        status: 'running',
        environment: 'cloudflare-workers',
        optimized: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 默认响应
    return new Response('Health Butler Light - Cloudflare Workers Optimized', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
`;

  fs.writeFileSync(lightWorkerPath, lightWorkerContent);
  console.log(`   ✅ 创建轻量级Worker: ${formatBytes(fs.statSync(lightWorkerPath).size)}`);
  
  return saved;
}

function checkFinalSizes() {
  console.log('\n📊 最终大小检查：');
  
  const workerPath = path.join(__dirname, '..', '.open-next', 'worker.js');
  const handlerPath = path.join(__dirname, '..', '.open-next', 'server-functions', 'default', 'handler.mjs');
  
  if (fs.existsSync(workerPath)) {
    const workerSize = fs.statSync(workerPath).size;
    console.log(`worker.js: ${formatBytes(workerSize)}`);
    
    if (workerSize <= FREE_WORKER_LIMIT) {
      console.log('✅ worker.js符合3MB限制！');
      return true;
    } else {
      console.log(`❌ worker.js仍然超出限制: ${formatBytes(workerSize - FREE_WORKER_LIMIT)}`);
    }
  }
  
  if (fs.existsSync(handlerPath)) {
    const handlerSize = fs.statSync(handlerPath).size;
    console.log(`handler.mjs: ${formatBytes(handlerSize)}`);
  }
  
  return false;
}

function createDeploymentAlternatives() {
  console.log('\n💡 部署替代方案：');
  console.log('1. 升级到付费Workers计划（支持10MB）');
  console.log('2. 使用更激进的分割策略');
  console.log('3. 考虑其他边缘平台');
  console.log('4. 重新架构为微服务');
}

// 主函数
async function main() {
  try {
    console.log('');
    
    const isValid = extremeOptimization();
    
    if (!isValid) {
      console.log('\n❌ 极端优化后仍然超限。');
      createDeploymentAlternatives();
      
      console.log('\n🎯 推荐方案：');
      console.log('1. 升级到Cloudflare Workers付费计划');
      console.log('2. 使用轻量级Worker作为临时方案');
      console.log('3. 考虑Vercel或其他平台');
      
      process.exit(1);
    }
    
    console.log('\n✅ 极端优化成功！可以部署到Cloudflare Workers免费版。');
    
  } catch (error) {
    console.error('❌ 优化过程中出错:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  extremeOptimization,
  formatBytes
};
