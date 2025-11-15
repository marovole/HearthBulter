import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recipeOptimizer } from '@/lib/services/ai/recipe-optimizer';
import { SupabaseFamilyRepository } from '@/lib/repositories/implementations/supabase-family-repository';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { feedbackRepository } from '@/lib/repositories/feedback-repository-singleton';
import type { FeedbackData } from '@/lib/types/feedback';

// 支持静态导出的配置
export const dynamic = 'force-static';
export const revalidate = false;

// 创建专门用于权限检查的 FamilyRepository 实例（不需要双写）
const familyRepo = new SupabaseFamilyRepository(SupabaseClientManager.getInstance());

const DEFAULT_STATS_DAYS = 30;

/**
 * POST /api/ai/feedback
 * 提交 AI 建议反馈
 *
 * Migrated from Prisma to Supabase (使用 Repository 模式)
 */
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
      feedbackType, // 'advice' | 'conversation'
      rating,
      liked,
      disliked,
      comments,
      categories,
    } = body;

    // 验证必需参数
    if (!adviceId || !feedbackType) {
      return NextResponse.json(
        { error: 'Advice ID and feedback type are required' },
        { status: 400 }
      );
    }

    // 构建反馈数据
    const feedbackData: FeedbackData = {
      rating: typeof rating === 'number' ? rating : null,
      liked: Boolean(liked),
      disliked: Boolean(disliked),
      comments: comments ?? null,
      categories: Array.isArray(categories) ? categories : [],
      submittedAt: new Date().toISOString(),
      userId: session.user.id,
    };

    // 根据反馈类型处理
    if (feedbackType === 'advice') {
      // 获取 AI 建议记录
      const advice = await feedbackRepository.getAdviceByIdWithFeedback(adviceId);
      if (!advice) {
        return NextResponse.json(
          { error: 'Feedback target not found' },
          { status: 404 }
        );
      }

      // 验证用户权限（是成员本人或家庭管理员）
      const hasAccess = await verifyFamilyAccess(advice.memberId, session.user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Member not found or access denied' },
          { status: 404 }
        );
      }

      // 追加反馈到 AI 建议
      await feedbackRepository.appendAdviceFeedback(adviceId, feedbackData);

      // 如果是食谱优化反馈，传递给学习机制
      if (advice.type === 'RECIPE_OPTIMIZATION') {
        try {
          await recipeOptimizer.learnFromUserFeedback(
            advice.content.originalRecipe,
            advice.content.optimization.improved_recipe,
            {
              rating: rating || 3,
              liked_changes: liked ? ['整体优化'] : [],
              disliked_changes: disliked ? ['特定调整'] : [],
              comments: comments ?? '',
            }
          );
        } catch (error) {
          console.warn('Recipe learning feedback failed:', error);
          // 不影响主要反馈流程
        }
      }
    } else if (feedbackType === 'conversation') {
      // 获取 AI 对话记录
      const conversation = await feedbackRepository.getConversationByIdWithFeedback(adviceId);
      if (!conversation) {
        return NextResponse.json(
          { error: 'Feedback target not found' },
          { status: 404 }
        );
      }

      // 验证用户权限
      const hasAccess = await verifyFamilyAccess(conversation.memberId, session.user.id);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Member not found or access denied' },
          { status: 404 }
        );
      }

      // 追加反馈到 AI 对话（在最后一条消息上）
      await feedbackRepository.appendConversationFeedback(adviceId, feedbackData);
    } else {
      return NextResponse.json(
        { error: 'Unsupported feedback type' },
        { status: 400 }
      );
    }

    // 记录反馈分析数据（可选持久化模块）
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

/**
 * GET /api/ai/feedback
 * 获取反馈统计
 *
 * Migrated from Prisma to Supabase (使用 Repository + RPC)
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
    const adviceType = searchParams.get('type');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // 验证用户权限
    const hasAccess = await verifyFamilyAccess(memberId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Member not found or access denied' },
        { status: 404 }
      );
    }

    // 使用 Repository 调用 RPC 获取统计数据
    const feedbackStats = await feedbackRepository.fetchFeedbackStats(
      memberId,
      adviceType,
      DEFAULT_STATS_DAYS
    );

    return NextResponse.json({
      memberId,
      type: adviceType || 'all',
      stats: feedbackStats,
      period: `last_${feedbackStats.periodDays}_days`,
    });

  } catch (error) {
    console.error('Feedback stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 辅助函数：验证家庭访问权限
 *
 * 检查用户是否是成员本人或家庭管理员
 *
 * @param memberId - 成员 ID
 * @param userId - 用户 ID
 * @returns 是否有访问权限
 */
async function verifyFamilyAccess(memberId: string, userId: string): Promise<boolean> {
  try {
    // 使用 FamilyRepository 获取成员信息
    const member = await familyRepo.getFamilyMemberById(memberId);
    if (!member) {
      return false;
    }

    // 检查是否是成员本人
    if (member.userId === userId) {
      return true;
    }

    // 检查是否是家庭管理员
    const role = await familyRepo.getUserFamilyRole(member.familyId, userId);
    return role === 'ADMIN';
  } catch (error) {
    console.error('Failed to verify family access:', error);
    return false;
  }
}

/**
 * 辅助函数：记录反馈分析数据
 *
 * 可选持久化模块：目前只记录日志，未来可扩展为存储到分析表
 *
 * @param adviceId - 建议 ID
 * @param feedbackType - 反馈类型
 * @param feedbackData - 反馈数据
 */
async function logFeedbackAnalytics(
  adviceId: string,
  feedbackType: string,
  feedbackData: FeedbackData
) {
  console.log('Feedback analytics logged:', {
    adviceId,
    feedbackType,
    rating: feedbackData.rating,
    categories: feedbackData.categories,
    timestamp: feedbackData.submittedAt,
  });

  // TODO: 未来可扩展为存储到专门的分析表（如 ai_feedback_events）
  // 用于机器学习训练或实时仪表板
}
