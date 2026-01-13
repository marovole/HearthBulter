import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Health Analysis Action - Calls OpenAI for health insights
 */
export const analyzeHealth = action({
  args: {
    memberId: v.id("familyMembers"),
    dataType: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = buildHealthPrompt(args.dataType, args.data);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一位专业的健康顾问，擅长分析健康数据并提供个性化建议。请用中文回复，保持专业但易懂的语气。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const advice = result.choices[0]?.message?.content ?? "";
    const tokens = result.usage?.total_tokens ?? 0;

    // Save advice to database
    await ctx.runMutation(internal.ai.saveAdvice, {
      memberId: args.memberId,
      type: "HEALTH_ANALYSIS",
      content: { analysis: advice, dataType: args.dataType },
      prompt,
      tokens,
    });

    return { advice, tokens };
  },
});

/**
 * Recipe Optimization Action
 */
export const optimizeRecipe = action({
  args: {
    memberId: v.id("familyMembers"),
    recipeData: v.any(),
    optimizationGoal: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `请优化以下食谱，目标：${args.optimizationGoal}

食谱信息：
${JSON.stringify(args.recipeData, null, 2)}

请提供：
1. 优化后的食材和用量
2. 营养价值变化
3. 口味调整建议
4. 替代食材选择`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一位专业的营养师和厨师，擅长优化食谱以满足各种健康需求。请用中文回复。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const optimization = result.choices[0]?.message?.content ?? "";
    const tokens = result.usage?.total_tokens ?? 0;

    await ctx.runMutation(internal.ai.saveAdvice, {
      memberId: args.memberId,
      type: "RECIPE_OPTIMIZATION",
      content: { optimization, goal: args.optimizationGoal },
      prompt,
      tokens,
    });

    return { optimization, tokens };
  },
});

/**
 * AI Consultation Action
 */
export const consult = action({
  args: {
    memberId: v.id("familyMembers"),
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ reply: string; tokens: number; conversationId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Get conversation history if exists
    let messages: Array<{ role: string; content: string }> = [
      {
        role: "system",
        content: `你是健康管家的AI助手，可以回答关于健康、营养、饮食计划等方面的问题。
${args.context ? `用户背景信息：${JSON.stringify(args.context)}` : ""}
请用中文回复，保持友好和专业。`,
      },
    ];

    if (args.conversationId) {
      const history = await ctx.runQuery(internal.ai.getConversationHistory, {
        conversationId: args.conversationId,
      });
      if (history) {
        messages = messages.concat(history);
      }
    }

    messages.push({ role: "user", content: args.message });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const reply = result.choices[0]?.message?.content ?? "";
    const tokens = result.usage?.total_tokens ?? 0;

    // Save or update conversation
    const conversationId = await ctx.runMutation(internal.ai.updateConversation, {
      conversationId: args.conversationId,
      memberId: args.memberId,
      userMessage: args.message,
      assistantMessage: reply,
      tokens,
    });

    return { reply, tokens, conversationId };
  },
});

/**
 * Generate Health Report Action
 */
export const generateReport = action({
  args: {
    memberId: v.id("familyMembers"),
    reportType: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    healthData: v.any(),
    nutritionData: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const openAIApiKey = process.env.OPENAI_API_KEY;
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const prompt = `请生成一份${args.reportType}健康报告。

时间范围：${new Date(args.startDate).toLocaleDateString()} - ${new Date(args.endDate).toLocaleDateString()}

健康数据：
${JSON.stringify(args.healthData, null, 2)}

营养摄入：
${JSON.stringify(args.nutritionData, null, 2)}

请生成包含以下内容的报告：
1. 总体健康评分 (0-100)
2. 主要发现和趋势
3. 需要关注的问题
4. 改善建议
5. 下一阶段目标`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一位专业的健康报告撰写专家。请生成结构清晰、内容专业的健康报告。使用中文。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const report = result.choices[0]?.message?.content ?? "";
    const tokens = result.usage?.total_tokens ?? 0;

    await ctx.runMutation(internal.ai.saveAdvice, {
      memberId: args.memberId,
      type: "REPORT_GENERATION",
      content: { report, reportType: args.reportType },
      prompt,
      tokens,
    });

    return { report, tokens };
  },
});

// Internal mutations and queries

export const saveAdvice = internalMutation({
  args: {
    memberId: v.id("familyMembers"),
    type: v.string(),
    content: v.any(),
    prompt: v.optional(v.string()),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiAdvices", {
      memberId: args.memberId,
      type: args.type as "HEALTH_ANALYSIS" | "RECIPE_OPTIMIZATION" | "CONSULTATION" | "REPORT_GENERATION",
      content: args.content,
      prompt: args.prompt,
      tokens: args.tokens,
      generatedAt: Date.now(),
    });
  },
});

export const getConversationHistory = internalQuery({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;
    return conversation.messages as Array<{ role: string; content: string }>;
  },
});

export const updateConversation = internalMutation({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    memberId: v.id("familyMembers"),
    userMessage: v.string(),
    assistantMessage: v.string(),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    const newMessages = [
      { role: "user", content: args.userMessage },
      { role: "assistant", content: args.assistantMessage },
    ];

    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId);
      if (conversation) {
        const existingMessages = (conversation.messages as Array<{ role: string; content: string }>) ?? [];
        await ctx.db.patch(args.conversationId, {
          messages: [...existingMessages, ...newMessages],
          tokens: conversation.tokens + args.tokens,
          lastMessageAt: Date.now(),
        });
        return args.conversationId;
      }
    }

    return await ctx.db.insert("aiConversations", {
      memberId: args.memberId,
      messages: newMessages,
      status: "ACTIVE",
      tokens: args.tokens,
      lastMessageAt: Date.now(),
    });
  },
});

// Helper functions

function buildHealthPrompt(dataType: string, data: unknown): string {
  switch (dataType) {
    case "weight_trend":
      return `请分析以下体重变化趋势并提供建议：
${JSON.stringify(data, null, 2)}

请包括：
1. 趋势分析
2. 可能的原因
3. 健康建议`;

    case "nutrition_analysis":
      return `请分析以下营养摄入数据：
${JSON.stringify(data, null, 2)}

请评估：
1. 营养均衡性
2. 需要增加或减少的营养素
3. 饮食调整建议`;

    case "health_metrics":
      return `请分析以下健康指标：
${JSON.stringify(data, null, 2)}

请提供：
1. 各项指标评估
2. 需要关注的问题
3. 改善建议`;

    default:
      return `请分析以下健康数据并提供专业建议：
${JSON.stringify(data, null, 2)}`;
  }
}
