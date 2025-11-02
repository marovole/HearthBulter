#!/usr/bin/env node

/**
 * Pre-commit代码审查钩子
 * 对即将提交的文件进行自动化代码审查
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取暂存的文件列表
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    console.error('Failed to get staged files:', error.message);
    return [];
  }
}

// 过滤需要审查的文件类型
function filterCodeFiles(files) {
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  const excludePatterns = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.next/,
    /coverage/,
    /\.test\./,
    /\.spec\./,
  ];

  return files.filter(file => {
    const ext = path.extname(file);
    const isCodeFile = codeExtensions.includes(ext);
    const isExcluded = excludePatterns.some(pattern => pattern.test(file));

    return isCodeFile && !isExcluded;
  });
}

// 确定文件类型
function getFileType(filePath) {
  const ext = path.extname(filePath);

  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'react';
    case '.js':
      return 'javascript';
    case '.jsx':
      return 'react';
    default:
      return 'other';
  }
}

// 简单的代码审查（由于无法直接运行TypeScript，这里使用简单的检查）
function performSimpleReview(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    // 检查any类型使用
    if (content.includes(': any') || content.includes('<any>')) {
      issues.push({
        type: 'typescript',
        severity: 'medium',
        description: '检测到any类型使用',
        file: filePath,
      });
    }

    // 检查console.log
    if (content.includes('console.log(')) {
      issues.push({
        type: 'style',
        severity: 'low',
        description: '检测到console.log语句',
        file: filePath,
      });
    }

    // 检查函数长度（简化检查）
    const lines = content.split('\n').length;
    if (lines > 100) {
      issues.push({
        type: 'maintainability',
        severity: 'medium',
        description: '文件过长，可能需要拆分',
        file: filePath,
      });
    }

    return issues;
  } catch (error) {
    console.error(`Failed to review ${filePath}:`, error.message);
    return [];
  }
}

// 主函数
function main() {
  console.log('🔍 正在进行代码审查...\n');

  const stagedFiles = getStagedFiles();
  const codeFiles = filterCodeFiles(stagedFiles);

  if (codeFiles.length === 0) {
    console.log('✅ 没有需要审查的代码文件');
    return;
  }

  console.log(`📁 发现 ${codeFiles.length} 个代码文件待审查:`);
  codeFiles.forEach(file => console.log(`  - ${file}`));
  console.log();

  let totalIssues = 0;
  let criticalIssues = 0;
  const allIssues = [];

  // 对每个文件进行审查
  for (const filePath of codeFiles) {
    console.log(`🔍 审查 ${filePath}...`);
    const issues = performSimpleReview(filePath);

    if (issues.length > 0) {
      issues.forEach(issue => {
        allIssues.push(issue);
        totalIssues++;

        if (issue.severity === 'critical') {
          criticalIssues++;
        }

        const severityIcon = issue.severity === 'critical' ? '🚨' :
                           issue.severity === 'high' ? '⚠️' :
                           issue.severity === 'medium' ? 'ℹ️' : '💡';

        console.log(`  ${severityIcon} ${issue.description} (${issue.type})`);
      });
    } else {
      console.log(`  ✅ 通过审查`);
    }
  }

  console.log(`\n📊 审查结果:`);
  console.log(`  - 检查文件数: ${codeFiles.length}`);
  console.log(`  - 发现问题数: ${totalIssues}`);
  console.log(`  - 严重问题数: ${criticalIssues}`);

  // 根据严重程度决定是否阻止提交
  if (criticalIssues > 0) {
    console.log('\n❌ 发现严重问题，提交被阻止。请修复后再提交。');
    console.log('💡 提示: 运行 "npm run lint" 和 "npm run type-check" 检查代码');
    process.exit(1);
  } else if (totalIssues > 0) {
    console.log('\n⚠️ 发现一些问题，但不阻止提交。请考虑修复这些问题。');
    console.log('💡 提示: 运行 "npm run lint" 检查代码风格');
  } else {
    console.log('\n✅ 所有文件通过代码审查！');
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main, performSimpleReview, filterCodeFiles, getStagedFiles };
