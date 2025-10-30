import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      }
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 构建查询条件
    const whereCondition: any = {
      memberId,
      deletedAt: null,
    };

    if (type) {
      whereCondition.type = type;
    }

    // 获取AI建议历史
    const [adviceHistory, totalCount] = await Promise.all([
      prisma.aIAdvice.findMany({
        where: whereCondition,
        orderBy: { generatedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          content: true,
          prompt: true,
          tokens: true,
          feedback: true,
          generatedAt: true,
          createdAt: true,
        }
      }),
      prisma.aIAdvice.count({
        where: whereCondition,
      })
    ]);

    // 获取对话历史
    const conversationHistory = await prisma.aIConversation.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      orderBy: { lastMessageAt: 'desc' },
      take: Math.min(limit, 10), // 限制对话历史数量
      select: {
        id: true,
        title: true,
        messages: true,
        status: true,
        tokens: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
      }
    });

    // 处理对话历史，只保留最近的几条消息
    const processedConversations = conversationHistory.map(conv => ({
      ...conv,
      messages: conv.messages.slice(-5), // 只保留最近5条消息
      messageCount: conv.messages.length,
    }));

    return NextResponse.json({
      advice: {
        items: adviceHistory,
        total: totalCount,
        limit,
        offset,
      },
      conversations: {
        items: processedConversations,
        total: processedConversations.length,
      },
      summary: {
        totalAdvice: totalCount,
        totalConversations: processedConversations.length,
        adviceByType: await getAdviceStats(memberId),
      }
    });

  } catch (error) {
    console.error('Advice history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 获取建议统计信息
async function getAdviceStats(memberId: string) {
  const stats = await prisma.aIAdvice.groupBy({
    by: ['type'],
    where: {
      memberId,
      deletedAt: null,
    },
    _count: {
      type: true,
    },
  });

  return stats.reduce((acc, stat) => {
    acc[stat.type] = stat._count.type;
    return acc;
  }, {} as Record<string, number>);
}
