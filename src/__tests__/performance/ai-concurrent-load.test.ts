/**
 * 压力测试：AI API并发调用
 * 测试系统在高并发情况下的性能表现和稳定性
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
        create: jest.fn()
      }
    }
  }
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    userConsent: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    },
    aIConversation: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    aIAdvice: {
      create: jest.fn()
    }
  }
}));

jest.mock('@/lib/services/ai-review-service', () => ({
  aiReviewService: {
    reviewContent: jest.fn()
  }
}));

jest.mock('@/lib/services/ai/rate-limiter', () => ({
  rateLimiter: {
    checkLimit: jest.fn()
  }
}));

import { openaiClient } from '@/lib/services/ai/openai-client';
import { prisma } from '@/lib/db';
import { aiReviewService } from '@/lib/services/ai-review-service';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';

describe('AI Concurrent Load Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (prisma.userConsent.findUnique as jest.Mock).mockResolvedValue({
      userId: 'test-user',
      hasConsented: true,
      consentedAt: new Date()
    });

    (openaiClient.chat.completions.create as jest.Mock).mockImplementation(async () => {
      // Simulate realistic AI response time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      return {
        choices: [{
          message: {
            content: 'AI生成的营养建议'
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230
        }
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
        reviewerVersion: '1.0.0'
      }
    });

    (rateLimiter.checkLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 100
    });
  });

  describe('并发聊天请求', () => {
    it('应该处理10个并发聊天请求', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestData = {
          message: `测试消息 ${i + 1}`,
          userId: `user-${i + 1}`,
          sessionId: `session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => POST(req)));
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify all AI calls were made
      expect(openaiClient.chat.completions.create).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('应该处理50个并发聊天请求', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestData = {
          message: `并发测试消息 ${i + 1}`,
          userId: `concurrent-user-${i + 1}`,
          sessionId: `concurrent-session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      });

      const startTime = Date.now();
      const responses = await Promise.allSettled(requests.map(req => POST(req)));
      const endTime = Date.now();

      // Analyze results
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;

      console.log(`并发测试结果: 成功 ${successful}, 失败 ${failed}, 耗时 ${endTime - startTime}ms`);

      // At least 90% should succeed
      expect(successful / concurrentRequests).toBeGreaterThan(0.9);

      // Should complete within reasonable time even under load
      expect(endTime - startTime).toBeLessThan(15000);
    });

    it('应该正确处理速率限制', async () => {
      // Mock rate limiter to trigger after 20 requests
      let requestCount = 0;
      (rateLimiter.checkLimit as jest.Mock).mockImplementation(async () => {
        requestCount++;
        if (requestCount > 20) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: new Date(Date.now() + 60000)
          };
        }
        return {
          allowed: true,
          remaining: 20 - requestCount
        };
      });

      const concurrentRequests = 30;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestData = {
          message: `速率限制测试 ${i + 1}`,
          userId: `rate-limit-user-${i + 1}`,
          sessionId: `rate-limit-session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      });

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      const successful = responses.filter(r => r.status === 200).length;
      const rateLimited = responses.filter(r => r.status === 429).length;

      expect(successful).toBe(20);
      expect(rateLimited).toBe(10);
    });
  });

  describe('混合API并发测试', () => {
    it('应该处理多种AI API的并发调用', async () => {
      const chatRequests = Array.from({ length: 10 }, (_, i) => {
        const requestData = {
          message: `聊天测试 ${i + 1}`,
          userId: `chat-user-${i + 1}`,
          sessionId: `chat-session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const healthAnalysisRequests = Array.from({ length: 5 }, (_, i) => {
        const requestData = {
          healthData: {
            cholesterol: 5.5 + i * 0.1,
            bloodSugar: 5.0 + i * 0.2,
            age: 30 + i,
            gender: 'male'
          },
          userId: `health-user-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/analyze-health', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const recipeOptimizationRequests = Array.from({ length: 5 }, (_, i) => {
        const requestData = {
          recipe: {
            name: `食谱 ${i + 1}`,
            ingredients: [
              { name: '米饭', amount: 100 },
              { name: '鸡肉', amount: 50 }
            ],
            nutrition: {
              calories: 300 + i * 50,
              protein: 20 + i * 5,
              carbs: 40 + i * 10
            }
          },
          healthGoals: {
            targetCalories: 2000,
            targetProtein: 100
          },
          userId: `recipe-user-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/optimize-recipe', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const allRequests = [...chatRequests, ...healthAnalysisRequests, ...recipeOptimizationRequests];
      
      const startTime = Date.now();
      const responses = await Promise.allSettled(allRequests.map(req => {
        if (req.url.includes('/chat')) return POST(req);
        if (req.url.includes('/analyze-health')) return AnalyzeHealthPOST(req);
        if (req.url.includes('/optimize-recipe')) return OptimizeRecipePOST(req);
        return Promise.reject(new Error('Unknown endpoint'));
      }));
      const endTime = Date.now();

      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;

      console.log(`混合API并发测试: 总请求 ${allRequests.length}, 成功 ${successful}, 失败 ${failed}, 耗时 ${endTime - startTime}ms`);

      expect(successful).toBeGreaterThan(allRequests.length * 0.9);
      expect(endTime - startTime).toBeLessThan(20000);
    });
  });

  describe('内存和资源管理', () => {
    it('应该在大量并发请求下保持内存稳定', async () => {
      const initialMemory = process.memoryUsage();
      console.log('初始内存使用:', {
        rss: Math.round(initialMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB'
      });

      // Execute 100 requests in batches
      const batchSize = 20;
      const batches = 5;
      
      for (let batch = 0; batch < batches; batch++) {
        const requests = Array.from({ length: batchSize }, (_, i) => {
          const requestData = {
            message: `内存测试批次${batch + 1}消息${i + 1}`,
            userId: `memory-user-${batch}-${i}`,
            sessionId: `memory-session-${batch}-${i}`
          };

          return new NextRequest('http://localhost/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify(requestData),
            headers: { 'Content-Type': 'application/json' }
          });
        });

        await Promise.all(requests.map(req => POST(req)));
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Wait for all async operations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalMemory = process.memoryUsage();
      console.log('最终内存使用:', {
        rss: Math.round(finalMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB'
      });

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = Math.round(memoryIncrease / 1024 / 1024);

      console.log(`内存增长: ${memoryIncreaseMB}MB`);

      // Memory increase should be reasonable (less than 100MB for 100 requests)
      expect(memoryIncreaseMB).toBeLessThan(100);
    });

    it('应该正确处理数据库连接池', async () => {
      const dbCallCount = jest.fn();
      
      // Mock database operations to track calls
      (prisma.aIConversation.create as jest.Mock).mockImplementation(dbCallCount);
      (prisma.userConsent.findUnique as jest.Mock).mockImplementation(dbCallCount);

      const concurrentRequests = 30;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestData = {
          message: `数据库连接测试 ${i + 1}`,
          userId: `db-user-${i + 1}`,
          sessionId: `db-session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      await Promise.all(requests.map(req => POST(req)));

      // Verify database was called appropriate number of times
      expect(dbCallCount).toHaveBeenCalledTimes(concurrentRequests * 2); // consent + conversation per request
    });
  });

  describe('错误恢复测试', () => {
    it('应该在部分AI服务失败时继续处理其他请求', async () => {
      let failureCount = 0;
      (openaiClient.chat.completions.create as jest.Mock).mockImplementation(async () => {
        failureCount++;
        if (failureCount % 3 === 0) {
          throw new Error('AI service temporarily unavailable');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          choices: [{ message: { content: '成功响应' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
        };
      });

      const concurrentRequests = 15;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestData = {
          message: `错误恢复测试 ${i + 1}`,
          userId: `recovery-user-${i + 1}`,
          sessionId: `recovery-session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const responses = await Promise.allSettled(requests.map(req => POST(req)));
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      
      const fallbackResponses = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 503
      ).length;

      console.log(`错误恢复测试: 成功响应 ${successful}, 降级响应 ${fallbackResponses}`);

      // Some requests should succeed, others should get fallback responses
      expect(successful + fallbackResponses).toBe(concurrentRequests);
      expect(fallbackResponses).toBeGreaterThan(0);
    });
  });

  describe('性能基准测试', () => {
    it('应该满足性能基准要求', async () => {
      const concurrentRequests = 20;
      const responseTimes: number[] = [];

      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const requestData = {
          message: `性能基准测试 ${i + 1}`,
          userId: `perf-user-${i + 1}`,
          sessionId: `perf-session-${i + 1}`
        };

        return new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const startTime = Date.now();
      
      const responses = await Promise.all(requests.map(async (req) => {
        const requestStart = Date.now();
        const response = await POST(req);
        const requestEnd = Date.now();
        responseTimes.push(requestEnd - requestStart);
        return response;
      }));
      
      const endTime = Date.now();

      // Calculate performance metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      console.log('性能指标:', {
        总请求数: concurrentRequests,
        总耗时: `${endTime - startTime}ms`,
        平均响应时间: `${Math.round(avgResponseTime)}ms`,
        最大响应时间: `${maxResponseTime}ms`,
        最小响应时间: `${minResponseTime}ms`,
        P95响应时间: `${p95ResponseTime}ms`
      });

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(3000); // Average < 3s
      expect(maxResponseTime).toBeLessThan(8000); // Max < 8s
      expect(p95ResponseTime).toBeLessThan(5000); // P95 < 5s
      expect(endTime - startTime).toBeLessThan(10000); // Total < 10s

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
