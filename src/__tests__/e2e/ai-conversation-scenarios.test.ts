/**
 * E2E测试：用户对话场景
 * 测试完整的AI营养咨询对话流程
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/ai/chat/route';

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
      update: jest.fn(),
    },
    aIAdvice: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/ai-review-service', () => ({
  aiReviewService: {
    reviewContent: jest.fn(),
  },
}));

import { openaiClient } from '@/lib/services/ai/openai-client';
import { prisma } from '@/lib/db';
import { aiReviewService } from '@/lib/services/ai-review-service';

describe('AI Conversation E2E Tests', () => {
  const mockUserId = 'test-user-123';
  const mockSessionId = 'test-session-456';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (prisma.userConsent.findUnique as jest.Mock).mockResolvedValue({
      userId: mockUserId,
      hasConsented: true,
      consentedAt: new Date(),
    });

    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{
        message: {
          content: '根据您的体检数据，我建议您增加蛋白质摄入，减少精制碳水化合物。',
        },
      }],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 80,
        total_tokens: 230,
      },
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
  });

  describe('完整对话流程', () => {
    it('应该成功处理初次营养咨询', async () => {
      const requestData = {
        message: '我的体检报告显示胆固醇偏高，应该怎么调整饮食？',
        userId: mockUserId,
        sessionId: mockSessionId,
        context: {
          healthData: {
            cholesterol: 6.5,
            age: 35,
            gender: 'male',
          },
        },
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
      expect(result.response).toContain('建议');
      expect(result.sessionId).toBe(mockSessionId);
      
      // Verify conversation was saved
      expect(prisma.aIConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          sessionId: mockSessionId,
          messages: expect.any(Array),
        }),
      });

      // Verify AI was called
      expect(openaiClient.chat.completions.create).toHaveBeenCalled();
      
      // Verify content review
      expect(aiReviewService.reviewContent).toHaveBeenCalled();
    });

    it('应该支持多轮对话上下文记忆', async () => {
      // Mock previous conversation
      (prisma.aIConversation.findMany as jest.Mock).mockResolvedValue([{
        id: 'conv-1',
        userId: mockUserId,
        sessionId: mockSessionId,
        messages: [
          {
            role: 'user',
            content: '我的胆固醇偏高',
            timestamp: new Date(),
          },
          {
            role: 'assistant', 
            content: '建议您减少饱和脂肪摄入',
            timestamp: new Date(),
          },
        ],
      }]);

      const followUpRequest = {
        message: '那具体应该吃什么？',
        userId: mockUserId,
        sessionId: mockSessionId,
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(followUpRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      
      // Verify that previous context was included in AI call
      const aiCall = (openaiClient.chat.completions.create as jest.Mock).mock.calls[0][0];
      expect(aiCall.messages.length).toBeGreaterThan(2); // Previous messages + new message
    });

    it('应该处理快捷预设问题', async () => {
      const presetRequest = {
        presetQuestion: 'how_to_lower_cholesterol',
        userId: mockUserId,
        sessionId: mockSessionId,
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(presetRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      
      // Should use preset template
      const aiCall = (openaiClient.chat.completions.create as jest.Mock).mock.calls[0][0];
      expect(aiCall.messages[0].content).toContain('降低胆固醇');
    });
  });

  describe('错误处理场景', () => {
    it('应该处理用户未同意免责声明的情况', async () => {
      (prisma.userConsent.findUnique as jest.Mock).mockResolvedValue(null);

      const requestData = {
        message: '我需要营养建议',
        userId: mockUserId,
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

      expect(response.status).toBe(403);
      expect(result.success).toBe(false);
      expect(result.error).toContain('同意');
    });

    it('应该处理AI服务不可用的情况', async () => {
      (openaiClient.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('AI service unavailable')
      );

      const requestData = {
        message: '我需要营养建议',
        userId: mockUserId,
        sessionId: mockSessionId,
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

      expect(response.status).toBe(503);
      expect(result.success).toBe(false);
      expect(result.fallbackResponse).toBeDefined();
    });

    it('应该处理内容审核不通过的情况', async () => {
      (aiReviewService.reviewContent as jest.Mock).mockResolvedValue({
        approved: false,
        riskLevel: 'high' as const,
        issues: [{
          type: 'medical_claim' as const,
          severity: 'high' as const,
          description: '包含医疗声明',
          recommendation: '修改建议内容',
        }],
        warnings: [],
        suggestions: [],
        metadata: {
          reviewTimestamp: new Date(),
          processingTime: 100,
          reviewerVersion: '1.0.0',
        },
      });

      const requestData = {
        message: '我的血糖很高，有危险吗？',
        userId: mockUserId,
        sessionId: mockSessionId,
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
      expect(result.response).toContain('就医');
      expect(result.reviewed).toBe(true);
    });
  });

  describe('性能和安全场景', () => {
    it('应该在合理时间内响应', async () => {
      const startTime = Date.now();
      
      (openaiClient.chat.completions.create as jest.Mock).mockImplementation(async () => {
        // Simulate 2 second AI response time
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          choices: [{
            message: { content: '快速响应' },
          }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
        };
      });

      const requestData = {
        message: '简单问题',
        userId: mockUserId,
        sessionId: mockSessionId,
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('应该过滤敏感信息', async () => {
      const sensitiveRequest = {
        message: '我的身份证号是123456789012345678，请给我营养建议',
        userId: mockUserId,
        sessionId: mockSessionId,
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(sensitiveRequest),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      
      // Verify sensitive data was filtered before sending to AI
      const aiCall = (openaiClient.chat.completions.create as jest.Mock).mock.calls[0][0];
      expect(aiCall.messages[0].content).not.toContain('123456789012345678');
      expect(aiCall.messages[0].content).toContain('[已过滤敏感信息]');
    });
  });

  describe('对话历史管理', () => {
    it('应该正确保存对话历史', async () => {
      const requestData = {
        message: '测试消息',
        userId: mockUserId,
        sessionId: mockSessionId,
      };

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      expect(prisma.aIConversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          sessionId: mockSessionId,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: '测试消息',
            }),
            expect.objectContaining({
              role: 'assistant',
              content: expect.any(String),
            }),
          ]),
        }),
      });
    });

    it('应该支持获取对话历史', async () => {
      const mockHistory = [{
        id: 'conv-1',
        sessionId: mockSessionId,
        messages: [
          { role: 'user', content: '之前的问题', timestamp: new Date() },
          { role: 'assistant', content: '之前的回答', timestamp: new Date() },
        ],
      }];

      (prisma.aIConversation.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const request = new NextRequest(`http://localhost/api/ai/chat?userId=${mockUserId}&sessionId=${mockSessionId}`, {
        method: 'GET',
      });

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.conversations).toEqual(mockHistory);
    });
  });
});
