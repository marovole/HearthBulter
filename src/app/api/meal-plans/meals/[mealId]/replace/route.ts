import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { mealPlanner } from "@/lib/services/meal-planner";

/**
 * POST /api/meal-plans/meals/:mealId/replace
 *
 * Note: 保留服务层调用
 * 此端点使用智能餐食替换算法（同 PATCH /meal-plans/:planId/meals/:mealId）
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> }
) {
  try {
    const { mealId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const meal = await convexClient.query<{
      _id: Id<"meals">;
      planId: Id<"mealPlans">;
    } | null>(api.meals.getMealById, {
      mealId: mealId as Id<"meals">,
    });

    if (!meal) {
      return NextResponse.json({ error: "餐食不存在" }, { status: 404 });
    }

    const plan = await convexClient.query<{
      memberId: Id<"familyMembers">;
    } | null>(api.meals.getPlanById, {
      planId: meal.planId,
    });

    if (!plan) {
      return NextResponse.json({ error: "食谱计划不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(api.members.verifyAccess, {
      memberId: plan.memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    const replaced = await mealPlanner.replaceMeal(mealId, plan.memberId);
    return NextResponse.json({ message: "替换成功", meal: replaced }, { status: 200 });
  } catch (error) {
    console.error("替换餐食失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
