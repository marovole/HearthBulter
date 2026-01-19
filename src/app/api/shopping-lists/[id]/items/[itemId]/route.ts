import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shoppingListRepository } from "@/lib/repositories/shopping-list-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id: listId, itemId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const purchased = body.purchased !== undefined ? body.purchased : true;

    const shoppingList = await shoppingListRepository.getShoppingListById(
      listId,
      { includePlan: true, includeItems: true },
    );

    const memberId = shoppingList?.plan?.member?.id;
    if (!shoppingList || !memberId) {
      return NextResponse.json({ error: "购物清单不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "无权限修改该购物清单" },
        { status: 403 },
      );
    }

    const updatedItem = await shoppingListRepository.updateShoppingListItem(
      listId,
      itemId,
      { purchased },
    );

    const refreshedList = await shoppingListRepository.getShoppingListById(
      listId,
      { includeItems: true },
    );

    if (refreshedList?.items) {
      const allPurchased = refreshedList.items.every((item) => item.purchased);

      if (allPurchased && refreshedList.status !== "COMPLETED") {
        await shoppingListRepository.updateShoppingList(listId, {
          status: "COMPLETED",
        });
      } else if (!allPurchased && refreshedList.status === "DRAFT") {
        await shoppingListRepository.updateShoppingList(listId, {
          status: "ACTIVE",
        });
      }
    }

    return NextResponse.json(
      {
        message: "清单项更新成功",
        item: updatedItem,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("更新清单项失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
