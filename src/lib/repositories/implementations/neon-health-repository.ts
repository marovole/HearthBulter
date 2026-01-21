// @ts-nocheck - Legacy migration: pending full type safety review
import { neonAdapter } from "@/lib/db/neon-adapter";
import type {
  HealthRepository,
  MemberHealthContext,
  AIAdviceHistoryRecord,
} from "../interfaces/health-repository";

interface FamilyMemberRow {
  id: string;
  familyId: string;
  userId: string | null;
  name: string;
  birthDate: string;
  gender: string;
  height: number | null;
  weight: number | null;
  bmi: number | null;
}

interface HealthGoalRow {
  id: string;
  goalType: string;
  targetValue: number | null;
  currentValue: number | null;
  deadline: string | null;
  status: string | null;
}

interface AllergyRow {
  id: string;
  allergenName: string;
  severity: string | null;
  symptoms: string | null;
}

interface DietaryPreferenceRow {
  dietType: string | null;
  isVegetarian: boolean;
  isVegan: boolean;
  restrictions: string | null;
  preferences: string | null;
}

interface HealthDataRow {
  id: string;
  dataType: string;
  value: number;
  unit: string | null;
  measuredAt: string | null;
  source: string | null;
}

interface MedicalReportRow {
  id: string;
  reportType: string | null;
  reportDate: string | null;
  uploadedAt: string | null;
}

interface ReportIndicatorRow {
  id: string;
  reportId: string;
  indicatorName: string;
  value: number;
  unit: string | null;
  referenceRange: string | null;
  status: string | null;
}

interface AIAdviceRow {
  id: string;
  generatedAt: string;
  content: any;
  feedback: any;
}

export class NeonHealthRepository implements HealthRepository {
  async getMemberHealthContext(
    memberId: string,
    options?: {
      healthDataLimit?: number;
      medicalReportsLimit?: number;
    }
  ): Promise<MemberHealthContext | null> {
    const healthDataLimit = options?.healthDataLimit ?? 20;
    const medicalReportsLimit = options?.medicalReportsLimit ?? 5;

    const member = await neonAdapter.familyMember.findUnique<FamilyMemberRow>({
      where: { id: memberId },
    });

    if (!member) {
      return null;
    }

    const [healthGoals, allergies, dietaryPreference, healthData, medicalReports] =
      await Promise.all([
        neonAdapter.healthGoal.findMany<HealthGoalRow>({
          where: { memberId, deletedAt: null },
          orderBy: { createdAt: "desc" },
        }),
        neonAdapter.allergy.findMany<AllergyRow>({
          where: { memberId, deletedAt: null },
        }),
        neonAdapter.dietaryPreference.findFirst<DietaryPreferenceRow>({
          where: { memberId, deletedAt: null },
        }),
        neonAdapter.healthData.findMany<HealthDataRow>({
          where: { memberId, deletedAt: null },
          orderBy: { measuredAt: "desc" },
          take: healthDataLimit,
        }),
        neonAdapter.medicalReport.findMany<MedicalReportRow>({
          where: { memberId, deletedAt: null },
          orderBy: { reportDate: "desc" },
          take: medicalReportsLimit,
        }),
      ]);

    const reportIds = medicalReports.map((r) => r.id);
    let indicators: ReportIndicatorRow[] = [];
    if (reportIds.length > 0) {
      indicators = await neonAdapter.reportIndicator.findMany<ReportIndicatorRow>({
        where: { reportId: { in: reportIds } },
      });
    }

    const indicatorsByReport = indicators.reduce(
      (acc, ind) => {
        if (!acc[ind.reportId]) {
          acc[ind.reportId] = [];
        }
        acc[ind.reportId].push(ind);
        return acc;
      },
      {} as Record<string, ReportIndicatorRow[]>
    );

    return {
      member: {
        id: member.id,
        familyId: member.familyId,
        userId: member.userId,
        name: member.name,
        birthDate: new Date(member.birthDate),
        gender: member.gender as "MALE" | "FEMALE",
        height: member.height,
        weight: member.weight,
        bmi: member.bmi,
      },
      healthGoals: healthGoals.map((g) => ({
        id: g.id,
        goalType: g.goalType,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        deadline: g.deadline ? new Date(g.deadline) : null,
        status: g.status,
      })),
      allergies: allergies.map((a) => ({
        id: a.id,
        allergenName: a.allergenName,
        severity: a.severity,
        symptoms: a.symptoms,
      })),
      dietaryPreference: dietaryPreference
        ? {
            dietType: dietaryPreference.dietType,
            isVegetarian: dietaryPreference.isVegetarian,
            isVegan: dietaryPreference.isVegan,
            restrictions: dietaryPreference.restrictions,
            preferences: dietaryPreference.preferences,
          }
        : null,
      healthData: healthData.map((d) => ({
        id: d.id,
        dataType: d.dataType,
        value: d.value,
        unit: d.unit,
        measuredAt: d.measuredAt ? new Date(d.measuredAt) : null,
        source: d.source,
      })),
      medicalReports: medicalReports.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        reportDate: r.reportDate ? new Date(r.reportDate) : null,
        uploadedAt: r.uploadedAt ? new Date(r.uploadedAt) : null,
        indicators: (indicatorsByReport[r.id] || []).map((ind) => ({
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
  }

  async getMemberHealthHistory(
    memberId: string,
    limit: number = 10
  ): Promise<AIAdviceHistoryRecord[]> {
    const records = await neonAdapter.aiAdvice.findMany<AIAdviceRow>({
      where: { memberId, deletedAt: null },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      generatedAt: new Date(r.generatedAt),
      content: r.content,
      feedback: r.feedback,
    }));
  }

  async saveHealthAdvice(data: {
    memberId: string;
    type: string;
    content: any;
    prompt: string;
    tokens: number;
  }): Promise<{ id: string; generatedAt: Date } | null> {
    const result = await neonAdapter.aiAdvice.create({
      data: {
        memberId: data.memberId,
        type: data.type,
        content: data.content,
        prompt: data.prompt,
        tokens: data.tokens,
        generatedAt: new Date(),
      },
    });

    if (!result || !result.id) {
      return null;
    }

    return {
      id: result.id,
      generatedAt: result.generatedAt ? new Date(result.generatedAt) : new Date(),
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

    const existing = await neonAdapter.aiConversation.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      await neonAdapter.aiConversation.update({
        where: { id: data.id },
        data: {
          messages: trimmedMessages,
          status: data.status,
          tokens: data.tokens ?? null,
          updatedAt: data.updatedAt,
          lastMessageAt: data.lastMessageAt,
        },
      });
    } else {
      await neonAdapter.aiConversation.create({
        data: {
          id: data.id,
          memberId: data.memberId,
          messages: trimmedMessages,
          status: data.status,
          tokens: data.tokens ?? null,
          createdAt: new Date(),
          updatedAt: data.updatedAt,
          lastMessageAt: data.lastMessageAt,
        },
      });
    }
  }
}
