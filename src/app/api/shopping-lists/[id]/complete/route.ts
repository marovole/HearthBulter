import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { priceEstimator } from "@/lib/services/price-estimator";
import { shoppingListRepository } from "@/lib/repositories/shopping-list-repository-singleton";
import { z } from "zod";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

const completeShoppingSchema = z.object({
  actualCost: z.number().min(0).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validatedData = completeShoppingSchema.parse(body);

    const shoppingList = await shoppingListRepository.getShoppingListById(listId, {
      includePlan: true,
    });

    const memberId = shoppingList?.plan?.member?.id;
    if (!shoppingList || !memberId) {
      return NextResponse.json({ error: "购物清单不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
      memberId: memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限完成该购物清单" }, { status: 403 });
    }

    const updatedList = await shoppingListRepository.completeShoppingList(listId, validatedData);

    let priceAdvice: string | undefined;
    if (updatedList.estimatedCost != null && updatedList.actualCost != null) {
      priceAdvice = priceEstimator.getPriceTrendAdvice(
        updatedList.estimatedCost,
        updatedList.actualCost
      );
    }

    return NextResponse.json(
      {
        message: "购物清单已完成",
        shoppingList: updatedList,
        priceAdvice,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("完成购物清单失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
