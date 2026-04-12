// ============================================================================
// Convex Feedback Repository — AI 反馈数据访问层
// ============================================================================
// 替代 neon-feedback-repository.ts，基于 Convex 实现
// 核心映射:
//   getAdviceByIdWithFeedback  → ai.getAdviceById
//   getConversationByIdWithFeedback → ai.getConversationById
//   appendAdviceFeedback       → ai.updateAdviceFeedback (merge)
//   appendConversationFeedback → ai.getConversationById + ai.updateConversation
//   fetchFeedbackStats         → ai.getFeedbackStats
// ============================================================================

import { convexClient, api } from "@/lib/convex-client";
import { asConvexMutationReference, asConvexQueryReference } from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type {
  FeedbackRepository,
  AIAdviceWithFeedback,
  AIConversationWithFeedback,
} from "../interfaces/feedback-repository";
import type {
  FeedbackData,
  FeedbackStats,
  FeedbackCategoryStat,
  FeedbackTypeStat,
  RatingDistribution,
} from "@/lib/types/feedback";

// ─── Convex 文档类型 ─────────────────────────────────────────

type AdviceDoc = Doc<"aiAdvice">;
type ConversationDoc = Doc<"aiConversations">;

// ─── getFeedbackStats 返回类型 ───────────────────────────────

interface ConvexFeedbackStats {
  total: number;
  withFeedback: number;
  positive: number;
  negative: number;
  neutral: number;
  feedbackRate: number;
  positiveRate: number;
}

// ============================================================================
// ConvexFeedbackRepository
// ============================================================================

export class ConvexFeedbackRepository implements FeedbackRepository {
  // ==================== 查询 ====================

  async getAdviceByIdWithFeedback(adviceId: string): Promise<AIAdviceWithFeedback | null> {
    try {
      const doc = await convexClient.query<AdviceDoc | null>(
        asConvexQueryReference("ai:getAdviceById"),
        { id: adviceId as Id<"aiAdvice"> }
      );

      if (!doc) return null;
      return mapAdviceDoc(doc);
    } catch (error) {
      console.error("ConvexFeedbackRepository.getAdviceByIdWithFeedback failed:", error);
      return null;
    }
  }

  async getConversationByIdWithFeedback(
    conversationId: string
  ): Promise<AIConversationWithFeedback | null> {
    try {
      const doc = await convexClient.query<ConversationDoc | null>(
        asConvexQueryReference("ai:getConversationById"),
        { id: conversationId as Id<"aiConversations"> }
      );

      if (!doc) return null;
      return mapConversationDoc(doc);
    } catch (error) {
      console.error("ConvexFeedbackRepository.getConversationByIdWithFeedback failed:", error);
      return null;
    }
  }

  // ==================== 写入 ====================

  async appendAdviceFeedback(adviceId: string, feedback: FeedbackData): Promise<void> {
    try {
      await convexClient.mutation(asConvexMutationReference("ai:updateAdviceFeedback"), {
        id: adviceId as Id<"aiAdvice">,
        feedback,
      });
    } catch (error) {
      console.error("ConvexFeedbackRepository.appendAdviceFeedback failed:", error);
      throw error;
    }
  }

  async appendConversationFeedback(conversationId: string, feedback: FeedbackData): Promise<void> {
    try {
      const doc = await convexClient.query<ConversationDoc | null>(
        asConvexQueryReference("ai:getConversationById"),
        { id: conversationId as Id<"aiConversations"> }
      );

      if (!doc) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      const messages: any[] = Array.isArray(doc.messages) ? [...doc.messages] : [];

      if (messages.length === 0) {
        console.warn(
          `[FeedbackRepository] Conversation ${conversationId} has no messages, skipping feedback append`
        );
        return;
      }

      // 在最后一条消息上设置反馈
      const lastIndex = messages.length - 1;
      messages[lastIndex] = { ...messages[lastIndex], feedback };

      await convexClient.mutation(asConvexMutationReference("ai:updateConversation"), {
        id: conversationId as Id<"aiConversations">,
        patch: { messages },
      });
    } catch (error) {
      console.error("ConvexFeedbackRepository.appendConversationFeedback failed:", error);
      throw error;
    }
  }

  // ==================== 统计 ====================

  async fetchFeedbackStats(
    memberId: string,
    adviceType?: string | null,
    daysAgo = 30
  ): Promise<FeedbackStats> {
    try {
      const stats = await convexClient.query<ConvexFeedbackStats>(
        asConvexQueryReference("ai:getFeedbackStats"),
        {
          memberId,
          adviceType: adviceType ?? undefined,
          daysAgo,
        }
      );

      return mapFeedbackStats(stats, daysAgo);
    } catch (error) {
      console.error("ConvexFeedbackRepository.fetchFeedbackStats failed:", error);
      return buildDefaultStats(daysAgo);
    }
  }
}

// ============================================================================
// Mapping — 文档 → DTO
// ============================================================================

function mapAdviceDoc(doc: AdviceDoc): AIAdviceWithFeedback {
  // Convex 反馈: updateAdviceFeedback 为对象合并，Neon 为数组追加
  // 两种情况都处理，保证接口契约 FeedbackData[] | null
  const feedback = normalizeFeedbackArray(doc.feedback);
  return {
    id: doc._id as string,
    memberId: doc.memberId,
    type: doc.type,
    content: doc.content,
    feedback,
  };
}

function mapConversationDoc(doc: ConversationDoc): AIConversationWithFeedback {
  return {
    id: doc._id as string,
    memberId: doc.memberId,
    messages: Array.isArray(doc.messages) ? doc.messages : [],
  };
}

/**
 * 统一反馈格式为数组 | null
 * - 数组 → 直接返回
 * - 对象 → 包装为单元素数组
 * - null/undefined → 返回 null
 */
function normalizeFeedbackArray(feedback: unknown): FeedbackData[] | null {
  if (feedback == null) return null;
  if (Array.isArray(feedback)) return feedback;
  // 对象合并模式: 单个反馈对象包装为数组
  return [feedback as FeedbackData];
}

/**
 * Convex getFeedbackStats → FeedbackStats DTO
 *
 * Convex 返回 { total, withFeedback, positive, negative, neutral, feedbackRate, positiveRate }
 * 接口要求  { totalFeedback, averageRating, ratingDistribution, topCategories, byType, periodDays }
 *
 * 不完全对齐的字段用合理默认值填充
 */
function mapFeedbackStats(stats: ConvexFeedbackStats, daysAgo: number): FeedbackStats {
  // positiveRate 作为 averageRating 的近似值 (0-1 → 1-5 映射)
  const averageRating = stats.positiveRate * 5;

  // 按 positive/negative 推导粗略的评分分布
  const ratingDistribution = deriveRatingDistribution(stats);

  return {
    totalFeedback: stats.withFeedback,
    averageRating: Math.round(averageRating * 100) / 100,
    ratingDistribution,
    topCategories: [],
    byType: {},
    periodDays: daysAgo,
  };
}

/**
 * 从 positive/negative/neutral 比例推导 1-5 评分分布
 *
 * 保守映射: positive → 4+5, negative → 1+2, neutral → 3
 */
function deriveRatingDistribution(stats: ConvexFeedbackStats): RatingDistribution {
  const total = stats.withFeedback || 1; // 防止除零
  return {
    1: Math.round(stats.negative * 0.5),
    2: Math.round(stats.negative * 0.5),
    3: stats.neutral,
    4: Math.round((stats.positive * total) / (total + 1)),
    5: Math.round((stats.positive * total) / (total + 1)),
  };
}

function buildDefaultStats(daysAgo: number): FeedbackStats {
  return {
    totalFeedback: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    topCategories: [],
    byType: {},
    periodDays: daysAgo,
  };
}
