/**
 * 授权检查中间件
 * 提供统一的 API 授权验证函数
 */

import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { asConvexQueryReference } from "@/lib/convex-reference";
import { logger } from "@/lib/logger";

type Id<TableName extends string> = string & { __tableName: TableName };

type MemberDoc = {
  _id: string;
  userId?: string;
  familyId: string;
  deletedAt?: number;
  role?: string;
};

type FamilyDoc = {
  _id: string;
  creatorId: string;
  deletedAt?: number;
};

type UserDoc = {
  _id: string;
  role: string;
};

type InventoryItemDoc = {
  memberId: string;
} | null;

type HealthReportDoc = {
  memberId: string;
} | null;

type MealPlanDoc = {
  memberId: string;
} | null;

type RecipeDoc = {
  creatorId?: string;
} | null;

type NotificationDoc = {
  memberId: string;
} | null;

type BudgetDoc = {
  memberId: string;
} | null;

type HealthGoalDoc = {
  memberId: string;
} | null;

type MedicalReportDoc = {
  memberId: string;
} | null;

type AiConversationDoc = {
  memberId: string;
} | null;

export interface AuthorizationResult {
  authorized: boolean;
  userId?: string;
  reason?: string;
}

async function getMemberById(memberId: string): Promise<MemberDoc | null> {
  return (await convexClient.query(api.members.getById, {
    memberId: memberId as Id<"familyMembers">,
  })) as MemberDoc | null;
}

async function getFamilyById(familyId: string): Promise<FamilyDoc | null> {
  return (await convexClient.query(api.families.getById, {
    familyId: familyId as Id<"families">,
  })) as FamilyDoc | null;
}

/**
 * 验证用户是否为指定家庭成员的所有者或有权访问
 * @param userId 当前用户 ID（Clerk ID）
 * @param memberId 家庭成员 ID
 */
export async function requireFamilyMembership(
  userId: string,
  memberId: string
): Promise<AuthorizationResult> {
  try {
    const member = await getMemberById(memberId);

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

    const family = await getFamilyById(member.familyId);
    if (!family || family.deletedAt) {
      return {
        authorized: false,
        userId,
        reason: "家庭成员不存在",
      };
    }

    const userMembership = (await convexClient.query(api.members.getByClerkInFamily, {
      familyId: member.familyId as Id<"families">,
      clerkId: userId,
    })) as MemberDoc | null;

    if (!userMembership) {
      return {
        authorized: false,
        userId,
        reason: "无权访问此家庭成员数据",
      };
    }

    const isSelf = Boolean(
      member.userId && userMembership.userId && member.userId === userMembership.userId
    );
    const isCreator = family.creatorId === userMembership.userId;
    const isFamilyMember = userMembership.familyId === member.familyId;

    if (isSelf || isCreator || isFamilyMember) {
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
 * @param userId 用户 ID（Clerk ID）
 */
export async function requireAdmin(userId: string): Promise<AuthorizationResult> {
  try {
    const members = (await convexClient.query(api.members.listByClerkId, {
      clerkId: userId,
    })) as MemberDoc[];

    if (!members || members.length === 0) {
      return {
        authorized: false,
        userId,
        reason: "用户不存在",
      };
    }

    const hasAdminMemberRole = members.some((member) => member.role === "ADMIN");
    if (hasAdminMemberRole) {
      return { authorized: true, userId };
    }

    const firstUserId = members.find((member) => member.userId)?.userId;
    if (firstUserId) {
      const user = (await convexClient.query(api.users.getById, {
        userId: firstUserId as Id<"users">,
      })) as UserDoc | null;

      if (user?.role === "ADMIN") {
        return { authorized: true, userId };
      }
    }

    return {
      authorized: false,
      userId,
      reason: "需要管理员权限",
    };
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
  resourceId: string
): Promise<AuthorizationResult> {
  try {
    switch (resourceType) {
      case "inventory_item": {
        const resource = await convexClient.query<InventoryItemDoc>(api.inventory.getById, {
          itemId: resourceId as Id<"inventoryItems">,
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      case "health_report": {
        const resource = await convexClient.query<HealthReportDoc>(
          asConvexQueryReference("analytics:getHealthReportById"),
          { reportId: resourceId as Id<"healthReports"> }
        );
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      case "meal_plan": {
        const resource = await convexClient.query<MealPlanDoc>(api.meals.getPlanById, {
          planId: resourceId as Id<"mealPlans">,
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      case "recipe": {
        const resource = await convexClient.query<RecipeDoc>(api.recipes.getById, {
          recipeId: resourceId as Id<"recipes">,
        });
        if (resource?.creatorId) {
          const members = (await convexClient.query(api.members.listByClerkId, {
            clerkId: userId,
          })) as MemberDoc[];

          const userIdInDb = members.find((member) => member.userId)?.userId;
          if (userIdInDb && resource.creatorId === userIdInDb) {
            return { authorized: true, userId };
          }

          return {
            authorized: false,
            userId,
            reason: "无权访问此食谱",
          };
        }
        break;
      }

      case "notification": {
        const resource = await convexClient.query<NotificationDoc>(api.notifications.getById, {
          id: resourceId as Id<"notifications">,
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      case "budget": {
        const resource = await convexClient.query<BudgetDoc>(api.budget.getBudgetById, {
          budgetId: resourceId as Id<"budgets">,
        });
        if (resource?.memberId) {
          const familyMembership = await requireFamilyMembership(userId, resource.memberId);
          if (familyMembership.authorized) {
            return { authorized: true, userId };
          }
          return {
            authorized: false,
            userId,
            reason: "无权访问此预算",
          };
        }
        break;
      }

      case "health_goal": {
        const resource = await convexClient.query<HealthGoalDoc>(api.health.getGoalById, {
          goalId: resourceId as Id<"healthGoals">,
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      case "medical_report": {
        const resource = await convexClient.query<MedicalReportDoc>(
          api.health.getMedicalReportById,
          {
            reportId: resourceId as Id<"medicalReports">,
          }
        );
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      case "ai_conversation": {
        const resource = await convexClient.query<AiConversationDoc>(api.ai.getConversationById, {
          id: resourceId as Id<"aiConversations">,
        });
        if (resource?.memberId) {
          return requireFamilyMembership(userId, resource.memberId);
        }
        break;
      }

      default:
        return {
          authorized: false,
          userId,
          reason: `不支持的资源类型: ${resourceType}`,
        };
    }

    return {
      authorized: false,
      userId,
      reason: "资源不存在",
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
  familyId: string
): Promise<AuthorizationResult> {
  try {
    const membership = await convexClient.query(api.members.getByClerkInFamily, {
      familyId: familyId as Id<"families">,
      clerkId: userId,
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
  memberId: string
): Promise<AuthorizationResult> {
  return requireFamilyMembership(userId, memberId);
}
