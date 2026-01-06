/**
 * 授权检查中间件
 * 提供统一的 API 授权验证函数
 */

import { auth } from "@/lib/auth";
import { supabaseAdapter } from "@/lib/db/supabase-adapter";
import { logger } from "@/lib/logger";

export interface AuthorizationResult {
  authorized: boolean;
  userId?: string;
  reason?: string;
}

/**
 * 验证用户是否为指定家庭成员的所有者或有权访问
 * @param userId 当前用户 ID
 * @param memberId 家庭成员 ID
 */
export async function requireFamilyMembership(
  userId: string,
  memberId: string,
): Promise<AuthorizationResult> {
  try {
    const member = await supabaseAdapter.familyMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        userId: true,
        familyId: true,
        deletedAt: true,
      },
    });

    if (!member) {
      return {
        authorized: false,
        userId,
        reason: "家庭成员不存在",
      };
    }

    if (member.deletedAt) {
      return {
        authorized: false,
        userId,
        reason: "家庭成员已被删除",
      };
    }

    // 检查是否为成员本人
    if (member.userId === userId) {
      return { authorized: true, userId };
    }

    // 检查是否为同一家庭成员
    const userMembership = await supabaseAdapter.familyMember.findFirst({
      where: {
        userId,
        familyId: member.familyId,
        deletedAt: null,
      },
    });

    if (userMembership) {
      return { authorized: true, userId };
    }

    return {
      authorized: false,
      userId,
      reason: "无权访问此家庭成员数据",
    };
  } catch (error) {
    logger.error("检查家庭成员权限失败", { userId, memberId, error });
    return {
      authorized: false,
      userId,
      reason: "权限验证过程中发生错误",
    };
  }
}

/**
 * 验证用户是否为管理员
 * @param userId 用户 ID
 */
export async function requireAdmin(
  userId: string,
): Promise<AuthorizationResult> {
  try {
    const user = await supabaseAdapter.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return {
        authorized: false,
        userId,
        reason: "用户不存在",
      };
    }

    if (user.role !== "ADMIN") {
      return {
        authorized: false,
        userId,
        reason: "需要管理员权限",
      };
    }

    return { authorized: true, userId };
  } catch (error) {
    logger.error("检查管理员权限失败", { userId, error });
    return {
      authorized: false,
      userId,
      reason: "权限验证过程中发生错误",
    };
  }
}

export type ResourceType =
  | "inventory_item"
  | "health_report"
  | "meal_plan"
  | "recipe"
  | "notification"
  | "budget"
  | "health_goal"
  | "medical_report"
  | "ai_conversation";

/**
 * 验证用户是否拥有指定资源的所有权
 * @param userId 用户 ID
 * @param resourceType 资源类型
 * @param resourceId 资源 ID
 */
export async function requireOwnership(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
): Promise<AuthorizationResult> {
  try {
    let resource: {
      userId?: string;
      memberId?: string;
      familyId?: string;
    } | null = null;

    switch (resourceType) {
      case "inventory_item":
        resource = await supabaseAdapter.inventoryItem.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      case "health_report":
        resource = await supabaseAdapter.healthReport.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      case "meal_plan":
        resource = await supabaseAdapter.mealPlan.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      case "recipe":
        resource = await supabaseAdapter.recipe.findUnique({
          where: { id: resourceId },
          select: { creatorId: true },
        });
        if (resource && "creatorId" in resource) {
          if (resource.creatorId === userId) {
            return { authorized: true, userId };
          }
          return {
            authorized: false,
            userId,
            reason: "无权访问此食谱",
          };
        }
        break;

      case "notification":
        resource = await supabaseAdapter.notification.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      case "budget":
        resource = await supabaseAdapter.budget.findUnique({
          where: { id: resourceId },
          select: { familyId: true },
        });
        if (resource?.familyId) {
          const membership = await supabaseAdapter.familyMember.findFirst({
            where: {
              userId,
              familyId: resource.familyId,
              deletedAt: null,
            },
          });
          if (membership) {
            return { authorized: true, userId };
          }
          return {
            authorized: false,
            userId,
            reason: "无权访问此预算",
          };
        }
        break;

      case "health_goal":
        resource = await supabaseAdapter.healthGoal.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      case "medical_report":
        resource = await supabaseAdapter.medicalReport.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      case "ai_conversation":
        resource = await supabaseAdapter.aiConversation.findUnique({
          where: { id: resourceId },
          select: { memberId: true },
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;

      default:
        return {
          authorized: false,
          userId,
          reason: `不支持的资源类型: ${resourceType}`,
        };
    }

    if (!resource) {
      return {
        authorized: false,
        userId,
        reason: "资源不存在",
      };
    }

    return {
      authorized: false,
      userId,
      reason: "无法验证资源所有权",
    };
  } catch (error) {
    logger.error("检查资源所有权失败", {
      userId,
      resourceType,
      resourceId,
      error,
    });
    return {
      authorized: false,
      userId,
      reason: "权限验证过程中发生错误",
    };
  }
}

/**
 * 从请求中获取并验证当前用户
 * @returns 用户 ID 或 null
 */
export async function getAuthenticatedUser(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id || null;
  } catch (error) {
    logger.error("获取认证用户失败", { error });
    return null;
  }
}

/**
 * 验证用户对家庭的访问权限
 * @param userId 用户 ID
 * @param familyId 家庭 ID
 */
export async function requireFamilyAccess(
  userId: string,
  familyId: string,
): Promise<AuthorizationResult> {
  try {
    const membership = await supabaseAdapter.familyMember.findFirst({
      where: {
        userId,
        familyId,
        deletedAt: null,
      },
    });

    if (membership) {
      return { authorized: true, userId };
    }

    return {
      authorized: false,
      userId,
      reason: "无权访问此家庭",
    };
  } catch (error) {
    logger.error("检查家庭访问权限失败", { userId, familyId, error });
    return {
      authorized: false,
      userId,
      reason: "权限验证过程中发生错误",
    };
  }
}

/**
 * 验证用户对家庭成员数据的访问权限（通过 memberId）
 * @param userId 用户 ID
 * @param memberId 目标成员 ID
 */
export async function requireMemberDataAccess(
  userId: string,
  memberId: string,
): Promise<AuthorizationResult> {
  return requireFamilyMembership(userId, memberId);
}
