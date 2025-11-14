/**
 * 家庭域 DTO 类型定义
 *
 * 本模块定义家庭管理系统相关的数据传输对象
 *
 * @module family
 */

import { z } from 'zod';

/**
 * 家庭成员角色枚举
 */
export const familyMemberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']);
export type FamilyMemberRole = z.infer<typeof familyMemberRoleSchema>;

/**
 * 家庭 DTO
 */
export const familySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().optional().nullable(),
  inviteCode: z.string().length(8),
  creatorId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable(),
});

export type FamilyDTO = z.infer<typeof familySchema>;

/**
 * 创建家庭 DTO
 */
export const createFamilySchema = familySchema.omit({
  id: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateFamilyDTO = z.infer<typeof createFamilySchema>;

/**
 * 更新家庭 DTO
 */
export const updateFamilySchema = createFamilySchema.partial();

export type UpdateFamilyDTO = z.infer<typeof updateFamilySchema>;

/**
 * 性别枚举
 */
export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);
export type Gender = z.infer<typeof genderSchema>;

/**
 * 年龄段枚举
 */
export const ageGroupSchema = z.enum(['INFANT', 'CHILD', 'TEEN', 'ADULT', 'SENIOR']);
export type AgeGroup = z.infer<typeof ageGroupSchema>;

/**
 * 用户信息（嵌套对象）
 */
export const userInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

export type UserInfo = z.infer<typeof userInfoSchema>;

/**
 * 家庭成员 DTO
 */
export const familyMemberSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  role: familyMemberRoleSchema.default('MEMBER'),
  joinedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable(),
  // 扩展字段（可选）
  gender: genderSchema.optional().nullable(),
  birthDate: z.coerce.date().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  bmi: z.number().optional().nullable(),
  ageGroup: ageGroupSchema.optional().nullable(),
  // 关联用户信息（可选，用于保持 API 兼容性）
  user: userInfoSchema.optional().nullable(),
});

export type FamilyMemberDTO = z.infer<typeof familyMemberSchema>;

/**
 * 创建家庭成员 DTO
 */
export const createFamilyMemberSchema = familyMemberSchema.omit({
  id: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  // userId 可选，允许创建不关联系统用户的成员（如儿童档案）
  userId: z.string().uuid().optional(),
  gender: genderSchema.optional(),
  birthDate: z.coerce.date().optional(),
});

export type CreateFamilyMemberDTO = z.infer<typeof createFamilyMemberSchema>;

/**
 * 更新家庭成员 DTO
 */
export const updateFamilyMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional().nullable(),
  role: familyMemberRoleSchema.optional(),
});

export type UpdateFamilyMemberDTO = z.infer<typeof updateFamilyMemberSchema>;

/**
 * 家庭（含成员列表）DTO
 */
export const familyWithMembersSchema = familySchema.extend({
  members: z.array(familyMemberSchema).default([]),
  _count: z.object({
    members: z.number().int().nonnegative(),
  }).optional(),
});

export type FamilyWithMembersDTO = z.infer<typeof familyWithMembersSchema>;

/**
 * 家庭列表查询参数
 */
export const familyListQuerySchema = z.object({
  userId: z.string().uuid(),
  includeDeleted: z.boolean().default(false).optional(),
  includeMembers: z.boolean().default(true).optional(),
});

export type FamilyListQuery = z.infer<typeof familyListQuerySchema>;
