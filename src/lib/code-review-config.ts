/**
 * 代码审查规则配置文件
 * 定义项目特定的代码审查规则和配置
 */

import { CodeReviewRule } from './services/code-review-service';

export interface CodeReviewConfig {
  rules: CodeReviewRule[];
  thresholds: {
    maxComplexity: number;
    maxLinesPerFunction: number;
    maxDuplicateLines: number;
    minSecurityScore: number;
    minMaintainabilityIndex: number;
    maxCriticalIssues: number;
    maxHighIssues: number;
    maxMediumIssues: number;
    minApprovalRate: number;
  };
  failureConditions: {
    criticalIssues: boolean;
    highIssueThreshold: number;
    mediumIssueThreshold: number;
    lowApprovalRate: number;
    fileMaxComplexity: number;
    fileMaxLines: number;
    fileMinSecurityScore: number;
  };
  filePatterns: {
    exclude: string[];
    include: string[];
  };
  severityOverrides: Record<string, CodeReviewRule['severity']>;
}

/**
 * 默认代码审查配置
 */
export const defaultCodeReviewConfig: CodeReviewConfig = {
  rules: [
    // 复杂度检查
    {
      id: 'complexity_high',
      name: '高复杂度函数',
      description: '检测复杂度过高的函数',
      condition: (content, filePath) => {
        const functionMatches =
          content.match(/function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g) || [];
        // 简化的复杂度检查 - 实际实现需要更复杂的分析
        return functionMatches.some(
          (func) => (func.match(/\bif\b|\bfor\b|\bwhile\b/g) || []).length > 5,
        );
      },
      severity: 'medium',
      type: 'complexity',
      recommendation: '考虑将复杂函数拆分为更小的函数，提高可读性和可维护性',
      enabled: true,
      fileTypes: ['typescript', 'javascript', 'react'],
    },

    // 安全漏洞检查
    {
      id: 'security_sql_injection',
      name: 'SQL注入风险',
      description: '检测潜在的SQL注入漏洞',
      keywords: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      pattern: /\$\{[^}]*(?:req\.|query\.|body\.)/gi,
      condition: (content) => {
        const hasSQLKeywords = /(?:SELECT|INSERT|UPDATE|DELETE)\s+/i.test(
          content,
        );
        const hasStringInterpolation = /\$\{[^}]*\}/.test(content);
        return hasSQLKeywords && hasStringInterpolation;
      },
      severity: 'critical',
      type: 'security',
      recommendation: '使用参数化查询或预编译语句，避免直接拼接SQL字符串',
      enabled: true,
    },

    // TypeScript类型检查
    {
      id: 'typescript_any_type',
      name: '使用any类型',
      description: '检测代码中不推荐使用的any类型',
      pattern: /\bany\b/g,
      condition: (content) =>
        content.includes(': any') || content.includes('<any>'),
      severity: 'medium',
      type: 'typescript',
      recommendation: '使用具体的类型定义替换any类型，提高类型安全性',
      enabled: true,
      fileTypes: ['typescript', 'react'],
    },

    // 性能问题检查
    {
      id: 'performance_large_array',
      name: '大数组操作',
      description: '检测可能影响性能的大数组操作',
      condition: (content) => {
        const largeArrayOps =
          content.match(/\w+\.map\(|\w+\.filter\(|\w+\.reduce\(/g) || [];
        return largeArrayOps.length > 5; // 简单阈值检测
      },
      severity: 'low',
      type: 'performance',
      recommendation: '考虑使用更高效的数据结构或算法优化大数组操作',
      enabled: true,
    },

    // 代码风格检查
    {
      id: 'style_console_log',
      name: '遗留的console.log',
      description: '检测生产环境中不应该存在的console.log语句',
      pattern: /console\.log\(/g,
      condition: (content) => content.includes('console.log('),
      severity: 'low',
      type: 'style',
      recommendation: '移除或替换为适当的日志记录方法',
      enabled: true,
    },

    // 可维护性检查
    {
      id: 'maintainability_long_function',
      name: '过长函数',
      description: '检测行数过多的函数',
      condition: (content) => {
        const lines = content.split('\n').length;
        return lines > 50;
      },
      severity: 'medium',
      type: 'maintainability',
      recommendation: '将长函数拆分为更小的函数，提高代码可读性',
      enabled: true,
    },

    // 项目特定的自定义规则示例
    {
      id: 'project_naming_convention',
      name: '项目命名规范',
      description: '检查是否遵循项目的命名规范',
      pattern: /\b[a-z]+_[a-z]+\b/g, // snake_case 检查
      condition: (content, filePath) => {
        // 在TypeScript文件中检查interface命名
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          const interfaceMatches = content.match(/interface\s+\w+/g) || [];
          return interfaceMatches.some(
            (match) =>
              !match.includes('I') && !/^[A-Z]/.test(match.split(' ')[1]),
          );
        }
        return false;
      },
      severity: 'low',
      type: 'style',
      recommendation: '接口名称应该以大写字母开头，或使用I前缀',
      enabled: true,
      fileTypes: ['typescript', 'react'],
    },

    // React特定的规则
    {
      id: 'react_hooks_dependency',
      name: 'React Hooks依赖检查',
      description: '检查useEffect和其他hooks的依赖数组',
      condition: (content, filePath) => {
        if (!filePath.endsWith('.tsx')) return false;

        // 检查是否有useEffect但缺少依赖数组
        const useEffectMatches = content.match(/useEffect\s*\(/g) || [];
        const dependencyArrays =
          content.match(/useEffect\s*\([^,]+,\s*\[/g) || [];

        return useEffectMatches.length > dependencyArrays.length;
      },
      severity: 'medium',
      type: 'typescript',
      recommendation: '为useEffect和其他hooks添加完整的依赖数组',
      enabled: true,
      fileTypes: ['react'],
    },

    // API路由特定的规则
    {
      id: 'api_error_handling',
      name: 'API错误处理',
      description: '检查API路由是否包含适当的错误处理',
      condition: (content, filePath) => {
        if (!filePath.includes('/api/')) return false;

        // 检查是否有try-catch块
        const hasTryCatch = /try\s*\{[\s\S]*?\}\s*catch/.test(content);
        return !hasTryCatch;
      },
      severity: 'medium',
      type: 'maintainability',
      recommendation: '为API路由添加try-catch错误处理',
      enabled: true,
    },

    // 数据库查询优化
    {
      id: 'prisma_query_optimization',
      name: 'Prisma查询优化',
      description: '检查Prisma查询是否包含必要的选择和过滤',
      condition: (content, filePath) => {
        if (!content.includes('prisma.')) return false;

        // 检查findMany查询是否有限制
        const findManyQueries = content.match(/\.findMany\s*\(/g) || [];
        const limitedQueries =
          content.match(/\.findMany\s*\(\s*\{[\s\S]*?take\s*:/g) || [];

        return findManyQueries.length > 0 && limitedQueries.length === 0;
      },
      severity: 'low',
      type: 'performance',
      recommendation: '为findMany查询添加take限制以避免返回过多数据',
      enabled: true,
    },
  ],

  thresholds: {
    maxComplexity: 10,
    maxLinesPerFunction: 50,
    maxDuplicateLines: 5,
    minSecurityScore: 70,
    minMaintainabilityIndex: 60,
    maxCriticalIssues: 0, // 严重问题数量上限
    maxHighIssues: 3, // 高风险问题数量上限
    maxMediumIssues: 10, // 中风险问题数量上限
    minApprovalRate: 0.8, // 最低通过率
  },

  failureConditions: {
    // 立即失败条件
    criticalIssues: true, // 发现严重问题立即失败
    highIssueThreshold: 5, // 高风险问题超过此数量失败

    // 警告但不失败条件
    mediumIssueThreshold: 15, // 中风险问题超过此数量发出警告
    lowApprovalRate: 0.6, // 通过率低于此值发出警告

    // 文件级别的失败条件
    fileMaxComplexity: 15, // 单文件复杂度超过此值失败
    fileMaxLines: 300, // 单文件行数超过此值失败
    fileMinSecurityScore: 50, // 单文件安全评分低于此值失败
  },

  filePatterns: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/migrations/**',
    ],
    include: [
      'src/**/*.{ts,tsx,js,jsx}',
      'pages/**/*.{ts,tsx,js,jsx}',
      'app/**/*.{ts,tsx,js,jsx}',
    ],
  },

  severityOverrides: {
    // 可以覆盖特定规则的严重程度
    typescript_any_type: 'high', // 将any类型使用升级为高严重性
    security_sql_injection: 'critical', // SQL注入保持严重
  },
};

/**
 * 加载代码审查配置
 * 可以从文件系统或环境变量加载自定义配置
 */
export function loadCodeReviewConfig(): CodeReviewConfig {
  // 在实际实现中，这里可以从配置文件或环境变量加载
  // 现在返回默认配置
  return defaultCodeReviewConfig;
}

/**
 * 应用配置到代码审查服务
 */
export function applyConfigToService(config: CodeReviewConfig) {
  // 这里将在服务初始化时调用
  // 为每个规则应用严重程度覆盖
  config.rules.forEach((rule) => {
    if (config.severityOverrides[rule.id]) {
      rule.severity = config.severityOverrides[rule.id];
    }
  });

  return config;
}
