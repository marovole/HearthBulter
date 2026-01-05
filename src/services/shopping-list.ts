import { prisma } from "@/lib/db";
import { FoodCategory, ListStatus } from "@prisma/client";
import { hasPermission, Permission, FamilyMemberRole } from "@/lib/permissions";

// 购物清单服务
export class ShoppingListService {
  // 获取家庭购物清单
  static async getFamilyShoppingList(familyId: string, userId: string) {
    try {
      // 验证用户权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 获取购物清单
      const shoppingLists = await prisma.shoppingList.findMany({
        where: {
          plan: {
            memberId: {
              in: await this.getFamilyMemberIds(familyId),
            },
          },
        },
        include: {
          items: {
            include: {
              food: {
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  category: true,
                  calories: true,
                  protein: true,
                  carbs: true,
                  fat: true,
                },
              },
              assignee: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  role: true,
                },
              },
              addedByMember: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  role: true,
                },
              },
              purchasedByMember: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          plan: {
            select: {
              id: true,
              member: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // 计算统计信息
      const listWithStats = shoppingLists.map((list) => ({
        ...list,
        stats: {
          totalItems: list.items.length,
          purchasedItems: list.items.filter((item) => item.purchased).length,
          pendingItems: list.items.filter((item) => !item.purchased).length,
          assignedItems: list.items.filter((item) => item.assigneeId).length,
          totalEstimatedCost: list.items.reduce(
            (sum, item) => sum + (item.estimatedPrice || 0),
            0,
          ),
        },
      }));

      return listWithStats;
    } catch (error) {
      console.error("Error getting family shopping list:", error);
      throw error;
    }
  }

  // 添加购物项
  static async addShoppingItem(
    familyId: string,
    userId: string,
    data: {
      listId: string;
      foodId: string;
      amount: number;
      estimatedPrice?: number;
      assigneeId?: string;
    },
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.CREATE_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 验证购物清单属于家庭成员
      const list = await prisma.shoppingList.findFirst({
        where: {
          id: data.listId,
          plan: {
            memberId: {
              in: await this.getFamilyMemberIds(familyId),
            },
          },
        },
      });

      if (!list) {
        throw new Error("Shopping list not found");
      }

      // 验证被分配人是家庭成员
      if (data.assigneeId) {
        const assignee = await prisma.familyMember.findFirst({
          where: {
            id: data.assigneeId,
            familyId,
            deletedAt: null,
          },
        });

        if (!assignee) {
          throw new Error("Assignee is not a family member");
        }
      }

      // 创建购物项
      const food = await prisma.food.findUnique({
        where: { id: data.foodId },
      });

      if (!food) {
        throw new Error("Food not found");
      }

      const shoppingItem = await prisma.shoppingItem.create({
        data: {
          listId: data.listId,
          foodId: data.foodId,
          amount: data.amount,
          category: food.category,
          estimatedPrice: data.estimatedPrice,
          assigneeId: data.assigneeId,
          addedBy: member.id,
        },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              category: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          addedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "SHOPPING_UPDATED", {
        action: "ADD_ITEM",
        itemId: shoppingItem.id,
        foodName: food.name,
      });

      return shoppingItem;
    } catch (error) {
      console.error("Error adding shopping item:", error);
      throw error;
    }
  }

  // 分配购物项
  static async assignShoppingItem(
    familyId: string,
    userId: string,
    itemId: string,
    assigneeId: string,
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.ASSIGN_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 验证购物项
      const item = await prisma.shoppingItem.findFirst({
        where: {
          id: itemId,
          list: {
            plan: {
              memberId: {
                in: await this.getFamilyMemberIds(familyId),
              },
            },
          },
        },
        include: {
          food: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Shopping item not found");
      }

      // 验证被分配人
      const assignee = await prisma.familyMember.findFirst({
        where: {
          id: assigneeId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      if (!assignee) {
        throw new Error("Assignee is not a family member");
      }

      // 更新分配
      const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: { assigneeId },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              category: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          addedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "SHOPPING_UPDATED", {
        action: "ASSIGN_ITEM",
        itemId: item.id,
        foodName: item.food.name,
        assigneeName: assignee.name,
      });

      return updatedItem;
    } catch (error) {
      console.error("Error assigning shopping item:", error);
      throw error;
    }
  }

  // 确认购买
  static async confirmPurchase(
    familyId: string,
    userId: string,
    itemId: string,
    actualPrice?: number,
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.PURCHASE_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 验证购物项
      const item = await prisma.shoppingItem.findFirst({
        where: {
          id: itemId,
          list: {
            plan: {
              memberId: {
                in: await this.getFamilyMemberIds(familyId),
              },
            },
          },
        },
        include: {
          food: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Shopping item not found");
      }

      // 更新购买状态
      const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: {
          purchased: true,
          purchasedBy: member.id,
          purchasedAt: new Date(),
          estimatedPrice: actualPrice || item.estimatedPrice,
        },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              category: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          addedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          purchasedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "SHOPPING_UPDATED", {
        action: "PURCHASE_ITEM",
        itemId: item.id,
        foodName: item.food.name,
        actualPrice,
      });

      return updatedItem;
    } catch (error) {
      console.error("Error confirming purchase:", error);
      throw error;
    }
  }

  // 更新购物项
  static async updateShoppingItem(
    familyId: string,
    userId: string,
    itemId: string,
    data: {
      amount?: number;
      estimatedPrice?: number;
      assigneeId?: string;
    },
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 验证购物项
      const item = await prisma.shoppingItem.findFirst({
        where: {
          id: itemId,
          list: {
            plan: {
              memberId: {
                in: await this.getFamilyMemberIds(familyId),
              },
            },
          },
        },
        include: {
          food: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Shopping item not found");
      }

      // 检查更新权限
      if (
        !hasPermission(
          member.role,
          Permission.UPDATE_SHOPPING_ITEM,
          item.addedBy,
          member.id,
        )
      ) {
        throw new Error("Insufficient permissions to update this item");
      }

      // 验证被分配人
      if (data.assigneeId) {
        const assignee = await prisma.familyMember.findFirst({
          where: {
            id: data.assigneeId,
            familyId,
            deletedAt: null,
          },
        });

        if (!assignee) {
          throw new Error("Assignee is not a family member");
        }
      }

      // 更新购物项
      const updatedItem = await prisma.shoppingItem.update({
        where: { id: itemId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              category: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          addedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
          purchasedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "SHOPPING_UPDATED", {
        action: "UPDATE_ITEM",
        itemId: item.id,
        foodName: item.food.name,
        changes: data,
      });

      return updatedItem;
    } catch (error) {
      console.error("Error updating shopping item:", error);
      throw error;
    }
  }

  // 删除购物项
  static async deleteShoppingItem(
    familyId: string,
    userId: string,
    itemId: string,
  ) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 验证购物项
      const item = await prisma.shoppingItem.findFirst({
        where: {
          id: itemId,
          list: {
            plan: {
              memberId: {
                in: await this.getFamilyMemberIds(familyId),
              },
            },
          },
        },
        include: {
          food: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Shopping item not found");
      }

      // 检查删除权限
      if (
        !hasPermission(
          member.role,
          Permission.DELETE_SHOPPING_ITEM,
          item.addedBy,
          member.id,
        )
      ) {
        throw new Error("Insufficient permissions to delete this item");
      }

      // 删除购物项
      await prisma.shoppingItem.delete({
        where: { id: itemId },
      });

      // 记录活动
      await this.logActivity(familyId, member.id, "SHOPPING_UPDATED", {
        action: "DELETE_ITEM",
        itemId: item.id,
        foodName: item.food.name,
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting shopping item:", error);
      throw error;
    }
  }

  // 获取购物统计
  static async getShoppingStats(familyId: string, userId: string) {
    try {
      // 验证权限
      const member = await prisma.familyMember.findFirst({
        where: {
          userId,
          familyId,
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (!member) {
        throw new Error("Not a family member");
      }

      // 获取统计信息
      const items = await prisma.shoppingItem.findMany({
        where: {
          list: {
            plan: {
              memberId: {
                in: await this.getFamilyMemberIds(familyId),
              },
            },
          },
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          addedByMember: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      const stats = {
        totalItems: items.length,
        purchasedItems: items.filter((item) => item.purchased).length,
        pendingItems: items.filter((item) => !item.purchased).length,
        assignedItems: items.filter((item) => item.assigneeId).length,
        totalEstimatedCost: items.reduce(
          (sum, item) => sum + (item.estimatedPrice || 0),
          0,
        ),
        categoryStats: {} as Record<FoodCategory, number>,
        assigneeStats: {} as Record<
          string,
          { name: string; count: number; avatar?: string }
        >,
        addedByStats: {} as Record<
          string,
          { name: string; count: number; avatar?: string }
        >,
      };

      // 按分类统计
      items.forEach((item) => {
        stats.categoryStats[item.category] =
          (stats.categoryStats[item.category] || 0) + 1;
      });

      // 按分配人统计
      items.forEach((item) => {
        if (item.assignee) {
          const key = item.assignee.id;
          if (!stats.assigneeStats[key]) {
            stats.assigneeStats[key] = {
              name: item.assignee.name,
              count: 0,
              avatar: item.assignee.avatar,
            };
          }
          stats.assigneeStats[key].count++;
        }
      });

      // 按添加人统计
      items.forEach((item) => {
        if (item.addedByMember) {
          const key = item.addedByMember.id;
          if (!stats.addedByStats[key]) {
            stats.addedByStats[key] = {
              name: item.addedByMember.name,
              count: 0,
              avatar: item.addedByMember.avatar,
            };
          }
          stats.addedByStats[key].count++;
        }
      });

      return stats;
    } catch (error) {
      console.error("Error getting shopping stats:", error);
      throw error;
    }
  }

  // 辅助方法：获取家庭成员ID列表
  private static async getFamilyMemberIds(familyId: string): Promise<string[]> {
    const members = await prisma.familyMember.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return members.map((member) => member.id);
  }

  // 辅助方法：记录活动
  private static async logActivity(
    familyId: string,
    memberId: string,
    activityType: string,
    metadata: any,
  ) {
    try {
      await prisma.activity.create({
        data: {
          familyId,
          memberId,
          activityType: activityType as any,
          title: this.getActivityTitle(activityType, metadata),
          description: this.getActivityDescription(activityType, metadata),
          metadata,
        },
      });
    } catch (error) {
      console.error("Error logging activity:", error);
      // 不抛出错误，避免影响主要操作
    }
  }

  private static getActivityTitle(activityType: string, metadata: any): string {
    switch (activityType) {
    case "SHOPPING_UPDATED":
      switch (metadata.action) {
      case "ADD_ITEM":
        return "添加了购物项";
      case "ASSIGN_ITEM":
        return "分配了购物项";
      case "PURCHASE_ITEM":
        return "购买了物品";
      case "UPDATE_ITEM":
        return "更新了购物项";
      case "DELETE_ITEM":
        return "删除了购物项";
      default:
        return "更新了购物清单";
      }
    default:
      return "购物清单更新";
    }
  }

  private static getActivityDescription(
    activityType: string,
    metadata: any,
  ): string {
    switch (activityType) {
    case "SHOPPING_UPDATED":
      let description = "";
      if (metadata.foodName) {
        description += `${metadata.foodName}`;
      }
      if (metadata.assigneeName) {
        description += ` 分配给 ${metadata.assigneeName}`;
      }
      if (metadata.actualPrice) {
        description += ` 实际价格: ¥${metadata.actualPrice}`;
      }
      return description;
    default:
      return "";
    }
  }
}
