/**
 * Prompt模板单元测试
 */

import {
  getActivePrompt,
  getPromptsByCategory,
  renderPrompt,
  validatePromptParameters,
  HEALTH_ANALYSIS_PROMPTS,
  RECIPE_OPTIMIZATION_PROMPTS,
  CHAT_PROMPTS,
  REPORT_GENERATION_PROMPTS,
} from '@/lib/services/ai/prompt-templates';

describe('Prompt Templates', () => {
  describe('renderPrompt', () => {
    it('应该正确替换简单变量', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Hello {{name}}, you are {{age}} years old.',
        parameters: ['name', 'age'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = { name: 'John', age: 30 };
      const result = renderPrompt(template, variables);

      expect(result).toBe('Hello John, you are 30 years old.');
    });

    it('应该处理不存在的变量', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Hello {{name}}, you are {{age}} years old.',
        parameters: ['name', 'age'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = { name: 'John' };
      const result = renderPrompt(template, variables);

      expect(result).toBe('Hello John, you are {{age}} years old.');
    });

    it('应该处理空对象', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Hello {{name}}!',
        parameters: ['name'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = {};
      const result = renderPrompt(template, variables);

      expect(result).toBe('Hello {{name}}!');
    });

    it('应该处理复杂变量（对象、数组）', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Goals: {{goals}}, Allergies: {{allergies}}',
        parameters: ['goals', 'allergies'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = {
        goals: ['weight_loss', 'muscle_gain'],
        allergies: ['nuts', 'dairy'],
      };
      const result = renderPrompt(template, variables);

      expect(result).toBe('Goals: weight_loss, muscle_gain, Allergies: nuts, dairy');
    });

    it('应该处理嵌套对象', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'BMI: {{health.bmi}}, Blood Pressure: {{health.bp}}',
        parameters: ['health'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = {
        health: { bmi: 22.5, bp: '120/80' },
      };
      const result = renderPrompt(template, variables);

      expect(result).toBe('BMI: 22.5, Blood Pressure: 120/80');
    });
  });

  describe('validatePromptParameters', () => {
    it('应该验证有效的参数', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Hello {{name}}, age: {{age}}',
        parameters: ['name', 'age'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = { name: 'John', age: 30 };
      const result = validatePromptParameters(template, variables);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('应该检测缺失的参数', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Hello {{name}}, age: {{age}}',
        parameters: ['name', 'age'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = { name: 'John' };
      const result = validatePromptParameters(template, variables);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age']);
    });

    it('应该处理空模板', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: '',
        parameters: ['name'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = { name: 'John' };
      const result = validatePromptParameters(template, variables);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('getActivePrompt', () => {
    it('应该返回活跃的健康分析提示模板', () => {
      const template = getActivePrompt('health_analysis', 'basic_health_analysis');

      expect(template).toBeDefined();
      expect(template?.id).toBe('health_analysis_v1');
      expect(template?.category).toBe('health_analysis');
      expect(template?.isActive).toBe(true);
      expect(template?.template).toContain('你是一位专业的营养师和健康顾问');
    });

    it('应该返回null对于不存在的模板', () => {
      const template = getActivePrompt('health_analysis', 'non_existent_template');

      expect(template).toBeNull();
    });

    it('应该返回null对于不活跃的模板', () => {
      const template = getActivePrompt('health_analysis', 'advanced_health_analysis');

      expect(template).toBeNull();
    });
  });

  describe('getPromptsByCategory', () => {
    it('应该返回指定类别的所有模板', () => {
      const healthPrompts = getPromptsByCategory('health_analysis');

      expect(Object.keys(healthPrompts)).toContain('basic_health_analysis');
      expect(Object.keys(healthPrompts)).toContain('advanced_health_analysis');
      expect(Object.keys(healthPrompts)).toContain('chronic_disease_management');

      Object.values(healthPrompts).forEach(prompt => {
        expect(prompt.category).toBe('health_analysis');
      });
    });

    it('应该返回食谱优化类别的模板', () => {
      const recipePrompts = getPromptsByCategory('recipe_optimization');

      expect(Object.keys(recipePrompts)).toContain('basic_recipe_optimization');
      expect(Object.keys(recipePrompts)).toContain('nutritional_boost');

      Object.values(recipePrompts).forEach(prompt => {
        expect(prompt.category).toBe('recipe_optimization');
      });
    });

    it('应该返回聊天类别的模板', () => {
      const chatPrompts = getPromptsByCategory('nutrition_consultation');

      expect(Object.keys(chatPrompts)).toContain('general_chat');
      expect(Object.keys(chatPrompts)).toContain('symptom_inquiry');

      Object.values(chatPrompts).forEach(prompt => {
        expect(prompt.category).toBe('nutrition_consultation');
      });
    });
  });

  describe('健康分析模板', () => {
    it('应该包含所有必需的参数', () => {
      const template = HEALTH_ANALYSIS_PROMPTS.basic_health_analysis;

      expect(template.parameters).toContain('medical_data');
      expect(template.parameters).toContain('age');
      expect(template.parameters).toContain('gender');
      expect(template.parameters).toContain('height');
      expect(template.parameters).toContain('weight');
      expect(template.parameters).toContain('health_goals');
      expect(template.parameters).toContain('dietary_preferences');
      expect(template.parameters).toContain('allergies');
    });

    it('应该能够渲染健康分析模板', () => {
      const template = HEALTH_ANALYSIS_PROMPTS.basic_health_analysis;
      const variables = {
        medical_data: '血压: 120/80, 胆固醇: 4.8mmol/L',
        age: 30,
        gender: '男',
        height: 175,
        weight: 70,
        health_goals: '减重、增肌',
        dietary_preferences: '均衡饮食',
        allergies: '无',
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('30岁');
      expect(rendered).toContain('男');
      expect(rendered).toContain('175cm');
      expect(rendered).toContain('70kg');
      expect(rendered).toContain('减重、增肌');
      expect(rendered).toContain('均衡饮食');
      expect(rendered).toContain('血压: 120/80');
    });
  });

  describe('食谱优化模板', () => {
    it('应该包含食谱相关参数', () => {
      const template = RECIPE_OPTIMIZATION_PROMPTS.basic_recipe_optimization;

      expect(template.parameters).toContain('recipe_info');
      expect(template.parameters).toContain('target_nutrition');
      expect(template.parameters).toContain('user_profile');
      expect(template.parameters).toContain('preferences');
    });

    it('应该能够渲染食谱优化模板', () => {
      const template = RECIPE_OPTIMIZATION_PROMPTS.basic_recipe_optimization;
      const variables = {
        recipe_info: '宫保鸡丁: 鸡肉500g, 花生100g, 辣椒50g',
        target_nutrition: '热量600kcal, 蛋白质40g',
        user_profile: '30岁男性，健身人群',
        preferences: '减脂增肌，喜欢川菜',
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('宫保鸡丁');
      expect(rendered).toContain('600kcal');
      expect(rendered).toContain('30岁男性');
      expect(rendered).toContain('减脂增肌');
    });
  });

  describe('聊天模板', () => {
    it('应该包含对话相关参数', () => {
      const template = CHAT_PROMPTS.general_chat;

      expect(template.parameters).toContain('user_profile');
      expect(template.parameters).toContain('conversation_history');
      expect(template.parameters).toContain('current_message');
      expect(template.parameters).toContain('context');
    });

    it('应该能够渲染聊天模板', () => {
      const template = CHAT_PROMPTS.general_chat;
      const variables = {
        user_profile: '30岁男性，目标是减重',
        conversation_history: '用户: 我想减肥\n助手: 我可以帮您制定减重计划',
        current_message: '应该如何开始？',
        context: '初次咨询',
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('30岁男性');
      expect(rendered).toContain('减重');
      expect(rendered).toContain('我想减肥');
      expect(rendered).toContain('应该如何开始？');
    });
  });

  describe('报告生成模板', () => {
    it('应该包含报告相关参数', () => {
      const template = REPORT_GENERATION_PROMPTS.weekly_health_report;

      expect(template.parameters).toContain('user_profile');
      expect(template.parameters).toContain('health_data');
      expect(template.parameters).toContain('period');
      expect(template.parameters).toContain('report_type');
    });

    it('应该能够渲染报告生成模板', () => {
      const template = REPORT_GENERATION_PROMPTS.weekly_health_report;
      const variables = {
        user_profile: '30岁男性，程序员',
        health_data: '体重变化: 70kg -> 69kg, 运动次数: 3次',
        period: '2024年10月第3周',
        report_type: '周报',
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('30岁男性');
      expect(rendered).toContain('程序员');
      expect(rendered).toContain('70kg -> 69kg');
      expect(rendered).toContain('2024年10月第3周');
    });
  });

  describe('模板安全性', () => {
    it('应该正确处理特殊字符输入', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Hello {{name}}!',
        parameters: ['name'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const variables = { name: specialChars };
      const result = renderPrompt(template, variables);

      expect(result).toContain(specialChars);
    });

    it('应该处理超长输入', () => {
      const template = {
        id: 'test',
        name: 'Test Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: 'Content: {{content}}',
        parameters: ['content'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const longString = 'a'.repeat(10000);
      const variables = { content: longString };
      const result = renderPrompt(template, variables);

      expect(result.length).toBeGreaterThan(10000);
      expect(result).toContain(longString);
    });
  });

  describe('性能测试', () => {
    it('应该能快速处理大型模板', () => {
      const largeTemplate = 'Hello {{name}}'.repeat(1000);
      const template = {
        id: 'test',
        name: 'Large Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: largeTemplate,
        parameters: ['name'],
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const variables = { name: 'John' };

      const startTime = performance.now();
      const result = renderPrompt(template, variables);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
      expect(result).toContain('Hello John'.repeat(1000));
    });

    it('应该能处理大量变量', () => {
      const variables: Record<string, string> = {};
      const templateParts = [];

      for (let i = 0; i < 100; i++) {
        variables[`var${i}`] = `value${i}`;
        templateParts.push(`{{var${i}}}`);
      }

      const template = {
        id: 'test',
        name: 'Multi Variable Template',
        version: '1.0',
        category: 'health_analysis' as const,
        template: templateParts.join(' '),
        parameters: Object.keys(variables),
        outputFormat: 'text' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const startTime = performance.now();
      const result = renderPrompt(template, variables);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
      expect(result).toContain('value0');
      expect(result).toContain('value99');
    });
  });
});
