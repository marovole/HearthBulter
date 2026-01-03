import { callOpenAI, RECOMMENDED_MODELS } from './openai-client';
import {
  getActivePrompt,
  renderPrompt,
  validatePromptParameters,
} from './prompt-templates';
import { aiResponseCache, AICacheKeys } from './response-cache';
import { createHash } from 'crypto';
import {
  recognizeIntentFromMessage,
  formatConversationHistory,
  extractKeyTopics,
  extractHealthConcerns,
  getPresetQuestions as getPresetQuestionsList,
  getFallbackResponse,
} from './conversation-helpers';

// 对话消息类型
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    tokens?: number;
    model?: string;
  };
}

// 对话会话类型
export interface ConversationSession {
  id: string;
  memberId: string;
  title?: string;
  messages: ConversationMessage[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  context: {
    userProfile?: any;
    healthData?: any;
    conversationGoals?: string[];
    preferences?: {
      language: 'zh' | 'en';
      detailLevel: 'brief' | 'detailed';
      tone: 'professional' | 'friendly' | 'casual';
    };
  };
}

// 意图识别结果
export interface IntentRecognition {
  intent:
    | 'question'
    | 'advice_request'
    | 'clarification'
    | 'correction'
    | 'feedback'
    | 'general_chat';
  confidence: number;
  entities: {
    topics: string[];
    health_metrics: string[];
    foods: string[];
    conditions: string[];
  };
  suggested_response_type:
    | 'factual'
    | 'advice'
    | 'clarification'
    | 'confirmation';
}

// 预设问题类型
export interface PresetQuestion {
  id: string;
  category:
    | 'general'
    | 'nutrition'
    | 'health'
    | 'meal_planning'
    | 'weight_management';
  question: string;
  description: string;
  tags: string[];
  priority: number;
}

// 对话管理器主类
export class ConversationManager {
  private static instance: ConversationManager;
  private activeSessions: Map<string, ConversationSession> = new Map();

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  /**
   * 创建新对话会话
   */
  createSession(
    memberId: string,
    context?: Partial<ConversationSession['context']>,
  ): ConversationSession {
    const session: ConversationSession = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memberId,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
      context: {
        preferences: {
          language: 'zh',
          detailLevel: 'detailed',
          tone: 'friendly',
        },
        ...context,
      },
    };

    this.activeSessions.set(session.id, session);
    return session;
  }

  /**
   * 获取或创建会话
   */
  getOrCreateSession(sessionId: string, memberId: string): ConversationSession {
    let session = this.activeSessions.get(sessionId);
    if (!session || session.memberId !== memberId) {
      session = this.createSession(memberId);
    }
    return session;
  }

  /**
   * 添加消息到会话
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: ConversationMessage['metadata'],
  ): Promise<ConversationSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      metadata,
    };

    session.messages.push(message);
    session.updatedAt = new Date();
    session.lastActivityAt = new Date();

    // 限制消息历史长度（保留最近50条消息）
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    return session;
  }

  /**
   * 意图识别
   */
  async recognizeIntent(
    message: string,
    context?: any,
  ): Promise<IntentRecognition> {
    return recognizeIntentFromMessage(message);
  }

  /**
   * 生成AI回复
   */
  async generateResponse(
    sessionId: string,
    userMessage: string,
    intent: IntentRecognition,
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // 生成缓存键
    const messageHash = createHash('md5')
      .update(
        userMessage +
          JSON.stringify(intent) +
          session.context.userProfile?.name || '',
      )
      .digest('hex');
    const cacheKey = AICacheKeys.chatResponse(sessionId, messageHash);

    // 尝试从缓存获取响应
    const cachedResponse = await aiResponseCache.get<string>(cacheKey);
    if (cachedResponse) {
      console.log('使用缓存的AI响应:', userMessage);
      return cachedResponse;
    }

    const prompt = getActivePrompt(
      'nutrition_consultation',
      'general_consultation',
    );
    if (!prompt) {
      throw new Error('Consultation prompt template not found');
    }

    // 构建对话历史
    const conversationHistory = formatConversationHistory(
      session.messages.slice(-10),
    );

    // 准备Prompt变量
    const variables = {
      user_question: userMessage,
      user_context: JSON.stringify({
        profile: session.context.userProfile,
        preferences: session.context.preferences,
      }),
      conversation_history: conversationHistory,
    };

    // 验证参数
    const validation = validatePromptParameters(prompt, variables);
    if (!validation.valid) {
      throw new Error(
        `Missing prompt parameters: ${validation.missing.join(', ')}`,
      );
    }

    // 渲染Prompt
    const renderedPrompt = renderPrompt(prompt, variables);

    // 选择合适的模型
    const model = this.selectModelForIntent(intent);

    try {
      const response = await callOpenAI(
        renderedPrompt,
        model,
        1000, // 控制回复长度
        0.7,
        true,
      );

      // 缓存响应（根据对话类型设置不同的TTL）
      const cacheTTL = this.getCacheTTL(intent);
      await aiResponseCache.set(cacheKey, response.content, cacheTTL);

      return response.content;
    } catch (error) {
      console.error('AI response generation failed:', error);
      return this.generateFallbackResponse(intent);
    }
  }

  /**
   * 实现上下文记忆
   */
  getConversationContext(
    sessionId: string,
    maxMessages: number = 10,
  ): {
    recentMessages: ConversationMessage[];
    keyTopics: string[];
    userPreferences: any;
    healthConcerns: string[];
  } {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        recentMessages: [],
        keyTopics: [],
        userPreferences: {},
        healthConcerns: [],
      };
    }

    const recentMessages = session.messages.slice(-maxMessages);
    const keyTopics = extractKeyTopics(recentMessages);
    const healthConcerns = extractHealthConcerns(recentMessages);

    return {
      recentMessages,
      keyTopics,
      userPreferences: session.context.preferences,
      healthConcerns,
    };
  }

  /**
   * 流式响应支持（模拟）
   */
  async *generateStreamingResponse(
    sessionId: string,
    userMessage: string,
    intent: IntentRecognition,
  ): AsyncGenerator<string, void, unknown> {
    const fullResponse = await this.generateResponse(
      sessionId,
      userMessage,
      intent,
    );

    // 模拟流式输出，按句子分割
    const sentences = fullResponse
      .split(/[。！？.!?]+/)
      .filter((s) => s.trim().length > 0);

    for (const sentence of sentences) {
      yield `${sentence.trim()}。`;
      // 模拟打字效果延迟
      await new Promise((resolve) =>
        setTimeout(resolve, 100 + Math.random() * 200),
      );
    }
  }

  /**
   * 获取预设问题列表
   */
  getPresetQuestions(): PresetQuestion[] {
    return getPresetQuestionsList();
  }

  /**
   * 归档会话
   */
  archiveSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'archived';
      session.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAgeHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.lastActivityAt < cutoffTime && session.status === 'active') {
        this.archiveSession(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // 私有辅助方法

  private selectModelForIntent(intent: IntentRecognition): string {
    // 根据意图选择合适的模型
    switch (intent.intent) {
      case 'advice_request':
        return RECOMMENDED_MODELS.PAID[0]; // 使用更强的付费模型
      case 'question':
        return RECOMMENDED_MODELS.FREE[0]; // 简单问题用免费模型
      default:
        return RECOMMENDED_MODELS.FREE[0];
    }
  }

  private getCacheTTL(intent: IntentRecognition): number {
    // 根据意图类型设置不同的缓存时间
    switch (intent.intent) {
      case 'question':
        return 7200; // 2小时 - 事实性问题缓存更久
      case 'advice_request':
        return 3600; // 1小时 - 建议类问题缓存适中
      case 'general_chat':
        return 1800; // 30分钟 - 通用聊天缓存较短
      default:
        return 3600; // 默认1小时
    }
  }

  private generateFallbackResponse(intent: IntentRecognition): string {
    return getFallbackResponse(intent.intent);
  }
}

// 导出单例实例
export const conversationManager = ConversationManager.getInstance();
