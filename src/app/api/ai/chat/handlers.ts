/**
 * AI Chat 路由处理函数
 * 将主路由逻辑拆分为独立的小函数
 */

import { NextResponse } from "next/server";
import {
  conversationManager,
  IntentRecognition,
  ConversationSession,
} from "@/lib/services/ai/conversation-manager";
import { healthRepository } from "@/lib/repositories/health-repository-singleton";
import { SupabaseFamilyRepository } from "@/lib/repositories/implementations/supabase-family-repository";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { aiFallbackService } from "@/lib/services/ai/fallback-service";
import { defaultSensitiveFilter } from "@/lib/middleware/ai-sensitive-filter";
import { logger } from "@/lib/logger";

const familyRepo = new SupabaseFamilyRepository(
  SupabaseClientManager.getInstance(),
);

export interface ChatRequestBody {
  message: string;
  sessionId?: string;
  memberId: string;
  stream?: boolean;
}

export interface MemberContext {
  member: {
    id: string;
    userId: string | null;
    familyId: string;
    name: string;
    birthDate: string;
    gender: "MALE" | "FEMALE";
    height?: number | null;
    weight?: number | null;
    bmi?: number | null;
    healthGoals: { goalType: string }[];
    dietaryPreference: {
      dietType: string | null;
      isVegetarian: boolean;
      isVegan: boolean;
    } | null;
    allergies: { allergenName: string }[];
    healthData: {
      dataType: string;
      value: number;
      unit: string;
      measuredAt?: string;
    }[];
  };
  isOwnMember: boolean;
  isAdmin: boolean;
}

/**
 * 验证聊天请求体
 */
export function validateChatRequest(
  body: unknown,
):
  | { valid: true; data: ChatRequestBody }
  | { valid: false; response: NextResponse } {
  const {
    message,
    sessionId,
    memberId,
    stream = false,
  } = body as ChatRequestBody;

  if (!message || !memberId) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Message and memberId are required" },
        { status: 400 },
      ),
    };
  }

  return {
    valid: true,
    data: { message, sessionId, memberId, stream },
  };
}

/**
 * 构建成员上下文数据
 */
export async function buildMemberContext(
  memberId: string,
  userId: string,
): Promise<
  | { success: true; context: MemberContext }
  | { success: false; response: NextResponse }
> {
  const memberContext = await healthRepository.getMemberHealthContext(
    memberId,
    {
      healthDataLimit: 5,
      medicalReportsLimit: 0,
    },
  );

  if (!memberContext) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      ),
    };
  }

  const isOwnMember = memberContext.member.userId === userId;
  let isAdmin = false;

  if (!isOwnMember) {
    const role = await familyRepo.getUserFamilyRole(
      memberContext.member.familyId,
      userId,
    );
    isAdmin = role === "ADMIN";
  }

  if (!isOwnMember && !isAdmin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Member not found or access denied" },
        { status: 404 },
      ),
    };
  }

  const member: MemberContext["member"] = {
    id: memberContext.member.id,
    userId: memberContext.member.userId,
    familyId: memberContext.member.familyId,
    name: memberContext.member.name,
    birthDate: memberContext.member.birthDate.toISOString(),
    gender: memberContext.member.gender,
    height: memberContext.member.height,
    weight: memberContext.member.weight,
    bmi: memberContext.member.bmi,
    healthGoals: memberContext.healthGoals.map((g) => ({
      goalType: g.goalType,
    })),
    dietaryPreference: memberContext.dietaryPreference
      ? {
          dietType: memberContext.dietaryPreference.dietType,
          isVegetarian: memberContext.dietaryPreference.isVegetarian,
          isVegan: memberContext.dietaryPreference.isVegan,
        }
      : null,
    allergies: memberContext.allergies.map((a) => ({
      allergenName: a.allergenName,
    })),
    healthData: memberContext.healthData.map((h) => ({
      dataType: h.dataType,
      value: h.value,
      unit: h.unit ?? "",
      measuredAt: h.measuredAt?.toISOString(),
    })),
  };

  return {
    success: true,
    context: { member, isOwnMember, isAdmin },
  };
}

/**
 * 创建或获取会话
 */
export function getOrCreateChatSession(
  sessionId: string | undefined,
  memberId: string,
  member: MemberContext["member"],
) {
  if (sessionId) {
    return conversationManager.getOrCreateSession(sessionId, memberId);
  }

  return conversationManager.createSession(memberId, {
    userProfile: {
      name: member.name,
      age: Math.floor(
        (Date.now() - new Date(member.birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      ),
      gender: member.gender.toLowerCase(),
      healthGoals: member.healthGoals.map((g) => g.goalType),
      dietaryPreferences: member.dietaryPreference
        ? {
            dietType: member.dietaryPreference.dietType,
            restrictions: [
              ...(member.dietaryPreference.isVegetarian ? ["vegetarian"] : []),
              ...(member.dietaryPreference.isVegan ? ["vegan"] : []),
            ],
          }
        : null,
      allergies: member.allergies.map((a) => a.allergenName),
    },
    preferences: {
      language: "zh",
      detailLevel: "detailed",
      tone: "friendly",
    },
  });
}

/**
 * 处理流式响应
 */
export async function handleStreamResponse(
  sessionId: string,
  message: string,
  intent: IntentRecognition,
): Promise<Response> {
  try {
    const streamGenerator = conversationManager.generateStreamingResponse(
      sessionId,
      message,
      intent,
    );

    const encoder = new TextEncoder();
    const STREAM_DELAY_MS = 50;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamGenerator) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`),
            );
            await new Promise((resolve) =>
              setTimeout(resolve, STREAM_DELAY_MS),
            );
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "AI服务暂时不可用，请稍后重试",
        fallback: true,
        message: "很抱歉，AI助手暂时离线。请稍后重试或咨询专业医生。",
      },
      { status: 503 },
    ) as Response;
  }
}

/**
 * 处理普通响应
 */
export async function handleNormalResponse(
  sessionId: string,
  memberId: string,
  message: string,
  intent: IntentRecognition,
  conversationSession: ConversationSession,
): Promise<NextResponse> {
  const filterResult = defaultSensitiveFilter.filterUserInput(message);

  await conversationManager.addMessage(
    sessionId,
    "user",
    filterResult.filtered,
    {
      intent: intent.intent,
      confidence: intent.confidence,
    },
  );

  const chatResult = await aiFallbackService.chatWithFallback(
    sessionId,
    message,
    intent,
  );

  if (!chatResult.success) {
    return NextResponse.json({ error: chatResult.message }, { status: 500 });
  }

  const aiResponse = chatResult.data.response;
  const aiFilterResult = defaultSensitiveFilter.filterAIOutput(aiResponse);

  await conversationManager.addMessage(
    sessionId,
    "assistant",
    aiFilterResult.filtered,
    {
      intent: intent.intent,
      confidence: intent.confidence,
      model: chatResult.fallbackUsed ? "fallback" : "openrouter-mixed",
    },
  );

  await saveConversation(sessionId, memberId, conversationSession);

  return NextResponse.json({
    sessionId,
    response: aiResponse,
    intent: intent.intent,
    confidence: intent.confidence,
    conversationContext: conversationManager.getConversationContext(sessionId),
    fallbackUsed: chatResult.fallbackUsed,
    message: chatResult.fallbackUsed ? chatResult.message : undefined,
  });
}

/**
 * 保存对话到数据库
 */
async function saveConversation(
  sessionId: string,
  memberId: string,
  conversationSession: ConversationSession,
): Promise<void> {
  const now = new Date();
  try {
    const normalizedStatus =
      conversationSession.status === "archived" ? "ARCHIVED" : "ACTIVE";

    await healthRepository.saveConversation({
      id: sessionId,
      memberId,
      messages: conversationSession.messages,
      status: normalizedStatus,
      tokens: 0,
      updatedAt: now,
      lastMessageAt: now,
    });
  } catch (error) {
    logger.error("保存对话失败", { error, sessionId });
  }
}
