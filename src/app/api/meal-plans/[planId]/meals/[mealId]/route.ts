import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { mealPlanner } from "@/lib/services/meal-planner";

/**
 * PATCH /api/meal-plans/:planId/meals/:mealId
 *
 * Note: 保留服务层调用
 * 此端点使用智能餐食替换算法，涉及：
 * - 营养相似度计算
 * - 食材可替代性分析
 * - 保持整体营养平衡
 * 这些复杂逻辑应保持在 mealPlanner 服务层
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; mealId: string }> },
) {
  try {
    const { planId, mealId } = await params;
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

    if (meal.planId !== (planId as Id<"mealPlans">)) {
      return NextResponse.json(
        { error: "餐食不属于指定的食谱计划" },
        { status: 400 },
      );
    }

    const plan = await convexClient.query<{
      memberId: Id<"familyMembers">;
    } | null>(api.meals.getPlanById, {
      planId: planId as Id<"mealPlans">,
    });

    if (!plan) {
      return NextResponse.json({ error: "食谱计划不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: plan.memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限替换此餐食" }, { status: 403 });
    }

    const replacedMeal = await mealPlanner.replaceMeal(mealId, plan.memberId);

    return NextResponse.json(
      {
        message: "餐食替换成功",
        meal: replacedMeal,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "餐食不存在") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "无权限替换此餐食") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === "未找到合适的替代餐食") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    console.error("替换餐食失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
