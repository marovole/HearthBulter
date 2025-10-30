import { RECOMMENDED_MODELS } from './openai-client';

// Prompt模板版本管理
export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  category: 'health_analysis' | 'recipe_optimization' | 'nutrition_consultation' | 'report_generation';
  template: string;
  parameters: string[];
  outputFormat: 'text' | 'json';
  isActive: boolean;
  createdAt: string;
}

// 健康分析Prompt模板
export const HEALTH_ANALYSIS_PROMPTS: Record<string, PromptTemplate> = {
  basic_health_analysis: {
    id: 'health_analysis_v1',
    name: '基础健康分析',
    version: '1.0',
    category: 'health_analysis',
    template: `你是一位专业的营养师和健康顾问。请根据用户提供的体检数据进行全面分析。

体检数据：
{{medical_data}}

用户信息：
- 年龄：{{age}}岁
- 性别：{{gender}}
- 身高：{{height}}cm
- 体重：{{weight}}kg
- 健康目标：{{health_goals}}
- 饮食偏好：{{dietary_preferences}}
- 过敏史：{{allergies}}

请提供：
1. 关键指标解读（正常/异常/需关注）
2. 健康风险评估（低/中/高风险）
3. 个性化营养建议
4. 饮食调整方案
5. 建议检查的项目

请用中文回答，保持专业性和易懂性。`,
    parameters: ['medical_data', 'age', 'gender', 'height', 'weight', 'health_goals', 'dietary_preferences', 'allergies'],
    outputFormat: 'json',
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  detailed_health_analysis: {
    id: 'health_analysis_detailed_v1',
    name: '详细健康分析',
    version: '1.0',
    category: 'health_analysis',
    template: `你是一位资深的临床营养师，请对用户的体检报告进行深度分析。

体检报告数据（JSON格式）：
{{medical_report_json}}

用户基本信息：
{{user_profile}}

饮食习惯历史：
{{meal_history}}

请生成结构化的健康分析报告，包含：

{
  "overall_health_score": "1-100的综合评分",
  "key_findings": ["主要发现"],
  "risk_assessment": {
    "level": "low|medium|high",
    "concerns": ["具体风险点"],
    "urgent_actions": ["紧急建议"]
  },
  "nutritional_recommendations": {
    "macro_distribution": {
      "carbs_percent": "碳水化合物比例",
      "protein_percent": "蛋白质比例",
      "fat_percent": "脂肪比例"
    },
    "daily_calories": "每日建议热量",
    "micronutrients": ["微量营养素关注点"]
  },
  "lifestyle_modifications": ["生活方式建议"],
  "follow_up_suggestions": ["后续检查建议"]
}

分析要基于医学证据，确保建议合理安全。`,
    parameters: ['medical_report_json', 'user_profile', 'meal_history'],
    outputFormat: 'json',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

// 食谱优化Prompt模板
export const RECIPE_OPTIMIZATION_PROMPTS: Record<string, PromptTemplate> = {
  recipe_nutrition_analysis: {
    id: 'recipe_analysis_v1',
    name: '食谱营养分析',
    version: '1.0',
    category: 'recipe_optimization',
    template: `你是一位专业的营养师，请分析这份食谱的营养价值。

食谱详情：
{{recipe_details}}

目标营养需求：
{{target_nutrition}}

用户健康状况：
{{health_conditions}}

请评估：
1. 营养素分布是否均衡
2. 与健康目标的匹配度
3. 潜在的营养缺口
4. 改善建议

如果发现问题，请提供具体的优化方案。`,
    parameters: ['recipe_details', 'target_nutrition', 'health_conditions'],
    outputFormat: 'json',
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  ingredient_substitution: {
    id: 'ingredient_sub_v1',
    name: '食材替代建议',
    version: '1.0',
    category: 'recipe_optimization',
    template: `用户需要替换食谱中的某些食材。

原始食材：{{original_ingredient}}
替换原因：{{reason}}
可用食材：{{available_ingredients}}
营养要求：{{nutrition_requirements}}

请推荐合适的替代食材，考虑：
1. 营养价值相似性
2. 口感相近程度
3. 烹饪特性匹配
4. 成本和季节性

提供3-5个替代选项，按优先级排序。`,
    parameters: ['original_ingredient', 'reason', 'available_ingredients', 'nutrition_requirements'],
    outputFormat: 'json',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

// 营养咨询Prompt模板
export const NUTRITION_CONSULTATION_PROMPTS: Record<string, PromptTemplate> = {
  general_consultation: {
    id: 'consultation_general_v1',
    name: '通用营养咨询',
    version: '1.0',
    category: 'nutrition_consultation',
    template: `你是一位友好的营养咨询师，用户有以下问题：

用户问题：{{user_question}}

用户背景：
{{user_context}}

对话历史：
{{conversation_history}}

请提供专业、易懂的回答。保持回答简洁但全面。如果需要更多信息，请明确询问。

回答格式：
- 先回答问题
- 然后提供相关建议
- 最后询问是否还有其他问题`,
    parameters: ['user_question', 'user_context', 'conversation_history'],
    outputFormat: 'text',
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  specific_nutrition_question: {
    id: 'consultation_specific_v1',
    name: '特定营养问题',
    version: '1.0',
    category: 'nutrition_consultation',
    template: `针对特定营养问题提供解答。

问题：{{specific_question}}
相关数据：{{relevant_data}}

请：
1. 分析问题的背景
2. 提供基于科学的解答
3. 给出实用建议
4. 推荐相关资源（如需要）

确保回答准确且安全。`,
    parameters: ['specific_question', 'relevant_data'],
    outputFormat: 'text',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

// 报告生成Prompt模板
export const REPORT_GENERATION_PROMPTS: Record<string, PromptTemplate> = {
  weekly_health_report: {
    id: 'report_weekly_v1',
    name: '周健康报告',
    version: '1.0',
    category: 'report_generation',
    template: `生成用户本周健康和营养报告。

数据汇总：
{{weekly_data}}

用户目标：{{user_goals}}

请生成：
1. 本周健康数据概览
2. 营养摄入分析
3. 目标达成情况
4. 下周建议
5. 亮点和改进点

保持积极鼓励的语气。`,
    parameters: ['weekly_data', 'user_goals'],
    outputFormat: 'text',
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  monthly_health_report: {
    id: 'report_monthly_v1',
    name: '月健康报告',
    version: '1.0',
    category: 'report_generation',
    template: `生成用户本月详细健康报告。

月度数据：
{{monthly_data}}

健康趋势：
{{health_trends}}

请包含：
1. 月度健康指标变化
2. 营养习惯分析
3. 长期趋势洞察
4. 个性化建议
5. 下一阶段目标`,
    parameters: ['monthly_data', 'health_trends'],
    outputFormat: 'text',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
};

// Prompt模板管理函数
export function getActivePrompt(category: PromptTemplate['category'], name?: string): PromptTemplate | null {
  const categoryPrompts = getPromptsByCategory(category);
  if (name) {
    return categoryPrompts[name] || null;
  }
  // 返回第一个活跃的模板
  return Object.values(categoryPrompts).find(p => p.isActive) || null;
}

export function getPromptsByCategory(category: PromptTemplate['category']): Record<string, PromptTemplate> {
  switch (category) {
    case 'health_analysis':
      return HEALTH_ANALYSIS_PROMPTS;
    case 'recipe_optimization':
      return RECIPE_OPTIMIZATION_PROMPTS;
    case 'nutrition_consultation':
      return NUTRITION_CONSULTATION_PROMPTS;
    case 'report_generation':
      return REPORT_GENERATION_PROMPTS;
    default:
      return {};
  }
}

export function renderPrompt(template: PromptTemplate, variables: Record<string, any>): string {
  let rendered = template.template;

  // 替换变量
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
  });

  return rendered;
}

// 验证Prompt参数
export function validatePromptParameters(template: PromptTemplate, providedParams: Record<string, any>): { valid: boolean; missing: string[] } {
  const missing = template.parameters.filter(param => !(param in providedParams));
  return {
    valid: missing.length === 0,
    missing,
  };
}
