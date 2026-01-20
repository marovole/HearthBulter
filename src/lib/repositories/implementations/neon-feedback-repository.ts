// @ts-nocheck - Legacy migration: pending full type safety review
import { neonAdapter } from "@/lib/db/neon-adapter";
import { NeonClientManager } from "@/lib/db/neon-client";
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

interface FeedbackStatsRow {
  total_feedback: number | null;
  average_rating: number | null;
  rating_distribution: Record<string, number> | null;
  top_categories: Array<{ category: string; count: number }> | null;
  by_type: Record<string, { count: number; avgRating: number }> | null;
  period_days: number | null;
}

export class NeonFeedbackRepository implements FeedbackRepository {
  async getAdviceByIdWithFeedback(adviceId: string): Promise<AIAdviceWithFeedback | null> {
    try {
      const data = await neonAdapter.aiAdvice.findUnique({
        where: { id: adviceId },
      });

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
      console.error("Failed to fetch advice feedback target:", error);
      return null;
    }
  }

  async getConversationByIdWithFeedback(
    conversationId: string
  ): Promise<AIConversationWithFeedback | null> {
    try {
      const data = await neonAdapter.aiConversation.findUnique({
        where: { id: conversationId },
      });

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        memberId: data.memberId,
        messages: Array.isArray(data.messages) ? data.messages : [],
      };
    } catch (error) {
      console.error("Failed to fetch conversation feedback target:", error);
      return null;
    }
  }

  async appendAdviceFeedback(adviceId: string, feedback: FeedbackData): Promise<void> {
    try {
      const data = await neonAdapter.aiAdvice.findUnique({
        where: { id: adviceId },
      });

      if (!data) {
        throw new Error(`Advice not found: ${adviceId}`);
      }

      const existingFeedback = Array.isArray(data.feedback) ? data.feedback : [];
      const updatedFeedback = [...existingFeedback, feedback];

      await neonAdapter.aiAdvice.update({
        where: { id: adviceId },
        data: {
          feedback: updatedFeedback,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("NeonFeedbackRepository.appendAdviceFeedback failed:", error);
      throw error;
    }
  }

  async appendConversationFeedback(conversationId: string, feedback: FeedbackData): Promise<void> {
    try {
      const data = await neonAdapter.aiConversation.findUnique({
        where: { id: conversationId },
      });

      if (!data) {
        throw new Error(`Conversation not found: ${conversationId}`);
      }

      const existingMessages = Array.isArray(data.messages) ? [...data.messages] : [];

      if (existingMessages.length === 0) {
        console.warn(
          `[FeedbackRepository] Conversation ${conversationId} has no messages, skipping feedback append`
        );
        return;
      }

      const lastIndex = existingMessages.length - 1;
      existingMessages[lastIndex] = {
        ...existingMessages[lastIndex],
        feedback,
      };

      await neonAdapter.aiConversation.update({
        where: { id: conversationId },
        data: {
          messages: existingMessages,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("NeonFeedbackRepository.appendConversationFeedback failed:", error);
      throw error;
    }
  }

  async fetchFeedbackStats(
    memberId: string,
    adviceType?: string | null,
    daysAgo = 30
  ): Promise<FeedbackStats> {
    try {
      const results = await NeonClientManager.query<FeedbackStatsRow>(
        "SELECT * FROM sp_ai_feedback_stats($1, $2, $3)",
        [memberId, adviceType, daysAgo]
      );

      const statsRow = results[0];
      if (!statsRow) {
        return this.buildDefaultStats(daysAgo);
      }

      return this.mapStatsRow(statsRow, daysAgo);
    } catch (error) {
      console.error("NeonFeedbackRepository.fetchFeedbackStats failed:", error);
      return this.buildDefaultStats(daysAgo);
    }
  }

  private mapStatsRow(row: FeedbackStatsRow, daysAgo: number): FeedbackStats {
    const topCategories: FeedbackCategoryStat[] = Array.isArray(row.top_categories)
      ? row.top_categories.map((entry) => ({
          category: entry.category,
          count: Number(entry.count ?? 0),
        }))
      : [];

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
      ratingDistribution: this.normalizeRatingDistribution(row.rating_distribution),
      topCategories,
      byType,
      periodDays: row.period_days ?? daysAgo,
    };
  }

  private normalizeRatingDistribution(input: Record<string, number> | null): RatingDistribution {
    const base: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (!input) {
      return base;
    }

    return {
      1: Number(input["1"] ?? base[1]),
      2: Number(input["2"] ?? base[2]),
      3: Number(input["3"] ?? base[3]),
      4: Number(input["4"] ?? base[4]),
      5: Number(input["5"] ?? base[5]),
    };
  }

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
