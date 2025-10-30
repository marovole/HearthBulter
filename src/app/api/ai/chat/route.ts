import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { conversationManager } from '@/lib/services/ai/conversation-manager';
import { prisma } from '@/lib/db';
import { rateLimiter } from '@/lib/services/ai/rate-limiter';
import { aiFallbackService } from '@/lib/services/ai/fallback-service';
import { defaultSensitiveFilter } from '@/lib/middleware/ai-sensitive-filter';
import { consentManager } from '@/lib/services/consent-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 速率限制检查
    const rateLimitResult = await rateLimiter.checkLimit(
      session.user.id,
      'ai_chat'
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetTime: rateLimitResult.resetTime
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // 同意检查（对话功能需要AI分析同意）
    const hasAIConsent = await consentManager.checkConsent(
      session.user.id,
      'ai_health_analysis'
    );

    if (!hasAIConsent) {
      const consentType = consentManager.getConsentType('ai_health_analysis');
      return NextResponse.json({
        error: 'Required consent not granted',
        requiredConsent: consentType ? {
          id: consentType.id,
          name: consentType.name,
          description: consentType.description,
          content: consentType.content,
        } : null,
      }, { status: 403 });
    }

    const body = await request.json();
    const { message, sessionId, memberId, stream = false } = body;

    if (!message || !memberId) {
      return NextResponse.json(
        { error: 'Message and memberId are required' },
        { status: 400 }
      );
    }

    // 验证用户权限
    const member = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        OR: [
          { userId: session.user.id },
          {
            family: {
              members: {
                some: {
                  userId: session.user.id,
                  role: 'ADMIN'
                }
              }
            }
          }
        ]
      },
      include: {
        healthGoals: true,
        dietaryPreference: true,
        allergies: true,
        healthData: {
          orderBy: { measuredAt: 'desc' },
          take: 5
        }
      }
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 获取或创建会话
    let conversationSession = sessionId
      ? conversationManager.getOrCreateSession(sessionId, memberId)
      : conversationManager.createSession(memberId, {
          userProfile: {
            name: member.name,
            age: Math.floor((Date.now() - member.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
            gender: member.gender.toLowerCase(),
            healthGoals: member.healthGoals.map(g => g.goalType),
            dietaryPreferences: member.dietaryPreference ? {
              dietType: member.dietaryPreference.dietType,
              restrictions: [
                ...(member.dietaryPreference.isVegetarian ? ['vegetarian'] : []),
                ...(member.dietaryPreference.isVegan ? ['vegan'] : []),
              ]
            } : null,
            allergies: member.allergies.map(a => a.allergenName),
          },
          preferences: {
            language: 'zh',
            detailLevel: 'detailed',
            tone: 'friendly',
          }
        });

    // 识别用户意图
    const intent = await conversationManager.recognizeIntent(message);

    // 敏感信息过滤处理用户消息
    const filterResult = defaultSensitiveFilter.filterUserInput(message);

    // 记录检测到的敏感信息（已由中间件处理日志）

    // 添加用户消息到会话（使用过滤后的消息）
    await conversationManager.addMessage(
      conversationSession.id,
      'user',
      filterResult.filtered,
      {
        intent: intent.intent,
        confidence: intent.confidence,
        hasSensitiveInfo: filterResult.hasSensitiveInfo,
        riskLevel: filterResult.riskLevel,
      }
    );

    // 生成AI回复（带降级策略）
    if (stream) {
      // 流式响应 - 暂时不支持降级策略
      try {
        const streamGenerator = conversationManager.generateStreamingResponse(
          conversationSession.id,
          message,
          intent
        );

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamGenerator) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
                // 模拟延迟
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (error) {
        // 流式响应失败，返回错误
        return NextResponse.json(
          {
            error: 'AI服务暂时不可用，请稍后重试',
            fallback: true,
            message: '很抱歉，AI助手暂时离线。请稍后重试或咨询专业医生。'
          },
          { status: 503 }
        );
      }
    } else {
      // 普通响应（支持降级策略）
      const chatResult = await aiFallbackService.chatWithFallback(
        conversationSession.id,
        message,
        intent
      );

      let aiResponse: string;
      let fallbackUsed = false;
      let fallbackReason;

      if (chatResult.success) {
        aiResponse = chatResult.data.response;
        fallbackUsed = chatResult.fallbackUsed;
        fallbackReason = chatResult.reason;
      } else {
        // 完全失败，返回错误
        return NextResponse.json(
          { error: chatResult.message },
          { status: 500 }
        );
      }

      // 对AI回复也进行敏感信息过滤（防御性措施）
      const aiFilterResult = defaultSensitiveFilter.filterAIOutput(aiResponse);

      // 添加AI回复到会话（使用过滤后的回复）
      await conversationManager.addMessage(
        conversationSession.id,
        'assistant',
        aiFilterResult.filtered,
        {
          intent: intent.intent,
          confidence: intent.confidence,
          model: fallbackUsed ? 'fallback' : 'openrouter-mixed',
          fallbackUsed,
          fallbackReason,
          hasSensitiveInfo: aiFilterResult.hasSensitiveInfo,
        }
      );

      // 保存对话到数据库
      await prisma.aIConversation.upsert({
        where: { id: conversationSession.id },
        update: {
          messages: conversationSession.messages,
          updatedAt: new Date(),
          lastMessageAt: new Date(),
        },
        create: {
          id: conversationSession.id,
          memberId,
          messages: conversationSession.messages,
          status: conversationSession.status,
          tokens: 0,
        }
      });

      return NextResponse.json({
        sessionId: conversationSession.id,
        response: aiResponse,
        intent: intent.intent,
        confidence: intent.confidence,
        conversationContext: conversationManager.getConversationContext(conversationSession.id),
        fallbackUsed,
        message: fallbackUsed ? chatResult.message : undefined,
      });
    }

  } catch (error) {
    console.error('AI chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET 方法用于获取预设问题
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as any;
    const limit = parseInt(searchParams.get('limit') || '10');

    const presetQuestions = conversationManager.getPresetQuestions();

    let filteredQuestions = presetQuestions;
    if (category) {
      filteredQuestions = presetQuestions.filter(q => q.category === category);
    }

    return NextResponse.json({
      questions: filteredQuestions.slice(0, limit)
    });

  } catch (error) {
    console.error('Preset questions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
