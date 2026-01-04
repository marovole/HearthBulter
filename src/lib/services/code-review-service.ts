/**
 * 代码审查服务
 * 提供自动化代码质量分析、规范检查和安全漏洞扫描
 */

import {
  loadCodeReviewConfig,
  applyConfigToService,
} from "@/lib/code-review-config";

export interface CodeReviewInput {
  content: string;
  filePath: string;
  fileType: "typescript" | "javascript" | "react" | "config" | "other";
  context?: {
    framework?: string;
    dependencies?: string[];
    projectType?: string;
  };
}

export interface CodeReviewResult {
  approved: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  issues: CodeReviewIssue[];
  warnings: string[];
  suggestions: string[];
  metrics: CodeMetrics;
  metadata: {
    reviewTimestamp: Date;
    processingTime: number;
    reviewerVersion: string;
    filePath: string;
  };
}

export interface CodeReviewIssue {
  type:
    | "complexity"
    | "security"
    | "typescript"
    | "style"
    | "performance"
    | "maintainability";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location?: {
    line: number;
    column?: number;
    text: string;
  };
  recommendation: string;
}

export interface CodeMetrics {
  complexity: number;
  linesOfCode: number;
  duplicateLines: number;
  securityScore: number;
  maintainabilityIndex: number;
}

export interface CodeReviewRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  keywords?: string[];
  condition: (
    content: string,
    filePath: string,
    context?: CodeReviewInput["context"],
  ) => boolean;
  severity: CodeReviewIssue["severity"];
  type: CodeReviewIssue["type"];
  recommendation: string;
  enabled: boolean;
  fileTypes?: CodeReviewInput["fileType"][];
}

class CodeReviewService {
  private rules: CodeReviewRule[] = [];
  private readonly version = "1.0.0";
  private config: any;

  constructor() {
    this.config = applyConfigToService(loadCodeReviewConfig());
    this.initializeRules();
  }

  /**
   * 初始化审查规则
   */
  private initializeRules(): void {
    // 使用配置中的规则
    this.rules = this.config.rules;
  }

  /**
   * 执行代码审查
   */
  async reviewCode(reviewInput: CodeReviewInput): Promise<CodeReviewResult> {
    const startTime = Date.now();

    const issues: CodeReviewIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 执行所有启用的规则
    for (const rule of this.rules.filter((r) => r.enabled)) {
      try {
        // 检查文件类型过滤
        if (rule.fileTypes && !rule.fileTypes.includes(reviewInput.fileType)) {
          continue;
        }

        if (
          rule.condition(
            reviewInput.content,
            reviewInput.filePath,
            reviewInput.context,
          )
        ) {
          // 查找具体位置（如果有模式匹配）
          let location;
          if (rule.pattern) {
            const match = rule.pattern.exec(reviewInput.content);
            if (match) {
              const lineNumber = this.getLineNumber(
                reviewInput.content,
                match.index,
              );
              location = {
                line: lineNumber,
                text: match[0],
              };
            }
          }

          const issue: CodeReviewIssue = {
            type: rule.type,
            severity: rule.severity,
            description: rule.description,
            location,
            recommendation: rule.recommendation,
          };

          issues.push(issue);
          warnings.push(`${rule.name}: ${rule.description}`);
          suggestions.push(rule.recommendation);
        }
      } catch (error) {
        console.error(`Rule ${rule.id} execution failed:`, error);
      }
    }

    // 计算代码指标
    const metrics = this.calculateMetrics(reviewInput.content);

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(issues);

    // 根据风险等级决定是否批准
    const approved =
      riskLevel !== "critical" &&
      issues.filter((i) => i.severity === "critical").length === 0;

    const processingTime = Date.now() - startTime;

    return {
      approved,
      riskLevel,
      issues,
      warnings,
      suggestions,
      metrics,
      metadata: {
        reviewTimestamp: new Date(),
        processingTime,
        reviewerVersion: this.version,
        filePath: reviewInput.filePath,
      },
    };
  }

  /**
   * 批量审查多个文件
   */
  async reviewBatch(reviews: CodeReviewInput[]): Promise<CodeReviewResult[]> {
    const results = await Promise.all(
      reviews.map((review) => this.reviewCode(review)),
    );
    return results;
  }

  /**
   * 添加自定义审查规则
   */
  addRule(rule: CodeReviewRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Rule with id ${rule.id} already exists`);
    }
    this.rules.push(rule);
  }

  /**
   * 移除审查规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  /**
   * 启用/禁用审查规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 获取所有审查规则
   */
  getRules(): CodeReviewRule[] {
    return [...this.rules];
  }

  /**
   * 生成审查报告
   */
  generateReport(results: CodeReviewResult[]): CodeReviewReport {
    const totalFiles = results.length;
    const approvedFiles = results.filter((r) => r.approved).length;
    const issuesByType = new Map<string, number>();
    const issuesBySeverity = new Map<string, number>();

    results.forEach((result) => {
      result.issues.forEach((issue) => {
        issuesByType.set(issue.type, (issuesByType.get(issue.type) || 0) + 1);
        issuesBySeverity.set(
          issue.severity,
          (issuesBySeverity.get(issue.severity) || 0) + 1,
        );
      });
    });

    return {
      summary: {
        totalFiles,
        approvedFiles,
        approvalRate: totalFiles > 0 ? approvedFiles / totalFiles : 0,
      },
      issues: {
        byType: Object.fromEntries(issuesByType),
        bySeverity: Object.fromEntries(issuesBySeverity),
        total: results.reduce((sum, r) => sum + r.issues.length, 0),
      },
      generatedAt: new Date(),
    };
  }

  /**
   * 私有辅助方法
   */
  private calculateComplexity(code: string): number {
    let complexity = 1; // 基础复杂度

    // 条件语句
    const conditions = (
      code.match(/\bif\b|\belse\b|\bswitch\b|\bcatch\b/g) || []
    ).length;
    complexity += conditions;

    // 循环语句
    const loops = (code.match(/\bfor\b|\bwhile\b|\bdo\b/g) || []).length;
    complexity += loops;

    // 逻辑运算符
    const logicalOps = (code.match(/\|\||&&/g) || []).length;
    complexity += logicalOps;

    return complexity;
  }

  private getLineNumber(content: string, charIndex: number): number {
    const lines = content.substring(0, charIndex).split("\n");
    return lines.length;
  }

  private calculateMetrics(content: string): CodeMetrics {
    const lines = content.split("\n");
    const linesOfCode = lines.filter((line) => line.trim().length > 0).length;

    // 简化的重复行检测
    const duplicateLines = this.detectDuplicateLines(lines);

    // 简化的复杂度计算
    const complexity = this.calculateComplexity(content);

    // 简化的安全评分（基于关键词检测）
    const securityScore = this.calculateSecurityScore(content);

    // 简化的可维护性指数
    const maintainabilityIndex = Math.max(
      0,
      100 - complexity * 5 - duplicateLines,
    );

    return {
      complexity,
      linesOfCode,
      duplicateLines,
      securityScore,
      maintainabilityIndex,
    };
  }

  private detectDuplicateLines(lines: string[]): number {
    const lineCounts = new Map<string, number>();
    let duplicates = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        // 只检查非空有意义行
        const count = lineCounts.get(trimmed) || 0;
        lineCounts.set(trimmed, count + 1);
        if (count === 1) {
          // 第二次出现算作重复
          duplicates++;
        }
      }
    });

    return duplicates;
  }

  private calculateSecurityScore(content: string): number {
    let score = 100;

    // 检测潜在安全问题
    const securityIssues = [
      /\$\{[^}]*\}/.test(content), // 字符串插值
      /eval\s*\(/.test(content), // eval使用
      /innerHTML\s*=/.test(content), // innerHTML赋值
      /document\.write\s*\(/.test(content), // document.write
    ];

    securityIssues.forEach((issue) => {
      if (issue) score -= 20;
    });

    return Math.max(0, score);
  }

  private calculateRiskLevel(
    issues: CodeReviewIssue[],
  ): CodeReviewResult["riskLevel"] {
    if (issues.some((issue) => issue.severity === "critical")) {
      return "critical";
    }
    if (issues.some((issue) => issue.severity === "high")) {
      return "high";
    }
    if (issues.some((issue) => issue.severity === "medium")) {
      return "medium";
    }
    if (issues.length > 0) {
      return "low";
    }
    return "low";
  }
}

export interface CodeReviewReport {
  summary: {
    totalFiles: number;
    approvedFiles: number;
    approvalRate: number;
  };
  issues: {
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    total: number;
  };
  generatedAt: Date;
}

// 导出单例实例
export const codeReviewService = new CodeReviewService();

// 导出工具函数
export async function reviewCodeFile(
  reviewInput: CodeReviewInput,
): Promise<CodeReviewResult> {
  return await codeReviewService.reviewCode(reviewInput);
}

export async function reviewCodeBatch(
  reviews: CodeReviewInput[],
): Promise<CodeReviewResult[]> {
  return await codeReviewService.reviewBatch(reviews);
}

export function generateReviewReport(
  results: CodeReviewResult[],
): CodeReviewReport {
  return codeReviewService.generateReport(results);
}
