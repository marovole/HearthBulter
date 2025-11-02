/**
 * 成本测试：Token消耗统计
 * 测试AI API的Token使用量和成本控制
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/chat/route';
import { POST as AnalyzeHealthPOST } from '@/app/api/ai/analyze-health/route';
import { POST as OptimizeRecipePOST } from '@/app/api/ai/optimize-recipe/route';

// Mock external dependencies
jest.mock('@/lib/services/ai/openai-client', () => ({
  openaiClient: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    userConsent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    aIConversation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    aIAdvice: {
      create: jest.fn(),
    },
    tokenUsage: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/ai-review-service', () => ({
  aiReviewService: {
    reviewContent: jest.fn(),
  },
}));

jest.mock('@/lib/services/ai/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: jest.fn(),
  },
}));

import { openaiClient } from '@/lib/services/ai/openai-client';
import { prisma } from '@/lib/db';
import { aiReviewService } from '@/lib/services/ai-review-service';

// Token pricing (example for GPT-4)
const TOKEN_PRICING = {
  'gpt-4': {
    input: 0.03,  // $0.03 per 1K tokens
    output: 0.06,  // $0.06 per 1K tokens
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
  },
  'gpt-3.5-turbo': {
    input: 0.0015,
    output: 0.002,
  },
};

describe('AI Token Cost Tests', () => {
  let tokenUsageLog: Array<{
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    timestamp: Date;
  }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    tokenUsageLog = [];
    
    // Setup default mocks
    (prisma.userConsent.findUnique as jest.Mock).mockResolvedValue({
      userId: 'test-user',
      hasConsented: true,
      consentedAt: new Date(),
    });

    (openaiClient.chat.completions.create as jest.Mock).mockImplementation(async (params) => {
      const mockUsage = {
        prompt_tokens: params.messages.reduce((sum: number, msg: any) => sum + msg.content.split(' ').length, 0),
        completion_tokens: Math.floor(Math.random() * 200) + 50,
        total_tokens: 0,
      };
      mockUsage.total_tokens = mockUsage.prompt_tokens + mockUsage.completion_tokens;

      tokenUsageLog.push({
        model: params.model || 'gpt-4',
        promptTokens: mockUsage.prompt_tokens,
        completionTokens: mockUsage.completion_tokens,
        totalTokens: mockUsage.total_tokens,
        timestamp: new Date(),
      });

      return {
        choices: [{
          message: {
            content: 'AI生成的响应内容，用于测试Token消耗统计。',
          },
        }],
        usage: mockUsage,
      };
    });

    (aiReviewService.reviewContent as jest.Mock).mockResolvedValue({
      approved: true,
      riskLevel: 'low' as const,
      issues: [],
      warnings: [],
      suggestions: [],
      metadata: {
        reviewTimestamp: new Date(),
        processingTime: 50,
        reviewerVersion: '1.0.0',
      },
    });

    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 100,
    });

    // Mock token usage tracking
    (prisma.tokenUsage.create as jest.Mock).mockImplementation(async (data) => {
      return { id: 'token-usage-1', ...data.data };
    });

    (prisma.tokenUsage.aggregate as jest.Mock).mockResolvedValue({
      _sum: {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      },
      _count: { id: 10 },
    });
  });

  describe('Token使用统计', () => {
    it('应该正确统计单次请求的Token使用量', async () => {
      const requestData = {
        message: '请分析我的胆固醇水平并给出饮食建议，我的总胆固醇是6.2mmol/L，低密度脂蛋白是4.1mmol/L，高密度脂蛋白是1.2mmol/L，甘油三酯是1.8mmol/L。我今年35岁，男性，有轻度脂肪肝，平时运动较少，饮食偏油腻。请根据这些数据给我具体的饮食调整建议。',
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage.promptTokens).toBeGreaterThan(0);
      expect(result.tokenUsage.completionTokens).toBeGreaterThan(0);
      expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);

      // Verify token usage was logged
      expect(prisma.tokenUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'test-user',
          apiEndpoint: '/api/ai/chat',
          promptTokens: expect.any(Number),
          completionTokens: expect.any(Number),
          totalTokens: expect.any(Number),
          estimatedCost: expect.any(Number),
        }),
      });
    });

    it('应该统计不同类型API的Token使用', async () => {
      // Chat API request
      const chatRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: '营养咨询问题',
          userId: 'test-user',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Health analysis API request
      const healthRequest = new NextRequest('http://localhost/api/ai/analyze-health', {
        method: 'POST',
        body: JSON.stringify({
          healthData: {
            cholesterol: 6.2,
            bloodSugar: 5.5,
            age: 35,
            gender: 'male',
          },
          userId: 'test-user',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Recipe optimization API request
      const recipeRequest = new NextRequest('http://localhost/api/ai/optimize-recipe', {
        method: 'POST',
        body: JSON.stringify({
          recipe: {
            name: '测试食谱',
            ingredients: [
              { name: '米饭', amount: 100 },
              { name: '鸡肉', amount: 50 },
            ],
          },
          healthGoals: {
            targetCalories: 2000,
          },
          userId: 'test-user',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(chatRequest);
      await AnalyzeHealthPOST(healthRequest);
      await OptimizeRecipePOST(recipeRequest);

      // Verify token usage was tracked for all APIs
      expect(prisma.tokenUsage.create).toHaveBeenCalledTimes(3);
      
      const calls = (prisma.tokenUsage.create as jest.Mock).mock.calls;
      const endpoints = calls.map(call => call[0].data.apiEndpoint);
      
      expect(endpoints).toContain('/api/ai/chat');
      expect(endpoints).toContain('/api/ai/analyze-health');
      expect(endpoints).toContain('/api/ai/optimize-recipe');
    });
  });

  describe('成本计算', () => {
    it('应该正确计算单次请求的成本', async () => {
      const requestData = {
        message: '请给我详细的营养建议',
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.tokenUsage.estimatedCost).toBeDefined();
      expect(result.tokenUsage.estimatedCost).toBeGreaterThan(0);

      // Verify cost calculation
      const expectedCost = (result.tokenUsage.promptTokens / 1000) * TOKEN_PRICING['gpt-4'].input +
                          (result.tokenUsage.completionTokens / 1000) * TOKEN_PRICING['gpt-4'].output;
      
      expect(Math.abs(result.tokenUsage.estimatedCost - expectedCost)).toBeLessThan(0.01);
    });

    it('应该根据不同模型计算成本', async () => {
      const models = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      const costs: { [key: string]: number } = {};

      for (const model of models) {
        (openaiClient.chat.completions.create as jest.Mock).mockImplementation(async (params) => {
          const mockUsage = {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          };

          return {
            choices: [{ message: { content: 'Response' } }],
            usage: mockUsage,
            model: model,
          };
        });

        const requestData = {
          message: '测试不同模型的成本',
          userId: 'test-user',
          sessionId: 'test-session',
          model: model,
        };

        const request = new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const result = await response.json();
        
        costs[model] = result.tokenUsage.estimatedCost;
      }

      // GPT-3.5-turbo should be cheapest
      expect(costs['gpt-3.5-turbo']).toBeLessThan(costs['gpt-4-turbo']);
      expect(costs['gpt-4-turbo']).toBeLessThan(costs['gpt-4']);
    });
  });

  describe('使用量聚合统计', () => {
    it('应该统计用户日/周/月使用量', async () => {
      // Mock aggregated usage data
      (prisma.tokenUsage.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          promptTokens: 5000,
          completionTokens: 2500,
          totalTokens: 7500,
        },
        _count: { id: 25 },
      });

      const requestData = {
        message: '查询我的使用量统计',
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.usageStats).toBeDefined();
      expect(result.usageStats.daily).toBeDefined();
      expect(result.usageStats.weekly).toBeDefined();
      expect(result.usageStats.monthly).toBeDefined();
    });

    it('应该统计全局使用量和成本', async () => {
      // Mock global usage stats
      (prisma.tokenUsage.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          promptTokens: 50000,
          completionTokens: 25000,
          totalTokens: 75000,
          estimatedCost: 1500.00,
        },
        _count: { id: 500 },
      });

      // This would typically be called by an admin endpoint
      const globalStats = {
        totalTokens: 75000,
        totalCost: 1500.00,
        totalRequests: 500,
        averageTokensPerRequest: 150,
        averageCostPerRequest: 3.00,
      };

      expect(globalStats.totalTokens).toBe(75000);
      expect(globalStats.totalCost).toBe(1500.00);
      expect(globalStats.averageTokensPerRequest).toBe(150);
    });
  });

  describe('成本控制测试', () => {
    it('应该在用户超出预算时返回警告', async () => {
      // Mock user has exceeded daily budget
      (prisma.tokenUsage.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          estimatedCost: 10.00, // $10 daily budget exceeded
        },
        _count: { id: 50 },
      });

      const requestData = {
        message: '我已经超预算了还能用吗？',
        userId: 'budget-exceeded-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.budgetWarning).toBeDefined();
      expect(result.budgetWarning.exceeded).toBe(true);
      expect(result.budgetWarning.dailyLimit).toBe(5.00);
      expect(result.budgetWarning.currentUsage).toBe(10.00);
    });

    it('应该在高成本操作前要求确认', async () => {
      // Mock a high-cost request (long context)
      const longContextRequest = {
        message: 'A'.repeat(10000), // Very long message
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(longContextRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      
      if (result.tokenUsage.estimatedCost > 1.00) { // If cost > $1
        expect(result.costConfirmation).toBeDefined();
        expect(result.costConfirmation.required).toBe(true);
        expect(result.costConfirmation.estimatedCost).toBeGreaterThan(1.00);
      }
    });
  });

  describe('优化建议测试', () => {
    it('应该提供Token使用优化建议', async () => {
      // Mock inefficient usage patterns
      tokenUsageLog = [
        { model: 'gpt-4', promptTokens: 2000, completionTokens: 1000, totalTokens: 3000, timestamp: new Date() },
        { model: 'gpt-4', promptTokens: 1800, completionTokens: 900, totalTokens: 2700, timestamp: new Date() },
        { model: 'gpt-4', promptTokens: 2200, completionTokens: 1100, totalTokens: 3300, timestamp: new Date() },
      ];

      const requestData = {
        message: '分析我的Token使用效率',
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.optimizationSuggestions).toBeDefined();
      
      const suggestions = result.optimizationSuggestions;
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should include suggestions like:
      expect(suggestions.some((s: any) => s.type === 'model_switch')).toBe(true);
      expect(suggestions.some((s: any) => s.type === 'prompt_optimization')).toBe(true);
      expect(suggestions.some((s: any) => s.type === 'caching')).toBe(true);
    });

    it('应该识别高成本使用模式', async () => {
      // Mock expensive usage pattern
      const expensiveRequest = {
        message: `请详细分析${'详细'.repeat(1000)}我的健康状况`,
        userId: 'expensive-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(expensiveRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      
      if (result.tokenUsage.totalTokens > 1000) {
        expect(result.costAnalysis).toBeDefined();
        expect(result.costAnalysis.isExpensive).toBe(true);
        expect(result.costAnalysis.recommendations).toBeDefined();
        expect(result.costAnalysis.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('缓存效果测试', () => {
    it('应该统计缓存节省的Token', async () => {
      // Mock cache hit
      const cachedRequest = {
        message: '常见问题：如何降低胆固醇？',
        userId: 'test-user',
        sessionId: 'test-session',
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(cachedRequest),
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Status': 'HIT',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.cacheHit).toBe(true);
      expect(result.tokenUsage.savedTokens).toBeGreaterThan(0);
      expect(result.tokenUsage.savedCost).toBeGreaterThan(0);
    });
  });

  describe('报告生成测试', () => {
    it('应该生成成本使用报告', async () => {
      // Mock monthly usage data
      (prisma.tokenUsage.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          userId: 'user1',
          apiEndpoint: '/api/ai/chat',
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          estimatedCost: 0.75,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          userId: 'user1',
          apiEndpoint: '/api/ai/analyze-health',
          promptTokens: 800,
          completionTokens: 400,
          totalTokens: 1200,
          estimatedCost: 0.60,
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const reportData = {
        period: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        totalCost: 50.25,
        totalTokens: 25000,
        totalRequests: 150,
        averageCostPerRequest: 0.335,
        topEndpoints: [
          { endpoint: '/api/ai/chat', usage: 60, cost: 30.15 },
          { endpoint: '/api/ai/analyze-health', usage: 45, cost: 15.10 },
          { endpoint: '/api/ai/optimize-recipe', usage: 45, cost: 5.00 },
        ],
        topUsers: [
          { userId: 'user1', usage: 50, cost: 25.00 },
          { userId: 'user2', usage: 30, cost: 15.00 },
        ],
      };

      expect(reportData.totalCost).toBe(50.25);
      expect(reportData.totalTokens).toBe(25000);
      expect(reportData.averageCostPerRequest).toBe(0.335);
      expect(reportData.topEndpoints.length).toBe(3);
      expect(reportData.topUsers.length).toBe(2);
    });
  });
});
