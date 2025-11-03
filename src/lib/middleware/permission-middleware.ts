/**
 * 权限验证中间件
 * 提供基于角色的访问控制(RBAC)和细粒度权限检查
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Permission, FamilyMemberRole, hasPermission } from '@/lib/permissions';
import { APIError, createErrorResponse } from '@/lib/errors/api-error';
import { logger } from '@/lib/logger';

export interface PermissionRequirement {
  permissions: Permission[]
  requireOwnership?: boolean
  requireFamilyMembership?: boolean
  customValidator?: (context: PermissionContext) => Promise<boolean>
}

export interface PermissionContext {
  userId: string
  familyId?: string
  memberId?: string
  userRole?: FamilyMemberRole
  resourceOwnerId?: string
  request: NextRequest
  params?: Record<string, string>
}

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  context: PermissionContext
}

/**
 * 权限验证中间件类
 */
export class PermissionMiddleware {
  private static instance: PermissionMiddleware;
  private permissionCache = new Map<string, { role: FamilyMemberRole; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): PermissionMiddleware {
    if (!PermissionMiddleware.instance) {
      PermissionMiddleware.instance = new PermissionMiddleware();
    }
    return PermissionMiddleware.instance;
  }

  /**
   * 验证用户权限
   */
  async checkPermissions(
    request: NextRequest,
    requirements: PermissionRequirement[],
    context?: {
      familyId?: string
      memberId?: string
      resourceOwnerId?: string
      params?: Record<string, string>
    }
  ): Promise<PermissionCheckResult> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // 1. 获取用户会话
      const session = await auth();
      if (!session?.user?.id) {
        return {
          allowed: false,
          reason: '未授权访问',
          context: { userId: '', request },
        };
      }

      const userId = session.user.id;

      // 2. 获取用户权限上下文
      const permissionContext = await this.buildPermissionContext(
        request,
        userId,
        context
      );

      // 3. 检查家庭成员权限（如果需要）
      if (requirements.some(req => req.requireFamilyMembership)) {
        if (!permissionContext.familyId) {
          return {
            allowed: false,
            reason: '需要指定家庭ID',
            context: permissionContext,
          };
        }

        if (!permissionContext.memberId) {
          return {
            allowed: false,
            reason: '不是该家庭成员',
            context: permissionContext,
          };
        }
      }

      // 4. 检查权限要求
      for (const requirement of requirements) {
        const checkResult = await this.checkRequirement(
          permissionContext,
          requirement
        );

        if (!checkResult) {
          return {
            allowed: false,
            reason: `权限不足，需要权限: ${requirement.permissions.join(', ')}`,
            context: permissionContext,
          };
        }
      }

      // 5. 检查自定义验证器
      for (const requirement of requirements) {
        if (requirement.customValidator) {
          const customResult = await requirement.customValidator(permissionContext);
          if (!customResult) {
            return {
              allowed: false,
              reason: '自定义权限验证失败',
              context: permissionContext,
            };
          }
        }
      }

      const duration = Date.now() - startTime;

      logger.info('权限验证通过', {
        requestId,
        userId,
        familyId: permissionContext.familyId,
        role: permissionContext.userRole,
        duration,
        permissions: requirements.flatMap(req => req.permissions),
      });

      return {
        allowed: true,
        context: permissionContext,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('权限验证异常', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        allowed: false,
        reason: '权限验证过程中发生错误',
        context: { userId: '', request },
      };
    }
  }

  /**
   * 构建权限上下文
   */
  private async buildPermissionContext(
    request: NextRequest,
    userId: string,
    context?: {
      familyId?: string
      memberId?: string
      resourceOwnerId?: string
      params?: Record<string, string>
    }
  ): Promise<PermissionContext> {
    const permissionContext: PermissionContext = {
      userId,
      request,
      params: context?.params,
    };

    // 获取家庭ID
    if (context?.familyId) {
      permissionContext.familyId = context.familyId;
    } else if (context?.params?.familyId) {
      permissionContext.familyId = context.params.familyId;
    }

    // 获取成员ID
    if (context?.memberId) {
      permissionContext.memberId = context.memberId;
    } else if (context?.params?.memberId) {
      permissionContext.memberId = context.params.memberId;
    }

    // 获取资源所有者ID
    permissionContext.resourceOwnerId = context?.resourceOwnerId;

    // 获取用户角色（带缓存）
    if (permissionContext.familyId) {
      permissionContext.userRole = await this.getUserRole(
        userId,
        permissionContext.familyId
      );
    }

    return permissionContext;
  }

  /**
   * 获取用户角色（带缓存）
   */
  private async getUserRole(
    userId: string,
    familyId: string
  ): Promise<FamilyMemberRole | null> {
    const cacheKey = `${userId}:${familyId}`;
    const cached = this.permissionCache.get(cacheKey);

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.role;
    }

    // 从数据库获取
    try {
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });

      const role = member?.role || null;

      // 更新缓存
      this.permissionCache.set(cacheKey, {
        role: role!,
        timestamp: Date.now(),
      });

      // 清理过期缓存
      this.cleanExpiredCache();

      return role;
    } catch (error) {
      logger.error('获取用户角色失败', { userId, familyId, error });
      return null;
    }
  }

  /**
   * 检查权限要求
   */
  private async checkRequirement(
    context: PermissionContext,
    requirement: PermissionRequirement
  ): Promise<boolean> {
    // 检查角色权限
    if (!context.userRole) {
      return false;
    }

    // 检查每个权限
    for (const permission of requirement.permissions) {
      const hasPermit = hasPermission(
        context.userRole,
        permission,
        context.resourceOwnerId,
        context.userId
      );

      if (!hasPermit) {
        return false;
      }
    }

    return true;
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.permissionCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 清空权限缓存
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * 失效特定用户的权限缓存
   */
  invalidateUserCache(userId: string, familyId?: string): void {
    if (familyId) {
      this.permissionCache.delete(`${userId}:${familyId}`);
    } else {
      // 失效该用户的所有缓存
      for (const [key] of this.permissionCache.entries()) {
        if (key.startsWith(`${userId}:`)) {
          this.permissionCache.delete(key);
        }
      }
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.permissionCache.size,
      timeout: this.cacheTimeout,
    };
  }
}

// 导出单例实例
export const permissionMiddleware = PermissionMiddleware.getInstance();

// 导出便捷方法
export const requirePermissions = (permissions: Permission[]) => ({
  permissions,
  requireFamilyMembership: true,
});

export const requireOwnership = (permissions: Permission[]) => ({
  permissions,
  requireOwnership: true,
  requireFamilyMembership: true,
});

export const requireAnyPermission = (permissions: Permission[]) => ({
  permissions,
  requireFamilyMembership: true,
  customValidator: async (context: PermissionContext) => {
    if (!context.userRole) return false;
    
    return permissions.some(permission => 
      hasPermission(
        context.userRole!,
        permission,
        context.resourceOwnerId,
        context.userId
      )
    );
  },
});

// 创建权限验证高阶函数
export function withPermissions(
  requirements: PermissionRequirement[],
  handler: (
    request: NextRequest,
    context: PermissionContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const result = await permissionMiddleware.checkPermissions(
      request,
      requirements,
      {
        params: context?.params,
      }
    );

    if (!result.allowed) {
      const error = APIError.forbidden(result.reason || '权限不足');
      return createErrorResponse(error);
    }

    return handler(request, result.context);
  };
}

// 快捷权限装饰器
export const withAdminPermission = (handler: Function) =>
  withPermissions(requirePermissions([Permission.MANAGE_FAMILY]), handler);

export const withMemberPermission = (handler: Function) =>
  withPermissions(requirePermissions([Permission.VIEW_FAMILY_DATA]), handler);

export const withTaskPermission = (action: 'create' | 'read' | 'update' | 'delete') => 
  (handler: Function) => {
    const permissions = {
      create: [Permission.CREATE_TASK],
      read: [Permission.READ_TASK],
      update: [Permission.UPDATE_TASK],
      delete: [Permission.DELETE_TASK],
    };
    
    return withPermissions(requirePermissions(permissions[action]!), handler);
  };

export const withOwnershipPermission = (
  permissions: Permission[],
  resourceOwnerId: string
) => (handler: Function) =>
  withPermissions([
    {
      permissions,
      requireOwnership: true,
      requireFamilyMembership: true,
      customValidator: async (context: PermissionContext) => {
        return context.resourceOwnerId === resourceOwnerId ||
               context.userRole === FamilyMemberRole.ADMIN;
      },
    },
  ], handler);
