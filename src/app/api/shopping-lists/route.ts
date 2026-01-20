import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { shoppingListRepository } from "@/lib/repositories/shopping-list-repository-singleton";
import type { ShoppingListStatus } from "@/lib/repositories/types/shopping-list";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");
    const status = searchParams.get("status") as ShoppingListStatus | null;

    if (planId) {
      const plan = await convexClient.query<Record<string, unknown> | null>(api.meals.getPlanById, {
        planId: planId as Id<"mealPlans">,
      });

      if (!plan) {
        return NextResponse.json({ error: "食谱计划不存在" }, { status: 404 });
      }

      const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
        memberId: plan.memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      });

      if (!access.hasAccess) {
        return NextResponse.json({ error: "无权限查看该购物清单" }, { status: 403 });
      }

      const result = await shoppingListRepository.listShoppingLists({
        planId,
        statuses: status ? [status] : undefined,
        includePlan: true,
        includeItems: true,
      });

      return NextResponse.json({ shoppingLists: result.items }, { status: 200 });
    }

    const members = await convexClient.query<Array<{ _id: string }>>(api.members.listByClerkId, {
      clerkId: session.user.id,
    });

    if (!members.length) {
      return NextResponse.json({ shoppingLists: [] }, { status: 200 });
    }

    const memberIds = members.map((member) => member._id as Id<"familyMembers">);
    const plans = await convexClient.query<Array<{ _id: string }>>(api.meals.listByMembers, {
      memberIds,
    });

    if (!plans.length) {
      return NextResponse.json({ shoppingLists: [] }, { status: 200 });
    }

    const planIds = plans.map((plan) => plan._id);

    const result = await shoppingListRepository.listShoppingLists({
      planIds,
      statuses: status ? [status] : undefined,
      includePlan: true,
      includeItems: true,
    });

    return NextResponse.json({ shoppingLists: result.items }, { status: 200 });
  } catch (error) {
    console.error("查询购物清单失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
