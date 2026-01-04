/**
 * Feedback Repository Singleton
 *
 * 提供全局单例 FeedbackRepository 实例
 *
 * 注意：目前使用裸 Supabase 实例（不使用双写装饰器），
 * 因为 /api/ai/feedback 已经是纯 Supabase 端点
 */

import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { SupabaseFeedbackRepository } from "./implementations/supabase-feedback-repository";
import type { FeedbackRepository } from "./interfaces/feedback-repository";

let instance: FeedbackRepository | null = null;

/**
 * 获取 FeedbackRepository 单例实例
 *
 * @returns FeedbackRepository 实例
 */
export function getFeedbackRepository(): FeedbackRepository {
  if (!instance) {
    const supabaseClient = SupabaseClientManager.getInstance();
    instance = new SupabaseFeedbackRepository(supabaseClient);
  }
  return instance;
}

/**
 * 全局 FeedbackRepository 单例
 *
 * 使用方式：
 * ```typescript
 * import { feedbackRepository } from '@/lib/repositories/feedback-repository-singleton';
 *
 * const advice = await feedbackRepository.getAdviceByIdWithFeedback(adviceId);
 * ```
 */
export const feedbackRepository = getFeedbackRepository();
