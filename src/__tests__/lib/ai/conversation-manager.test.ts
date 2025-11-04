/**
 * AI对话管理器单元测试
 */

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

// Mock the conversation manager module
jest.mock('@/lib/services/ai/conversation-manager', () => ({
  ConversationManager: jest.fn().mockImplementation(() => ({
    clearAllSessions: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    getOrCreateSession: jest.fn(),
    deleteSession: jest.fn(),
    getUserSessions: jest.fn(),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    recognizeIntent: jest.fn(),
  })),
  conversationManager: {
    clearAllSessions: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    getOrCreateSession: jest.fn(),
    deleteSession: jest.fn(),
    getUserSessions: jest.fn(),
    addMessage: jest.fn(),
    getMessages: jest.fn(),
    recognizeIntent: jest.fn(),
  },
}));

import { ConversationManager } from '@/lib/services/ai/conversation-manager';

describe('Conversation Manager', () => {
  let mockConversationManager: any;
  let conversationManager: any;

  beforeEach(() => {
    mockConversationManager = new ConversationManager();
    conversationManager = mockConversationManager;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConversationManager.clearAllSessions();
  });

  describe('会话管理', () => {
    it('应该能够创建新会话', () => {
      const memberId = 'member-123';
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: null,
        allergies: [],
      };

      const session = conversationManager.createSession(memberId, userProfile);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.memberId).toBe(memberId);
      expect(session.userProfile).toEqual(userProfile);
      expect(session.messages).toEqual([]);
      expect(session.status).toBe('active');
    });

    it('应该能够获取现有会话', () => {
      const memberId = 'member-123';
      const userProfile = { name: 'John', age: 30, gender: 'male', health_goals: [], dietary_preferences: null, allergies: [] };

      const createdSession = conversationManager.createSession(memberId, userProfile);
      const retrievedSession = conversationManager.getSession(createdSession.id);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.id).toBe(createdSession.id);
      expect(retrievedSession?.memberId).toBe(memberId);
    });

    it('应该能够获取或创建会话', () => {
      const memberId = 'member-123';
      const userProfile = { name: 'John', age: 30, gender: 'male', health_goals: [], dietary_preferences: null, allergies: [] };

      // 第一次调用应该创建新会话
      const session1 = conversationManager.getOrCreateSession('new-session-id', memberId, userProfile);
      expect(session1.id).toBe('new-session-id');
      expect(session1.memberId).toBe(memberId);

      // 第二次调用应该返回现有会话
      const session2 = conversationManager.getOrCreateSession('new-session-id', memberId);
      expect(session2.id).toBe('new-session-id');
      expect(session2).toBe(session1);
    });

    it('应该能够删除会话', () => {
      const memberId = 'member-123';
      const userProfile = { name: 'John', age: 30, gender: 'male', health_goals: [], dietary_preferences: null, allergies: [] };

      const session = conversationManager.createSession(memberId, userProfile);
      expect(conversationManager.getSession(session.id)).toBeDefined();

      conversationManager.deleteSession(session.id);
      expect(conversationManager.getSession(session.id)).toBeUndefined();
    });

    it('应该能够获取用户的所有会话', () => {
      const memberId = 'member-123';
      const userProfile = { name: 'John', age: 30, gender: 'male', health_goals: [], dietary_preferences: null, allergies: [] };

      const session1 = conversationManager.createSession(memberId, userProfile);
      const session2 = conversationManager.createSession(memberId, userProfile);
      const session3 = conversationManager.createSession('other-member', userProfile);

      const userSessions = conversationManager.getUserSessions(memberId);

      expect(userSessions).toHaveLength(2);
      expect(userSessions.map(s => s.id)).toContain(session1.id);
      expect(userSessions.map(s => s.id)).toContain(session2.id);
      expect(userSessions.map(s => s.id)).not.toContain(session3.id);
    });
  });

  describe('消息管理', () => {
    let sessionId: string;

    beforeEach(() => {
      const userProfile = { name: 'John', age: 30, gender: 'male', health_goals: [], dietary_preferences: null, allergies: [] };
      const session = conversationManager.createSession('member-123', userProfile);
      sessionId = session.id;
    });

    it('应该能够添加用户消息', () => {
      const content = 'Hello, I need help with my diet';
      const metadata = { intent: 'nutrition_advice', confidence: 0.9 };

      conversationManager.addMessage(sessionId, 'user', content, metadata);

      const session = conversationManager.getSession(sessionId);
      expect(session?.messages).toHaveLength(1);

      const message = session!.messages[0];
      expect(message.role).toBe('user');
      expect(message.content).toBe(content);
      expect(message.metadata).toEqual(metadata);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('应该能够添加助手回复', () => {
      // 先添加用户消息
      conversationManager.addMessage(sessionId, 'user', 'What should I eat today?');

      // 添加助手回复
      const response = 'Based on your health goals, I recommend...';
      const metadata = { model: 'gpt-4', tokens: 150 };

      conversationManager.addMessage(sessionId, 'assistant', response, metadata);

      const session = conversationManager.getSession(sessionId);
      expect(session?.messages).toHaveLength(2);

      const lastMessage = session!.messages[1];
      expect(lastMessage.role).toBe('assistant');
      expect(lastMessage.content).toBe(response);
      expect(lastMessage.metadata).toEqual(metadata);
    });

    it('应该保持消息顺序', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
        { role: 'user' as const, content: 'How are you?' },
        { role: 'assistant' as const, content: 'I am doing well, thanks!' },
      ];

      messages.forEach(msg => {
        conversationManager.addMessage(sessionId, msg.role, msg.content);
      });

      const session = conversationManager.getSession(sessionId);
      expect(session?.messages).toHaveLength(4);

      session!.messages.forEach((message, index) => {
        expect(message.role).toBe(messages[index].role);
        expect(message.content).toBe(messages[index].content);
      });
    });

    it('应该能够获取最近的消息', () => {
      // 添加多条消息
      for (let i = 0; i < 10; i++) {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        conversationManager.addMessage(sessionId, role, `Message ${i}`);
      }

      const recentMessages = conversationManager.getRecentMessages(sessionId, 5);
      expect(recentMessages).toHaveLength(5);

      // 应该是最后5条消息
      recentMessages.forEach((message, index) => {
        expect(message.content).toBe(`Message ${index + 5}`);
      });
    });

    it('应该能够格式化对话历史', () => {
      conversationManager.addMessage(sessionId, 'user', 'What is a healthy breakfast?');
      conversationManager.addMessage(sessionId, 'assistant', 'A healthy breakfast includes...');

      const formattedHistory = conversationManager.formatConversationHistory(sessionId);

      expect(formattedHistory).toContain('User: What is a healthy breakfast?');
      expect(formattedHistory).toContain('Assistant: A healthy breakfast includes...');
    });
  });

  describe('意图识别', () => {
    it('应该能够识别营养相关意图', () => {
      const testCases = [
        { message: 'What should I eat for weight loss?', expectedIntent: 'nutrition_advice' },
        { message: 'How many calories should I consume?', expectedIntent: 'calorie_guidance' },
        { message: 'Is this food healthy?', expectedIntent: 'food_analysis' },
        { message: 'Create a meal plan for me', expectedIntent: 'meal_planning' },
        { message: 'What are good protein sources?', expectedIntent: 'nutrition_info' },
      ];

      testCases.forEach(({ message, expectedIntent }) => {
        const result = conversationManager.recognizeIntent(message);
        expect(result.intent).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('应该能够识别健康相关意图', () => {
      const testCases = [
        { message: 'Analyze my health data', expectedIntent: 'health_analysis' },
        { message: 'Check my BMI', expectedIntent: 'health_metrics' },
        { message: 'What do my blood tests mean?', expectedIntent: 'medical_interpretation' },
        { message: 'Am I healthy?', expectedIntent: 'health_assessment' },
      ];

      testCases.forEach(({ message, expectedIntent }) => {
        const result = conversationManager.recognizeIntent(message);
        expect(result.intent).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('应该能够识别健身相关意图', () => {
      const testCases = [
        { message: 'How should I exercise?', expectedIntent: 'fitness_advice' },
        { message: 'Create a workout plan', expectedIntent: 'workout_planning' },
        { message: 'Is this exercise good for weight loss?', expectedIntent: 'exercise_analysis' },
      ];

      testCases.forEach(({ message, expectedIntent }) => {
        const result = conversationManager.recognizeIntent(message);
        expect(result.intent).toBe(expectedIntent);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('应该处理模糊意图', () => {
      const ambiguousMessages = [
        'Help',
        'I need advice',
        'Can you help me?',
        'What do you think?',
      ];

      ambiguousMessages.forEach(message => {
        const result = conversationManager.recognizeIntent(message);
        expect(result.intent).toBe('general_chat');
        expect(result.confidence).toBeLessThan(0.5);
      });
    });

    it('应该支持多语言意图识别', () => {
      const testCases = [
        { message: '我应该如何减肥？', expectedIntent: 'nutrition_advice' },
        { message: '分析我的健康数据', expectedIntent: 'health_analysis' },
        { message: '制定运动计划', expectedIntent: 'workout_planning' },
      ];

      testCases.forEach(({ message, expectedIntent }) => {
        const result = conversationManager.recognizeIntent(message);
        expect(result.intent).toBe(expectedIntent);
      });
    });
  });

  describe('上下文管理', () => {
    let sessionId: string;

    beforeEach(() => {
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: { diet_type: 'balanced' },
        allergies: ['nuts'],
      };
      const session = conversationManager.createSession('member-123', userProfile);
      sessionId = session.id;
    });

    it('应该提供对话上下文', () => {
      conversationManager.addMessage(sessionId, 'user', 'I want to lose weight');
      conversationManager.addMessage(sessionId, 'assistant', 'I can help with weight loss. What is your current weight?');
      conversationManager.addMessage(sessionId, 'user', 'I am 80kg and 175cm tall');

      const context = conversationManager.getConversationContext(sessionId);

      expect(context.userProfile).toBeDefined();
      expect(context.userProfile.name).toBe('John');
      expect(context.userProfile.health_goals).toContain('weight_loss');
      expect(context.recentMessages).toHaveLength(3);
      expect(context.currentTopic).toContain('weight');
      expect(context.sessionDuration).toBeGreaterThan(0);
    });

    it('应该检测话题变化', () => {
      conversationManager.addMessage(sessionId, 'user', 'Tell me about nutrition');
      conversationManager.addMessage(sessionId, 'assistant', 'Nutrition is important for health...');
      conversationManager.addMessage(sessionId, 'user', 'Actually, I want to know about exercise');

      const context = conversationManager.getConversationContext(sessionId);
      expect(context.topicChanged).toBe(true);
      expect(context.previousTopic).toContain('nutrition');
      expect(context.currentTopic).toContain('exercise');
    });

    it('应该跟踪用户偏好', () => {
      conversationManager.addMessage(sessionId, 'user', 'I prefer detailed answers');
      conversationManager.addMessage(sessionId, 'user', 'Keep it simple next time');
      conversationManager.addMessage(sessionId, 'user', 'I like scientific explanations');

      const context = conversationManager.getConversationContext(sessionId);
      expect(context.userPreferences).toBeDefined();
      expect(context.userPreferences.responseStyle).toBe('detailed');
      expect(context.userPreferences.complexityLevel).toBe('simple');
      expect(context.userPreferences.explanationType).toBe('scientific');
    });

    it('应该管理会话状态', () => {
      expect(conversationManager.getSessionStatus(sessionId)).toBe('active');

      conversationManager.setSessionStatus(sessionId, 'paused');
      expect(conversationManager.getSessionStatus(sessionId)).toBe('paused');

      conversationManager.setSessionStatus(sessionId, 'archived');
      expect(conversationManager.getSessionStatus(sessionId)).toBe('archived');
    });
  });

  describe('响应生成', () => {
    let sessionId: string;
    const mockCreate = (openaiClient.chat.completions.create as jest.Mock);

    beforeEach(() => {
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: null,
        allergies: [],
      };
      const session = conversationManager.createSession('member-123', userProfile);
      sessionId = session.id;

      // Mock successful AI response
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Here is my advice for healthy eating...',
          },
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
      });
    });

    it('应该生成AI响应', async () => {
      conversationManager.addMessage(sessionId, 'user', 'What should I eat for breakfast?');

      const response = await conversationManager.generateResponse(sessionId, {
        temperature: 0.7,
        maxTokens: 500,
      });

      expect(response).toBeDefined();
      expect(response.content).toContain('Here is my advice');
      expect(response.metadata).toBeDefined();
      expect(response.metadata.model).toBeDefined();
      expect(response.metadata.tokens).toBe(150);
    });

    it('应该处理流式响应', async () => {
      // Mock streaming response
      const streamChunks = [
        'Here',
        ' is',
        ' my',
        ' advice',
        ' for',
        ' healthy',
        ' eating',
        '.',
      ];

      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: streamChunks.join(''),
          },
        }],
      });

      conversationManager.addMessage(sessionId, 'user', 'Give me some advice');

      const chunks = [];
      for await (const chunk of conversationManager.generateStreamingResponse(sessionId)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(streamChunks.length);
      expect(chunks.join('')).toBe(streamChunks.join(''));
    });

    it('应该处理AI服务错误', async () => {
      mockCreate.mockRejectedValue(new Error('AI service unavailable'));

      conversationManager.addMessage(sessionId, 'user', 'Help me with diet');

      await expect(conversationManager.generateResponse(sessionId)).rejects.toThrow('AI service unavailable');
    });

    it('应该重用对话历史', async () => {
      conversationManager.addMessage(sessionId, 'user', 'My name is John');
      conversationManager.addMessage(sessionId, 'assistant', 'Nice to meet you, John!');
      conversationManager.addMessage(sessionId, 'user', 'What is my name?');

      const response = await conversationManager.generateResponse(sessionId);

      expect(response.content).toContain('John');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('John'),
            }),
          ]),
        })
      );
    });
  });

  describe('预设问题', () => {
    it('应该提供分类的预设问题', () => {
      const questions = conversationManager.getPresetQuestions();

      expect(questions).toBeDefined();
      expect(questions.length).toBeGreaterThan(0);

      // 检查分类
      const categories = questions.map(q => q.category);
      expect(categories).toContain('nutrition');
      expect(categories).toContain('health');
      expect(categories).toContain('fitness');
    });

    it('应该按类别获取预设问题', () => {
      const nutritionQuestions = conversationManager.getPresetQuestions('nutrition');
      const healthQuestions = conversationManager.getPresetQuestions('health');

      expect(nutritionQuestions.length).toBeGreaterThan(0);
      expect(healthQuestions.length).toBeGreaterThan(0);

      nutritionQuestions.forEach(q => {
        expect(q.category).toBe('nutrition');
      });

      healthQuestions.forEach(q => {
        expect(q.category).toBe('health');
      });
    });

    it('应该提供相关问题的推荐', () => {
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: null,
        allergies: ['nuts'],
      };

      const session = conversationManager.createSession('member-123', userProfile);

      conversationManager.addMessage(session.id, 'user', 'I want to lose weight');

      const recommendedQuestions = conversationManager.getRecommendedQuestions(session.id);

      expect(recommendedQuestions).toBeDefined();
      expect(recommendedQuestions.length).toBeGreaterThan(0);

      // 推荐的问题应该与用户目标和对话内容相关
      recommendedQuestions.forEach(q => {
        expect(
          q.question.toLowerCase().includes('weight') ||
          q.question.toLowerCase().includes('diet') ||
          q.question.toLowerCase().includes('calorie')
        ).toBe(true);
      });
    });
  });

  describe('会话分析', () => {
    let sessionId: string;

    beforeEach(() => {
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: ['weight_loss'],
        dietary_preferences: null,
        allergies: [],
      };
      const session = conversationManager.createSession('member-123', userProfile);
      sessionId = session.id;
    });

    it('应该分析会话统计', () => {
      conversationManager.addMessage(sessionId, 'user', 'Hello');
      conversationManager.addMessage(sessionId, 'assistant', 'Hi! How can I help you?');
      conversationManager.addMessage(sessionId, 'user', 'I need diet advice');
      conversationManager.addMessage(sessionId, 'assistant', 'I can help with diet planning...');

      const stats = conversationManager.getSessionStats(sessionId);

      expect(stats.messageCount).toBe(4);
      expect(stats.userMessageCount).toBe(2);
      expect(stats.assistantMessageCount).toBe(2);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.duration).toBeGreaterThan(0);
      expect(stats.topics).toContain('diet');
    });

    it('应该生成会话摘要', () => {
      conversationManager.addMessage(sessionId, 'user', 'I want to lose weight');
      conversationManager.addMessage(sessionId, 'assistant', 'I can help with weight loss. What is your current weight?');
      conversationManager.addMessage(sessionId, 'user', 'I am 80kg');
      conversationManager.addMessage(sessionId, 'assistant', 'Based on your weight, I recommend a calorie deficit...');

      const summary = conversationManager.generateSessionSummary(sessionId);

      expect(summary).toBeDefined();
      expect(summary.mainTopic).toContain('weight');
      expect(summary.keyPoints).toContain('calorie deficit');
      expect(summary.actionItems).toBeDefined();
      expect(summary.nextSteps).toBeDefined();
    });

    it('应该评估会话质量', () => {
      // 添加高质量的对话
      conversationManager.addMessage(sessionId, 'user', 'What is a healthy breakfast?');
      conversationManager.addMessage(sessionId, 'assistant', 'A healthy breakfast should include protein, complex carbs, and healthy fats. For example, oatmeal with berries and nuts provides...');

      const quality = conversationManager.assessConversationQuality(sessionId);

      expect(quality.overallScore).toBeGreaterThan(0);
      expect(quality.overallScore).toBeLessThanOrEqual(100);
      expect(quality.relevance).toBeGreaterThan(0);
      expect(quality.completeness).toBeGreaterThan(0);
      expect(quality.clarity).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    it('应该快速处理大量会话', () => {
      const startTime = performance.now();

      // 创建1000个会话
      const sessions = [];
      for (let i = 0; i < 1000; i++) {
        const userProfile = {
          name: `User${i}`,
          age: 30,
          gender: 'male',
          health_goals: [],
          dietary_preferences: null,
          allergies: [],
        };
        sessions.push(conversationManager.createSession(`member-${i}`, userProfile));
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
      expect(sessions).toHaveLength(1000);
    });

    it('应该高效处理长对话', () => {
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: [],
        dietary_preferences: null,
        allergies: [],
      };
      const session = conversationManager.createSession('member-123', userProfile);

      const startTime = performance.now();

      // 添加100条消息
      for (let i = 0; i < 100; i++) {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        conversationManager.addMessage(session.id, role, `Message number ${i}`);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // 应该在0.5秒内完成

      const retrievedSession = conversationManager.getSession(session.id);
      expect(retrievedSession?.messages).toHaveLength(100);
    });
  });

  describe('内存管理', () => {
    it('应该限制内存使用', () => {
      const initialMemory = conversationManager.getMemoryUsage();
      expect(initialMemory.activeSessions).toBe(0);
      expect(initialMemory.totalMessages).toBe(0);
      expect(initialMemory.estimatedMemoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('应该清理非活跃会话', () => {
      // 创建会话
      const userProfile = {
        name: 'John',
        age: 30,
        gender: 'male',
        health_goals: [],
        dietary_preferences: null,
        allergies: [],
      };
      const session = conversationManager.createSession('member-123', userProfile);

      expect(conversationManager.getSession(session.id)).toBeDefined();

      // 标记为非活跃
      conversationManager.setSessionStatus(session.id, 'inactive');

      // 清理非活跃会话
      conversationManager.cleanupInactiveSessions(0); // 立即清理

      expect(conversationManager.getSession(session.id)).toBeUndefined();
    });
  });
});
