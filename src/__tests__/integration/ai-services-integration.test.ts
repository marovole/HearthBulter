/**
 * AI服务集成测试
 * 测试AI服务层的集成，避免Next.js API路由的复杂性
 */

import { HealthAnalyzer } from '@/lib/services/ai/health-analyzer';
import { conversationManager } from '@/lib/services/ai/conversation-manager';
import { aiResponseCache } from '@/lib/services/ai/response-cache';
import { RateLimiter } from '@/lib/services/ai/rate-limiter';
import { aiFallbackService } from '@/lib/services/ai/fallback-service';

// Mock AI client
jest.mock('@/lib/services/ai/openai-client', () => ({
  openaiClient: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

import { openaiClient } from '@/lib/services/ai/openai-client';

describe('AI Services Integration Tests', () => {
  let healthAnalyzer: HealthAnalyzer;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    healthAnalyzer = new HealthAnalyzer();
    rateLimiter = new RateLimiter();

    // 清理单例实例
    conversationManager.clearAllSessions?.();
    aiResponseCache.clear?.();

    jest.clearAllMocks();
  });

  afterEach(() => {
    conversationManager.clearAllSessions?.();
    aiResponseCache.clear?.();
  });

  describe('健康分析与对话管理集成', () => {
    it('应该完成从健康分析到对话建议的完整流程', async () => {
      // Mock AI健康分析响应
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overall_score: 75,
                risk_level: 'medium',
                key_findings: ['体重略超重', '血压偏高'],
                nutritional_recommendations: {
                  daily_calories: 1800,
                  macros: {
                    carbs_percent: 45,
                    protein_percent: 30,
                    fat_percent: 25,
                  },
                },
                lifestyle_modifications: ['增加有氧运动', '减少钠盐摄入'],
              }),
            },
          },
        ],
      });

      // 1. 执行健康分析
      const userProfile = {
        age: 35,
        gender: 'male',
        height: 175,
        weight: 82,
        bmi: 26.8,
        health_goals: ['weight_loss'],
        dietary_preferences: ['balanced'],
        allergies: [],
      };

      const medicalData = {
        blood_pressure: '145/90',
        cholesterol: 5.8,
        glucose: 5.6,
      };

      const analysisResult = await healthAnalyzer.analyzeHealthStatus(
        userProfile,
        medicalData,
      );

      expect(analysisResult.overall_score).toBe(75);
      expect(analysisResult.nutritional_recommendations.daily_calories).toBe(
        1800,
      );

      // 2. 创建对话会话
      const session = conversationManager.createSession('member-123', {
        name: 'John',
        age: 35,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: { diet_type: 'balanced' },
        allergies: [],
      });

      // 3. 基于分析结果进行对话
      const conversationContext = `健康分析结果：总分${analysisResult.overall_score}分，风险等级${analysisResult.risk_level}`;

      conversationManager.addMessage(session.id, 'system', conversationContext);
      conversationManager.addMessage(
        session.id,
        'user',
        '根据我的分析结果，您建议我从哪方面开始改善？',
      );

      // Mock对话AI响应
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValueOnce(
        {
          choices: [
            {
              message: {
                content:
                  '根据您的健康分析，我建议从以下方面开始改善：\n1. 控制血压：减少钠盐摄入，增加有氧运动\n2. 管理体重：控制每日热量在1800卡路里左右\n3. 改善饮食：增加蔬菜水果摄入，减少加工食品',
              },
            },
          ],
        },
      );

      const conversationHistory = conversationManager.formatConversationHistory(
        session.id,
      );
      expect(conversationHistory).toContain('健康分析结果：总分75分');
      expect(conversationHistory).toContain('从哪方面开始改善？');

      // 验证两个AI服务都被调用
      expect(openaiClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('缓存与对话管理集成', () => {
    it('应该缓存相似的对话回复', async () => {
      // Mock AI响应
      const mockResponse = '根据您的健康目标，建议每天摄入2000卡路里';
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: mockResponse } }],
      });

      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: null,
        allergies: [],
      };

      // 创建会话
      const session1 = conversationManager.createSession(
        'member-123',
        userProfile,
      );
      const session2 = conversationManager.createSession(
        'member-456',
        userProfile,
      );

      // 第一次对话
      conversationManager.addMessage(
        session1.id,
        'user',
        '我应该摄入多少卡路里？',
      );

      const cacheKey1 = cache.generateKey({
        userProfile,
        message: '我应该摄入多少卡路里？',
        context: 'nutrition_advice',
      });

      await cache.set(cacheKey1, { response: mockResponse }, 3600);

      // 第二次相似对话，应该从缓存获取
      conversationManager.addMessage(session2.id, 'user', '我需要多少卡路里？');

      const cacheKey2 = cache.generateKey({
        userProfile,
        message: '我需要多少卡路里？',
        context: 'nutrition_advice',
      });

      // 缓存键应该相似但不完全相同（因为消息不同）
      expect(cacheKey1).not.toBe(cacheKey2);

      // 测试缓存命中（使用相同的消息）
      const cacheKey3 = cache.generateKey({
        userProfile,
        message: '我应该摄入多少卡路里？',
        context: 'nutrition_advice',
      });

      const cachedResponse = await cache.get(cacheKey3);
      expect(cachedResponse?.response).toBe(mockResponse);

      // AI服务应该只被调用一次
      expect(openaiClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('速率限制与服务降级集成', () => {
    it('应该在达到速率限制时使用降级方案', async () => {
      const userId = 'user-123';
      const config = { windowMs: 60000, maxRequests: 2 };

      // 前两个请求应该成功
      const result1 = await rateLimiter.checkLimit(userId, 'ai_chat', config);
      const result2 = await rateLimiter.checkLimit(userId, 'ai_chat', config);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);

      // 第三个请求应该被拒绝
      const result3 = await rateLimiter.checkLimit(userId, 'ai_chat', config);
      expect(result3.allowed).toBe(false);

      // 使用降级服务
      const fallbackResult = await aiFallbackService.analyzeHealthWithFallback(
        { blood_pressure: '120/80' },
        { age: 30, gender: 'male' },
      );

      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.fallbackUsed).toBe(true);
      expect(fallbackResult.data).toBeDefined();
    });
  });

  describe('完整工作流测试', () => {
    it('应该完成用户健康管理的完整工作流', async () => {
      // Mock所有AI服务响应
      (openaiClient.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overall_score: 80,
                  nutritional_recommendations: {
                    daily_calories: 1900,
                    macros: {
                      carbs_percent: 45,
                      protein_percent: 30,
                      fat_percent: 25,
                    },
                  },
                }),
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content:
                  '根据您的健康目标，建议：\n1. 每日1900卡路里\n2. 蛋白质占30%\n3. 多吃蔬菜水果',
              },
            },
          ],
        });

      // 1. 用户档案设置
      const userProfile = {
        name: 'Alice',
        age: 32,
        gender: 'female',
        health_goals: ['weight_maintenance', 'muscle_tone'],
        dietary_preferences: { diet_type: 'mediterranean' },
        allergies: ['dairy'],
      };

      const medicalData = {
        weight: 65,
        height: 165,
        blood_pressure: '115/75',
        resting_heart_rate: 65,
      };

      // 2. 健康分析
      const analysis = await healthAnalyzer.analyzeHealthStatus(
        userProfile,
        medicalData,
      );
      expect(analysis.overall_score).toBe(80);

      // 3. 创建对话会话
      const session = conversationManager.createSession(
        'member-456',
        userProfile,
      );

      // 4. 基于分析结果进行营养咨询
      conversationManager.addMessage(
        session.id,
        'system',
        `健康分析完成，总分：${analysis.overall_score}`,
      );
      conversationManager.addMessage(
        session.id,
        'user',
        '请根据我的分析结果给我具体的饮食建议',
      );

      const conversationHistory = conversationManager.formatConversationHistory(
        session.id,
      );
      expect(conversationHistory).toContain('健康分析完成，总分：80');
      expect(conversationHistory).toContain('具体的饮食建议');

      // 5. 验证对话上下文管理
      const context = conversationManager.getConversationContext(session.id);
      expect(context.userProfile.name).toBe('Alice');
      expect(context.recentMessages).toHaveLength(2);

      // 6. 验证缓存策略
      const cacheKey = cache.generateKey({
        userProfile,
        medicalData,
        analysisType: 'comprehensive',
      });

      await cache.set(cacheKey, analysis, 3600);
      const cachedAnalysis = await cache.get(cacheKey);
      expect(cachedAnalysis?.overall_score).toBe(80);

      // 7. 验证速率限制
      const rateLimitResult = await rateLimiter.checkLimit(
        'member-456',
        'ai_analyze_health',
      );
      expect(rateLimitResult.allowed).toBe(true);

      // 8. 生成营养目标
      const nutritionTargets = healthAnalyzer.generateNutritionTargets(
        userProfile,
        analysis,
        userProfile.health_goals,
      );

      expect(nutritionTargets.daily_calories).toBeGreaterThan(0);
      expect(nutritionTargets.macros).toBeDefined();

      // 验证所有服务都被正确调用
      expect(openaiClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('应该处理错误情况并提供适当的降级方案', async () => {
      // Mock AI服务错误
      (openaiClient.chat.completions.create as jest.Mock)
        .mockRejectedValueOnce(new Error('AI service unavailable'))
        .mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const userProfile = {
        name: 'Bob',
        age: 45,
        gender: 'male',
        health_goals: ['heart_health'],
        dietary_preferences: null,
        allergies: [],
      };

      const medicalData = {
        blood_pressure: '160/100',
        cholesterol: 6.5,
      };

      // 尝试健康分析，应该使用降级方案
      const result = await aiFallbackService.analyzeHealthWithFallback(
        medicalData,
        userProfile,
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.data).toBeDefined();

      // 降级方案应该提供基本的健康建议
      expect(typeof result.data.risk_assessment).toBe('string');
      expect(typeof result.data.nutrition_recommendations).toBe('string');
    });
  });

  describe('性能测试', () => {
    it('应该能够处理并发请求', async () => {
      const userProfile = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        health_goals: [],
        dietary_preferences: null,
        allergies: [],
      };

      const medicalData = { weight: 70, height: 175 };

      // Mock快速AI响应
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'Quick response' } }],
      });

      // 创建多个并发会话
      const sessions = [];
      for (let i = 0; i < 10; i++) {
        sessions.push(
          conversationManager.createSession(`member-${i}`, userProfile),
        );
      }

      // 并发添加消息
      const promises = sessions.map((session) =>
        Promise.resolve(
          conversationManager.addMessage(session.id, 'user', 'Test message'),
        ),
      );

      await Promise.all(promises);

      // 验证所有会话都正常工作
      sessions.forEach((session) => {
        const sessionData = conversationManager.getSession(session.id);
        expect(sessionData?.messages).toHaveLength(1);
      });

      // 测试并发缓存操作
      const cachePromises = [];
      for (let i = 0; i < 20; i++) {
        const key = `test-key-${i}`;
        cachePromises.push(cache.set(key, { data: `value-${i}` }, 3600));
      }

      await Promise.all(cachePromises);

      // 验证缓存操作
      for (let i = 0; i < 20; i++) {
        const key = `test-key-${i}`;
        const cached = await cache.get(key);
        expect(cached?.data).toBe(`value-${i}`);
      }
    });
  });
});
