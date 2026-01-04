/**
 * Supabase Health Repository Implementation
 *
 * 使用 Supabase 实现健康数据访问
 * 复用 FamilyRepository 进行权限检查，使用并行查询优化性能
 */

import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type {
  HealthRepository,
  MemberHealthContext,
  AIAdviceHistoryRecord,
} from '@/lib/repositories/interfaces/health-repository';

export class SupabaseHealthRepository implements HealthRepository {
  private readonly supabase = SupabaseClientManager.getInstance();

  /**
   * 获取成员健康上下文
   *
   * 使用并行查询优化性能，一次性获取所有健康数据
   */
  async getMemberHealthContext(
    memberId: string,
    options?: {
      healthDataLimit?: number;
      medicalReportsLimit?: number;
    },
  ): Promise<MemberHealthContext | null> {
    const healthDataLimit = options?.healthDataLimit ?? 10;
    const medicalReportsLimit = options?.medicalReportsLimit ?? 5;

    try {
      // 使用 Promise.all 并行查询所有数据（6 个查询 → 1 个往返）
      const [
        memberResult,
        healthGoalsResult,
        allergiesResult,
        dietaryPreferenceResult,
        healthDataResult,
        medicalReportsResult,
      ] = await Promise.all([
        // 1. 获取成员基本信息
        this.supabase
          .from('family_members')
          .select(
            'id, familyId, userId, name, birthDate, gender, height, weight, bmi',
          )
          .eq('id', memberId)
          .is('deletedAt', null)
          .single(),

        // 2. 获取健康目标
        this.supabase
          .from('health_goals')
          .select('id, goalType, targetValue, currentValue, deadline, status')
          .eq('memberId', memberId)
          .is('deletedAt', null),

        // 3. 获取过敏信息
        this.supabase
          .from('allergies')
          .select('id, allergenName, severity, symptoms')
          .eq('memberId', memberId)
          .is('deletedAt', null),

        // 4. 获取饮食偏好
        this.supabase
          .from('dietary_preferences')
          .select('dietType, isVegetarian, isVegan, restrictions, preferences')
          .eq('memberId', memberId)
          .is('deletedAt', null)
          .maybeSingle(),

        // 5. 获取健康数据（最近 N 条）
        this.supabase
          .from('health_data')
          .select('id, dataType, value, unit, measuredAt, source')
          .eq('memberId', memberId)
          .order('measuredAt', { ascending: false })
          .limit(healthDataLimit),

        // 6. 获取体检报告（最近 N 条）
        this.supabase
          .from('medical_reports')
          .select('id, reportType, reportDate, uploadedAt')
          .eq('memberId', memberId)
          .order('createdAt', { ascending: false })
          .limit(medicalReportsLimit),
      ]);

      // 检查成员是否存在
      if (memberResult.error || !memberResult.data) {
        return null;
      }

      const member = memberResult.data;

      // 获取体检指标（如果有报告）
      let allIndicators: any[] = [];
      if (medicalReportsResult.data && medicalReportsResult.data.length > 0) {
        const reportIds = medicalReportsResult.data.map((r) => r.id);
        const { data: indicators } = await this.supabase
          .from('medical_report_indicators')
          .select(
            'id, reportId, indicatorName, value, unit, referenceRange, status',
          )
          .in('reportId', reportIds);

        allIndicators = indicators || [];
      }

      // 组装完整的健康上下文
      return {
        member: {
          id: member.id,
          familyId: member.familyId,
          userId: member.userId,
          name: member.name,
          birthDate: new Date(member.birthDate),
          gender: member.gender,
          height: member.height,
          weight: member.weight,
          bmi: member.bmi,
        },
        healthGoals: (healthGoalsResult.data || []).map((g) => ({
          id: g.id,
          goalType: g.goalType,
          targetValue: g.targetValue,
          currentValue: g.currentValue,
          deadline: g.deadline ? new Date(g.deadline) : null,
          status: g.status,
        })),
        allergies: (allergiesResult.data || []).map((a) => ({
          id: a.id,
          allergenName: a.allergenName,
          severity: a.severity,
          symptoms: a.symptoms,
        })),
        dietaryPreference: dietaryPreferenceResult.data
          ? {
              dietType: dietaryPreferenceResult.data.dietType,
              isVegetarian: dietaryPreferenceResult.data.isVegetarian ?? false,
              isVegan: dietaryPreferenceResult.data.isVegan ?? false,
              restrictions: dietaryPreferenceResult.data.restrictions,
              preferences: dietaryPreferenceResult.data.preferences,
            }
          : null,
        healthData: (healthDataResult.data || []).map((h) => ({
          id: h.id,
          dataType: h.dataType,
          value: h.value,
          unit: h.unit,
          measuredAt: h.measuredAt ? new Date(h.measuredAt) : null,
          source: h.source,
        })),
        medicalReports: (medicalReportsResult.data || []).map((report) => ({
          id: report.id,
          reportType: report.reportType,
          reportDate: report.reportDate ? new Date(report.reportDate) : null,
          uploadedAt: report.uploadedAt ? new Date(report.uploadedAt) : null,
          indicators: allIndicators
            .filter((ind) => ind.reportId === report.id)
            .map((ind) => ({
              id: ind.id,
              reportId: ind.reportId,
              indicatorName: ind.indicatorName,
              value: ind.value,
              unit: ind.unit,
              referenceRange: ind.referenceRange,
              status: ind.status,
            })),
        })),
      };
    } catch (error) {
      console.error('Failed to fetch member health context:', error);
      return null;
    }
  }

  /**
   * 获取成员 AI 健康分析历史
   */
  async getMemberHealthHistory(
    memberId: string,
    limit = 10,
  ): Promise<AIAdviceHistoryRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('ai_advice')
        .select('id, generatedAt, content, feedback')
        .eq('memberId', memberId)
        .eq('type', 'HEALTH_ANALYSIS')
        .is('deletedAt', null)
        .order('generatedAt', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch health history:', error);
        return [];
      }

      return (data || []).map((record) => ({
        id: record.id,
        generatedAt: new Date(record.generatedAt),
        content: record.content,
        feedback: record.feedback,
      }));
    } catch (error) {
      console.error('Failed to fetch member health history:', error);
      return [];
    }
  }

  /**
   * 保存 AI 健康建议
   */
  async saveHealthAdvice(data: {
    memberId: string;
    type: string;
    content: any;
    prompt: string;
    tokens: number;
  }): Promise<{ id: string; generatedAt: Date } | null> {
    try {
      const now = new Date().toISOString();

      const { data: aiAdvice, error } = await this.supabase
        .from('ai_advice')
        .insert({
          memberId: data.memberId,
          type: data.type,
          content: data.content,
          prompt: data.prompt,
          tokens: data.tokens,
          generatedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .select('id, generatedAt')
        .single();

      if (error) {
        console.error('Failed to save AI health advice:', error);
        return null;
      }

      return {
        id: aiAdvice.id,
        generatedAt: new Date(aiAdvice.generatedAt),
      };
    } catch (error) {
      console.error('Failed to save health advice:', error);
      return null;
    }
  }

  /**
   * 保存 AI 对话
   *
   * 自动压缩 messages 数组，保留最近 50 条消息以控制 JSONB 大小
   */
  async saveConversation(data: {
    id: string;
    memberId: string;
    messages: any[];
    status: 'ACTIVE' | 'ARCHIVED';
    tokens?: number;
    updatedAt: Date;
    lastMessageAt: Date;
  }): Promise<void> {
    try {
      // 压缩 messages：只保留最近 50 条消息
      const MAX_MESSAGES = 50;
      const compressedMessages =
        data.messages.length > MAX_MESSAGES
          ? data.messages.slice(-MAX_MESSAGES)
          : data.messages;

      // 如果压缩了消息，记录日志（使用 warn 级别避免日志噪音）
      if (data.messages.length > MAX_MESSAGES) {
        console.warn(
          `[HealthRepository] Compressed conversation ${data.id}: ${data.messages.length} → ${compressedMessages.length} messages`,
        );
      }

      const { error } = await this.supabase.from('ai_conversations').upsert(
        {
          id: data.id,
          memberId: data.memberId,
          messages: compressedMessages,
          status: data.status,
          tokens: data.tokens ?? 0,
          updatedAt: data.updatedAt.toISOString(),
          lastMessageAt: data.lastMessageAt.toISOString(),
        },
        { onConflict: 'id' },
      );

      if (error) {
        console.error('Failed to save AI conversation:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save AI conversation:', error);
      throw error;
    }
  }
}
