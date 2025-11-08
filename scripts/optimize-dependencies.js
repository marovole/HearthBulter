#!/usr/bin/env node

/**
 * 依赖优化脚本
 * 用于在构建前优化依赖项，减少Cloudflare Workers包大小
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始优化依赖项...');

// 需要排除的大型依赖项
const EXCLUDE_PACKAGES = [
  'puppeteer',
  '@sparticuz/chromium',
  'chrome-aws-lambda',
  'puppeteer-core',
  // Prisma的其他数据库引擎
  '@prisma/client/runtime/query_engine_bg.mysql.wasm',
  '@prisma/client/runtime/query_engine_bg.sqlite.wasm',
  '@prisma/client/runtime/query_engine_bg.sqlserver.wasm',
  '@prisma/client/runtime/query_engine_bg.cockroachdb.wasm',
  '@prisma/client/runtime/query_compiler_bg.mysql.wasm',
  '@prisma/client/runtime/query_compiler_bg.sqlite.wasm',
  '@prisma/client/runtime/query_compiler_bg.sqlserver.wasm',
  '@prisma/client/runtime/query_compiler_bg.cockroachdb.wasm',
];

// 优化node_modules中的依赖
function optimizeNodeModules() {
  console.log('📦 优化node_modules...');
  
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('⚠️  node_modules不存在，跳过优化');
    return;
  }

  let optimizedCount = 0;
  
  // 删除大型WASM文件
  EXCLUDE_PACKAGES.forEach(packageName => {
    if (packageName.includes('.wasm')) {
      const wasmPattern = packageName.replace(/\./g, '\\.');
      findAndDeleteWASM(nodeModulesPath, wasmPattern);
      optimizedCount++;
    }
  });
  
  console.log(`✅ 优化完成，处理了 ${optimizedCount} 个依赖项`);
}

// 查找并删除WASM文件
function findAndDeleteWASM(basePath, pattern) {
  try {
    const files = fs.readdirSync(basePath, { recursive: true });
    
    files.forEach(file => {
      if (file.includes('wasm') && file.match(new RegExp(pattern))) {
        const filePath = path.join(basePath, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isFile() && stats.size > 1000000) { // 大于1MB的WASM文件
            console.log(`🗑️  删除大型WASM文件: ${file} (${(stats.size/1024/1024).toFixed(2)}MB)`);
            fs.unlinkSync(filePath);
          }
        }
      }
    });
  } catch (error) {
    console.log(`⚠️  处理WASM文件时出错: ${error.message}`);
  }
}

// 优化package.json
function optimizePackageJson() {
  console.log('📋 优化package.json...');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // 添加Cloudflare特定的构建配置
  if (!packageJson.cloudflare) {
    packageJson.cloudflare = {
      exclude: EXCLUDE_PACKAGES,
      optimize: true
    };
  }
  
  // 添加构建脚本
  if (!packageJson.scripts['build:cloudflare-optimized']) {
    packageJson.scripts['build:cloudflare-optimized'] = 
      'pnpm run optimize-deps && pnpm run build:cloudflare && pnpm run check-bundle-size';
  }
  
  if (!packageJson.scripts['optimize-deps']) {
    packageJson.scripts['optimize-deps'] = 'node scripts/optimize-dependencies.js';
  }
  
  if (!packageJson.scripts['check-bundle-size']) {
    packageJson.scripts['check-bundle-size'] = 'node scripts/check-bundle-size.js';
  }
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json优化完成');
}

// 创建Cloudflare环境检查工具
function createCloudflareUtils() {
  console.log('🔧 创建Cloudflare工具...');
  
  const utilsPath = path.join(__dirname, '..', 'src', 'lib', 'cloudflare-utils.ts');
  
  const utilsContent = `// Cloudflare环境工具函数
export const isCloudflare = typeof WebSocketPair !== 'undefined';

// 条件导入大型依赖
export const getPdfParser = async () => {
  if (isCloudflare) {
    console.warn('PDF parsing not available in Cloudflare environment');
    return null;
  }
  try {
    return await import('puppeteer');
  } catch (error) {
    console.error('Failed to import puppeteer:', error);
    return null;
  }
};

// 条件执行函数
export const runIfNotCloudflare = async (fn: Function) => {
  if (isCloudflare) {
    console.warn('Function not available in Cloudflare environment');
    return null;
  }
  return await fn();
};
`;

  // 确保目录存在
  const libDir = path.dirname(utilsPath);
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  
  fs.writeFileSync(utilsPath, utilsContent);
  console.log('✅ Cloudflare工具创建完成');
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始依赖优化流程...');
    
    optimizeNodeModules();
    optimizePackageJson();
    createCloudflareUtils();
    
    console.log('🎉 依赖优化完成！');
    console.log('');
    console.log('下一步:');
    console.log('1. 运行: pnpm run build:cloudflare-optimized');
    console.log('2. 检查构建输出大小');
    console.log('3. 部署到Cloudflare Pages');
    
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
  optimizeNodeModules,
  optimizePackageJson,
  createCloudflareUtils
};
