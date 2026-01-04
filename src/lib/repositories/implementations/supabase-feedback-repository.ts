/**
 * Supabase Feedback Repository Implementation
 *
 * 使用 Supabase 实现 AI 反馈数据访问，包括调用 RPC 进行统计聚合
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type {
  FeedbackRepository,
  AIAdviceWithFeedback,
  AIConversationWithFeedback,
} from '../interfaces/feedback-repository';
import type {
  FeedbackData,
  FeedbackStats,
  FeedbackCategoryStat,
  FeedbackTypeStat,
  RatingDistribution,
} from '@/lib/types/feedback';

/**
 * RPC sp_ai_feedback_stats 返回的行结构
 */
interface FeedbackStatsRow {
  total_feedback: number | null;
  average_rating: number | null;
  rating_distribution: Record<string, number> | null;
  top_categories: Array<{ category: string; count: number }> | null;
  by_type: Record<string, { count: number; avgRating: number }> | null;
  period_days: number | null;
}

export class SupabaseFeedbackRepository implements FeedbackRepository {
  private readonly supabase = SupabaseClientManager.getInstance();

  /**
   * 获取 AI 建议记录（包含反馈）
   */
  async getAdviceByIdWithFeedback(
    adviceId: string,
  ): Promise<AIAdviceWithFeedback | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_advice')
        .select('id, memberId, type, content, feedback')
        .eq('id', adviceId)
        .single();

      if (error) {
        console.error('Failed to fetch advice feedback target:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        memberId: data.memberId,
        type: data.type,
        content: data.content,
        feedback: Array.isArray(data.feedback) ? data.feedback : null,
      };
    } catch (error) {
      console.error('Failed to fetch advice feedback target:', error);
      return null;
    }
  }

  /**
   * 获取 AI 对话记录（包含反馈）
   */
  async getConversationByIdWithFeedback(
    conversationId: string,
  ): Promise<AIConversationWithFeedback | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_conversations')
        .select('id, memberId, messages')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Failed to fetch conversation feedback target:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        memberId: data.memberId,
        messages: Array.isArray(data.messages) ? data.messages : [],
      };
    } catch (error) {
      console.error('Failed to fetch conversation feedback target:', error);
      return null;
    }
  }

  /**
   * 追加反馈到 AI 建议
   *
   * 读取现有 feedback 数组，追加新反馈，然后更新
   */
  async appendAdviceFeedback(
    adviceId: string,
    feedback: FeedbackData,
  ): Promise<void> {
    try {
      // 读取现有反馈
      const { data, error } = await this.supabase
        .from('ai_advice')
        .select('feedback')
        .eq('id', adviceId)
        .single();

      if (error) {
        throw new Error(
          `Failed to read existing advice feedback: ${error.message ?? 'unknown'}`,
        );
      }

      // 追加新反馈
      const existingFeedback = Array.isArray(data?.feedback)
        ? data.feedback
        : [];
      const updatedFeedback = [...existingFeedback, feedback];

      // 更新数据库
      const { error: updateError } = await this.supabase
        .from('ai_advice')
        .update({
          feedback: updatedFeedback,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', adviceId);

      if (updateError) {
        throw new Error(
          `Failed to append advice feedback: ${updateError.message ?? 'unknown'}`,
        );
      }
    } catch (error) {
      console.error(
        'SupabaseFeedbackRepository.appendAdviceFeedback failed:',
        error,
      );
      throw error;
    }
  }

  /**
   * 追加反馈到 AI 对话（在最后一条消息上）
   *
   * 读取现有 messages 数组，在最后一条消息上添加 feedback 字段，然后更新
   *
   * 注意：如果对话没有消息，则不做任何操作（避免插入格式不正确的占位消息）
   */
  async appendConversationFeedback(
    conversationId: string,
    feedback: FeedbackData,
  ): Promise<void> {
    try {
      // 读取现有消息
      const { data, error } = await this.supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      if (error) {
        throw new Error(
          `Failed to read existing conversation messages: ${error.message ?? 'unknown'}`,
        );
      }

      // 在最后一条消息上添加反馈
      const existingMessages = Array.isArray(data?.messages)
        ? [...data.messages]
        : [];

      if (existingMessages.length === 0) {
        // 如果没有消息，不做任何操作（避免插入格式不正确的占位消息）
        console.warn(
          `[FeedbackRepository] Conversation ${conversationId} has no messages, skipping feedback append`,
        );
        return;
      }

      const lastIndex = existingMessages.length - 1;
      existingMessages[lastIndex] = {
        ...existingMessages[lastIndex],
        feedback,
      };

      // 更新数据库
      const { error: updateError } = await this.supabase
        .from('ai_conversations')
        .update({
          messages: existingMessages,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (updateError) {
        throw new Error(
          `Failed to append conversation feedback: ${updateError.message ?? 'unknown'}`,
        );
      }
    } catch (error) {
      console.error(
        'SupabaseFeedbackRepository.appendConversationFeedback failed:',
        error,
      );
      throw error;
    }
  }

  /**
   * 获取反馈统计数据（调用 RPC sp_ai_feedback_stats）
   *
   * 使用数据库端聚合，避免客户端遍历 JSONB 数组
   */
  async fetchFeedbackStats(
    memberId: string,
    adviceType?: string | null,
    daysAgo = 30,
  ): Promise<FeedbackStats> {
    try {
      const { data, error } = await this.supabase.rpc('sp_ai_feedback_stats', {
        p_member_id: memberId,
        p_advice_type: adviceType,
        p_days_ago: daysAgo,
      });

      if (error) {
        console.error('Failed to fetch feedback stats:', error);
        return this.buildDefaultStats(daysAgo);
      }

      // RPC 返回单行数据（包装在数组中）
      const statsRow = Array.isArray(data)
        ? (data[0] as FeedbackStatsRow | undefined)
        : undefined;
      if (!statsRow) {
        return this.buildDefaultStats(daysAgo);
      }

      return this.mapStatsRow(statsRow, daysAgo);
    } catch (error) {
      console.error(
        'SupabaseFeedbackRepository.fetchFeedbackStats failed:',
        error,
      );
      return this.buildDefaultStats(daysAgo);
    }
  }

  /**
   * 将 RPC 返回的行映射为 FeedbackStats 类型
   */
  private mapStatsRow(row: FeedbackStatsRow, daysAgo: number): FeedbackStats {
    // 映射 top_categories
    const topCategories: FeedbackCategoryStat[] = Array.isArray(
      row.top_categories,
    )
      ? row.top_categories.map((entry) => ({
          category: entry.category,
          count: Number(entry.count ?? 0),
        }))
      : [];

    // 映射 by_type
    const byType: Record<string, FeedbackTypeStat> = {};
    if (row.by_type) {
      Object.entries(row.by_type).forEach(([type, stats]) => {
        byType[type] = {
          count: Number(stats?.count ?? 0),
          avgRating: Number(stats?.avgRating ?? 0),
        };
      });
    }

    return {
      totalFeedback: Number(row.total_feedback ?? 0),
      averageRating: Number(row.average_rating ?? 0),
      ratingDistribution: this.normalizeRatingDistribution(
        row.rating_distribution,
      ),
      topCategories,
      byType,
      periodDays: row.period_days ?? daysAgo,
    };
  }

  /**
   * 规范化评分分布（确保包含 1-5 所有评分）
   */
  private normalizeRatingDistribution(
    input: Record<string, number> | null,
  ): RatingDistribution {
    const base: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (!input) {
      return base;
    }

    return {
      1: Number(input['1'] ?? base[1]),
      2: Number(input['2'] ?? base[2]),
      3: Number(input['3'] ?? base[3]),
      4: Number(input['4'] ?? base[4]),
      5: Number(input['5'] ?? base[5]),
    };
  }

  /**
   * 构建默认统计数据（当 RPC 调用失败或无数据时）
   */
  private buildDefaultStats(daysAgo: number): FeedbackStats {
    return {
      totalFeedback: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      topCategories: [],
      byType: {},
      periodDays: daysAgo,
    };
  }
}
