import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/api-auth';
import { checkAIRateLimit } from '@/lib/middleware/api-rate-limit';
import { checkConsent } from '@/lib/middleware/api-consent';
import { conversationManager } from '@/lib/services/ai/conversation-manager';
import { logger } from '@/lib/logger';
import {
  validateChatRequest,
  buildMemberContext,
  getOrCreateChatSession,
  handleStreamResponse,
  handleNormalResponse,
} from './handlers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/chat
 * AI 对话端点
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    const { userId } = authResult.context;

    const rateLimitResult = await checkAIRateLimit(userId, 'ai_chat');
    if (!rateLimitResult.success) return rateLimitResult.response;

    const consentResult = await checkConsent(userId, 'ai_health_analysis');
    if (!consentResult.success) return consentResult.response;

    const body = await request.json();
    const validation = validateChatRequest(body);
    if (!validation.valid) return validation.response;

    const { message, sessionId, memberId, stream } = validation.data;

    const memberResult = await buildMemberContext(memberId, userId);
    if (!memberResult.success) return memberResult.response;

    const { member } = memberResult.context;
    const conversationSession = getOrCreateChatSession(
      sessionId,
      memberId,
      member,
    );
    const intent = await conversationManager.recognizeIntent(message);

    if (stream) {
      return handleStreamResponse(conversationSession.id, message, intent);
    }

    return handleNormalResponse(
      conversationSession.id,
      memberId,
      message,
      intent,
      conversationSession,
    );
  } catch (error) {
    logger.error('AI chat API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ai/chat
 * 获取预设问题
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as string | null;
    const limit = parseInt(searchParams.get('limit') || '10');

    const presetQuestions = conversationManager.getPresetQuestions();
    const filteredQuestions = category
      ? presetQuestions.filter((q) => q.category === category)
      : presetQuestions;

    return NextResponse.json({ questions: filteredQuestions.slice(0, limit) });
  } catch (error) {
    logger.error('Preset questions API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
