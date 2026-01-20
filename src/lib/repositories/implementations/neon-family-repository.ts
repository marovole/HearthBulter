/**
 * Neon 家庭 Repository 实现
 *
 * 基于 Neon PostgreSQL + neonAdapter 实现家庭系统的数据访问层
 *
 * @module neon-family-repository
 */

import { neonAdapter } from "@/lib/db/neon-adapter";
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

interface FamilyRow {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface FamilyMemberRow {
  id: string;
  familyId: string;
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  gender?: string | null;
  birthDate?: Date | null;
  height?: number | null;
  weight?: number | null;
  bmi?: number | null;
  ageGroup?: string | null;
}

/**
 * Neon 家庭 Repository 实现
 */
export class NeonFamilyRepository implements FamilyRepository {
  private readonly loggerPrefix = "[NeonFamilyRepository]";

  // ==================== 家庭 CRUD ====================

  async createFamily(payload: CreateFamilyDTO): Promise<FamilyDTO> {
    const inviteCode = await this.generateUniqueInviteCode();

    const data = await neonAdapter.family.create<FamilyRow>({
      data: {
        name: payload.name,
        description: payload.description || null,
        inviteCode,
        creatorId: payload.creatorId,
      },
    });

    return this.mapFamilyRow(data);
  }

  async getFamilyById(id: string): Promise<FamilyDTO | null> {
    const data = await neonAdapter.family.findFirst<FamilyRow>({
      where: { id, deletedAt: null },
    });

    return data ? this.mapFamilyRow(data) : null;
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<FamilyDTO | null> {
    const data = await neonAdapter.family.findFirst<FamilyRow>({
      where: { inviteCode, deletedAt: null },
    });

    return data ? this.mapFamilyRow(data) : null;
  }

  async listUserFamilies(
    query: FamilyListQuery,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<FamilyWithMembersDTO>> {
    const { userId, includeDeleted = false, includeMembers = true } = query;

    // 查询用户创建的家庭
    const createdFamilies = await neonAdapter.family.findMany<FamilyRow>({
      where: includeDeleted ? { creatorId: userId } : { creatorId: userId, deletedAt: null },
    });

    // 查询用户作为成员加入的家庭
    const memberRecords = await neonAdapter.familyMember.findMany<{
      familyId: string;
    }>({
      where: includeDeleted ? { userId } : { userId, deletedAt: null },
    });

    const memberFamilyIds = memberRecords.map((m) => m.familyId);

    // 获取成员加入的家庭详情
    const memberFamilies: FamilyRow[] = [];
    for (const familyId of memberFamilyIds) {
      const family = await neonAdapter.family.findFirst<FamilyRow>({
        where: includeDeleted ? { id: familyId } : { id: familyId, deletedAt: null },
      });
      if (family) memberFamilies.push(family);
    }

    // 合并并去重
    const familyMap = new Map<string, FamilyWithMembersDTO>();

    const processFamily = async (family: FamilyRow) => {
      if (familyMap.has(family.id)) return;

      let members: FamilyMemberDTO[] = [];
      if (includeMembers) {
        const memberRows = await neonAdapter.familyMember.findMany<FamilyMemberRow>({
          where: includeDeleted
            ? { familyId: family.id }
            : { familyId: family.id, deletedAt: null },
        });
        members = memberRows.map((m) => this.mapFamilyMemberRow(m));
      }

      familyMap.set(family.id, {
        ...this.mapFamilyRow(family),
        members,
        _count: { members: members.length },
      });
    };

    for (const family of createdFamilies) {
      await processFamily(family);
    }
    for (const family of memberFamilies) {
      await processFamily(family);
    }

    const allFamilies = Array.from(familyMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
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
    const updateData: Record<string, unknown> = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;

    const data = await neonAdapter.family.update<FamilyRow>({
      where: { id },
      data: updateData,
    });

    return this.mapFamilyRow(data);
  }

  async softDeleteFamily(id: string): Promise<void> {
    await neonAdapter.family.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==================== 家庭成员管理 ====================

  async addFamilyMember(payload: CreateFamilyMemberDTO): Promise<FamilyMemberDTO> {
    const now = new Date();
    const data = await neonAdapter.familyMember.create<FamilyMemberRow>({
      data: {
        familyId: payload.familyId,
        userId: payload.userId,
        name: payload.name,
        email: payload.email || null,
        avatar: payload.avatar || null,
        role: payload.role || "MEMBER",
        joinedAt: now,
        gender: payload.gender || null,
        birthDate: payload.birthDate || null,
        height: payload.height || null,
        weight: payload.weight || null,
        bmi: payload.bmi || null,
        ageGroup: payload.ageGroup || null,
      },
    });

    return this.mapFamilyMemberRow(data);
  }

  async listFamilyMembers(familyId: string, includeDeleted = false): Promise<FamilyMemberDTO[]> {
    const data = await neonAdapter.familyMember.findMany<FamilyMemberRow>({
      where: includeDeleted ? { familyId } : { familyId, deletedAt: null },
    });

    return data.map((row) => this.mapFamilyMemberRow(row));
  }

  async getFamilyMemberById(id: string): Promise<FamilyMemberDTO | null> {
    const data = await neonAdapter.familyMember.findFirst<FamilyMemberRow>({
      where: { id, deletedAt: null },
    });

    return data ? this.mapFamilyMemberRow(data) : null;
  }

  async updateFamilyMember(id: string, payload: UpdateFamilyMemberDTO): Promise<FamilyMemberDTO> {
    const updateData: Record<string, unknown> = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.avatar !== undefined) updateData.avatar = payload.avatar;
    if (payload.role !== undefined) updateData.role = payload.role;

    const data = await neonAdapter.familyMember.update<FamilyMemberRow>({
      where: { id },
      data: updateData,
    });

    return this.mapFamilyMemberRow(data);
  }

  async removeFamilyMember(id: string): Promise<void> {
    await neonAdapter.familyMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async isUserFamilyMember(familyId: string, userId: string): Promise<boolean> {
    const data = await neonAdapter.familyMember.findFirst<{ id: string }>({
      where: { familyId, userId, deletedAt: null },
    });

    return !!data;
  }

  async getUserFamilyRole(familyId: string, userId: string): Promise<string | null> {
    const data = await neonAdapter.familyMember.findFirst<{ role: string }>({
      where: { familyId, userId, deletedAt: null },
    });

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

      const existing = await neonAdapter.family.findFirst<{ id: string }>({
        where: { inviteCode: code },
      });

      if (!existing) {
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
      inviteCode: row.inviteCode,
      creatorId: row.creatorId,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
      deletedAt: row.deletedAt
        ? row.deletedAt instanceof Date
          ? row.deletedAt
          : new Date(row.deletedAt)
        : undefined,
    };
  }

  /**
   * 映射 FamilyMemberRow -> FamilyMemberDTO
   */
  private mapFamilyMemberRow(row: FamilyMemberRow): FamilyMemberDTO {
    return {
      id: row.id,
      familyId: row.familyId,
      userId: row.userId,
      name: row.name,
      email: row.email || undefined,
      avatar: row.avatar || undefined,
      role: row.role as FamilyMemberDTO["role"],
      joinedAt: row.joinedAt instanceof Date ? row.joinedAt : new Date(row.joinedAt),
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
      deletedAt: row.deletedAt
        ? row.deletedAt instanceof Date
          ? row.deletedAt
          : new Date(row.deletedAt)
        : undefined,
      gender: row.gender ? (row.gender as "MALE" | "FEMALE" | "OTHER") : undefined,
      birthDate: row.birthDate
        ? row.birthDate instanceof Date
          ? row.birthDate
          : new Date(row.birthDate)
        : undefined,
      height: row.height || undefined,
      weight: row.weight || undefined,
      bmi: row.bmi || undefined,
      ageGroup: row.ageGroup
        ? (row.ageGroup as "INFANT" | "CHILD" | "TEEN" | "ADULT" | "SENIOR")
        : undefined,
    };
  }
}
