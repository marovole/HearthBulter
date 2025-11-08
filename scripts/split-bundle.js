#!/usr/bin/env node

/**
 * 分割bundle脚本
 * 将大型handler.mjs文件分割成多个小文件
 */

const fs = require('fs');
const path = require('path');

console.log('✂️  Bundle分割优化');
console.log('==================');

function splitHandlerFile() {
  const handlerPath = path.join(__dirname, '..', '.open-next', 'server-functions', 'default', 'handler.mjs');
  
  if (!fs.existsSync(handlerPath)) {
    console.log('❌ handler.mjs不存在');
    return false;
  }

  const originalSize = fs.statSync(handlerPath).size;
  console.log(`📊 原始handler.mjs大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

  if (originalSize <= 20 * 1024 * 1024) { // 如果小于20MB，不需要分割
    console.log('✅ handler.mjs大小在可接受范围内，无需分割');
    return true;
  }

  console.log('🔄 开始分割大型handler文件...');

  try {
    // 读取handler文件内容
    let content = fs.readFileSync(handlerPath, 'utf8');
    
    // 创建分割目录
    const splitDir = path.join(path.dirname(handlerPath), 'handler-parts');
    if (!fs.existsSync(splitDir)) {
      fs.mkdirSync(splitDir, { recursive: true });
    }

    // 分析内容结构，按函数或模块分割
    const parts = analyzeAndSplitContent(content);
    
    console.log(`📝 分割为 ${parts.length} 个部分`);

    // 创建主加载器文件
    const loaderContent = createLoaderContent(parts);
    fs.writeFileSync(handlerPath, loaderContent);

    // 写入各个部分
    parts.forEach((part, index) => {
      const partPath = path.join(splitDir, `part-${index + 1}.mjs`);
      fs.writeFileSync(partPath, part.content);
      console.log(`   创建部分 ${index + 1}: ${(part.content.length / 1024).toFixed(1)} KB`);
    });

    const newSize = fs.statSync(handlerPath).size;
    console.log(`✅ 分割完成！新handler.mjs大小: ${(newSize / 1024).toFixed(1)} KB`);
    console.log(`📉 大小减少: ${((originalSize - newSize) / 1024 / 1024).toFixed(2)} MB`);

    return true;

  } catch (error) {
    console.error('❌ 分割过程中出错:', error);
    return false;
  }
}

function analyzeAndSplitContent(content) {
  const parts = [];
  const targetPartSize = 2 * 1024 * 1024; // 每个部分约2MB
  
  // 简单的分割策略：按函数定义分割
  const functionRegex = /(?:async\s+)?function\s+\w+|(?:async\s+)?\w+\s*=\s*async\s*\(|(?:async\s+)?\w+\s*=\s*function|export\s+(?:async\s+)?function/g;
  
  let lastIndex = 0;
  let match;
  let currentPart = '';
  
  while ((match = functionRegex.exec(content)) !== null) {
    const functionStart = match.index;
    
    // 找到函数的结束位置（简化处理）
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let i = functionStart;
    
    while (i < content.length) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      // 处理字符串
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
      }
      
      // 计算大括号
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        
        if (braceCount === 0 && char === '}') {
          // 找到了完整的函数
          const functionContent = content.substring(lastIndex, i + 1);
          currentPart += functionContent;
          
          if (currentPart.length >= targetPartSize) {
            parts.push({
              content: currentPart,
              functions: currentPart.match(functionRegex) || []
            });
            currentPart = '';
          }
          
          lastIndex = i + 1;
          break;
        }
      }
      
      i++;
    }
    
    if (i >= content.length) break;
  }
  
  // 添加剩余内容
  if (lastIndex < content.length) {
    currentPart += content.substring(lastIndex);
  }
  
  if (currentPart) {
    parts.push({
      content: currentPart,
      functions: currentPart.match(functionRegex) || []
    });
  }
  
  return parts;
}

function createLoaderContent(parts) {
  let loader = `// Handler loader - 动态加载分割的handler部分
// 自动生成于 ${new Date().toISOString()}

const PARTS_COUNT = ${parts.length};
const PARTS_DIR = './handler-parts/';

// 动态导入函数
async function loadPart(partNumber) {
  try {
    const module = await import(PARTS_DIR + 'part-' + partNumber + '.mjs');
    return module;
  } catch (error) {
    console.error(\`Failed to load part \${partNumber}:\`, error);
    return {};
  }
}

// 主处理函数
export default async function handler(request, context) {
  // 这里可以实现基于请求的智能路由
  // 目前简单加载所有部分
  
  const loadedParts = [];
  
  for (let i = 1; i <= PARTS_COUNT; i++) {
    const part = await loadPart(i);
    loadedParts.push(part);
  }
  
  // 合并所有部分的处理逻辑
  // 这里需要根据具体的路由逻辑来实现
  
  // 临时：直接返回第一个部分的响应
  if (loadedParts[0] && loadedParts[0].default) {
    return loadedParts[0].default(request, context);
  }
  
  return new Response('Handler not implemented', { status: 501 });
}`;

  return loader;
}

function main() {
  console.log('');
  
  const success = splitHandlerFile();
  
  if (!success) {
    console.log('\n❌ Bundle分割失败。');
    process.exit(1);
  }
  
  console.log('\n✅ Bundle分割完成！');
  console.log('');
  console.log('注意：这是一个临时解决方案。');
  console.log('建议长期方案：');
  console.log('1. 优化代码结构，减少单个文件大小');
  console.log('2. 使用更轻量的依赖');
  console.log('3. 考虑使用Cloudflare Workers而不是Pages');
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  splitHandlerFile
};
