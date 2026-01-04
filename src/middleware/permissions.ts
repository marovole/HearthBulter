import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  Permission,
  hasPermission,
  getUserFamilyRole,
  PermissionError,
} from '@/lib/permissions';
import { FamilyMemberRole } from '@prisma/client';
import { prisma } from '@/lib/db';

// 权限中间件配置
export interface PermissionMiddlewareConfig {
  requiredPermission?: Permission;
  requireFamilyMember?: boolean;
  requireFamilyAdmin?: boolean;
  requireFamilyCreator?: boolean;
  allowSelf?: boolean; // 允许用户操作自己的资源
}

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  familyMember?: {
    id: string;
    familyId: string;
    role: FamilyMemberRole;
  };
}

// 权限中间件函数
export async function withPermissions(
  request: AuthenticatedRequest,
  config: PermissionMiddlewareConfig,
): Promise<{ success: boolean; response?: NextResponse; error?: string }> {
  try {
    // 1. 验证用户身份
    const token = await getToken({ req: request });
    if (!token || !token.sub) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }

    const userId = token.sub as string;
    request.user = {
      id: userId,
      email: token.email as string,
      role: token.role as string,
    };

    // 2. 如果需要家庭成员身份，验证家庭成员关系
    if (
      config.requireFamilyMember ||
      config.requireFamilyAdmin ||
      config.requireFamilyCreator
    ) {
      const familyId =
        request.nextUrl.searchParams.get('familyId') ||
        request.headers.get('x-family-id');

      if (!familyId) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Family ID is required' },
            { status: 400 },
          ),
        };
      }

      const memberRole = await getUserFamilyRole(userId, familyId, prisma);
      if (!memberRole) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Not a family member' },
            { status: 403 },
          ),
        };
      }

      request.familyMember = {
        id: '', // 需要从数据库获取实际的member ID
        familyId,
        role: memberRole,
      };

      // 3. 检查家庭管理员权限
      if (config.requireFamilyAdmin && memberRole !== FamilyMemberRole.ADMIN) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Family admin access required' },
            { status: 403 },
          ),
        };
      }

      // 4. 检查家庭创建者权限
      if (config.requireFamilyCreator) {
        const family = await prisma.family.findFirst({
          where: {
            id: familyId,
            creatorId: userId,
            deletedAt: null,
          },
        });

        if (!family) {
          return {
            success: false,
            response: NextResponse.json(
              { error: 'Family creator access required' },
              { status: 403 },
            ),
          };
        }
      }
    }

    // 5. 检查具体权限
    if (config.requiredPermission) {
      const familyId =
        request.nextUrl.searchParams.get('familyId') ||
        request.headers.get('x-family-id');

      if (!familyId && config.requireFamilyMember) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Family ID is required for permission check' },
            { status: 400 },
          ),
        };
      }

      const memberRole = request.familyMember?.role || FamilyMemberRole.GUEST;

      // 如果需要检查资源所有权
      let resourceOwnerId: string | undefined;
      if (config.allowSelf) {
        // 从请求中获取资源所有者ID（具体实现取决于API端点）
        resourceOwnerId =
          request.headers.get('x-resource-owner-id') || undefined;
      }

      const hasRequiredPermission = hasPermission(
        memberRole,
        config.requiredPermission,
        resourceOwnerId,
        userId,
      );

      if (!hasRequiredPermission) {
        return {
          success: false,
          response: NextResponse.json(
            {
              error: 'Insufficient permissions',
              required: config.requiredPermission,
              userRole: memberRole,
            },
            { status: 403 },
          ),
        };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Permission middleware error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      ),
    };
  }
}

// 权限检查装饰器工厂
export function createPermissionHandler(config: PermissionMiddlewareConfig) {
  return async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const result = await withPermissions(request, config);

    if (!result.success) {
      return result.response!;
    }

    // 权限检查通过，继续处理请求
    // 这里会在具体的API路由中实现
    return NextResponse.json({ message: 'Permission check passed' });
  };
}

// 常用权限配置
export const PERMISSION_CONFIGS = {
  // 需要家庭成员身份
  FAMILY_MEMBER: {
    requireFamilyMember: true,
  } as PermissionMiddlewareConfig,

  // 需要家庭管理员身份
  FAMILY_ADMIN: {
    requireFamilyMember: true,
    requireFamilyAdmin: true,
  } as PermissionMiddlewareConfig,

  // 需要家庭创建者身份
  FAMILY_CREATOR: {
    requireFamilyMember: true,
    requireFamilyCreator: true,
  } as PermissionMiddlewareConfig,

  // 创建任务
  CREATE_TASK: {
    requireFamilyMember: true,
    requiredPermission: Permission.CREATE_TASK,
  } as PermissionMiddlewareConfig,

  // 更新任务（可以更新自己的任务）
  UPDATE_TASK: {
    requireFamilyMember: true,
    requiredPermission: Permission.UPDATE_TASK,
    allowSelf: true,
  } as PermissionMiddlewareConfig,

  // 删除任务（只能删除自己的任务，管理员可以删除任何任务）
  DELETE_TASK: {
    requireFamilyMember: true,
    requiredPermission: Permission.DELETE_TASK,
    allowSelf: true,
  } as PermissionMiddlewareConfig,

  // 分配任务（需要管理员权限）
  ASSIGN_TASK: {
    requireFamilyMember: true,
    requiredPermission: Permission.ASSIGN_TASK,
  } as PermissionMiddlewareConfig,

  // 创建购物项
  CREATE_SHOPPING_ITEM: {
    requireFamilyMember: true,
    requiredPermission: Permission.CREATE_SHOPPING_ITEM,
  } as PermissionMiddlewareConfig,

  // 分配购物项
  ASSIGN_SHOPPING_ITEM: {
    requireFamilyMember: true,
    requiredPermission: Permission.ASSIGN_SHOPPING_ITEM,
  } as PermissionMiddlewareConfig,

  // 购买购物项
  PURCHASE_SHOPPING_ITEM: {
    requireFamilyMember: true,
    requiredPermission: Permission.PURCHASE_SHOPPING_ITEM,
  } as PermissionMiddlewareConfig,

  // 管理家庭成员
  MANAGE_MEMBERS: {
    requireFamilyMember: true,
    requiredPermission: Permission.MANAGE_MEMBERS,
  } as PermissionMiddlewareConfig,

  // 邀请成员
  INVITE_MEMBERS: {
    requireFamilyMember: true,
    requiredPermission: Permission.INVITE_MEMBERS,
  } as PermissionMiddlewareConfig,

  // 移除成员
  REMOVE_MEMBERS: {
    requireFamilyMember: true,
    requiredPermission: Permission.REMOVE_MEMBERS,
  } as PermissionMiddlewareConfig,
};

// API路由权限检查包装器
export function withApiPermissions(
  handler: (
    request: AuthenticatedRequest,
    context?: any,
  ) => Promise<NextResponse>,
  config: PermissionMiddlewareConfig,
) {
  return async (
    request: AuthenticatedRequest,
    context?: any,
  ): Promise<NextResponse> => {
    const result = await withPermissions(request, config);

    if (!result.success) {
      return result.response!;
    }

    // 权限检查通过，执行原始处理器
    return handler(request, context);
  };
}

// 客户端权限检查（用于React组件）
export function useClientPermissions() {
  // 这里会返回客户端权限检查的hooks
  // 实际实现会在React组件中使用
  return {
    canCreateTask: (userRole: FamilyMemberRole) =>
      hasPermission(userRole, Permission.CREATE_TASK),
    canUpdateTask: (userRole: FamilyMemberRole, isOwner: boolean) =>
      hasPermission(
        userRole,
        Permission.UPDATE_TASK,
        isOwner ? 'owner' : undefined,
      ),
    canDeleteTask: (userRole: FamilyMemberRole, isOwner: boolean) =>
      hasPermission(
        userRole,
        Permission.DELETE_TASK,
        isOwner ? 'owner' : undefined,
      ),
    canAssignTask: (userRole: FamilyMemberRole) =>
      hasPermission(userRole, Permission.ASSIGN_TASK),
    canManageFamily: (userRole: FamilyMemberRole) =>
      hasPermission(userRole, Permission.MANAGE_FAMILY),
    canInviteMembers: (userRole: FamilyMemberRole) =>
      hasPermission(userRole, Permission.INVITE_MEMBERS),
    canRemoveMembers: (userRole: FamilyMemberRole) =>
      hasPermission(userRole, Permission.REMOVE_MEMBERS),
  };
}
