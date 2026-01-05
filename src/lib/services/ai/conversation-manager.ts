import { callOpenAI, RECOMMENDED_MODELS } from "./openai-client";
import {
  getActivePrompt,
  renderPrompt,
  validatePromptParameters,
} from "./prompt-templates";
import { aiResponseCache, AICacheKeys } from "./response-cache";
import { createHash } from "crypto";

// 对话消息类型
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
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
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  context: {
    userProfile?: any;
    healthData?: any;
    conversationGoals?: string[];
    preferences?: {
      language: "zh" | "en";
      detailLevel: "brief" | "detailed";
      tone: "professional" | "friendly" | "casual";
    };
  };
}

// 意图识别结果
export interface IntentRecognition {
  intent:
    | "question"
    | "advice_request"
    | "clarification"
    | "correction"
    | "feedback"
    | "general_chat";
  confidence: number;
  entities: {
    topics: string[];
    health_metrics: string[];
    foods: string[];
    conditions: string[];
  };
  suggested_response_type:
    | "factual"
    | "advice"
    | "clarification"
    | "confirmation";
}

// 预设问题类型
export interface PresetQuestion {
  id: string;
  category:
    | "general"
    | "nutrition"
    | "health"
    | "meal_planning"
    | "weight_management";
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
    context?: Partial<ConversationSession["context"]>,
  ): ConversationSession {
    const session: ConversationSession = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      memberId,
      messages: [],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
      context: {
        preferences: {
          language: "zh",
          detailLevel: "detailed",
          tone: "friendly",
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
    role: "user" | "assistant",
    content: string,
    metadata?: ConversationMessage["metadata"],
  ): Promise<ConversationSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
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
    // 使用简单的关键词识别，也可以使用AI进行更精确的意图识别
    const lowerMessage = message.toLowerCase();

    // 问题关键词
    const questionKeywords = [
      "什么",
      "怎么",
      "为什么",
      "如何",
      "能不能",
      "可不可以",
      "?",
      "？",
    ];
    const hasQuestion = questionKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    // 建议请求关键词
    const adviceKeywords = [
      "建议",
      "推荐",
      "应该",
      "最好",
      "如何改善",
      "怎么调整",
    ];
    const hasAdviceRequest = adviceKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    // 澄清关键词
    const clarificationKeywords = [
      "具体点",
      "详细点",
      "不清楚",
      "没明白",
      "再解释",
      "举例",
    ];
    const hasClarification = clarificationKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    // 纠正关键词
    const correctionKeywords = ["不对", "错了", "不是", "纠正", "修改"];
    const hasCorrection = correctionKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    // 反馈关键词
    const feedbackKeywords = ["有用", "喜欢", "不喜欢", "感谢", "谢谢"];
    const hasFeedback = feedbackKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    // 确定主要意图
    let intent: IntentRecognition["intent"] = "general_chat";
    let confidence = 0.5;

    if (hasCorrection) {
      intent = "correction";
      confidence = 0.8;
    } else if (hasClarification) {
      intent = "clarification";
      confidence = 0.8;
    } else if (hasAdviceRequest) {
      intent = "advice_request";
      confidence = 0.7;
    } else if (hasQuestion) {
      intent = "question";
      confidence = 0.7;
    } else if (hasFeedback) {
      intent = "feedback";
      confidence = 0.6;
    }

    // 提取实体
    const entities = this.extractEntities(message);

    // 确定响应类型
    let suggested_response_type: IntentRecognition["suggested_response_type"] =
      "factual";
    if (intent === "advice_request") {
      suggested_response_type = "advice";
    } else if (intent === "clarification") {
      suggested_response_type = "clarification";
    } else if (intent === "correction") {
      suggested_response_type = "confirmation";
    }

    return {
      intent,
      confidence,
      entities,
      suggested_response_type,
    };
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
      throw new Error("Session not found");
    }

    // 生成缓存键
    const messageHash = createHash("md5")
      .update(
        userMessage +
          JSON.stringify(intent) +
          session.context.userProfile?.name || "",
      )
      .digest("hex");
    const cacheKey = AICacheKeys.chatResponse(sessionId, messageHash);

    // 尝试从缓存获取响应
    const cachedResponse = await aiResponseCache.get<string>(cacheKey);
    if (cachedResponse) {
      console.log("使用缓存的AI响应:", userMessage);
      return cachedResponse;
    }

    const prompt = getActivePrompt(
      "nutrition_consultation",
      "general_consultation",
    );
    if (!prompt) {
      throw new Error("Consultation prompt template not found");
    }

    // 构建对话历史
    const conversationHistory = this.formatConversationHistory(
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
        `Missing prompt parameters: ${validation.missing.join(", ")}`,
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
      console.error("AI response generation failed:", error);
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
    const keyTopics = this.extractKeyTopics(recentMessages);
    const healthConcerns = this.extractHealthConcerns(recentMessages);

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
    return [
      {
        id: "weight_loss_tips",
        category: "weight_management",
        question: "如何健康减重？",
        description: "获取科学的减重建议",
        tags: ["减重", "健康", "饮食"],
        priority: 10,
      },
      {
        id: "protein_intake",
        category: "nutrition",
        question: "每天需要摄入多少蛋白质？",
        description: "了解蛋白质推荐摄入量",
        tags: ["蛋白质", "营养", "健康"],
        priority: 9,
      },
      {
        id: "blood_sugar_control",
        category: "health",
        question: "如何控制血糖？",
        description: "血糖管理的实用建议",
        tags: ["血糖", "糖尿病", "饮食"],
        priority: 8,
      },
      {
        id: "meal_prep_tips",
        category: "meal_planning",
        question: "如何做好餐食准备？",
        description: "高效备餐的实用技巧",
        tags: ["备餐", "时间管理", "健康饮食"],
        priority: 7,
      },
      {
        id: "cholesterol_management",
        category: "health",
        question: "如何降低胆固醇？",
        description: "胆固醇管理的饮食建议",
        tags: ["胆固醇", "心血管", "饮食"],
        priority: 8,
      },
      {
        id: "fiber_intake",
        category: "nutrition",
        question: "膳食纤维很重要吗？",
        description: "了解膳食纤维的益处",
        tags: ["纤维", "肠道健康", "营养"],
        priority: 6,
      },
      {
        id: "sports_nutrition",
        category: "nutrition",
        question: "运动前后应该吃什么？",
        description: "运动营养的实用建议",
        tags: ["运动", "营养", "恢复"],
        priority: 7,
      },
      {
        id: "hydration_tips",
        category: "general",
        question: "每天喝多少水合适？",
        description: "科学饮水建议",
        tags: ["饮水", "健康", "生活习惯"],
        priority: 5,
      },
    ].sort((a, b) => b.priority - a.priority);
  }

  /**
   * 归档会话
   */
  archiveSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = "archived";
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
      if (session.lastActivityAt < cutoffTime && session.status === "active") {
        this.archiveSession(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  // 私有辅助方法

  private extractEntities(message: string): IntentRecognition["entities"] {
    const topics: string[] = [];
    const health_metrics: string[] = [];
    const foods: string[] = [];
    const conditions: string[] = [];

    const lowerMessage = message.toLowerCase();

    // 健康指标关键词
    const healthMetricKeywords = [
      "体重",
      "血糖",
      "血压",
      "胆固醇",
      "BMI",
      "体脂率",
    ];
    healthMetricKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        health_metrics.push(keyword);
      }
    });

    // 食物关键词
    const foodKeywords = [
      "肉",
      "鱼",
      "蔬菜",
      "水果",
      "米饭",
      "面条",
      "牛奶",
      "鸡蛋",
    ];
    foodKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        foods.push(keyword);
      }
    });

    // 健康状况关键词
    const conditionKeywords = ["糖尿病", "高血压", "肥胖", "贫血", "便秘"];
    conditionKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        conditions.push(keyword);
      }
    });

    // 提取话题（基于问题内容）
    if (lowerMessage.includes("减重") || lowerMessage.includes("减肥")) {
      topics.push("weight_management");
    }
    if (lowerMessage.includes("营养") || lowerMessage.includes("饮食")) {
      topics.push("nutrition");
    }
    if (lowerMessage.includes("运动") || lowerMessage.includes("锻炼")) {
      topics.push("exercise");
    }

    return { topics, health_metrics, foods, conditions };
  }

  private formatConversationHistory(messages: ConversationMessage[]): string {
    return messages
      .map((msg) => `${msg.role === "user" ? "用户" : "AI"}: ${msg.content}`)
      .join("\n");
  }

  private selectModelForIntent(intent: IntentRecognition): string {
    // 根据意图选择合适的模型
    switch (intent.intent) {
    case "advice_request":
      return RECOMMENDED_MODELS.PAID[0]; // 使用更强的付费模型
    case "question":
      return RECOMMENDED_MODELS.FREE[0]; // 简单问题用免费模型
    default:
      return RECOMMENDED_MODELS.FREE[0];
    }
  }

  private getCacheTTL(intent: IntentRecognition): number {
    // 根据意图类型设置不同的缓存时间
    switch (intent.intent) {
    case "question":
      return 7200; // 2小时 - 事实性问题缓存更久
    case "advice_request":
      return 3600; // 1小时 - 建议类问题缓存适中
    case "general_chat":
      return 1800; // 30分钟 - 通用聊天缓存较短
    default:
      return 3600; // 默认1小时
    }
  }

  private generateFallbackResponse(intent: IntentRecognition): string {
    const fallbacks = {
      question:
        "这是一个很好的问题。基于您的健康数据，我建议您咨询专业医生获取更准确的建议。同时，我可以为您提供一些通用的健康指导。",
      advice_request:
        "我理解您需要健康建议。不过，为了确保建议的安全性和准确性，建议您先咨询专业医生。我可以为您提供一些基于普遍健康原则的通用建议。",
      clarification:
        "我需要更多信息来更好地帮助您。您能具体描述一下您的健康状况或饮食习惯吗？",
      correction:
        "感谢您指出我的错误。我会根据您的反馈改进回答。请问您希望我如何调整建议？",
      feedback:
        "感谢您的反馈！我会继续努力为您提供更好的健康建议。有任何其他问题都可以随时询问。",
      general_chat:
        "很高兴与您交流健康话题！如果您有具体的健康或营养问题，我很乐意为您提供建议。",
    };

    return fallbacks[intent.intent] || fallbacks.general_chat;
  }

  private extractKeyTopics(messages: ConversationMessage[]): string[] {
    const topics = new Set<string>();

    messages.forEach((msg) => {
      if (msg.metadata?.intent) {
        topics.add(msg.metadata.intent);
      }
    });

    return Array.from(topics);
  }

  private extractHealthConcerns(messages: ConversationMessage[]): string[] {
    const concerns = new Set<string>();

    const concernKeywords = ["担心", "问题", "不适", "异常", "不正常"];
    messages.forEach((msg) => {
      if (msg.role === "user") {
        concernKeywords.forEach((keyword) => {
          if (msg.content.includes(keyword)) {
            // 提取关键词后的内容作为健康担忧
            const index = msg.content.indexOf(keyword);
            const concern = msg.content.substring(index, index + 20).trim();
            if (concern) concerns.add(concern);
          }
        });
      }
    });

    return Array.from(concerns);
  }
}

// 导出单例实例
export const conversationManager = ConversationManager.getInstance();
