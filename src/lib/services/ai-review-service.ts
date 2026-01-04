/**
 * AI建议审核服务
 * 对AI生成的建议进行内容审核和质量检查
 */

export interface AIContentReview {
  content: string;
  contentType:
    | 'health_advice'
    | 'nutrition_recommendation'
    | 'meal_plan'
    | 'general_response';
  userId: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface ReviewResult {
  approved: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issues: ReviewIssue[];
  warnings: string[];
  suggestions: string[];
  metadata: {
    reviewTimestamp: Date;
    processingTime: number;
    reviewerVersion: string;
  };
}

export interface ReviewIssue {
  type:
    | 'medical_claim'
    | 'extreme_advice'
    | 'incomplete_info'
    | 'contradictory'
    | 'sensitive_topic'
    | 'uncertainty'
    | 'commercial_bias';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: {
    start: number;
    end: number;
    text: string;
  };
  recommendation: string;
}

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  keywords?: string[];
  condition: (content: string, context?: Record<string, any>) => boolean;
  severity: ReviewIssue['severity'];
  type: ReviewIssue['type'];
  recommendation: string;
  enabled: boolean;
}

class AIReviewService {
  private rules: ReviewRule[] = [];
  private readonly version = '1.0.0';

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认审核规则
   */
  private initializeDefaultRules(): void {
    const defaultRules: ReviewRule[] = [
      // 医疗声明检查
      {
        id: 'medical_claim_diagnosis',
        name: '医疗诊断声明',
        description: '检测AI是否做出医疗诊断声明',
        keywords: ['诊断', '确诊', '疾病', '患有', '病症', '病情', '医疗结论'],
        pattern:
          /(?:我诊断|确诊|诊断出|患有(?:严重)?(?:疾病|病症)|医疗(?:诊断|结论))/gi,
        condition: (content) =>
          this.containsKeywords(content, ['诊断', '确诊', '疾病', '患有']),
        severity: 'critical',
        type: 'medical_claim',
        recommendation: '移除所有医疗诊断声明，改为"基于数据分析的健康建议"',
        enabled: true,
      },

      // 极端建议检查
      {
        id: 'extreme_advice',
        name: '极端健康建议',
        description: '检测过于极端或危险的健康建议',
        keywords: [
          '完全停止',
          '立即停止',
          '绝对不能',
          '必须完全',
          '严格禁止',
          '永久戒除',
        ],
        pattern:
          /(?:完全(?:停止|戒除|禁止)|立即(?:停止|戒除)|绝对(?:不能|禁止)|必须完全|严格(?:禁止|戒除)|永久(?:戒除|停止))/gi,
        condition: (content) =>
          this.containsKeywords(content, [
            '完全停止',
            '立即停止',
            '绝对不能',
            '永久戒除',
          ]),
        severity: 'high',
        type: 'extreme_advice',
        recommendation:
          '将绝对性语言改为建议性语言，如"建议减少"而不是"完全停止"',
        enabled: true,
      },

      // 不确定性表达检查
      {
        id: 'uncertainty_expression',
        name: '缺乏不确定性表达',
        description: '检查是否缺少适当的不确定性表达',
        condition: (content, context) => {
          const certaintyWords = [
            '一定',
            '肯定',
            '绝对',
            '完全',
            '100%',
            '确保',
          ];
          const uncertaintyWords = [
            '可能',
            '建议',
            '考虑',
            '或许',
            '通常',
            '一般',
          ];

          const hasCertainty = this.containsKeywords(content, certaintyWords);
          const hasUncertainty = this.containsKeywords(
            content,
            uncertaintyWords,
          );

          // 如果有确定性表达但缺乏不确定性表达，标记为问题
          return hasCertainty && !hasUncertainty && content.length > 100;
        },
        severity: 'medium',
        type: 'uncertainty',
        recommendation: '添加不确定性表达，如"建议考虑"、"可能有助于"等',
        enabled: true,
      },

      // 矛盾信息检查
      {
        id: 'contradictory_info',
        name: '矛盾信息',
        description: '检测内容中的矛盾信息',
        condition: (content) => {
          // 检查常见的矛盾模式
          const contradictions = [
            /(?:建议.*不建议|推荐.*不推荐|可以.*不能|适合.*不适合)/gi,
            /(?:增加.*减少|提高.*降低|多吃.*少吃)/gi,
          ];

          return contradictions.some((pattern) => pattern.test(content));
        },
        severity: 'medium',
        type: 'contradictory',
        recommendation: '澄清矛盾信息，确保建议一致性',
        enabled: true,
      },

      // 敏感话题处理
      {
        id: 'sensitive_topics',
        name: '敏感健康话题',
        description: '检测涉及敏感健康话题的内容',
        keywords: ['癌症', '肿瘤', '艾滋病', '精神疾病', '遗传病', '绝症'],
        condition: (content) =>
          this.containsKeywords(content, [
            '癌症',
            '肿瘤',
            '艾滋病',
            '精神疾病',
          ]),
        severity: 'high',
        type: 'sensitive_topic',
        recommendation: '对于敏感话题，建议用户咨询专业医生，不给出具体建议',
        enabled: true,
      },

      // 商业偏见检查
      {
        id: 'commercial_bias',
        name: '商业产品偏好',
        description: '检测是否有推销特定商业产品的倾向',
        keywords: ['推荐购买', '最佳选择', '顶级产品', '专业品牌', '指定产品'],
        condition: (content) => {
          const commercialWords = [
            '推荐购买',
            '最佳选择',
            '顶级产品',
            '专业品牌',
            '指定产品',
          ];
          return this.containsKeywords(content, commercialWords);
        },
        severity: 'medium',
        type: 'commercial_bias',
        recommendation: '避免推销特定产品，改为一般性建议',
        enabled: true,
      },

      // 信息完整性检查
      {
        id: 'incomplete_info',
        name: '信息不完整',
        description: '检查建议是否缺乏重要上下文或警告',
        condition: (content, context) => {
          // 检查是否缺少免责声明
          const hasDisclaimer = /(?:仅供参考|不构成|请咨询|建议咨询)/.test(
            content,
          );
          const isHealthAdvice = context?.contentType === 'health_advice';

          return isHealthAdvice && !hasDisclaimer && content.length > 200;
        },
        severity: 'medium',
        type: 'incomplete_info',
        recommendation: '添加"此建议仅供参考，请咨询专业医生"等免责声明',
        enabled: true,
      },
    ];

    this.rules = defaultRules;
  }

  /**
   * 审核AI生成的内容
   */
  async reviewContent(review: AIContentReview): Promise<ReviewResult> {
    const startTime = Date.now();

    const issues: ReviewIssue[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 执行所有启用的规则
    for (const rule of this.rules.filter((r) => r.enabled)) {
      try {
        if (rule.condition(review.content, review.context)) {
          // 查找具体位置（如果有模式匹配）
          let location;
          if (rule.pattern) {
            const match = rule.pattern.exec(review.content);
            if (match) {
              location = {
                start: match.index,
                end: match.index + match[0].length,
                text: match[0],
              };
            }
          }

          const issue: ReviewIssue = {
            type: rule.type,
            severity: rule.severity,
            description: rule.description,
            location,
            recommendation: rule.recommendation,
          };

          issues.push(issue);

          // 生成警告和建议
          warnings.push(`${rule.name}: ${rule.description}`);
          suggestions.push(rule.recommendation);
        }
      } catch (error) {
        console.error(`Rule ${rule.id} execution failed:`, error);
      }
    }

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(issues);

    // 根据风险等级决定是否批准
    const approved =
      riskLevel !== 'critical' &&
      issues.filter((i) => i.severity === 'critical').length === 0;

    const processingTime = Date.now() - startTime;

    return {
      approved,
      riskLevel,
      issues,
      warnings,
      suggestions,
      metadata: {
        reviewTimestamp: new Date(),
        processingTime,
        reviewerVersion: this.version,
      },
    };
  }

  /**
   * 批量审核多个内容
   */
  async reviewBatch(reviews: AIContentReview[]): Promise<ReviewResult[]> {
    const results = await Promise.all(
      reviews.map((review) => this.reviewContent(review)),
    );
    return results;
  }

  /**
   * 添加自定义审核规则
   */
  addRule(rule: ReviewRule): void {
    // 检查规则ID是否唯一
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Rule with id ${rule.id} already exists`);
    }
    this.rules.push(rule);
  }

  /**
   * 移除审核规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  /**
   * 启用/禁用审核规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 获取所有审核规则
   */
  getRules(): ReviewRule[] {
    return [...this.rules];
  }

  /**
   * 修复内容问题（自动修复简单问题）
   */
  async fixContent(content: string, issues: ReviewIssue[]): Promise<string> {
    let fixedContent = content;

    for (const issue of issues) {
      switch (issue.type) {
        case 'uncertainty':
          // 添加不确定性表达
          if (!/(?:可能|建议|考虑|或许)/.test(fixedContent)) {
            fixedContent = `建议${fixedContent.toLowerCase()}`;
          }
          break;

        case 'incomplete_info':
          // 添加免责声明
          if (!/(?:仅供参考|请咨询)/.test(fixedContent)) {
            fixedContent +=
              '\n\n⚠️ 此建议仅供参考，不构成专业医疗诊断。如有健康问题，请咨询专业医生。';
          }
          break;

        case 'extreme_advice':
          // 将绝对性语言改为建议性
          fixedContent = fixedContent
            .replace(/完全停止/g, '建议减少')
            .replace(/立即停止/g, '建议逐渐减少')
            .replace(/绝对不能/g, '建议避免')
            .replace(/必须完全/g, '建议尽量')
            .replace(/永久戒除/g, '建议长期避免');
          break;
      }
    }

    return fixedContent;
  }

  /**
   * 检查内容是否需要人工审核
   */
  needsHumanReview(result: ReviewResult): boolean {
    return (
      result.riskLevel === 'critical' ||
      result.issues.some((issue) => issue.severity === 'critical') ||
      result.issues.length > 3
    );
  }

  /**
   * 私有辅助方法
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private calculateRiskLevel(issues: ReviewIssue[]): ReviewResult['riskLevel'] {
    if (issues.some((issue) => issue.severity === 'critical')) {
      return 'critical';
    }
    if (issues.some((issue) => issue.severity === 'high')) {
      return 'high';
    }
    if (issues.some((issue) => issue.severity === 'medium')) {
      return 'medium';
    }
    if (issues.length > 0) {
      return 'low';
    }
    return 'low';
  }
}

// 导出单例实例
export const aiReviewService = new AIReviewService();

// 导出工具函数
export async function reviewAIContent(
  review: AIContentReview,
): Promise<ReviewResult> {
  return await aiReviewService.reviewContent(review);
}

export async function needsHumanReview(result: ReviewResult): Promise<boolean> {
  return aiReviewService.needsHumanReview(result);
}

export async function fixAIContent(
  content: string,
  issues: ReviewIssue[],
): Promise<string> {
  return await aiReviewService.fixContent(content, issues);
}
