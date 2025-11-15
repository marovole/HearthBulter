/**
 * Feedback Repository Interface
 *
 * 抽象 AI 反馈的持久化和聚合操作，支持 advice 和 conversation 两种反馈类型
 */

import type { FeedbackData, FeedbackStats } from '@/lib/types/feedback';

/**
 * AI 建议记录（包含反馈）
 */
export interface AIAdviceWithFeedback {
  id: string;
  memberId: string;
  type: string;
  content: any; // JSONB 字段
  feedback: FeedbackData[] | null;
}

/**
 * AI 对话记录（包含反馈）
 */
export interface AIConversationWithFeedback {
  id: string;
  memberId: string;
  messages: any[]; // JSONB 数组
}

/**
 * Feedback Repository 接口
 *
 * 提供反馈数据的增删改查和统计聚合操作
 */
export interface FeedbackRepository {
  /**
   * 获取 AI 建议记录（包含反馈）
   *
   * @param adviceId - AI 建议 ID
   * @returns AI 建议记录，如果不存在则返回 null
   */
  getAdviceByIdWithFeedback(adviceId: string): Promise<AIAdviceWithFeedback | null>;

  /**
   * 获取 AI 对话记录（包含反馈）
   *
   * @param conversationId - AI 对话 ID
   * @returns AI 对话记录，如果不存在则返回 null
   */
  getConversationByIdWithFeedback(conversationId: string): Promise<AIConversationWithFeedback | null>;

  /**
   * 追加反馈到 AI 建议
   *
   * @param adviceId - AI 建议 ID
   * @param feedback - 反馈数据
   * @throws Error 如果追加失败
   */
  appendAdviceFeedback(adviceId: string, feedback: FeedbackData): Promise<void>;

  /**
   * 追加反馈到 AI 对话（在最后一条消息上）
   *
   * @param conversationId - AI 对话 ID
   * @param feedback - 反馈数据
   * @throws Error 如果追加失败
   */
  appendConversationFeedback(conversationId: string, feedback: FeedbackData): Promise<void>;

  /**
   * 获取反馈统计数据（调用 RPC sp_ai_feedback_stats）
   *
   * @param memberId - 成员 ID
   * @param adviceType - 可选的建议类型过滤
   * @param daysAgo - 统计时间范围（默认 30 天）
   * @returns 反馈统计数据
   */
  fetchFeedbackStats(
    memberId: string,
    adviceType?: string | null,
    daysAgo?: number
  ): Promise<FeedbackStats>;
}
