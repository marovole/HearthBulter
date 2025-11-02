/**
 * 代码质量改进脚本
 * 自动修复常见的代码质量问题
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

// 常见问题模式
const PROBLEMS = {
  CONSOLE_LOG: {
    pattern: /console\.log\(/g,
    description: 'Production console.log statements',
    severity: 'medium'
  },
  ANY_TYPE: {
    pattern: /:\s*any\b|<any>/g,
    description: 'Usage of any type',
    severity: 'high'
  },
  TODO_COMMENTS: {
    pattern: /\/\/ TODO|\/\*[\s\S]*?\*\//g,
    description: 'Unresolved TODO comments',
    severity: 'low'
  },
  EMPTY_USE_EFFECT: {
    pattern: /useEffect\(\(\s*\)\s*,\s*\[\]\)/g,
    description: 'Empty useEffect with empty dependencies',
    severity: 'medium'
  }
};

/**
 * 扫描文件中的问题
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  Object.entries(PROBLEMS).forEach(([key, problem]) => {
    const matches = content.match(problem.pattern);
    if (matches) {
      issues.push({
        type: key,
        count: matches.length,
        severity: problem.severity,
        description: problem.description
      });
    }
  });

  return issues;
}

/**
 * 扫描目录
 */
function scanDirectory(dir) {
  const results = [];
  
  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scan(filePath);
      } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
        const issues = scanFile(filePath);
        if (issues.length > 0) {
          results.push({
            file: filePath,
            issues
          });
        }
      }
    }
  }
  
  scan(dir);
  return results;
}

/**
 * 生成修复建议
 */
function generateFixSuggestions(results) {
  const suggestions = [];
  
  results.forEach(({ file, issues }) => {
    issues.forEach(issue => {
      switch (issue.type) {
        case 'CONSOLE_LOG':
          suggestions.push({
            file,
            type: 'Replace console.log',
            action: 'Replace with appropriate logging service',
            pattern: 'console.log(',
            replacement: 'logger.info('
          });
          break;
          
        case 'ANY_TYPE':
          suggestions.push({
            file,
            type: 'Replace any with specific type',
            action: 'Define proper TypeScript interfaces',
            pattern: ': any',
            replacement: ': <SpecificType>'
          });
          break;
          
        case 'TODO_COMMENTS':
          suggestions.push({
            file,
            type: 'Resolve TODO comments',
            action: 'Complete TODO items or create proper tickets',
            priority: 'high'
          });
          break;
      }
    });
  });
  
  return suggestions;
}

/**
 * 生成报告
 */
function generateReport(results, suggestions) {
  const totalIssues = results.reduce((sum, { issues }) => sum + issues.length, 0);
  
  console.log('\n🔍 代码质量扫描报告');
  console.log('='.repeat(50));
  
  // 按严重程度统计
  const severityStats = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  results.forEach(({ issues }) => {
    issues.forEach(issue => {
      severityStats[issue.severity]++;
    });
  });
  
  console.log('\n📊 问题统计:');
  console.log(`严重 (Critical): ${severityStats.critical}`);
  console.log(`高风险 (High): ${severityStats.high}`);
  console.log(`中等 (Medium): ${severityStats.medium}`);
  console.log(`低风险 (Low): ${severityStats.low}`);
  console.log(`总计: ${totalIssues}`);
  
  // 显示问题文件
  console.log('\n📁 问题文件:');
  results.forEach(({ file, issues }) => {
    console.log(`\n${file}:`);
    issues.forEach(issue => {
      console.log(`  ⚠️  ${issue.description} (${issue.severity}) x${issue.count}`);
    });
  });
  
  // 显示修复建议
  console.log('\n🔧 修复建议:');
  suggestions.forEach((suggestion, index) => {
    console.log(`\n${index + 1}. ${suggestion.type}`);
    console.log(`   文件: ${suggestion.file}`);
    console.log(`   操作: ${suggestion.action}`);
    if (suggestion.pattern) {
      console.log(`   模式: ${suggestion.pattern}`);
      console.log(`   替换: ${suggestion.replacement}`);
    }
  });
  
  // 生成优先级任务列表
  console.log('\n📋 优先级任务:');
  const prioritizedSuggestions = suggestions
    .filter(s => s.type.includes('any') || s.type.includes('TODO'))
    .slice(0, 5);
    
  prioritizedSuggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.type} - ${suggestion.file}`);
  });
  
  return {
    totalIssues,
    severityStats,
    results,
    suggestions
  };
}

// 执行扫描
if (require.main === module) {
  console.log('🔍 开始代码质量扫描...');
  
  const results = scanDirectory(SRC_DIR);
  const suggestions = generateFixSuggestions(results);
  
  const report = generateReport(results, suggestions);
  
  // 保存报告到文件
  const reportPath = path.join(__dirname, '../code-quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  // 设置退出码（用于CI/CD）
  const hasHighSeverityIssues = report.severityStats.high > 0 || report.severityStats.critical > 0;
  process.exit(hasHighSeverityIssues ? 1 : 0);
}

module.exports = {
  scanDirectory,
  generateFixSuggestions,
  generateReport
};
