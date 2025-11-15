/**
 * Feedback Domain Types
 *
 * 定义 AI 交互反馈相关的类型
 */

/**
 * 反馈数据结构
 *
 * 存储在 ai_advice.feedback 和 ai_conversations.messages[].feedback 中
 */
export interface FeedbackData {
  /** 用户评分 (1-5) */
  rating: number | null;
  /** 是否点赞 */
  liked: boolean;
  /** 是否点踩 */
  disliked: boolean;
  /** 详细反馈内容 */
  comments: string | null;
  /** 反馈分类（如 accuracy, helpfulness, tone, completeness） */
  categories: string[];
  /** 提交时间 (ISO 8601) */
  submittedAt: string;
  /** 提交用户 ID */
  userId: string;
}

/**
 * 反馈分类统计
 */
export interface FeedbackCategoryStat {
  /** 分类名称 */
  category: string;
  /** 该分类的反馈数量 */
  count: number;
}

/**
 * 按类型统计的反馈数据
 */
export interface FeedbackTypeStat {
  /** 该类型的反馈总数 */
  count: number;
  /** 该类型的平均评分 */
  avgRating: number;
}

/**
 * 评分分布 (1-5 星)
 */
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * 反馈统计数据
 *
 * 从 RPC sp_ai_feedback_stats 返回
 */
export interface FeedbackStats {
  /** 总反馈数 */
  totalFeedback: number;
  /** 平均评分 */
  averageRating: number;
  /** 评分分布 (1-5 星) */
  ratingDistribution: RatingDistribution;
  /** Top 5 反馈分类 */
  topCategories: FeedbackCategoryStat[];
  /** 按建议类型分组的统计 */
  byType: Record<string, FeedbackTypeStat>;
  /** 统计时间范围（天数） */
  periodDays: number;
}
