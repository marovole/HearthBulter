import { prisma } from '@/lib/prisma';
import { FamilyMemberRole } from '@prisma/client';
import { PermissionError, isFamilyCreator, isFamilyAdmin } from '@/lib/permissions';

// 角色管理服务
export class RoleManagementService {
  // 分配角色
  static async assignRole(
    executorId: string,
    familyId: string,
    memberId: string,
    newRole: FamilyMemberRole
  ) {
    try {
      // 验证执行者权限
      const executorIsCreator = await isFamilyCreator(executorId, familyId, prisma);
      const executorIsAdmin = await isFamilyAdmin(executorId, familyId, prisma);

      // 只有家庭创建者可以分配管理员角色
      if (newRole === FamilyMemberRole.ADMIN && !executorIsCreator) {
        throw new PermissionError('Only family creator can assign admin role');
      }

      // 只有管理员或创建者可以分配成员角色
      if (newRole === FamilyMemberRole.MEMBER && !executorIsAdmin && !executorIsCreator) {
        throw new PermissionError('Only family admin or creator can assign member role');
      }

      // 只有管理员或创建者可以分配访客角色
      if (newRole === FamilyMemberRole.GUEST && !executorIsAdmin && !executorIsCreator) {
        throw new PermissionError('Only family admin or creator can assign guest role');
      }

      // 不能修改自己的角色（除非是创建者修改自己的管理员状态）
      if (executorId === memberId && !executorIsCreator) {
        throw new PermissionError('Cannot modify your own role');
      }

      // 不能将创建者降级为非管理员
      const targetMember = await prisma.familyMember.findFirst({
        where: {
          id: memberId,
          familyId,
          deletedAt: null,
        },
        include: {
          family: {
            select: {
              creatorId: true,
            },
          },
        },
      });

      if (!targetMember) {
        throw new Error('Family member not found');
      }

      if (targetMember.family.creatorId === memberId && newRole !== FamilyMemberRole.ADMIN) {
        throw new PermissionError('Cannot demote family creator from admin role');
      }

      // 更新角色
      const updatedMember = await prisma.familyMember.update({
        where: {
          id: memberId,
        },
        data: {
          role: newRole,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return updatedMember;
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }

  // 获取家庭成员列表及其角色
  static async getFamilyMembers(familyId: string, executorId: string) {
    try {
      // 验证执行者是家庭成员
      const executor = await prisma.familyMember.findFirst({
        where: {
          userId: executorId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!executor) {
        throw new PermissionError('Not a family member');
      }

      const members = await prisma.familyMember.findMany({
        where: {
          familyId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 标记创建者
      const family = await prisma.family.findUnique({
        where: {
          id: familyId,
        },
        select: {
          creatorId: true,
        },
      });

      const membersWithCreatorInfo = members.map(member => ({
        ...member,
        isCreator: member.userId === family?.creatorId,
        canBeManaged: this.canManageMember(executor.role, member.role, member.userId === family?.creatorId),
      }));

      return membersWithCreatorInfo;
    } catch (error) {
      console.error('Error getting family members:', error);
      throw error;
    }
  }

  // 检查是否可以管理特定成员
  static canManageMember(
    executorRole: FamilyMemberRole,
    targetRole: FamilyMemberRole,
    targetIsCreator: boolean
  ): boolean {
    // 创建者可以管理任何人
    if (executorRole === FamilyMemberRole.ADMIN) {
      return true;
    }

    // 管理员不能管理创建者
    if (targetIsCreator) {
      return false;
    }

    // 管理员可以管理成员和访客
    if (executorRole === FamilyMemberRole.ADMIN) {
      return targetRole === FamilyMemberRole.MEMBER || targetRole === FamilyMemberRole.GUEST;
    }

    // 成员和访客不能管理其他人
    return false;
  }

  // 移除成员
  static async removeMember(
    executorId: string,
    familyId: string,
    memberId: string
  ) {
    try {
      // 验证执行者权限
      const executorIsCreator = await isFamilyCreator(executorId, familyId, prisma);
      const executorIsAdmin = await isFamilyAdmin(executorId, familyId, prisma);

      if (!executorIsCreator && !executorIsAdmin) {
        throw new PermissionError('Only family admin or creator can remove members');
      }

      // 不能移除自己
      if (executorId === memberId) {
        throw new PermissionError('Cannot remove yourself from family');
      }

      // 获取目标成员信息
      const targetMember = await prisma.familyMember.findFirst({
        where: {
          id: memberId,
          familyId,
          deletedAt: null,
        },
        include: {
          family: {
            select: {
              creatorId: true,
            },
          },
        },
      });

      if (!targetMember) {
        throw new Error('Family member not found');
      }

      // 不能移除创建者
      if (targetMember.family.creatorId === targetMember.userId) {
        throw new PermissionError('Cannot remove family creator');
      }

      // 管理员不能移除其他管理员
      if (!executorIsCreator && targetMember.role === FamilyMemberRole.ADMIN) {
        throw new PermissionError('Admin cannot remove other admins');
      }

      // 软删除成员
      const removedMember = await prisma.familyMember.update({
        where: {
          id: memberId,
        },
        data: {
          deletedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return removedMember;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  // 获取角色统计信息
  static async getRoleStats(familyId: string, executorId: string) {
    try {
      // 验证执行者是家庭成员
      const executor = await prisma.familyMember.findFirst({
        where: {
          userId: executorId,
          familyId,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });

      if (!executor) {
        throw new PermissionError('Not a family member');
      }

      const stats = await prisma.familyMember.groupBy({
        by: ['role'],
        where: {
          familyId,
          deletedAt: null,
        },
        _count: {
          role: true,
        },
      });

      const roleStats = {
        admin: 0,
        member: 0,
        guest: 0,
        total: 0,
      };

      stats.forEach(stat => {
        roleStats[stat.role.toLowerCase() as keyof typeof roleStats] = stat._count.role;
        roleStats.total += stat._count.role;
      });

      return roleStats;
    } catch (error) {
      console.error('Error getting role stats:', error);
      throw error;
    }
  }

  // 检查角色分配限制
  static async checkRoleLimits(
    familyId: string,
    newRole: FamilyMemberRole
  ): Promise<{ canAssign: boolean; reason?: string }> {
    try {
      // 获取当前角色统计
      const currentStats = await prisma.familyMember.groupBy({
        by: ['role'],
        where: {
          familyId,
          deletedAt: null,
        },
        _count: {
          role: true,
        },
      });

      const adminCount = currentStats.find(stat => stat.role === FamilyMemberRole.ADMIN)?._count.role || 0;
      const memberCount = currentStats.find(stat => stat.role === FamilyMemberRole.MEMBER)?._count.role || 0;

      // 检查管理员数量限制（至少需要一个管理员）
      if (newRole !== FamilyMemberRole.ADMIN && adminCount <= 1) {
        return {
          canAssign: false,
          reason: 'Family must have at least one admin',
        };
      }

      // 可以根据需要添加其他限制
      return { canAssign: true };
    } catch (error) {
      console.error('Error checking role limits:', error);
      return { canAssign: false, reason: 'Error checking role limits' };
    }
  }

  // 批量分配角色
  static async batchAssignRoles(
    executorId: string,
    familyId: string,
    assignments: Array<{ memberId: string; role: FamilyMemberRole }>
  ) {
    try {
      const results = [];
      
      for (const assignment of assignments) {
        try {
          const result = await this.assignRole(
            executorId,
            familyId,
            assignment.memberId,
            assignment.role
          );
          results.push({ success: true, memberId: assignment.memberId, data: result });
        } catch (error) {
          results.push({ 
            success: false, 
            memberId: assignment.memberId, 
            error: error instanceof Error ? error.message : 'Unknown error', 
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch role assignment:', error);
      throw error;
    }
  }

  // 获取可执行的操作
  static async getAvailableActions(
    executorId: string,
    familyId: string,
    targetMemberId: string
  ) {
    try {
      const executor = await prisma.familyMember.findFirst({
        where: {
          userId: executorId,
          familyId,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });

      if (!executor) {
        throw new PermissionError('Not a family member');
      }

      const targetMember = await prisma.familyMember.findFirst({
        where: {
          id: targetMemberId,
          familyId,
          deletedAt: null,
        },
        include: {
          family: {
            select: {
              creatorId: true,
            },
          },
        },
      });

      if (!targetMember) {
        throw new Error('Target member not found');
      }

      const executorIsCreator = await isFamilyCreator(executorId, familyId, prisma);
      const executorIsAdmin = await isFamilyAdmin(executorId, familyId, prisma);
      const targetIsCreator = targetMember.family.creatorId === targetMember.userId;
      const isSelf = executorId === targetMember.userId;

      const actions = {
        canChangeRole: false,
        canRemove: false,
        availableRoles: [] as FamilyMemberRole[],
      };

      // 确定是否可以更改角色
      if (!isSelf && executorIsCreator) {
        actions.canChangeRole = true;
        actions.availableRoles = [FamilyMemberRole.ADMIN, FamilyMemberRole.MEMBER, FamilyMemberRole.GUEST];
      } else if (!isSelf && executorIsAdmin && !targetIsCreator) {
        actions.canChangeRole = true;
        actions.availableRoles = [FamilyMemberRole.MEMBER, FamilyMemberRole.GUEST];
      }

      // 确定是否可以移除成员
      if (!isSelf && !targetIsCreator && (executorIsCreator || executorIsAdmin)) {
        if (executorIsCreator || (executorIsAdmin && targetMember.role !== FamilyMemberRole.ADMIN)) {
          actions.canRemove = true;
        }
      }

      return actions;
    } catch (error) {
      console.error('Error getting available actions:', error);
      throw error;
    }
  }
}
