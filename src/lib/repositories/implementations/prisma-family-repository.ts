/**
 * Prisma 家庭 Repository 占位实现
 *
 * 所有方法暂未实现,仅用于双写迁移期间占位
 *
 * @module prisma-family-repository
 */

import type { PrismaClient } from "@prisma/client";
import type { PaginatedResult, PaginationInput } from "../types/common";
import type {
  CreateFamilyDTO,
  CreateFamilyMemberDTO,
  FamilyDTO,
  FamilyListQuery,
  FamilyMemberDTO,
  FamilyWithMembersDTO,
  UpdateFamilyDTO,
  UpdateFamilyMemberDTO,
} from "../types/family";
import type { FamilyRepository } from "../interfaces/family-repository";

/**
 * Prisma 家庭 Repository 占位实现
 *
 * 当前仅抛出未实现错误,后续将填充 Prisma 客户端逻辑
 */
export class PrismaFamilyRepository implements FamilyRepository {
  private readonly client: PrismaClient;

  constructor(client: PrismaClient) {
    this.client = client;
  }

  /**
   * 创建家庭
   *
   * 自动生成唯一邀请码
   *
   * @param payload - 家庭创建参数
   * @returns 创建的家庭对象
   */
  async createFamily(payload: CreateFamilyDTO): Promise<FamilyDTO> {
    return this.notImplemented("createFamily");
  }

  /**
   * 获取家庭详情
   *
   * @param id - 家庭ID
   * @returns 家庭对象,不存在时返回 null
   */
  async getFamilyById(id: string): Promise<FamilyDTO | null> {
    return this.notImplemented("getFamilyById");
  }

  /**
   * 通过邀请码获取家庭
   *
   * @param inviteCode - 邀请码
   * @returns 家庭对象,不存在时返回 null
   */
  async getFamilyByInviteCode(inviteCode: string): Promise<FamilyDTO | null> {
    return this.notImplemented("getFamilyByInviteCode");
  }

  /**
   * 获取用户所属的家庭列表
   *
   * 包括用户创建的和加入的家庭
   *
   * @param query - 查询参数
   * @param pagination - 分页参数
   * @returns 分页的家庭列表
   */
  async listUserFamilies(
    query: FamilyListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<FamilyWithMembersDTO>> {
    return this.notImplemented("listUserFamilies");
  }

  /**
   * 更新家庭信息
   *
   * @param id - 家庭ID
   * @param payload - 更新参数
   * @returns 更新后的家庭对象
   */
  async updateFamily(id: string, payload: UpdateFamilyDTO): Promise<FamilyDTO> {
    return this.notImplemented("updateFamily");
  }

  /**
   * 软删除家庭
   *
   * @param id - 家庭ID
   */
  async softDeleteFamily(id: string): Promise<void> {
    return this.notImplemented("softDeleteFamily");
  }

  /**
   * 添加家庭成员
   *
   * @param payload - 成员创建参数
   * @returns 创建的成员对象
   */
  async addFamilyMember(
    payload: CreateFamilyMemberDTO,
  ): Promise<FamilyMemberDTO> {
    return this.notImplemented("addFamilyMember");
  }

  /**
   * 获取家庭成员列表
   *
   * @param familyId - 家庭ID
   * @param includeDeleted - 是否包含已删除成员
   * @returns 成员列表
   */
  async listFamilyMembers(
    familyId: string,
    includeDeleted?: boolean,
  ): Promise<FamilyMemberDTO[]> {
    return this.notImplemented("listFamilyMembers");
  }

  /**
   * 获取家庭成员详情
   *
   * @param id - 成员ID
   * @returns 成员对象,不存在时返回 null
   */
  async getFamilyMemberById(id: string): Promise<FamilyMemberDTO | null> {
    return this.notImplemented("getFamilyMemberById");
  }

  /**
   * 更新家庭成员信息
   *
   * @param id - 成员ID
   * @param payload - 更新参数
   * @returns 更新后的成员对象
   */
  async updateFamilyMember(
    id: string,
    payload: UpdateFamilyMemberDTO,
  ): Promise<FamilyMemberDTO> {
    return this.notImplemented("updateFamilyMember");
  }

  /**
   * 移除家庭成员（软删除）
   *
   * @param id - 成员ID
   */
  async removeFamilyMember(id: string): Promise<void> {
    return this.notImplemented("removeFamilyMember");
  }

  /**
   * 检查用户是否是家庭成员
   *
   * @param familyId - 家庭ID
   * @param userId - 用户ID
   * @returns 是否是成员
   */
  async isUserFamilyMember(familyId: string, userId: string): Promise<boolean> {
    return this.notImplemented("isUserFamilyMember");
  }

  /**
   * 获取用户在家庭中的角色
   *
   * @param familyId - 家庭ID
   * @param userId - 用户ID
   * @returns 角色,如果不是成员则返回 null
   */
  async getUserFamilyRole(
    familyId: string,
    userId: string,
  ): Promise<string | null> {
    return this.notImplemented("getUserFamilyRole");
  }

  /**
   * 抛出未实现错误
   */
  private notImplemented(methodName: string): never {
    void this.client;
    throw new Error(`PrismaFamilyRepository.${methodName} not implemented`);
  }
}
