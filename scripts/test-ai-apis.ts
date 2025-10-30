import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

import { callOpenAI, RECOMMENDED_MODELS } from '../src/lib/services/ai/openai-client';
import { healthAnalyzer } from '../src/lib/services/ai/health-analyzer';
import { recipeOptimizer } from '../src/lib/services/ai/recipe-optimizer';
import { conversationManager } from '../src/lib/services/ai/conversation-manager';
import { healthReportGenerator, ReportType } from '../src/lib/services/ai/health-report-generator';
import { IndicatorType } from '../src/lib/types/medical';

/**
 * AI API 功能测试脚本
 * 测试核心API端点的功能正常性
 */

async function testOpenAIConnection() {
  console.log('\n🔄 测试 OpenRouter API 连接...');

  try {
    const response = await callOpenAI(
      '你好，请简单介绍一下自己。',
      RECOMMENDED_MODELS.FREE[0],
      100
    );

    console.log('✅ OpenRouter API 连接成功');
    console.log('📝 响应:', response.content.substring(0, 100) + '...');
    console.log('🎯 使用的模型:', response.model);
    console.log('💰 Token消耗:', response.tokens);

    return true;
  } catch (error) {
    console.error('❌ OpenRouter API 连接失败:', error);
    return false;
  }
}

async function testHealthAnalyzer() {
  console.log('\n🔄 测试健康分析引擎...');

  try {
    // 模拟体检数据
    const mockMedicalData = {
      blood_tests: {
        total_cholesterol: 5.8,
        fasting_glucose: 5.2,
        hba1c: 5.1,
      },
      liver_function: {
        alt: 25,
      },
      other_indicators: {},
    };

    // 模拟用户档案
    const mockUserProfile = {
      age: 35,
      gender: 'male' as const,
      height: 175,
      weight: 75,
      bmi: 24.5,
      health_goals: ['lose_weight', 'improve_health'],
      dietary_preferences: ['balanced'],
      allergies: [],
      activity_level: 'moderate' as const,
    };

    const analysisResult = await healthAnalyzer.analyzeHealth(
      mockMedicalData,
      mockUserProfile
    );

    console.log('✅ 健康分析引擎工作正常');
    console.log('🏥 健康评分:', analysisResult.overall_score);
    console.log('⚠️  风险等级:', analysisResult.risk_level);
    console.log('📊 发现的问题数量:', analysisResult.key_findings.length);

    return true;
  } catch (error) {
    console.error('❌ 健康分析引擎测试失败:', error);
    return false;
  }
}

async function testRecipeOptimizer() {
  console.log('\n🔄 测试食谱优化器...');

  try {
    // 模拟食谱数据
    const mockRecipe = {
      id: 'test-recipe-1',
      name: '测试食谱',
      ingredients: [
        { name: '猪肉', amount: 200, unit: 'g' },
        { name: '大米', amount: 100, unit: 'g' },
        { name: '蔬菜', amount: 150, unit: 'g' },
      ],
      nutrition: {
        calories: 650,
        protein: 35,
        carbs: 60,
        fat: 25,
      },
    };

    const userPreferences = {
      dietary_restrictions: ['balanced'],
      allergies: [],
      disliked_ingredients: [],
      preferred_cuisines: ['chinese'],
      budget_level: 'medium' as const,
      cooking_skill: 'intermediate' as const,
    };

    const targetNutrition = {
      calories: 600,
      protein: 30,
      carbs: 50,
      fat: 20,
    };

    const optimizationResult = await recipeOptimizer.optimizeRecipe(
      mockRecipe,
      targetNutrition,
      userPreferences
    );

    console.log('✅ 食谱优化器工作正常');
    console.log('🍽️ 优化后的食谱:', optimizationResult.improved_recipe.name);
    console.log('💯 营养评分:', optimizationResult.analysis.nutrition_score);
    console.log('🔄 替代建议数量:', optimizationResult.optimizations.ingredient_substitutions.length);

    return true;
  } catch (error) {
    console.error('❌ 食谱优化器测试失败:', error);
    return false;
  }
}

async function testConversationManager() {
  console.log('\n🔄 测试对话管理器...');

  try {
    // 创建会话
    const session = conversationManager.createSession('test-member-1', {
      userProfile: {
        name: '测试用户',
        age: 30,
        gender: 'female',
        healthGoals: ['maintain_health'],
        dietaryPreferences: ['vegetarian'],
        allergies: [],
      },
      preferences: {
        language: 'zh',
        detailLevel: 'detailed',
        tone: 'friendly',
      },
    });

    console.log('✅ 会话创建成功，ID:', session.id);

    // 测试意图识别
    const testMessages = [
      '我最近体重增加了，怎么办？',
      '什么是健康的饮食比例？',
      '谢谢你的建议',
    ];

    for (const message of testMessages) {
      const intent = await conversationManager.recognizeIntent(message);
      console.log(`🎯 消息"${message}" → 意图: ${intent.intent} (${Math.round(intent.confidence * 100)}%)`);
    }

    // 测试回复生成
    const response = await conversationManager.generateResponse(
      session.id,
      testMessages[0],
      await conversationManager.recognizeIntent(testMessages[0])
    );

    console.log('💬 AI回复:', response.substring(0, 100) + '...');

    return true;
  } catch (error) {
    console.error('❌ 对话管理器测试失败:', error);
    return false;
  }
}

async function testReportGenerator() {
  console.log('\n🔄 测试报告生成器...');

  try {
    // 模拟报告数据
    const mockReportData = {
      reportType: ReportType.WEEKLY,
      memberId: 'test-member-1',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      data: {
        health_scores: [
          { date: '2024-01-01', score: 75 },
          { date: '2024-01-02', score: 78 },
          { date: '2024-01-03', score: 80 },
          { date: '2024-01-04', score: 82 },
          { date: '2024-01-05', score: 85 },
          { date: '2024-01-06', score: 83 },
          { date: '2024-01-07', score: 87 },
        ],
        nutrition_data: {
          calories: [
            { date: '2024-01-01', actual: 2100, target: 2000 },
            { date: '2024-01-02', actual: 1950, target: 2000 },
            { date: '2024-01-03', actual: 2050, target: 2000 },
            { date: '2024-01-04', actual: 1980, target: 2000 },
            { date: '2024-01-05', actual: 2020, target: 2000 },
            { date: '2024-01-06', actual: 1970, target: 2000 },
            { date: '2024-01-07', actual: 2010, target: 2000 },
          ],
        },
      },
    };

    const report = await healthReportGenerator.generateReport(mockReportData, false);

    console.log('✅ 报告生成器工作正常');
    console.log('📄 报告标题:', report.title);
    console.log('📊 报告章节数:', report.sections.length);
    console.log('📈 图表数量:', report.charts.length);
    console.log('💡 AI洞察数量:', report.insights.length);

    return true;
  } catch (error) {
    console.error('❌ 报告生成器测试失败:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 开始AI API功能测试...');
  console.log('=' .repeat(50));

  const testResults = await Promise.all([
    testOpenAIConnection(),
    testHealthAnalyzer(),
    testRecipeOptimizer(),
    testConversationManager(),
    testReportGenerator(),
  ]);

  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果汇总:');

  const passed = testResults.filter(Boolean).length;
  const total = testResults.length;

  console.log(`✅ 通过: ${passed}/${total}`);
  console.log(`❌ 失败: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('🎉 所有测试通过！AI营养建议引擎核心功能正常。');
  } else {
    console.log('⚠️ 部分测试失败，请检查配置和依赖。');
  }

  return passed === total;
}

// 运行测试
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

export { runAllTests };
