import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recipeOptimizer } from '@/lib/services/ai/recipe-optimizer';
import { prisma } from '@/lib/db';

// 支持静态导出的配置
export const dynamic = 'force-static';
export const revalidate = false;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      adviceId,
      feedbackType, // 'advice' | 'conversation' | 'recipe_optimization'
      rating, // 1-5 分
      liked, // boolean
      disliked, // boolean
      comments, // 详细反馈
      categories, // 反馈分类 ['accuracy', 'helpfulness', 'tone', 'completeness']
    } = body;

    if (!adviceId) {
      return NextResponse.json(
        { error: 'Advice ID is required' },
        { status: 400 }
      );
    }

    let feedbackTarget;
    let memberId;

    // 根据反馈类型查找目标记录
    if (feedbackType === 'advice') {
      feedbackTarget = await prisma.aIAdvice.findUnique({
        where: { id: adviceId },
        select: { memberId: true, type: true, content: true },
      });
      memberId = feedbackTarget?.memberId;
    } else if (feedbackType === 'conversation') {
      feedbackTarget = await prisma.aIConversation.findUnique({
        where: { id: adviceId },
        select: { memberId: true, messages: true },
      });
      memberId = feedbackTarget?.memberId;
    }

    if (!feedbackTarget || !memberId) {
      return NextResponse.json(
        { error: 'Feedback target not found' },
        { status: 404 }
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
                  role: 'ADMIN',
                },
              },
            },
          },
        ],
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 构建反馈数据
    const feedbackData = {
      rating: rating || null,
      liked: liked || false,
      disliked: disliked || false,
      comments: comments || null,
      categories: categories || [],
      submittedAt: new Date(),
      userId: session.user.id,
    };

    // 更新建议记录的反馈
    if (feedbackType === 'advice') {
      const existingFeedback = await prisma.aIAdvice.findUnique({
        where: { id: adviceId },
        select: { feedback: true },
      });

      const updatedFeedback = existingFeedback?.feedback
        ? [...(existingFeedback.feedback as any[]), feedbackData]
        : [feedbackData];

      await prisma.aIAdvice.update({
        where: { id: adviceId },
        data: {
          feedback: updatedFeedback,
          updatedAt: new Date(),
        },
      });

      // 如果是食谱优化反馈，传递给学习机制
      if (feedbackTarget.type === 'RECIPE_OPTIMIZATION') {
        try {
          await recipeOptimizer.learnFromUserFeedback(
            feedbackTarget.content.originalRecipe,
            feedbackTarget.content.optimization.improved_recipe,
            {
              rating: rating || 3,
              liked_changes: liked ? ['整体优化'] : [],
              disliked_changes: disliked ? ['特定调整'] : [],
              comments: comments || '',
            }
          );
        } catch (error) {
          console.warn('Recipe learning feedback failed:', error);
          // 不影响主要反馈流程
        }
      }
    } else if (feedbackType === 'conversation') {
      // 为对话添加反馈（可以存储在对话元数据中或单独表）
      // 这里简化为在最后一条消息中添加反馈标记
      const messages = feedbackTarget.messages as any[];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        lastMessage.feedback = feedbackData;

        await prisma.aIConversation.update({
          where: { id: adviceId },
          data: {
            messages,
            updatedAt: new Date(),
          },
        });
      }
    }

    // 记录反馈统计（用于后续改进）
    await logFeedbackAnalytics(adviceId, feedbackType, feedbackData);

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: `${adviceId}_${Date.now()}`,
    });

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET 方法用于获取反馈统计
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
    const adviceType = searchParams.get('type');

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
                  role: 'ADMIN',
                },
              },
            },
          },
        ],
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 计算反馈统计
    const feedbackStats = await calculateFeedbackStats(memberId, adviceType);

    return NextResponse.json({
      memberId,
      type: adviceType || 'all',
      stats: feedbackStats,
      period: 'last_30_days', // 可以扩展为参数
    });

  } catch (error) {
    console.error('Feedback stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 辅助函数：记录反馈分析数据
async function logFeedbackAnalytics(
  adviceId: string,
  feedbackType: string,
  feedbackData: any
) {
  // 这里可以实现更复杂的分析逻辑
  // 例如：存储到单独的分析表中，用于模型改进

  console.log('Feedback analytics logged:', {
    adviceId,
    feedbackType,
    rating: feedbackData.rating,
    categories: feedbackData.categories,
    timestamp: feedbackData.submittedAt,
  });
}

// 辅助函数：计算反馈统计
async function calculateFeedbackStats(memberId: string, adviceType?: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 获取最近30天的反馈数据
  const adviceRecords = await prisma.aIAdvice.findMany({
    where: {
      memberId,
      ...(adviceType && { type: adviceType }),
      updatedAt: {
        gte: thirtyDaysAgo,
      },
      feedback: {
        not: null,
      },
    },
    select: {
      feedback: true,
      type: true,
    },
  });

  let totalFeedback = 0;
  let totalRating = 0;
  let ratingCount = 0;
  const categoryStats: Record<string, number> = {};
  const typeStats: Record<string, { count: number; avgRating: number }> = {};

  adviceRecords.forEach(record => {
    const feedbacks = record.feedback as any[];
    if (feedbacks && feedbacks.length > 0) {
      feedbacks.forEach(fb => {
        totalFeedback++;

        if (fb.rating) {
          totalRating += fb.rating;
          ratingCount++;
        }

        // 统计反馈类别
        if (fb.categories) {
          fb.categories.forEach((cat: string) => {
            categoryStats[cat] = (categoryStats[cat] || 0) + 1;
          });
        }

        // 按类型统计
        const type = record.type;
        if (!typeStats[type]) {
          typeStats[type] = { count: 0, avgRating: 0 };
        }
        typeStats[type].count++;
        if (fb.rating) {
          typeStats[type].avgRating = (
            (typeStats[type].avgRating * (typeStats[type].count - 1)) + fb.rating
          ) / typeStats[type].count;
        }
      });
    }
  });

  return {
    total_feedback: totalFeedback,
    average_rating: ratingCount > 0 ? totalRating / ratingCount : 0,
    rating_distribution: await getRatingDistribution(adviceRecords),
    top_categories: Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count })),
    by_type: typeStats,
    period_days: 30,
  };
}

// 获取评分分布
async function getRatingDistribution(adviceRecords: any[]) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  adviceRecords.forEach(record => {
    const feedbacks = record.feedback as any[];
    if (feedbacks) {
      feedbacks.forEach(fb => {
        if (fb.rating && fb.rating >= 1 && fb.rating <= 5) {
          distribution[fb.rating as keyof typeof distribution]++;
        }
      });
    }
  });

  return distribution;
}
