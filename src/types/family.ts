/**
 * 家庭和成员相关的类型定义
 */

/**
 * 家庭成员角色
 */
export type FamilyMemberRole = "ADMIN" | "MEMBER";

/**
 * 性别类型
 */
export type Gender = "MALE" | "FEMALE" | "OTHER";

/**
 * API 返回的原始家庭成员数据结构
 */
export interface RawFamilyMember {
  id: string;
  name: string;
  gender: Gender;
  birthDate: Date | string;
  height?: number | null;
  weight?: number | null;
  avatar?: string | null;
  bmi?: number | null;
  ageGroup?: string | null;
  familyId: string;
  userId?: string | null;
  role: FamilyMemberRole;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

/**
 * UI 组件使用的家庭成员数据结构
 */
export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  email?: string;
  healthScore?: number;
  lastActive?: Date;
}

/**
 * API 返回的家庭数据结构
 */
export interface RawFamily {
  id: string;
  name: string;
  description?: string | null;
  inviteCode?: string;
  creatorId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  members?: RawFamilyMember[];
  _count?: {
    members: number;
  };
}
