/**
 * Health Repository Interface
 *
 * 管理成员健康数据的访问，包括健康目标、过敏信息、饮食偏好、健康数据、体检报告等
 */

/**
 * 成员健康上下文
 *
 * 包含 AI 健康分析所需的所有数据
 */
export interface MemberHealthContext {
  /** 成员基本信息 */
  member: {
    id: string;
    familyId: string;
    userId: string | null;
    name: string;
    birthDate: Date;
    gender: "MALE" | "FEMALE";
    height: number | null;
    weight: number | null;
    bmi: number | null;
  };

  /** 健康目标列表 */
  healthGoals: Array<{
    id: string;
    goalType: string;
    targetValue: number | null;
    currentValue: number | null;
    deadline: Date | null;
    status: string | null;
  }>;

  /** 过敏信息列表 */
  allergies: Array<{
    id: string;
    allergenName: string;
    severity: string | null;
    symptoms: string | null;
  }>;

  /** 饮食偏好 */
  dietaryPreference: {
    dietType: string | null;
    isVegetarian: boolean;
    isVegan: boolean;
    restrictions: string | null;
    preferences: string | null;
  } | null;

  /** 健康数据列表（最近N条） */
  healthData: Array<{
    id: string;
    dataType: string;
    value: number;
    unit: string | null;
    measuredAt: Date | null;
    source: string | null;
  }>;

  /** 体检报告列表（包含指标） */
  medicalReports: Array<{
    id: string;
    reportType: string | null;
    reportDate: Date | null;
    uploadedAt: Date | null;
    indicators: Array<{
      id: string;
      reportId: string;
      indicatorName: string;
      value: number;
      unit: string | null;
      referenceRange: string | null;
      status: string | null;
    }>;
  }>;
}

/**
 * AI 建议历史记录
 */
export interface AIAdviceHistoryRecord {
  id: string;
  generatedAt: Date;
  content: any; // JSONB 字段
  feedback: any; // JSONB 字段
}

/**
 * Health Repository 接口
 *
 * 提供健康数据访问的抽象层，支持 Prisma 和 Supabase 双写
 */
export interface HealthRepository {
  /**
   * 获取成员健康上下文
   *
   * @param memberId - 成员 ID
   * @param options - 可选配置
   * @returns 健康上下文数据，如果成员不存在或无权限则返回 null
   */
  getMemberHealthContext(
    memberId: string,
    options?: {
      /** 健康数据记录数量限制 */
      healthDataLimit?: number;
      /** 体检报告数量限制 */
      medicalReportsLimit?: number;
    },
  ): Promise<MemberHealthContext | null>;

  /**
   * 获取成员 AI 健康分析历史
   *
   * @param memberId - 成员 ID
   * @param limit - 返回记录数量限制
   * @returns AI 建议历史记录列表
   */
  getMemberHealthHistory(
    memberId: string,
    limit?: number,
  ): Promise<AIAdviceHistoryRecord[]>;

  /**
   * 保存 AI 健康建议
   *
   * @param data - AI 建议数据
   * @returns 保存的建议记录
   */
  saveHealthAdvice(data: {
    memberId: string;
    type: string;
    content: any;
    prompt: string;
    tokens: number;
  }): Promise<{ id: string; generatedAt: Date } | null>;

  /**
   * 保存 AI 对话
   *
   * 自动压缩 messages 数组，保留最近 50 条消息以控制 JSONB 大小
   *
   * @param data - AI 对话数据
   * @returns Promise<void>
   */
  saveConversation(data: {
    id: string;
    memberId: string;
    messages: any[];
    status: "ACTIVE" | "ARCHIVED";
    tokens?: number;
    updatedAt: Date;
    lastMessageAt: Date;
  }): Promise<void>;
}
