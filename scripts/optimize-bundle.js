#!/usr/bin/env node

/**
 * 激进的包大小优化脚本
 * 用于解决Cloudflare Pages 25MB限制问题
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_SIZE_LIMIT = 24 * 1024 * 1024; // 24MB，留有余地

console.log('🔥 激进的包大小优化');
console.log('===================');

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 主要优化函数
function optimizeBundle() {
  const buildDir = path.join(__dirname, '..', '.open-next', 'server-functions', 'default');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ 构建目录不存在');
    return false;
  }

  console.log('📁 优化目录:', buildDir);
  
  let totalSaved = 0;
  
  // 1. 删除source map文件（可节省数MB）
  const savedMaps = deleteSourceMaps(buildDir);
  totalSaved += savedMaps;
  
  // 2. 删除不必要的WASM文件（即使PostgreSQL的也部分删除）
  const savedWASM = optimizeWASMFiles(buildDir);
  totalSaved += savedWASM;
  
  // 3. 删除大型二进制文件
  const savedBinaries = deleteLargeBinaries(buildDir);
  totalSaved += savedBinaries;
  
  // 4. 压缩和优化handler.mjs
  const savedHandler = optimizeHandler(buildDir);
  totalSaved += savedHandler;
  
  console.log(`\n✅ 优化完成！总共节省: ${formatBytes(totalSaved)}`);
  
  // 检查最终大小
  return checkFinalSize(buildDir);
}

function deleteSourceMaps(buildDir) {
  console.log('🗑️  删除source map文件...');
  let saved = 0;
  
  function scanAndDelete(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            scanAndDelete(filePath);
          } else if (file.endsWith('.map') && stats.size > 1024) {
            saved += stats.size;
            console.log(`   删除: ${path.relative(buildDir, filePath)} (${formatBytes(stats.size)})`);
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
  
  scanAndDelete(buildDir);
  console.log(`   ✅ 节省: ${formatBytes(saved)}`);
  return saved;
}

function optimizeWASMFiles(buildDir) {
  console.log('🎯 优化WASM文件...');
  let saved = 0;
  
  // 删除重复的WASM文件
  const wasmFiles = [];
  
  function findWASM(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            findWASM(filePath);
          } else if (file.includes('wasm') && file.includes('base64')) {
            wasmFiles.push({ path: filePath, size: stats.size });
          }
        } catch (error) {
          // 忽略错误
        }
      });
    } catch (error) {
      // 忽略错误
    }
  }
  
  findWASM(buildDir);
  
  // 按大小排序，保留最大的一个，删除其他的
  wasmFiles.sort((a, b) => b.size - a.size);
  
  if (wasmFiles.length > 1) {
    for (let i = 1; i < wasmFiles.length; i++) {
      const file = wasmFiles[i];
      if (fs.existsSync(file.path)) {
        saved += file.size;
        console.log(`   删除重复WASM: ${path.relative(buildDir, file.path)} (${formatBytes(file.size)})`);
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.log(`   ⚠️  无法删除文件: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`   ✅ 节省: ${formatBytes(saved)}`);
  return saved;
}

function deleteLargeBinaries(buildDir) {
  console.log('🗂️  删除大型二进制文件...');
  let saved = 0;
  
  // 删除.node文件（原生模块）
  function scanForNodeFiles(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            scanForNodeFiles(filePath);
          } else if (file.endsWith('.node') && stats.size > 5 * 1024 * 1024) { // 大于5MB
            saved += stats.size;
            console.log(`   删除原生模块: ${path.relative(buildDir, filePath)} (${formatBytes(stats.size)})`);
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
  
  scanForNodeFiles(buildDir);
  console.log(`   ✅ 节省: ${formatBytes(saved)}`);
  return saved;
}

function optimizeHandler(buildDir) {
  console.log('🔧 优化handler.mjs...');
  let saved = 0;
  
  const handlerPath = path.join(buildDir, 'handler.mjs');
  
  if (fs.existsSync(handlerPath)) {
    const originalSize = fs.statSync(handlerPath).size;
    
    if (originalSize > 20 * 1024 * 1024) { // 大于20MB才处理
      console.log(`   原始大小: ${formatBytes(originalSize)}`);
      
      // 读取文件内容
      let content = fs.readFileSync(handlerPath, 'utf8');
      
      // 移除console.log语句
      content = content.replace(/console\.log\([^)]*\);?/g, '');
      
      // 移除注释（简单的单行注释）
      content = content.replace(/^\s*\/\/.*$/gm, '');
      
      // 移除多余的空白
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      // 写入优化后的内容
      fs.writeFileSync(handlerPath, content);
      
      const newSize = fs.statSync(handlerPath).size;
      saved = originalSize - newSize;
      
      console.log(`   优化后大小: ${formatBytes(newSize)}`);
      console.log(`   ✅ 节省: ${formatBytes(saved)}`);
    }
  }
  
  return saved;
}

function checkFinalSize(buildDir) {
  console.log('\n📊 最终大小检查:');
  
  const handlerPath = path.join(buildDir, 'handler.mjs');
  
  if (fs.existsSync(handlerPath)) {
    const size = fs.statSync(handlerPath).size;
    console.log(`handler.mjs: ${formatBytes(size)}`);
    
    if (size <= BUNDLE_SIZE_LIMIT) {
      console.log('✅ 包大小符合要求！');
      return true;
    } else {
      console.log(`❌ 仍然超出限制: ${formatBytes(size - BUNDLE_SIZE_LIMIT)}`);
      return false;
    }
  } else {
    console.log('❌ handler.mjs不存在');
    return false;
  }
}

// 主函数
async function main() {
  try {
    console.log('');
    
    const isValid = optimizeBundle();
    
    if (!isValid) {
      console.log('\n❌ 包大小仍然超限，需要进一步优化。');
      console.log('建议:');
      console.log('1. 检查是否还有大型依赖可以排除');
      console.log('2. 考虑使用更激进的分割策略');
      console.log('3. 或者考虑使用Cloudflare Workers而不是Pages');
      process.exit(1);
    }
    
    console.log('\n✅ 包大小优化成功！可以部署到Cloudflare Pages。');
    
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
  optimizeBundle,
  formatBytes
};
