#!/usr/bin/env node

/**
 * 代码审查报告生成器
 * 生成详细的代码审查报告（Markdown和HTML格式）
 */

const fs = require('fs');
const path = require('path');

// 模拟的审查结果数据结构（在实际使用中，这些数据会从codeReviewService生成）
function generateMockReviewData() {
  return {
    summary: {
      totalFiles: 15,
      approvedFiles: 12,
      approvalRate: 0.8,
      totalIssues: 8,
      criticalIssues: 1,
      highIssues: 2,
      mediumIssues: 3,
      lowIssues: 2,
    },
    files: [
      {
        path: 'src/lib/services/code-review-service.ts',
        approved: true,
        issues: [
          { type: 'complexity', severity: 'medium', description: '函数复杂度较高' },
        ],
        metrics: { complexity: 8, linesOfCode: 120, securityScore: 85, maintainabilityIndex: 75 },
      },
      {
        path: 'src/components/ui/code-review-panel.tsx',
        approved: false,
        issues: [
          { type: 'typescript', severity: 'high', description: '使用any类型' },
          { type: 'style', severity: 'low', description: '包含console.log' },
        ],
        metrics: { complexity: 12, linesOfCode: 200, securityScore: 75, maintainabilityIndex: 65 },
      },
    ],
    issuesByCategory: {
      complexity: 3,
      security: 1,
      typescript: 2,
      style: 1,
      performance: 1,
    },
    trends: {
      averageComplexity: 9.2,
      averageSecurityScore: 82.5,
      averageMaintainabilityIndex: 71.8,
    },
  };
}

// 生成Markdown报告
function generateMarkdownReport(data) {
  const { summary, files, issuesByCategory, trends } = data;

  let report = '# 代码审查报告\n\n';
  report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

  // 总体摘要
  report += '## 📊 总体摘要\n\n';
  report += `| 指标 | 值 |\n`;
  report += `|------|-----|\n`;
  report += `| 总文件数 | ${summary.totalFiles} |\n`;
  report += `| 通过文件数 | ${summary.approvedFiles} |\n`;
  report += `| 通过率 | ${(summary.approvalRate * 100).toFixed(1)}% |\n`;
  report += `| 总问题数 | ${summary.totalIssues} |\n`;
  report += `| 严重问题 | ${summary.criticalIssues} |\n`;
  report += `| 高风险问题 | ${summary.highIssues} |\n`;
  report += `| 中风险问题 | ${summary.mediumIssues} |\n`;
  report += `| 低风险问题 | ${summary.lowIssues} |\n\n`;

  // 问题分类
  report += '## 🏷️ 问题分类\n\n';
  Object.entries(issuesByCategory).forEach(([category, count]) => {
    const categoryNames = {
      complexity: '复杂度',
      security: '安全',
      typescript: 'TypeScript',
      style: '代码风格',
      performance: '性能',
    };
    report += `- ${categoryNames[category] || category}: ${count} 个问题\n`;
  });
  report += '\n';

  // 趋势分析
  report += '## 📈 趋势分析\n\n';
  report += `| 指标 | 平均值 |\n`;
  report += `|------|--------|\n`;
  report += `| 复杂度 | ${trends.averageComplexity.toFixed(1)} |\n`;
  report += `| 安全评分 | ${trends.averageSecurityScore.toFixed(1)} |\n`;
  report += `| 可维护性指数 | ${trends.averageMaintainabilityIndex.toFixed(1)} |\n\n`;

  // 文件详情
  report += '## 📁 文件详情\n\n';
  files.forEach(file => {
    const status = file.approved ? '✅ 通过' : '❌ 需要改进';
    report += `### ${file.path}\n\n`;
    report += `**状态**: ${status}\n\n`;

    if (file.issues.length > 0) {
      report += '**发现的问题**:\n\n';
      file.issues.forEach(issue => {
        const severityIcon = issue.severity === 'critical' ? '🚨' :
                           issue.severity === 'high' ? '⚠️' :
                           issue.severity === 'medium' ? 'ℹ️' : '💡';
        report += `- ${severityIcon} ${issue.description} (${issue.type})\n`;
      });
      report += '\n';
    }

    report += '**代码指标**:\n\n';
    report += `- 复杂度: ${file.metrics.complexity}\n`;
    report += `- 代码行数: ${file.metrics.linesOfCode}\n`;
    report += `- 安全评分: ${file.metrics.securityScore}\n`;
    report += `- 可维护性指数: ${file.metrics.maintainabilityIndex}\n\n`;
  });

  // 建议
  report += '## 💡 改进建议\n\n';
  report += '1. **类型安全**: 减少any类型的使用，确保所有变量都有明确的类型定义\n';
  report += '2. **代码复杂度**: 将复杂函数拆分为更小的函数，提高可读性和可维护性\n';
  report += '3. **安全检查**: 定期检查SQL注入、XSS等安全漏洞\n';
  report += '4. **代码风格**: 统一代码格式，使用ESLint和Prettier保持一致性\n';
  report += '5. **性能优化**: 关注大数组操作和重复代码，优化算法复杂度\n\n';

  return report;
}

// 生成HTML报告
function generateHtmlReport(data) {
  const markdown = generateMarkdownReport(data);

  // 简单的Markdown到HTML转换（实际项目中可以使用专门的库）
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\| (.+?) \| (.+?) \|/g, '<td>$1</td><td>$2</td>')
    .replace(/\|------\|-----\|/g, '<th></th><th></th>');

  // 包装HTML结构
  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码审查报告</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .status-passed {
            color: #28a745;
        }
        .status-failed {
            color: #dc3545;
        }
        .metric-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
        }
        .issues-list {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;

  return fullHtml;
}

// 保存报告到文件
function saveReport(content, filename) {
  const outputDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`报告已保存到: ${filePath}`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--html') ? 'html' : 'markdown';

  console.log('🔍 生成代码审查报告...\n');

  // 生成模拟数据（实际使用时会从真实的审查结果生成）
  const reviewData = generateMockReviewData();

  if (format === 'html') {
    const htmlReport = generateHtmlReport(reviewData);
    saveReport(htmlReport, 'code-review-report.html');
  } else {
    const markdownReport = generateMarkdownReport(reviewData);
    saveReport(markdownReport, 'code-review-report.md');
  }

  console.log('✅ 报告生成完成');
}

// 导出函数供其他模块使用
module.exports = {
  generateMarkdownReport,
  generateHtmlReport,
  generateMockReviewData,
};

if (require.main === module) {
  main();
}
