/**
 * 权限检查辅助函数
 *
 * 已迁移到使用 FamilyRepository（支持双写框架）
 */

import { familyRepository } from '@/lib/repositories/family-repository-singleton';

/**
 * 验证用户是否有权访问指定家庭
 *
 * 使用 FamilyRepository 进行权限检查，支持双写验证
 *
 * @param familyId 家庭 ID
 * @param userId 用户 ID
 * @returns 如果有权访问返回家庭对象，否则返回 null
 */
export async function verifyFamilyAccess(familyId: string, userId: string) {
  try {
    // 先检查家庭是否存在
    const family = await familyRepository.getFamilyById(familyId);

    if (!family) {
      return null;
    }

    // 检查用户是否是创建者或成员
    if (family.creatorId === userId) {
      return family;
    }

    const isMember = await familyRepository.isUserFamilyMember(
      familyId,
      userId,
    );

    return isMember ? family : null;
  } catch (error) {
    console.error('Failed to verify family access:', error);
    throw error;
  }
}

/**
 * 验证用户是否有家庭管理权限（创建者或管理员成员）
 *
 * 使用 FamilyRepository 进行权限检查，支持双写验证
 *
 * @param familyId 家庭 ID
 * @param userId 用户 ID
 * @returns 如果有管理权限返回家庭对象，否则返回 null
 */
export async function verifyFamilyAdmin(familyId: string, userId: string) {
  try {
    // 先检查家庭是否存在
    const family = await familyRepository.getFamilyById(familyId);

    if (!family) {
      return null;
    }

    // 检查用户是否是创建者
    if (family.creatorId === userId) {
      return family;
    }

    // 检查用户角色是否是 ADMIN
    const role = await familyRepository.getUserFamilyRole(familyId, userId);

    return role === 'ADMIN' ? family : null;
  } catch (error) {
    console.error('Failed to verify family admin permission:', error);
    throw error;
  }
}
