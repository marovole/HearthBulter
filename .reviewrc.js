/**
 * 代码审查开发环境配置
 * 此配置文件用于开发环境的代码审查设置
 */

module.exports = {
  // 开发环境特定的配置
  development: {
    // 放宽一些规则以便于开发
    thresholds: {
      maxComplexity: 15,        // 开发时允许稍高复杂度
      maxLinesPerFunction: 80,  // 允许稍长函数
      maxDuplicateLines: 10,    // 允许更多重复代码
      minSecurityScore: 60,     // 降低安全评分要求
      minMaintainabilityIndex: 50, // 降低可维护性要求
      maxCriticalIssues: 1,     // 允许1个严重问题
      maxHighIssues: 5,         // 允许更多高风险问题
      maxMediumIssues: 20,      // 允许更多中风险问题
      minApprovalRate: 0.7,     // 降低通过率要求
    },

    // 开发环境的失败条件（更宽松）
    failureConditions: {
      criticalIssues: false,    // 开发时不因严重问题失败
      highIssueThreshold: 10,   // 高风险问题阈值提高
      mediumIssueThreshold: 30, // 中风险问题阈值提高
      lowApprovalRate: 0.5,     // 通过率警告阈值降低
      fileMaxComplexity: 20,    // 文件复杂度限制放宽
      fileMaxLines: 500,        // 文件行数限制放宽
      fileMinSecurityScore: 40, // 安全评分下限降低
    },

    // 开发时禁用一些严格的规则
    disabledRules: [
      'style_console_log',      // 开发时允许console.log
      'maintainability_long_function', // 允许长函数
    ],
  },

  // CI/CD环境的配置（更严格）
  ci: {
    thresholds: {
      maxComplexity: 8,
      maxLinesPerFunction: 40,
      maxDuplicateLines: 3,
      minSecurityScore: 80,
      minMaintainabilityIndex: 70,
      maxCriticalIssues: 0,     // CI/CD不允许严重问题
      maxHighIssues: 2,
      maxMediumIssues: 8,
      minApprovalRate: 0.9,
    },

    failureConditions: {
      criticalIssues: true,     // CI/CD中严重问题立即失败
      highIssueThreshold: 3,
      mediumIssueThreshold: 10,
      lowApprovalRate: 0.7,
      fileMaxComplexity: 12,
      fileMaxLines: 250,
      fileMinSecurityScore: 60,
    },

    disabledRules: [], // CI/CD启用所有规则
  },

  // 自定义规则覆盖
  ruleOverrides: {
    // 为特定规则调整严重程度
    'typescript_any_type': {
      severity: 'low', // 开发时any类型问题降级
    },
    'performance_large_array': {
      enabled: false, // 开发时禁用性能检查
    },
  },

  // 文件模式配置
  filePatterns: {
    // 开发时排除更多文件
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/migrations/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/scripts/**', // 排除脚本目录
    ],
    include: [
      'src/**/*.{ts,tsx,js,jsx}',
      'app/**/*.{ts,tsx,js,jsx}',
      'pages/**/*.{ts,tsx,js,jsx}',
      // 开发时不包含配置和脚本文件
    ],
  },

  // 报告配置
  reporting: {
    // 开发环境生成更详细的报告
    verbose: true,
    includeMetrics: true,
    includeSuggestions: true,
    outputFormat: 'both', // 生成markdown和html
  },

  // 集成配置
  integrations: {
    // IDE集成
    vscode: {
      enableLintOnSave: true,
      enableCodeReviewOnCommit: false, // 开发时禁用commit时审查
    },

    // Git集成
    git: {
      enablePreCommitHook: true,
      enableCommitMsgValidation: false,
    },
  },
};

/**
 * 获取当前环境的配置
 */
function getCurrentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = module.exports;

  if (env === 'ci' || env === 'production') {
    return { ...baseConfig.development, ...baseConfig.ci };
  }

  return baseConfig.development;
}

module.exports.getCurrentConfig = getCurrentConfig;
