/**
 * AI工作流集成测试
 * 测试完整的AI分析流程，从用户请求到响应生成
 */

import { NextRequest } from "next/server";

// Mock AI services
jest.mock("@/lib/services/ai/openai-client", () => ({
  openaiClient: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock database
jest.mock("@/lib/db", () => ({
  prisma: {
    userConsent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    familyMember: {
      findFirst: jest.fn(),
    },
    aIAdvice: {
      create: jest.fn(),
    },
    aIConversation: {
      upsert: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { openaiClient } from "@/lib/services/ai/openai-client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

describe("AI Workflows Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user-123" },
    });

    (prisma.userConsent.findUnique as jest.Mock).mockResolvedValue({
      userId: "user-123",
      consentId: "ai_health_analysis",
      granted: true,
      grantedAt: new Date(),
    });

    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({
      id: "member-123",
      userId: "user-123",
      name: "John Doe",
      birthDate: new Date("1990-01-01"),
      gender: "MALE",
      height: 175,
      weight: 75,
      healthGoals: [],
      allergies: [],
      dietaryPreference: null,
      healthData: [],
      medicalReports: [],
    });

    (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              overall_score: 75,
              risk_level: "medium",
              key_findings: ["正常体重", "需要改善饮食结构"],
              nutritional_recommendations: {
                daily_calories: 2000,
                macros: {
                  carbs_percent: 50,
                  protein_percent: 25,
                  fat_percent: 25,
                },
              },
              lifestyle_modifications: ["增加运动", "改善睡眠质量"],
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    });
  });

  describe("健康分析工作流", () => {
    it("应该完成完整的健康分析流程", async () => {
      // 创建请求
      const requestBody = {
        memberId: "member-123",
        includeRecommendations: true,
      };

      const request = new NextRequest(
        "http://localhost:3000/api/ai/analyze-health",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );

      // 导入并调用API处理函数
      const { POST } = await import("@/app/api/ai/analyze-health/route");
      const response = await POST(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.analysis).toBeDefined();
      expect(data.nutritionTargets).toBeDefined();
      expect(data.dietaryAdjustments).toBeDefined();
      expect(data.adviceId).toBeDefined();

      // 验证AI服务被调用
      expect(openaiClient.chat.completions.create).toHaveBeenCalled();

      // 验证数据库操作
      expect(prisma.aIAdvice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: "member-123",
          type: "HEALTH_ANALYSIS",
          content: expect.objectContaining({
            analysis: expect.any(Object),
            nutritionTargets: expect.any(Object),
            userProfile: expect.any(Object),
          }),
        }),
      });
    });

    it("应该处理缺少用户同意的情况", async () => {
      // Mock缺少同意
      (prisma.userConsent.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/ai/analyze-health",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: "member-123" }),
        },
      );

      const { POST } = await import("@/app/api/ai/analyze-health/route");
      const response = await POST(request);

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("Required consents not granted");
      expect(data.requiredConsents).toHaveLength(2); // ai_health_analysis + medical_data_processing
    });

    it("应该处理AI服务错误并提供降级方案", async () => {
      // Mock AI服务错误
      (openaiClient.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error("AI service unavailable"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/ai/analyze-health",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: "member-123" }),
        },
      );

      const { POST } = await import("@/app/api/ai/analyze-health/route");
      const response = await POST(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("应该验证用户权限", async () => {
      // Mock无权限访问
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/ai/analyze-health",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: "member-123" }),
        },
      );

      const { POST } = await import("@/app/api/ai/analyze-health/route");
      const response = await POST(request);

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Member not found or access denied");
    });
  });

  describe("AI对话工作流", () => {
    it("应该完成多轮对话流程", async () => {
      // Mock对话AI响应
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content:
                "根据您的健康目标，我建议您每天摄入2000卡路里，其中25%来自蛋白质。",
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150,
        },
      });

      // 第一轮对话
      const firstRequest = new NextRequest(
        "http://localhost:3000/api/ai/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "我应该如何控制饮食来减重？",
            memberId: "member-123",
          }),
        },
      );

      const { POST: ChatPOST } = await import("@/app/api/ai/chat/route");
      const firstResponse = await ChatPOST(firstRequest);

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.response).toContain("2000卡路里");
      expect(firstData.sessionId).toBeDefined();

      // 第二轮对话（使用会话ID）
      const secondRequest = new NextRequest(
        "http://localhost:3000/api/ai/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "蛋白质具体应该吃多少？",
            memberId: "member-123",
            sessionId: firstData.sessionId,
          }),
        },
      );

      const secondResponse = await ChatPOST(secondRequest);
      expect(secondResponse.status).toBe(200);

      // 验证对话历史被保存
      expect(prisma.aIConversation.upsert).toHaveBeenCalledTimes(2);
    });

    it("应该处理流式响应", async () => {
      // Mock流式响应
      const mockStream = async function* () {
        yield "根据";
        yield "您的";
        yield "健康";
        yield "目标";
        yield "...";
      };

      (openaiClient.chat.completions.create as jest.Mock).mockImplementation(
        () => mockStream(),
      );

      const request = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "给我一些建议",
          memberId: "member-123",
          stream: true,
        }),
      });

      const { POST: ChatPOST } = await import("@/app/api/ai/chat/route");
      const response = await ChatPOST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");

      // 验证流式响应格式
      const text = await response.text();
      expect(text).toContain("data: {\"chunk\":\"根据\"}");
      expect(text).toContain("data: [DONE]");
    });

    it("应该过滤敏感信息", async () => {
      const request = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "我的身份证号是123456789012345678，电话是13800138000，帮我分析健康状况",
          memberId: "member-123",
        }),
      });

      const { POST: ChatPOST } = await import("@/app/api/ai/chat/route");
      const response = await ChatPOST(request);

      expect(response.status).toBe(200);

      // 验证敏感信息被过滤
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.toContain("123456789012345678"),
              content: expect.not.toContain("13800138000"),
            }),
          ]),
        }),
      );
    });
  });

  describe("食谱优化工作流", () => {
    it("应该完成食谱优化流程", async () => {
      // Mock食谱优化AI响应
      (openaiClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                analysis: {
                  nutrition_score: 85,
                  gap_analysis: {
                    calories_gap: -150,
                    protein_gap: -10,
                    carbs_gap: 50,
                    fat_gap: -5,
                  },
                  strengths: ["蛋白质含量充足", "食材搭配均衡"],
                  weaknesses: ["碳水化合物偏高", "缺少膳食纤维"],
                },
                optimizations: {
                  ingredient_substitutions: [
                    {
                      original_ingredient: "白米饭",
                      substitute_ingredient: "糙米饭",
                      reason: "增加膳食纤维，降低升糖指数",
                      nutritional_impact: {
                        similar_nutrients: ["碳水化合物", "B族维生素"],
                        improved_aspects: ["膳食纤维", "矿物质含量"],
                      },
                    },
                  ],
                  improved_recipe: {
                    name: "优化版宫保鸡丁",
                    ingredients: [
                      { name: "糙米饭", amount: 150, unit: "g" },
                      { name: "鸡胸肉", amount: 200, unit: "g" },
                    ],
                    nutrition_facts: {
                      calories: 450,
                      macronutrients: {
                        protein: { amount: 35, unit: "g" },
                        carbohydrates: { amount: 45, unit: "g" },
                        fat: { amount: 15, unit: "g" },
                      },
                    },
                  },
                },
              }),
            },
          },
        ],
      });

      const request = new NextRequest(
        "http://localhost:3000/api/ai/optimize-recipe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId: "recipe-123",
            memberId: "member-123",
            targetNutrition: {
              calories: 600,
              protein: 40,
              carbs: 50,
              fat: 20,
            },
            preferences: {
              dietary_restrictions: [],
              allergies: ["nuts"],
              preferred_cuisines: ["chinese"],
              budget_level: "medium",
            },
          }),
        },
      );

      const { POST } = await import("@/app/api/ai/optimize-recipe/route");
      const response = await POST(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.optimization).toBeDefined();
      expect(data.optimization.analysis).toBeDefined();
      expect(data.optimization.optimizations).toBeDefined();
      expect(data.adviceId).toBeDefined();

      // 验证优化结果
      const optimization = data.optimization;
      expect(optimization.analysis.nutrition_score).toBe(85);
      expect(optimization.optimizations.improved_recipe.name).toBe(
        "优化版宫保鸡丁",
      );
      expect(optimization.optimizations.ingredient_substitutions).toHaveLength(
        1,
      );
    });

    it("应该处理用户偏好和过敏信息", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ai/optimize-recipe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId: "recipe-123",
            memberId: "member-123",
            preferences: {
              dietary_restrictions: ["vegetarian"],
              allergies: ["nuts", "dairy"],
              preferred_cuisines: ["mediterranean"],
            },
          }),
        },
      );

      const { POST } = await import("@/app/api/ai/optimize-recipe/route");
      const response = await POST(request);

      expect(response.status).toBe(200);

      // 验证用户偏好被传递给AI
      expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("vegetarian"),
              content: expect.stringContaining("nuts"),
              content: expect.stringContaining("dairy"),
              content: expect.stringContaining("mediterranean"),
            }),
          ]),
        }),
      );
    });
  });

  describe("反馈工作流", () => {
    it("应该处理用户反馈", async () => {
      // Mock AI建议记录
      (prisma.aIAdvice.findUnique as jest.Mock).mockResolvedValue({
        id: "advice-123",
        memberId: "member-123",
        type: "HEALTH_ANALYSIS",
        content: { analysis: "test data" },
      });

      const feedbackRequest = new NextRequest(
        "http://localhost:3000/api/ai/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adviceId: "advice-123",
            feedbackType: "advice",
            liked: true,
            rating: 5,
            comments: "非常有用的建议",
            categories: ["helpfulness", "accuracy"],
          }),
        },
      );

      const { POST } = await import("@/app/api/ai/feedback/route");
      const response = await POST(feedbackRequest);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.feedbackId).toBeDefined();

      // 验证反馈被保存
      expect(prisma.aIAdvice.update).toHaveBeenCalledWith({
        where: { id: "advice-123" },
        data: {
          feedback: expect.arrayContaining([
            expect.objectContaining({
              rating: 5,
              liked: true,
              comments: "非常有用的建议",
              categories: ["helpfulness", "accuracy"],
            }),
          ]),
        },
      });
    });

    it("应该获取反馈统计", async () => {
      // Mock反馈数据
      (prisma.aIAdvice.findMany as jest.Mock).mockResolvedValue([
        {
          feedback: [
            { rating: 5, categories: ["helpfulness"] },
            { rating: 4, categories: ["accuracy"] },
          ],
        },
      ]);

      const statsRequest = new NextRequest(
        "http://localhost:3000/api/ai/feedback?memberId=member-123&type=HEALTH_ANALYSIS",
      );

      const { GET } = await import("@/app/api/ai/feedback/route");
      const response = await GET(statsRequest);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.stats).toBeDefined();
      expect(data.stats.total_feedback).toBe(2);
      expect(data.stats.average_rating).toBe(4.5);
    });
  });

  describe("同意管理工作流", () => {
    it("应该处理用户同意流程", async () => {
      const consentRequest = new NextRequest(
        "http://localhost:3000/api/ai/consent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consentId: "ai_health_analysis",
            action: "grant",
            context: { source: "health_analysis_page" },
          }),
        },
      );

      const { POST } = await import("@/app/api/ai/consent/route");
      const response = await POST(consentRequest);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.granted).toBe(true);
      expect(data.consent).toBeDefined();

      // 验证同意被保存
      expect(prisma.userConsent.upsert).toHaveBeenCalledWith({
        where: {
          userId_consentId: {
            userId: "user-123",
            consentId: "ai_health_analysis",
          },
        },
        create: expect.objectContaining({
          userId: "user-123",
          consentId: "ai_health_analysis",
          granted: true,
        }),
      });
    });

    it("应该检查用户同意状态", async () => {
      const checkRequest = new NextRequest(
        "http://localhost:3000/api/ai/consent?consentId=ai_health_analysis",
      );

      const { GET } = await import("@/app/api/ai/consent/route");
      const response = await GET(checkRequest);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.hasConsent).toBe(true);
      expect(data.consentType).toBeDefined();
    });

    it("应该处理同意撤销", async () => {
      const revokeRequest = new NextRequest(
        "http://localhost:3000/api/ai/consent?consentId=ai_health_analysis",
        { method: "DELETE" },
      );

      const { DELETE } = await import("@/app/api/ai/consent/route");
      const response = await DELETE(revokeRequest);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe("同意已成功撤销");

      // 验证同意被删除
      expect(prisma.userConsent.delete).toHaveBeenCalledWith({
        where: {
          userId_consentId: {
            userId: "user-123",
            consentId: "ai_health_analysis",
          },
        },
      });
    });
  });

  describe("端到端工作流", () => {
    it("应该完成完整的用户健康管理流程", async () => {
      // 1. 用户首先需要同意AI分析
      const consentRequest = new NextRequest(
        "http://localhost:3000/api/ai/consent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consentId: "ai_health_analysis",
            action: "grant",
          }),
        },
      );

      const { POST: ConsentPOST } = await import("@/app/api/ai/consent/route");
      const consentResponse = await ConsentPOST(consentRequest);
      expect(consentResponse.status).toBe(200);

      // 2. 进行健康分析
      const analysisRequest = new NextRequest(
        "http://localhost:3000/api/ai/analyze-health",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: "member-123",
            includeRecommendations: true,
          }),
        },
      );

      const { POST: AnalysisPOST } = await import(
        "@/app/api/ai/analyze-health/route"
      );
      const analysisResponse = await AnalysisPOST(analysisRequest);
      expect(analysisResponse.status).toBe(200);

      const analysisData = await analysisResponse.json();
      const adviceId = analysisData.adviceId;

      // 3. 基于分析结果进行对话咨询
      const chatRequest = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "根据我的分析结果，您建议我从哪方面开始改善？",
          memberId: "member-123",
        }),
      });

      const { POST: ChatPOST } = await import("@/app/api/ai/chat/route");
      const chatResponse = await ChatPOST(chatRequest);
      expect(chatResponse.status).toBe(200);

      // 4. 提供反馈
      const feedbackRequest = new NextRequest(
        "http://localhost:3000/api/ai/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adviceId,
            feedbackType: "advice",
            liked: true,
            rating: 5,
            comments: "分析很全面，建议很实用",
          }),
        },
      );

      const { POST: FeedbackPOST } = await import(
        "@/app/api/ai/feedback/route"
      );
      const feedbackResponse = await FeedbackPOST(feedbackRequest);
      expect(feedbackResponse.status).toBe(200);

      // 验证完整流程的数据库操作
      expect(prisma.userConsent.upsert).toHaveBeenCalled();
      expect(prisma.aIAdvice.create).toHaveBeenCalled();
      expect(prisma.aIConversation.upsert).toHaveBeenCalled();
      expect(prisma.aIAdvice.update).toHaveBeenCalled();
    });
  });

  describe("错误处理和降级策略", () => {
    it("应该在AI服务不可用时提供降级方案", async () => {
      // Mock AI服务完全不可用
      (openaiClient.chat.completions.create as jest.Mock)
        .mockRejectedValueOnce(new Error("API quota exceeded"))
        .mockRejectedValueOnce(new Error("Service unavailable"));

      const request = new NextRequest(
        "http://localhost:3000/api/ai/analyze-health",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId: "member-123" }),
        },
      );

      const { POST } = await import("@/app/api/ai/analyze-health/route");
      const response = await POST(request);

      // 应该返回降级方案
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.fallback).toBe(true);
      expect(data.message).toContain("AI服务暂时不可用");
    });

    it("应该处理网络超时", async () => {
      // Mock网络超时
      (openaiClient.chat.completions.create as jest.Mock).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 100),
          ),
      );

      const request = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "测试消息",
          memberId: "member-123",
        }),
      });

      const { POST } = await import("@/app/api/ai/chat/route");
      const response = await POST(request);

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
