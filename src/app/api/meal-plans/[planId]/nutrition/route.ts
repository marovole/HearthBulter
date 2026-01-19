import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id, Doc } from "@/../convex/_generated/dataModel";
import { nutritionCalculator } from "@/lib/services/nutrition-calculator";

/**
 * GET /api/meal-plans/:planId/nutrition
 *
 * Note: 保留服务层调用
 * 此端点使用 nutritionCalculator 服务进行营养计算和聚合
 * 营养计算涉及复杂的转换和聚合逻辑，应保持在服务层
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const planDetails = await convexClient.query<{
      plan: Doc<"mealPlans">;
      meals: Array<Record<string, unknown>>;
    } | null>(api.meals.getPlanDetails, {
      planId: planId as Id<"mealPlans">,
    });

    if (!planDetails) {
      return NextResponse.json({ error: "食谱计划不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: planDetails.plan.memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "无权限查看该食谱的营养汇总" },
        { status: 403 },
      );
    }

    const allIngredients = planDetails.meals.flatMap((meal) => {
      const ingredients =
        (meal.ingredients as Array<Record<string, unknown>> | undefined) ?? [];
      return ingredients.map((ingredient) => ({
        foodId: ingredient.foodId as string,
        amount: ingredient.amount as number,
      }));
    });

    const nutrition = await nutritionCalculator.calculateBatch(allIngredients);

    const planStart = new Date(planDetails.plan.startDate);
    const planEnd = new Date(planDetails.plan.endDate);
    const days =
      Math.ceil(
        (planEnd.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    return NextResponse.json(
      {
        planId: planDetails.plan._id,
        total: {
          calories: nutrition.totalCalories,
          protein: nutrition.totalProtein,
          carbs: nutrition.totalCarbs,
          fat: nutrition.totalFat,
        },
        daily: {
          calories: Math.round(nutrition.totalCalories / days),
          protein: Math.round(nutrition.totalProtein / days),
          carbs: Math.round(nutrition.totalCarbs / days),
          fat: Math.round(nutrition.totalFat / days),
        },
        target: {
          calories: planDetails.plan.targetCalories,
          protein: planDetails.plan.targetProtein ?? null,
          carbs: planDetails.plan.targetCarbs ?? null,
          fat: planDetails.plan.targetFat ?? null,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("获取营养汇总失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
