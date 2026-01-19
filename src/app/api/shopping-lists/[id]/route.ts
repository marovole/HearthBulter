import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shoppingListRepository } from "@/lib/repositories/shopping-list-repository-singleton";
import { z } from "zod";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

const updateShoppingListSchema = z.object({
  name: z.string().optional(),
  budget: z.number().min(0).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const shoppingList = await shoppingListRepository.getShoppingListById(
      listId,
      { includePlan: true },
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

    const body = await request.json();
    const validatedData = updateShoppingListSchema.parse(body);

    const updatedList = await shoppingListRepository.updateShoppingList(
      listId,
      validatedData,
    );

    return NextResponse.json(
      {
        message: "购物清单更新成功",
        shoppingList: updatedList,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: error.errors },
        { status: 400 },
      );
    }

    console.error("更新购物清单失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const shoppingList = await shoppingListRepository.getShoppingListById(
      listId,
      { includePlan: true },
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
        { error: "无权限删除该购物清单" },
        { status: 403 },
      );
    }

    await shoppingListRepository.deleteShoppingList(listId);

    return NextResponse.json(
      {
        message: "购物清单删除成功",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("删除购物清单失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
