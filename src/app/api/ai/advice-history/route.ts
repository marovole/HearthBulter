import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/ai/advice-history
 * 获取AI建议历史和对话历史
 *
 * Migrated from Prisma to Supabase
 */
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
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type') as any;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 验证用户权限 - 检查是否是成员本人或家庭管理员
    const { data: memberCheck } = await supabase
      .from('family_members')
      .select('id, familyId, userId')
      .eq('id', memberId)
      .single();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 检查权限：是成员本人
    const isOwnMember = memberCheck.userId === session.user.id;

    // 如果不是本人，检查是否是家庭管理员
    let isAdmin = false;
    if (!isOwnMember) {
      const { data: adminCheck } = await supabase
        .from('family_members')
        .select('id')
        .eq('familyId', memberCheck.familyId)
        .eq('userId', session.user.id)
        .eq('role', 'ADMIN')
        .is('deletedAt', null)
        .maybeSingle();

      isAdmin = !!adminCheck;
    }

    if (!isOwnMember && !isAdmin) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 获取AI建议历史
    let adviceQuery = supabase
      .from('ai_advice')
      .select('id, type, content, prompt, tokens, feedback, generatedAt, createdAt', { count: 'exact' })
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .order('generatedAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      adviceQuery = adviceQuery.eq('type', type);
    }

    const { data: adviceHistory, error: adviceError, count: totalCount } = await adviceQuery;

    if (adviceError) {
      console.error('获取AI建议历史失败:', adviceError);
      return NextResponse.json(
        { error: 'Failed to fetch advice history' },
        { status: 500 }
      );
    }

    // 获取对话历史
    const { data: conversationHistory, error: convError } = await supabase
      .from('ai_conversations')
      .select('id, title, messages, status, tokens, createdAt, updatedAt, lastMessageAt')
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .order('lastMessageAt', { ascending: false })
      .limit(Math.min(limit, 10));

    if (convError) {
      console.error('获取对话历史失败:', convError);
      return NextResponse.json(
        { error: 'Failed to fetch conversation history' },
        { status: 500 }
      );
    }

    // 处理对话历史，只保留最近的几条消息
    const processedConversations = (conversationHistory || []).map(conv => {
      const messages = conv.messages || [];
      return {
        ...conv,
        messages: messages.slice(-5), // 只保留最近5条消息
        messageCount: messages.length,
      };
    });

    // 获取建议统计
    const adviceStats = await getAdviceStats(supabase, memberId);

    return NextResponse.json({
      advice: {
        items: adviceHistory || [],
        total: totalCount || 0,
        limit,
        offset,
      },
      conversations: {
        items: processedConversations,
        total: processedConversations.length,
      },
      summary: {
        totalAdvice: totalCount || 0,
        totalConversations: processedConversations.length,
        adviceByType: adviceStats,
      },
    });

  } catch (error) {
    console.error('Advice history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取建议统计信息（按类型分组）
 *
 * Note: Supabase doesn't support groupBy directly,
 * so we fetch all records and compute stats client-side
 */
async function getAdviceStats(supabase: ReturnType<typeof SupabaseClientManager.getInstance>, memberId: string) {
  const { data: allAdvice, error } = await supabase
    .from('ai_advice')
    .select('type')
    .eq('memberId', memberId)
    .is('deletedAt', null);

  if (error || !allAdvice) {
    console.error('获取建议统计失败:', error);
    return {};
  }

  // 客户端分组统计
  const stats = allAdvice.reduce((acc, advice) => {
    const type = advice.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return stats;
}
