/**
 * 权限检查辅助函数
 */

import { prisma } from '@/lib/db';

/**
 * 验证用户是否有权访问指定家庭
 * @param familyId 家庭 ID
 * @param userId 用户 ID
 * @returns 如果有权访问返回家庭对象，否则返回 null
 */
export async function verifyFamilyAccess(familyId: string, userId: string) {
  const family = await prisma.family.findFirst({
    where: {
      id: familyId,
      deletedAt: null,
      OR: [
        { creatorId: userId },
        {
          members: {
            some: {
              userId: userId,
              deletedAt: null,
            },
          },
        },
      ],
    },
  });

  return family;
}

/**
 * 验证用户是否有家庭管理权限（创建者或管理员成员）
 * @param familyId 家庭 ID
 * @param userId 用户 ID
 * @returns 如果有管理权限返回家庭对象，否则返回 null
 */
export async function verifyFamilyAdmin(familyId: string, userId: string) {
  const family = await prisma.family.findFirst({
    where: {
      id: familyId,
      deletedAt: null,
      OR: [
        { creatorId: userId },
        {
          members: {
            some: {
              userId: userId,
              role: 'ADMIN',
              deletedAt: null,
            },
          },
        },
      ],
    },
  });

  return family;
}
