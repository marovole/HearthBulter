/**
 * Convex Health Repository 实现
 *
 * 基于 Convex 实现健康数据访问层，替代 NeonHealthRepository
 * 并行查询成员数据、健康目标、过敏、饮食偏好、健康数据、体检报告
 *
 * @module convex-health-repository
 */

import { convexClient, api } from "@/lib/convex-client";
import { asConvexQueryReference, asConvexMutationReference } from "@/lib/convex-reference";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type {
  HealthRepository,
  MemberHealthContext,
  AIAdviceHistoryRecord,
} from "../interfaces/health-repository";

// ==================== Convex 文档类型 ====================

type FamilyMemberDoc = Doc<"familyMembers">;
type HealthGoalDoc = Doc<"healthGoals">;
type AllergyDoc = Doc<"allergies">;
type DietaryPreferenceDoc = Doc<"dietaryPreferences">;
type HealthDataDoc = Doc<"healthData">;
type MedicalReportDoc = Doc<"medicalReports">;
type MedicalIndicatorDoc = Doc<"medicalIndicators">;
type AiAdviceDoc = Doc<"aiAdvice">;
type AiConversationDoc = Doc<"aiConversations">;

// ==================== 动态 API 引用 ====================
// ai 模块尚未加入 generated API，使用动态引用

const aiListDietaryPreferences = asConvexQueryReference("ai:listDietaryPreferences");
const aiListAdviceByMember = asConvexQueryReference("ai:listAdviceByMember");
const aiCreateAdvice = asConvexMutationReference("ai:createAdvice");
const aiGetConversationById = asConvexQueryReference("ai:getConversationById");
const aiUpdateConversation = asConvexMutationReference("ai:updateConversation");
const aiCreateConversation = asConvexMutationReference("ai:createConversation");

// health 模块新增函数，尚未加入 generated API
const healthListMedicalReportsByMember = asConvexQueryReference(
  "health:listMedicalReportsByMember"
);
const healthListIndicatorsByReport = asConvexQueryReference("health:listIndicatorsByReport");

// ==================== Repository ====================

export class ConvexHealthRepository implements HealthRepository {
  /**
   * 获取成员健康上下文 — 并行拉取所有关联数据
   *
   * 数据流: member → [goals, allergies, dietaryPrefs, healthData, medicalReports]
   * → 按 reportId 批量拉 indicators → 组装返回
   */
  async getMemberHealthContext(
    memberId: string,
    options?: {
      healthDataLimit?: number;
      medicalReportsLimit?: number;
    }
  ): Promise<MemberHealthContext | null> {
    const healthDataLimit = options?.healthDataLimit ?? 20;
    const medicalReportsLimit = options?.medicalReportsLimit ?? 5;
    const memberIdAsId = memberId as Id<"familyMembers">;

    const member = await convexClient.query<FamilyMemberDoc | null>(api.families.getMemberById, {
      memberId: memberIdAsId,
    });

    if (!member) return null;

    const [healthGoals, allergies, dietaryPrefs, healthDataResult, medicalReports] =
      await Promise.all([
        convexClient.query<HealthGoalDoc[]>(api.health.listGoals, {
          memberId: memberIdAsId,
          includeInactive: true,
        }),
        convexClient.query<AllergyDoc[]>(api.health.listAllergies, {
          memberId: memberIdAsId,
        }),
        convexClient.query<DietaryPreferenceDoc[]>(aiListDietaryPreferences, { memberId }),
        convexClient.query<{ data: HealthDataDoc[]; total: number }>(api.health.listHealthData, {
          memberId: memberIdAsId,
          page: 1,
          limit: healthDataLimit,
          sortOrder: "desc",
        }),
        convexClient.query<MedicalReportDoc[]>(healthListMedicalReportsByMember, {
          memberId: memberIdAsId,
          limit: medicalReportsLimit,
        }),
      ]);

    // 按报告批量拉指标
    const indicatorsByReport = await this.fetchIndicatorsByReports(medicalReports);

    return {
      member: {
        id: member._id as string,
        familyId: member.familyId as string,
        userId: (member.userId as string) ?? null,
        name: member.name,
        birthDate: new Date(member.birthDate),
        gender: member.gender as "MALE" | "FEMALE",
        height: member.height ?? null,
        weight: member.weight ?? null,
        bmi: this.calculateBmi(member.height, member.weight),
      },
      healthGoals: healthGoals.map(mapGoal),
      allergies: allergies.map(mapAllergy),
      dietaryPreference: this.mapDietaryPref(dietaryPrefs),
      healthData: healthDataResult.data.map(mapHealthDataRecord),
      medicalReports: medicalReports.map((r) => ({
        id: r._id as string,
        reportType: r.reportType ?? null,
        reportDate: r.reportDate ? new Date(r.reportDate) : null,
        uploadedAt: r.createdAt ? new Date(r.createdAt) : null,
        indicators: (indicatorsByReport[r._id as string] || []).map(mapIndicator),
      })),
    };
  }

  async getMemberHealthHistory(
    memberId: string,
    limit: number = 10
  ): Promise<AIAdviceHistoryRecord[]> {
    const docs = await convexClient.query<AiAdviceDoc[]>(aiListAdviceByMember, {
      memberId,
      limit,
    });

    return docs.map((d) => ({
      id: d._id as string,
      generatedAt: new Date(d.generatedAt),
      content: d.content,
      feedback: d.feedback,
    }));
  }

  async saveHealthAdvice(data: {
    memberId: string;
    type: string;
    content: any;
    prompt: string;
    tokens: number;
  }): Promise<{ id: string; generatedAt: Date } | null> {
    const result = await convexClient.mutation<AiAdviceDoc | null>(aiCreateAdvice, {
      memberId: data.memberId,
      type: data.type,
      content: data.content,
      prompt: data.prompt,
      tokens: data.tokens,
    });

    if (!result) return null;

    return {
      id: (result as any)._id as string,
      generatedAt: new Date((result as any).generatedAt),
    };
  }

  async saveConversation(data: {
    id: string;
    memberId: string;
    messages: any[];
    status: "ACTIVE" | "ARCHIVED";
    tokens?: number;
    updatedAt: Date;
    lastMessageAt: Date;
  }): Promise<void> {
    const maxMessages = 50;
    const trimmedMessages =
      data.messages.length > maxMessages ? data.messages.slice(-maxMessages) : data.messages;

    const existing = await convexClient.query<AiConversationDoc | null>(aiGetConversationById, {
      id: data.id as Id<"aiConversations">,
    });

    if (existing) {
      await convexClient.mutation(aiUpdateConversation, {
        id: data.id as Id<"aiConversations">,
        patch: {
          messages: trimmedMessages,
          status: data.status,
          tokens: data.tokens ?? null,
          lastMessageAt: data.lastMessageAt.getTime(),
        },
      });
    } else {
      await convexClient.mutation(aiCreateConversation, {
        memberId: data.memberId,
        title: (trimmedMessages[0]?.content?.slice?.(0, 50) as string) ?? "新对话",
        messages: trimmedMessages,
        status: data.status,
        tokens: data.tokens ?? 0,
      });
    }
  }

  // ==================== 私有辅助 ====================

  /**
   * 批量拉取医学指标 — N+1 模式，report 数量少（≤5）可接受
   */
  private async fetchIndicatorsByReports(
    reports: MedicalReportDoc[]
  ): Promise<Record<string, MedicalIndicatorDoc[]>> {
    if (reports.length === 0) return {};

    const allIndicators = await Promise.all(
      reports.map((r) =>
        convexClient
          .query<MedicalIndicatorDoc[]>(healthListIndicatorsByReport, {
            reportId: r._id as Id<"medicalReports">,
          })
          .catch(() => [] as MedicalIndicatorDoc[])
      )
    );

    const result: Record<string, MedicalIndicatorDoc[]> = {};
    reports.forEach((r, i) => {
      result[r._id as string] = allIndicators[i] ?? [];
    });
    return result;
  }

  /**
   * BMI 计算 — 让边界自然消失，null 输入返回 null
   */
  private calculateBmi(height: number | undefined, weight: number | undefined): number | null {
    if (!height || !weight || height <= 0) return null;
    const heightM = height / 100;
    return Math.round((weight / (heightM * heightM)) * 10) / 10;
  }

  /**
   * 饮食偏好映射 — Convex dietaryPreferences 是多条记录，
   * Neon 里是单条 dietType/isVegetarian/isVegan 结构。
   * 将 Convex 的类型列表映射回接口格式
   */
  private mapDietaryPref(prefs: DietaryPreferenceDoc[]): MemberHealthContext["dietaryPreference"] {
    if (prefs.length === 0) return null;

    const types = prefs.map((p) => p.type);
    return {
      dietType: types.join(", ") || null,
      isVegetarian: types.some(
        (t) => t.toLowerCase() === "vegetarian" || t.toLowerCase() === "素食"
      ),
      isVegan: types.some((t) => t.toLowerCase() === "vegan" || t.toLowerCase() === "纯素"),
      restrictions:
        prefs
          .filter((p) => p.strictness)
          .map((p) => `${p.type}(${p.strictness})`)
          .join(", ") || null,
      preferences: types.join(", ") || null,
    };
  }
}

// ==================== 映射函数 ====================

function mapGoal(doc: HealthGoalDoc) {
  return {
    id: doc._id as string,
    goalType: doc.goalType,
    targetValue: doc.targetValue ?? null,
    currentValue: doc.currentValue ?? null,
    deadline: doc.endDate ? new Date(doc.endDate) : null,
    status: doc.status ?? null,
  };
}

function mapAllergy(doc: AllergyDoc) {
  return {
    id: doc._id as string,
    allergenName: doc.allergenName,
    severity: doc.severity ?? null,
    symptoms: doc.description ?? null,
  };
}

function mapHealthDataRecord(doc: HealthDataDoc) {
  // Convex healthData 没有 dataType/unit 字段 — 根据哪个字段有值推断类型
  // 保持与 Neon 版接口兼容
  const { dataType, value, unit } = inferDataType(doc);
  return {
    id: doc._id as string,
    dataType,
    value,
    unit,
    measuredAt: doc.measuredAt ? new Date(doc.measuredAt) : null,
    source: doc.source ?? null,
  };
}

/**
 * 从 Convex healthData 的具体字段反推 dataType/value/unit
 * — 让特殊情况消失，统一遍历所有数值字段
 */
function inferDataType(doc: HealthDataDoc): {
  dataType: string;
  value: number;
  unit: string;
} {
  const fields: Array<[string, number | undefined, string]> = [
    ["weight", doc.weight, "kg"],
    ["bodyFat", doc.bodyFat, "%"],
    ["muscleMass", doc.muscleMass, "kg"],
    ["bloodPressureSystolic", doc.bloodPressureSystolic, "mmHg"],
    ["bloodPressureDiastolic", doc.bloodPressureDiastolic, "mmHg"],
    ["heartRate", doc.heartRate, "bpm"],
    ["bloodSugar", doc.bloodSugar, "mg/dL"],
    ["sleep", doc.sleep, "hours"],
    ["exercise", doc.exercise, "minutes"],
    ["steps", doc.steps, "steps"],
  ];

  for (const [name, val, u] of fields) {
    if (val !== undefined && val !== null) {
      return { dataType: name, value: val, unit: u };
    }
  }

  return { dataType: "unknown", value: 0, unit: "" };
}

function mapIndicator(doc: MedicalIndicatorDoc) {
  return {
    id: doc._id as string,
    reportId: doc.reportId as string,
    indicatorName: doc.name,
    value: doc.value,
    unit: doc.unit ?? null,
    referenceRange: doc.referenceRange ?? null,
    status: doc.status ?? null,
  };
}
