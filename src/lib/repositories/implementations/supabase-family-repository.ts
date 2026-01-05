/**
 * Supabase 家庭 Repository 实现
 *
 * @module supabase-family-repository
 */

import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import type { FamilyRepository } from "../interfaces/family-repository";
import type {
  FamilyDTO,
  CreateFamilyDTO,
  UpdateFamilyDTO,
  FamilyMemberDTO,
  CreateFamilyMemberDTO,
  UpdateFamilyMemberDTO,
  FamilyWithMembersDTO,
  FamilyListQuery,
} from "../types/family";
import type { PaginatedResult, PaginationInput } from "../types/common";

type FamilyRow = Database["public"]["Tables"]["families"]["Row"];
type FamilyMemberRow = Database["public"]["Tables"]["family_members"]["Row"];

/**
 * Supabase 家庭 Repository 实现
 */
export class SupabaseFamilyRepository implements FamilyRepository {
  private readonly client: SupabaseClient<Database>;
  private readonly loggerPrefix = "[SupabaseFamilyRepository]";

  constructor(
    client: SupabaseClient<Database> = SupabaseClientManager.getInstance(),
  ) {
    this.client = client;
  }

  // ==================== 家庭 CRUD ====================

  async createFamily(payload: CreateFamilyDTO): Promise<FamilyDTO> {
    // 生成唯一邀请码
    const inviteCode = await this.generateUniqueInviteCode();

    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("families")
      .insert({
        name: payload.name,
        description: payload.description || null,
        invite_code: inviteCode,
        creator_id: payload.creatorId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      this.handleError("createFamily", error);
    }

    return this.mapFamilyRow(data!);
  }

  async getFamilyById(id: string): Promise<FamilyDTO | null> {
    const { data, error } = await this.client
      .from("families")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getFamilyById", error);
    }

    return data ? this.mapFamilyRow(data) : null;
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<FamilyDTO | null> {
    const { data, error } = await this.client
      .from("families")
      .select("*")
      .eq("invite_code", inviteCode)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getFamilyByInviteCode", error);
    }

    return data ? this.mapFamilyRow(data) : null;
  }

  async listUserFamilies(
    query: FamilyListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<FamilyWithMembersDTO>> {
    const { userId, includeDeleted = false, includeMembers = true } = query;

    // 查询用户创建的家庭
    let createdQuery = this.client
      .from("families")
      .select(includeMembers ? "*, members:family_members(*)" : "*")
      .eq("creator_id", userId);

    if (!includeDeleted) {
      createdQuery = createdQuery.is("deleted_at", null);
    }

    const { data: createdFamilies, error: createdError } = await createdQuery;

    if (createdError) {
      this.handleError("listUserFamilies:created", createdError);
    }

    // 查询用户作为成员加入的家庭
    let memberQuery = this.client
      .from("family_members")
      .select(
        includeMembers
          ? "family_id, families(*, members:family_members(*))"
          : "family_id, families(*)",
      )
      .eq("user_id", userId);

    if (!includeDeleted) {
      memberQuery = memberQuery.is("deleted_at", null);
    }

    const { data: memberData, error: memberError } = await memberQuery;

    if (memberError) {
      this.handleError("listUserFamilies:member", memberError);
    }

    // 合并并去重
    const familyMap = new Map<string, FamilyWithMembersDTO>();

    // 添加创建的家庭
    createdFamilies?.forEach((family) => {
      const members =
        includeMembers && Array.isArray((family as any).members)
          ? (family as any).members
            .filter((m: any) => !m.deleted_at)
            .map(this.mapFamilyMemberRow)
          : [];

      familyMap.set(family.id, {
        ...this.mapFamilyRow(family),
        members,
        _count: { members: members.length },
      });
    });

    // 添加加入的家庭
    memberData?.forEach((item: any) => {
      const family = item.families;
      if (family && !familyMap.has(family.id)) {
        const members =
          includeMembers && Array.isArray(family.members)
            ? family.members
              .filter((m: any) => !m.deleted_at)
              .map(this.mapFamilyMemberRow)
            : [];

        familyMap.set(family.id, {
          ...this.mapFamilyRow(family),
          members,
          _count: { members: members.length },
        });
      }
    });

    const allFamilies = Array.from(familyMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    // 应用分页
    const offset = pagination?.offset || 0;
    const limit = pagination?.limit || allFamilies.length;
    const items = allFamilies.slice(offset, offset + limit);

    return {
      items,
      total: allFamilies.length,
      hasMore: offset + items.length < allFamilies.length,
    };
  }

  async updateFamily(id: string, payload: UpdateFamilyDTO): Promise<FamilyDTO> {
    const updateData: Partial<FamilyRow> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined)
      updateData.description = payload.description;

    const { data, error } = await this.client
      .from("families")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError("updateFamily", error);
    }

    return this.mapFamilyRow(data!);
  }

  async softDeleteFamily(id: string): Promise<void> {
    const { error } = await this.client
      .from("families")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      this.handleError("softDeleteFamily", error);
    }
  }

  // ==================== 家庭成员管理 ====================

  async addFamilyMember(
    payload: CreateFamilyMemberDTO,
  ): Promise<FamilyMemberDTO> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from("family_members")
      .insert({
        family_id: payload.familyId,
        user_id: payload.userId,
        name: payload.name,
        email: payload.email || null,
        avatar: payload.avatar || null,
        role: payload.role || "MEMBER",
        joined_at: now,
        created_at: now,
        updated_at: now,
        // 扩展字段
        gender: payload.gender || null,
        birth_date: payload.birthDate ? payload.birthDate.toISOString() : null,
        height: payload.height || null,
        weight: payload.weight || null,
        bmi: payload.bmi || null,
        age_group: payload.ageGroup || null,
      })
      .select()
      .single();

    if (error) {
      this.handleError("addFamilyMember", error);
    }

    return this.mapFamilyMemberRow(data!);
  }

  async listFamilyMembers(
    familyId: string,
    includeDeleted = false,
  ): Promise<FamilyMemberDTO[]> {
    let query = this.client
      .from("family_members")
      .select(
        `
        *,
        user:users(id, name, email)
      `,
      )
      .eq("family_id", familyId);

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;

    if (error) {
      this.handleError("listFamilyMembers", error);
    }

    return (data || []).map(this.mapFamilyMemberRow);
  }

  async getFamilyMemberById(id: string): Promise<FamilyMemberDTO | null> {
    const { data, error } = await this.client
      .from("family_members")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getFamilyMemberById", error);
    }

    return data ? this.mapFamilyMemberRow(data) : null;
  }

  async updateFamilyMember(
    id: string,
    payload: UpdateFamilyMemberDTO,
  ): Promise<FamilyMemberDTO> {
    const updateData: Partial<FamilyMemberRow> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.avatar !== undefined) updateData.avatar = payload.avatar;
    if (payload.role !== undefined) updateData.role = payload.role;

    const { data, error } = await this.client
      .from("family_members")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.handleError("updateFamilyMember", error);
    }

    return this.mapFamilyMemberRow(data!);
  }

  async removeFamilyMember(id: string): Promise<void> {
    const { error } = await this.client
      .from("family_members")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      this.handleError("removeFamilyMember", error);
    }
  }

  async isUserFamilyMember(familyId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("family_members")
      .select("id")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("isUserFamilyMember", error);
    }

    return !!data;
  }

  async getUserFamilyRole(
    familyId: string,
    userId: string,
  ): Promise<string | null> {
    const { data, error } = await this.client
      .from("family_members")
      .select("role")
      .eq("family_id", familyId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      this.handleError("getUserFamilyRole", error);
    }

    return data?.role || null;
  }

  // ==================== 辅助方法 ====================

  /**
   * 生成唯一邀请码
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data } = await this.client
        .from("families")
        .select("id")
        .eq("invite_code", code)
        .maybeSingle();

      if (!data) {
        return code;
      }

      attempts++;
    }

    throw new Error("Failed to generate unique invite code");
  }

  /**
   * 映射 FamilyRow -> FamilyDTO
   */
  private mapFamilyRow(row: FamilyRow): FamilyDTO {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      inviteCode: row.invite_code,
      creatorId: row.creator_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  /**
   * 映射 FamilyMemberRow -> FamilyMemberDTO
   */
  private mapFamilyMemberRow(row: FamilyMemberRow): FamilyMemberDTO {
    const rowWithUser = row as any;
    return {
      id: row.id,
      familyId: row.family_id,
      userId: row.user_id,
      name: row.name,
      email: row.email || undefined,
      avatar: row.avatar || undefined,
      role: row.role as any,
      joinedAt: new Date(row.joined_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      // 扩展字段
      gender: rowWithUser.gender || undefined,
      birthDate: rowWithUser.birth_date
        ? new Date(rowWithUser.birth_date)
        : undefined,
      height: rowWithUser.height || undefined,
      weight: rowWithUser.weight || undefined,
      bmi: rowWithUser.bmi || undefined,
      ageGroup: rowWithUser.age_group || undefined,
      // 关联用户信息
      user: rowWithUser.user
        ? {
          id: rowWithUser.user.id,
          name: rowWithUser.user.name,
          email: rowWithUser.user.email,
        }
        : undefined,
    };
  }

  /**
   * 统一错误处理
   */
  private handleError(operation: string, error?: PostgrestError | null): never {
    const message = error?.message ?? "Unknown Supabase error";
    console.error(`${this.loggerPrefix} ${operation} failed:`, error);
    throw new Error(`FamilyRepository.${operation} failed: ${message}`);
  }
}
