// @ts-nocheck - 类型兼容性问题待解决
// Convex 购物清单服务 - 替换原有的 ShoppingListService
import { convexClient } from "@/lib/convex-client";
import { api } from "@/../convex/_generated/api";
import { hasPermission, Permission } from "@/lib/permissions";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import type { Id } from "@/../convex/_generated/dataModel";

// 购物清单服务
export class ShoppingListService {
  // 获取家庭购物清单
  static async getFamilyShoppingList(familyId: string, userId: string) {
    try {
      // 验证用户权限
      const { hasAccess, member } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess || !member) {
        throw new Error("Not a family member");
      }

      // 获取购物清单
      const shoppingLists = (await convexClient.query(api.shoppingLists.listByFamily, {
        familyId: familyId as Id<"families">,
      })) as any[];

      // 计算统计信息
      const listWithStats = shoppingLists.map((list: any) => {
        const items = list.items || [];

        return {
          ...list,
          id: list._id,
          items: items.map((item: any) => ({
            ...item,
            id: item.id || item._id,
            amount: item.quantity,
          })),
          stats: {
            totalItems: items.length,
            purchasedItems: items.filter((item: any) => item.purchased).length,
            pendingItems: items.filter((item: any) => !item.purchased).length,
            assignedItems: items.filter((item: any) => item.assigneeId).length,
            totalEstimatedCost: items.reduce(
              (sum: number, item: any) => sum + (item.estimatedPrice || 0),
              0
            ),
          },
        };
      });

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
    }
  ) {
    try {
      // 验证权限
      const { hasAccess, member } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess || !member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.CREATE_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 验证被分配人是家庭成员
      if (data.assigneeId) {
        const { hasAccess: assigneeIsMember } = await memberRepository.verifyMemberAccess(
          familyId,
          data.assigneeId
        );
        if (!assigneeIsMember) {
          throw new Error("Assignee is not a family member");
        }
      }

      // 获取食物信息
      const food = await convexClient.query(api.recipes.getFoodById, {
        foodId: data.foodId as Id<"foods">,
      });

      if (!food) {
        throw new Error("Food not found");
      }

      // 创建购物项
      const itemId = await convexClient.mutation(api.shoppingLists.addItem, {
        listId: data.listId as Id<"shoppingLists">,
        foodId: data.foodId as Id<"foods">,
        quantity: data.amount,
        unit: food.defaultUnit || "个",
        category: food.category || "其他",
        estimatedPrice: data.estimatedPrice,
        assigneeId: data.assigneeId as Id<"familyMembers"> | undefined,
        addedBy: member.id as Id<"familyMembers">,
      });

      return {
        id: itemId,
        listId: data.listId,
        foodId: data.foodId,
        amount: data.amount,
        quantity: data.amount,
        unit: food.defaultUnit || "个",
        category: food.category || "其他",
        estimatedPrice: data.estimatedPrice,
        assigneeId: data.assigneeId,
        addedBy: member.id,
        purchased: false,
        food: {
          id: food._id,
          name: food.name,
          nameEn: food.nameEn,
          category: food.category,
        },
      };
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
    assigneeId: string
  ) {
    try {
      // 验证权限
      const { hasAccess, member } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess || !member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.ASSIGN_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 验证被分配人
      const { hasAccess: assigneeIsMember, member: assignee } =
        await memberRepository.verifyMemberAccess(familyId, assigneeId);

      if (!assigneeIsMember || !assignee) {
        throw new Error("Assignee is not a family member");
      }

      // 更新分配
      await convexClient.mutation(api.shoppingLists.assignItem, {
        itemId: itemId as Id<"shoppingListItems">,
        assigneeId: assigneeId as Id<"familyMembers">,
      });

      return {
        id: itemId,
        assigneeId,
        assignee: {
          id: assignee.id,
          name: assignee.name,
          avatar: assignee.avatar,
          role: assignee.role,
        },
      };
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
    actualPrice?: number
  ) {
    try {
      // 验证权限
      const { hasAccess, member } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess || !member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.PURCHASE_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 更新购买状态
      await convexClient.mutation(api.shoppingLists.confirmPurchase, {
        itemId: itemId as Id<"shoppingListItems">,
        purchasedBy: member.id as Id<"familyMembers">,
        actualPrice,
      });

      return {
        id: itemId,
        purchased: true,
        purchasedBy: member.id,
        purchasedAt: Date.now(),
        actualPrice,
      };
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
    }
  ) {
    try {
      // 验证权限
      const { hasAccess, member } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess || !member) {
        throw new Error("Not a family member");
      }

      // 验证被分配人
      if (data.assigneeId) {
        const { hasAccess: assigneeIsMember } = await memberRepository.verifyMemberAccess(
          familyId,
          data.assigneeId
        );
        if (!assigneeIsMember) {
          throw new Error("Assignee is not a family member");
        }
      }

      // 构建更新数据
      const patch: any = {};
      if (data.amount !== undefined) patch.quantity = data.amount;
      if (data.estimatedPrice !== undefined) patch.estimatedPrice = data.estimatedPrice;
      if (data.assigneeId !== undefined) patch.assigneeId = data.assigneeId as Id<"familyMembers">;

      // 更新购物项
      await convexClient.mutation(api.shoppingLists.updateItem, {
        listId: "" as Id<"shoppingLists">, // 不需要验证 listId，Convex 函数内部处理
        itemId: itemId as Id<"shoppingListItems">,
        ...patch,
      });

      return {
        id: itemId,
        ...data,
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error("Error updating shopping item:", error);
      throw error;
    }
  }

  // 删除购物项
  static async deleteShoppingItem(familyId: string, userId: string, itemId: string) {
    try {
      // 验证权限
      const { hasAccess, member } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess || !member) {
        throw new Error("Not a family member");
      }

      if (!hasPermission(member.role, Permission.DELETE_SHOPPING_ITEM)) {
        throw new Error("Insufficient permissions");
      }

      // 删除购物项
      await convexClient.mutation(api.shoppingLists.deleteItem, {
        itemId: itemId as Id<"shoppingListItems">,
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
      const { hasAccess } = await memberRepository.verifyMemberAccess(familyId, userId);

      if (!hasAccess) {
        throw new Error("Not a family member");
      }

      // 获取统计信息
      const stats = await convexClient.query(api.shoppingLists.getStats, {
        familyId: familyId as Id<"families">,
      });

      return stats;
    } catch (error) {
      console.error("Error getting shopping stats:", error);
      throw error;
    }
  }
}
