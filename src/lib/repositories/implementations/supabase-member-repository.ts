/**
 * Supabase MemberRepository 实现
 *
 * 使用 Supabase 客户端处理成员健康管理数据
 *
 * @module supabase-member-repository
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MemberRepository,
  MemberAccessResult,
  HealthGoalDTO,
  CreateHealthGoalInput,
  UpdateHealthGoalInput,
  AllergyDTO,
  CreateAllergyInput,
  UpdateAllergyInput,
  HealthDataDTO,
  CreateHealthDataInput,
  UpdateHealthDataInput,
  HealthDataQuery,
  HealthDataResult,
} from "@/lib/repositories/interfaces/member-repository";

/**
 * SupabaseMemberRepository
 *
 * 提供基于 Supabase 的成员健康管理数据访问实现
 */
export class SupabaseMemberRepository implements MemberRepository {
  constructor(private supabase: SupabaseClient) {}

  // ============================================================================
  // 成员访问验证
  // ============================================================================

  async verifyMemberAccess(
    memberId: string,
    userId: string,
  ): Promise<MemberAccessResult> {
    try {
      // 查询成员信息，包含家庭信息
      const { data: member, error } = await this.supabase
        .from("family_members")
        .select(
          `
          id,
          name,
          familyId,
          userId,
          role,
          family:families!inner(
            id,
            creatorId
          )
        `,
        )
        .eq("id", memberId)
        .is("deletedAt", null)
        .single();

      if (error) {
        console.error("Error fetching member for access verification:", error);
        return { hasAccess: false, member: null };
      }

      if (!member) {
        return { hasAccess: false, member: null };
      }

      // 检查访问权限：
      // 1. 用户是家庭创建者
      // 2. 用户是成员本人（member.userId === userId）
      // 3. 用户是管理员成员
      const family = Array.isArray(member.family)
        ? member.family[0]
        : member.family;
      const isCreator = family?.creatorId === userId;
      const isSelf = member.userId === userId;

      // 如果不是创建者也不是本人，检查是否是管理员
      let isAdmin = false;
      if (!isCreator && !isSelf) {
        const { data: userMember } = await this.supabase
          .from("family_members")
          .select("role")
          .eq("userId", userId)
          .eq("familyId", member.familyId)
          .is("deletedAt", null)
          .single();

        isAdmin = userMember?.role === "ADMIN";
      }

      const hasAccess = isCreator || isSelf || isAdmin;

      return {
        hasAccess,
        member: {
          id: member.id,
          name: member.name,
          familyId: member.familyId,
          userId: member.userId || undefined,
          role: member.role,
          family: {
            id: family.id,
            creatorId: family.creatorId,
          },
        },
      };
    } catch (error) {
      console.error("Unexpected error in verifyMemberAccess:", error);
      return { hasAccess: false, member: null };
    }
  }

  // ============================================================================
  // 健康目标管理
  // ============================================================================

  async getHealthGoals(
    memberId: string,
    includeInactive: boolean = false,
  ): Promise<HealthGoalDTO[]> {
    let query = this.supabase
      .from("health_goals")
      .select("*")
      .eq("memberId", memberId)
      .is("deletedAt", null)
      .order("createdAt", { ascending: false });

    // 如果不包含非活跃目标，只返回 ACTIVE 状态
    if (!includeInactive) {
      query = query.eq("status", "ACTIVE");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching health goals:", error);
      throw new Error(`Failed to fetch health goals: ${error.message}`);
    }

    return (data || []).map(this.mapHealthGoalToDTO);
  }

  async getHealthGoalById(goalId: string): Promise<HealthGoalDTO | null> {
    const { data, error } = await this.supabase
      .from("health_goals")
      .select("*")
      .eq("id", goalId)
      .is("deletedAt", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Error fetching health goal:", error);
      throw new Error(`Failed to fetch health goal: ${error.message}`);
    }

    return data ? this.mapHealthGoalToDTO(data) : null;
  }

  async createHealthGoal(
    memberId: string,
    input: CreateHealthGoalInput,
  ): Promise<HealthGoalDTO> {
    const { data, error } = await this.supabase
      .from("health_goals")
      .insert({
        memberId,
        goalType: input.goalType,
        targetWeight: input.targetWeight,
        currentWeight: input.currentWeight,
        startWeight: input.startWeight,
        targetWeeks: input.targetWeeks,
        startDate: input.startDate.toISOString(),
        targetDate: input.targetDate?.toISOString(),
        tdee: input.tdee,
        bmr: input.bmr,
        activityFactor: input.activityFactor,
        carbRatio: input.carbRatio ?? 0.5,
        proteinRatio: input.proteinRatio ?? 0.2,
        fatRatio: input.fatRatio ?? 0.3,
        status: "ACTIVE",
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating health goal:", error);
      throw new Error(`Failed to create health goal: ${error.message}`);
    }

    return this.mapHealthGoalToDTO(data);
  }

  async updateHealthGoal(
    goalId: string,
    input: UpdateHealthGoalInput,
  ): Promise<HealthGoalDTO> {
    const updateData: any = {};

    if (input.goalType !== undefined) updateData.goalType = input.goalType;
    if (input.targetWeight !== undefined)
      updateData.targetWeight = input.targetWeight;
    if (input.currentWeight !== undefined)
      updateData.currentWeight = input.currentWeight;
    if (input.targetWeeks !== undefined)
      updateData.targetWeeks = input.targetWeeks;
    if (input.targetDate !== undefined) {
      updateData.targetDate = input.targetDate.toISOString();
    }
    if (input.tdee !== undefined) updateData.tdee = input.tdee;
    if (input.bmr !== undefined) updateData.bmr = input.bmr;
    if (input.activityFactor !== undefined)
      updateData.activityFactor = input.activityFactor;
    if (input.carbRatio !== undefined) updateData.carbRatio = input.carbRatio;
    if (input.proteinRatio !== undefined)
      updateData.proteinRatio = input.proteinRatio;
    if (input.fatRatio !== undefined) updateData.fatRatio = input.fatRatio;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.progress !== undefined) updateData.progress = input.progress;

    const { data, error } = await this.supabase
      .from("health_goals")
      .update(updateData)
      .eq("id", goalId)
      .is("deletedAt", null)
      .select()
      .single();

    if (error) {
      console.error("Error updating health goal:", error);
      throw new Error(`Failed to update health goal: ${error.message}`);
    }

    return this.mapHealthGoalToDTO(data);
  }

  async deleteHealthGoal(goalId: string): Promise<void> {
    const { error } = await this.supabase
      .from("health_goals")
      .update({ deletedAt: new Date().toISOString() })
      .eq("id", goalId);

    if (error) {
      console.error("Error deleting health goal:", error);
      throw new Error(`Failed to delete health goal: ${error.message}`);
    }
  }

  // ============================================================================
  // 过敏管理
  // ============================================================================

  async getAllergies(memberId: string): Promise<AllergyDTO[]> {
    const { data, error } = await this.supabase
      .from("allergies")
      .select("*")
      .eq("memberId", memberId)
      .is("deletedAt", null)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Error fetching allergies:", error);
      throw new Error(`Failed to fetch allergies: ${error.message}`);
    }

    return (data || []).map(this.mapAllergyToDTO);
  }

  async createAllergy(
    memberId: string,
    input: CreateAllergyInput,
  ): Promise<AllergyDTO> {
    const { data, error } = await this.supabase
      .from("allergies")
      .insert({
        memberId,
        allergenType: input.allergenType,
        allergenName: input.allergenName,
        severity: input.severity,
        description: input.description,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating allergy:", error);
      throw new Error(`Failed to create allergy: ${error.message}`);
    }

    return this.mapAllergyToDTO(data);
  }

  async updateAllergy(
    allergyId: string,
    input: UpdateAllergyInput,
  ): Promise<AllergyDTO> {
    const updateData: any = {};

    if (input.allergenType !== undefined)
      updateData.allergenType = input.allergenType;
    if (input.allergenName !== undefined)
      updateData.allergenName = input.allergenName;
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.description !== undefined)
      updateData.description = input.description;

    const { data, error } = await this.supabase
      .from("allergies")
      .update(updateData)
      .eq("id", allergyId)
      .is("deletedAt", null)
      .select()
      .single();

    if (error) {
      console.error("Error updating allergy:", error);
      throw new Error(`Failed to update allergy: ${error.message}`);
    }

    return this.mapAllergyToDTO(data);
  }

  async deleteAllergy(allergyId: string): Promise<void> {
    const { error } = await this.supabase
      .from("allergies")
      .update({ deletedAt: new Date().toISOString() })
      .eq("id", allergyId);

    if (error) {
      console.error("Error deleting allergy:", error);
      throw new Error(`Failed to delete allergy: ${error.message}`);
    }
  }

  // ============================================================================
  // 健康数据管理
  // ============================================================================

  async getHealthData(query: HealthDataQuery): Promise<HealthDataResult> {
    const {
      memberId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortOrder = "desc",
    } = query;

    let dbQuery = this.supabase
      .from("health_data")
      .select("*", { count: "exact" })
      .eq("memberId", memberId)
      .order("measuredAt", { ascending: sortOrder === "asc" });

    // 时间范围过滤
    if (startDate) {
      dbQuery = dbQuery.gte("measuredAt", startDate);
    }
    if (endDate) {
      dbQuery = dbQuery.lte("measuredAt", endDate);
    }

    // 分页
    const skip = (page - 1) * limit;
    dbQuery = dbQuery.range(skip, skip + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error("Error fetching health data:", error);
      throw new Error(`Failed to fetch health data: ${error.message}`);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: (data || []).map(this.mapHealthDataToDTO),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async createHealthData(
    memberId: string,
    input: CreateHealthDataInput,
  ): Promise<HealthDataDTO> {
    const { data, error } = await this.supabase
      .from("health_data")
      .insert({
        memberId,
        weight: input.weight,
        bodyFat: input.bodyFat,
        muscleMass: input.muscleMass,
        bloodPressureSystolic: input.bloodPressureSystolic,
        bloodPressureDiastolic: input.bloodPressureDiastolic,
        heartRate: input.heartRate,
        measuredAt: input.measuredAt?.toISOString() || new Date().toISOString(),
        source: input.source || "MANUAL",
        notes: input.notes,
        deviceConnectionId: input.deviceConnectionId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating health data:", error);
      throw new Error(`Failed to create health data: ${error.message}`);
    }

    return this.mapHealthDataToDTO(data);
  }

  async updateHealthData(
    dataId: string,
    input: UpdateHealthDataInput,
  ): Promise<HealthDataDTO> {
    const updateData: any = {};

    if (input.weight !== undefined) updateData.weight = input.weight;
    if (input.bodyFat !== undefined) updateData.bodyFat = input.bodyFat;
    if (input.muscleMass !== undefined)
      updateData.muscleMass = input.muscleMass;
    if (input.bloodPressureSystolic !== undefined) {
      updateData.bloodPressureSystolic = input.bloodPressureSystolic;
    }
    if (input.bloodPressureDiastolic !== undefined) {
      updateData.bloodPressureDiastolic = input.bloodPressureDiastolic;
    }
    if (input.heartRate !== undefined) updateData.heartRate = input.heartRate;
    if (input.measuredAt !== undefined) {
      updateData.measuredAt = input.measuredAt.toISOString();
    }
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await this.supabase
      .from("health_data")
      .update(updateData)
      .eq("id", dataId)
      .select()
      .single();

    if (error) {
      console.error("Error updating health data:", error);
      throw new Error(`Failed to update health data: ${error.message}`);
    }

    return this.mapHealthDataToDTO(data);
  }

  async deleteHealthData(dataId: string): Promise<void> {
    // 注意：health_data 表没有 deletedAt 字段，执行硬删除
    const { error } = await this.supabase
      .from("health_data")
      .delete()
      .eq("id", dataId);

    if (error) {
      console.error("Error deleting health data:", error);
      throw new Error(`Failed to delete health data: ${error.message}`);
    }
  }

  // ============================================================================
  // 辅助方法：数据映射
  // ============================================================================

  private mapHealthGoalToDTO(data: any): HealthGoalDTO {
    return {
      id: data.id,
      memberId: data.memberId,
      goalType: data.goalType,
      targetWeight: data.targetWeight,
      currentWeight: data.currentWeight,
      startWeight: data.startWeight,
      targetWeeks: data.targetWeeks,
      startDate: data.startDate,
      targetDate: data.targetDate,
      tdee: data.tdee,
      bmr: data.bmr,
      activityFactor: data.activityFactor,
      carbRatio: data.carbRatio ?? 0.5,
      proteinRatio: data.proteinRatio ?? 0.2,
      fatRatio: data.fatRatio ?? 0.3,
      status: data.status,
      progress: data.progress ?? 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapAllergyToDTO(data: any): AllergyDTO {
    return {
      id: data.id,
      memberId: data.memberId,
      allergenType: data.allergenType,
      allergenName: data.allergenName,
      severity: data.severity,
      description: data.description,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapHealthDataToDTO(data: any): HealthDataDTO {
    return {
      id: data.id,
      memberId: data.memberId,
      weight: data.weight,
      bodyFat: data.bodyFat,
      muscleMass: data.muscleMass,
      bloodPressureSystolic: data.bloodPressureSystolic,
      bloodPressureDiastolic: data.bloodPressureDiastolic,
      heartRate: data.heartRate,
      measuredAt: data.measuredAt,
      source: data.source,
      notes: data.notes,
      deviceConnectionId: data.deviceConnectionId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
