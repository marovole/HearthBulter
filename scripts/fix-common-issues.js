/**
 * 修复常见代码质量问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '../src');

/**
 * 修复console.log问题
 */
function fixConsoleLogs() {
  console.log('🔧 修复console.log问题...');
  
  // 查找包含console.log的文件
  const { execSync } = require('child_process');
  try {
    const result = execSync(`grep -r "console\\.log(" "${SRC_DIR}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l`, { encoding: 'utf8' });
    const files = result.trim().split('\n');
    
    files.forEach(file => {
      console.log(`  修复文件: ${file}`);
      let content = fs.readFileSync(file, 'utf8');
      
      // 替换console.log为适当的日志方法
      content = content.replace(/console\.log\(/g, 'logger.info(');
      
      fs.writeFileSync(file, content);
    });
    
    console.log(`✅ 修复了 ${files.length} 个文件中的console.log问题`);
  } catch (error) {
    console.log('✅ 没有发现console.log问题');
  }
}

/**
 * 修复空useEffect依赖
 */
function fixEmptyUseEffects() {
  console.log('🔧 检查useEffect依赖问题...');
  
  const { execSync } = require('child_process');
  try {
    const result = execSync(`grep -r "useEffect(\\s*)()" "${SRC_DIR}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -n`, { encoding: 'utf8' });
    const matches = result.trim().split('\n');
    
    if (matches.length > 0) {
      console.log('⚠️  发现以下空的useEffect调用:');
      matches.forEach(match => console.log(`  ${match}`));
      console.log('💡 建议: 检查这些useEffect是否需要依赖数组');
    } else {
      console.log('✅ 没有发现空的useEffect调用');
    }
  } catch (error) {
    console.log('✅ 没有发现空的useEffect调用');
  }
}

/**
 * 检查TODO注释
 */
function checkTODOComments() {
  console.log('🔍 检查TODO注释...');
  
  const { execSync } = require('child_process');
  try {
    const result = execSync(`grep -r -n "TODO\\|FIXME\\|HACK\\|XXX" "${SRC_DIR}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"`, { encoding: 'utf8' });
    const todos = result.trim().split('\n');
    
    if (todos.length > 0) {
      console.log('⚠️  发现以下TODO/FIXME注释:');
      todos.forEach(todo => console.log(`  ${todo}`));
      console.log(`\n💡 建议: 解决这些TODO项或创建对应的任务卡片`);
    } else {
      console.log('✅ 没有发现未解决的TODO注释');
    }
  } catch (error) {
    console.log('✅ 没有发现TODO注释');
  }
}

/**
 * 运行TypeScript类型检查
 */
function runTypeCheck() {
  console.log('🔍 运行TypeScript类型检查...');
  
  try {
    execSync('npm run type-check', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ TypeScript类型检查通过');
  } catch (error) {
    console.log('❌ TypeScript类型检查失败，请修复类型错误');
  }
}

/**
 * 运行ESLint检查
 */
function runESLint() {
  console.log('🔍 运行ESLint检查...');
  
  try {
    execSync('npm run lint', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ ESLint检查通过');
  } catch (error) {
    console.log('❌ ESLint检查失败，请修复linting错误');
  }
}

/**
 * 生成修复报告
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    fixes: {
      consoleLogs: '已将console.log替换为logger.info',
      useEffectDeps: '已检查useEffect依赖数组',
      todoComments: '已识别TODO注释需要处理',
      typeCheck: '建议运行npm run type-check',
      eslint: '建议运行npm run lint:fix'
    },
    recommendations: [
      '运行 npm run type-check 修复类型错误',
      '运行 npm run lint:fix 自动修复ESLint问题',
      '手动处理TODO注释，将它们转换为任务或删除',
      '为API错误处理添加统一的错误处理机制',
      '考虑添加更多的单元测试和集成测试'
    ]
  };
  
  const reportPath = path.join(__dirname, '../fixes-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 修复报告已保存到: ${reportPath}`);
}

// 执行所有修复
function main() {
  console.log('🔧 开始修复常见代码质量问题...');
  console.log('='.repeat(50));
  
  fixConsoleLogs();
  fixEmptyUseEffects();
  checkTODOComments();
  generateReport();
  
  console.log('\n📋 建议后续操作:');
  console.log('1. npm run type-check  # 修复类型错误');
  console.log('2. npm run lint:fix  # 自动修复代码风格问题');
  console.log('3. 手动处理TODO注释');
  console.log('4. 添加更多测试覆盖');
  
  console.log('\n✅ 代码质量改进完成！');
}

if (require.main === module) {
  main();
}

module.exports = {
  fixConsoleLogs,
  fixEmptyUseEffects,
  checkTODOComments,
  runTypeCheck,
  runESLint,
  generateReport
};
