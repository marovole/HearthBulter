/**
 * 家庭 Repository 接口
 *
 * 定义家庭管理系统所需的数据访问契约
 *
 * @module family-repository
 */

import type { PaginatedResult, PaginationInput } from '../types/common';
import type {
  FamilyDTO,
  CreateFamilyDTO,
  UpdateFamilyDTO,
  FamilyMemberDTO,
  CreateFamilyMemberDTO,
  UpdateFamilyMemberDTO,
  FamilyWithMembersDTO,
  FamilyListQuery,
} from '../types/family';

/**
 * 家庭 Repository 接口
 *
 * 提供家庭和家庭成员的 CRUD 操作
 */
export interface FamilyRepository {
  // ==================== 家庭 CRUD ====================

  /**
   * 创建家庭
   *
   * 自动生成唯一邀请码
   *
   * @param payload - 家庭创建参数
   * @returns 创建的家庭对象
   */
  createFamily(payload: CreateFamilyDTO): Promise<FamilyDTO>;

  /**
   * 获取家庭详情
   *
   * @param id - 家庭ID
   * @returns 家庭对象，不存在时返回 null
   */
  getFamilyById(id: string): Promise<FamilyDTO | null>;

  /**
   * 通过邀请码获取家庭
   *
   * @param inviteCode - 邀请码
   * @returns 家庭对象，不存在时返回 null
   */
  getFamilyByInviteCode(inviteCode: string): Promise<FamilyDTO | null>;

  /**
   * 获取用户所属的家庭列表
   *
   * 包括用户创建的和加入的家庭
   *
   * @param query - 查询参数
   * @param pagination - 分页参数
   * @returns 分页的家庭列表
   */
  listUserFamilies(
    query: FamilyListQuery,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<FamilyWithMembersDTO>>;

  /**
   * 更新家庭信息
   *
   * @param id - 家庭ID
   * @param payload - 更新参数
   * @returns 更新后的家庭对象
   */
  updateFamily(id: string, payload: UpdateFamilyDTO): Promise<FamilyDTO>;

  /**
   * 软删除家庭
   *
   * @param id - 家庭ID
   */
  softDeleteFamily(id: string): Promise<void>;

  // ==================== 家庭成员管理 ====================

  /**
   * 添加家庭成员
   *
   * @param payload - 成员创建参数
   * @returns 创建的成员对象
   */
  addFamilyMember(payload: CreateFamilyMemberDTO): Promise<FamilyMemberDTO>;

  /**
   * 获取家庭成员列表
   *
   * @param familyId - 家庭ID
   * @param includeDeleted - 是否包含已删除成员
   * @returns 成员列表
   */
  listFamilyMembers(
    familyId: string,
    includeDeleted?: boolean,
  ): Promise<FamilyMemberDTO[]>;

  /**
   * 获取家庭成员详情
   *
   * @param id - 成员ID
   * @returns 成员对象，不存在时返回 null
   */
  getFamilyMemberById(id: string): Promise<FamilyMemberDTO | null>;

  /**
   * 更新家庭成员信息
   *
   * @param id - 成员ID
   * @param payload - 更新参数
   * @returns 更新后的成员对象
   */
  updateFamilyMember(
    id: string,
    payload: UpdateFamilyMemberDTO,
  ): Promise<FamilyMemberDTO>;

  /**
   * 移除家庭成员（软删除）
   *
   * @param id - 成员ID
   */
  removeFamilyMember(id: string): Promise<void>;

  /**
   * 检查用户是否是家庭成员
   *
   * @param familyId - 家庭ID
   * @param userId - 用户ID
   * @returns 是否是成员
   */
  isUserFamilyMember(familyId: string, userId: string): Promise<boolean>;

  /**
   * 获取用户在家庭中的角色
   *
   * @param familyId - 家庭ID
   * @param userId - 用户ID
   * @returns 角色，如果不是成员则返回 null
   */
  getUserFamilyRole(familyId: string, userId: string): Promise<string | null>;
}
