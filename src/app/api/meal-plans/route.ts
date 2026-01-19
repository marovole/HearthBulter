import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id, Doc } from "@/../convex/_generated/dataModel";

// GET /api/meal-plans?startDate=...&endDate=...&memberId=...
// Returns meal plans for the authenticated user, optionally filtered by date range
//
// 使用双写框架迁移（部分）

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const memberIdParam = searchParams.get("memberId");

    const members = await convexClient.query<Doc<"familyMembers">[]>(
      api.members.listByClerkId,
      { clerkId: session.user.id },
    );

    if (members.length === 0) {
      return NextResponse.json({ error: "未找到关联的成员" }, { status: 404 });
    }

    const memberId = (memberIdParam || members[0]?._id) as string | undefined;
    if (!memberId) {
      return NextResponse.json({ error: "未找到关联的成员" }, { status: 404 });
    }

    const mapPlanResponse = (
      plan: Doc<"mealPlans">,
      meals: Array<Record<string, unknown>>,
    ) => ({
      id: plan._id,
      startDate: new Date(plan.startDate),
      endDate: new Date(plan.endDate),
      goalType: plan.goalType,
      targetCalories: plan.targetCalories,
      targetProtein: plan.targetProtein ?? null,
      targetCarbs: plan.targetCarbs ?? null,
      targetFat: plan.targetFat ?? null,
      meals: meals.map((meal) => ({
        id: meal._id as string,
        date: new Date(meal.date as number),
        mealType: meal.mealType,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        ingredients: (
          (meal.ingredients as Array<Record<string, unknown>>) ?? []
        ).map((ingredient) => ({
          id: ingredient._id as string,
          amount: ingredient.amount as number,
          food: {
            id: ingredient.foodId as string,
            name:
              (ingredient.food as Record<string, unknown> | undefined)?.name ??
              "",
          },
        })),
      })),
      nutritionSummary: null,
    });

    if (startDateParam && endDateParam) {
      const plan = await convexClient.query<{
        plan: Doc<"mealPlans">;
        meals: Array<Record<string, unknown>>;
      } | null>(api.meals.getPlan, {
        memberId: memberId as Id<"familyMembers">,
        startDate: new Date(startDateParam).getTime(),
        endDate: new Date(endDateParam).getTime(),
      });

      if (!plan?.plan) {
        return NextResponse.json(
          { message: "暂无食谱计划", plan: null },
          { status: 200 },
        );
      }

      const details = await convexClient.query<{
        plan: Doc<"mealPlans">;
        meals: Array<Record<string, unknown>>;
      } | null>(api.meals.getPlanDetails, {
        planId: plan.plan._id as Id<"mealPlans">,
      });

      if (!details) {
        return NextResponse.json(
          { message: "暂无食谱计划", plan: null },
          { status: 200 },
        );
      }

      return NextResponse.json(mapPlanResponse(details.plan, details.meals), {
        status: 200,
      });
    }

    const activePlan = await convexClient.query<Doc<"mealPlans"> | null>(
      api.meals.getActivePlanByMember,
      { memberId: memberId as Id<"familyMembers"> },
    );

    if (!activePlan) {
      return NextResponse.json(
        { message: "暂无食谱计划", plan: null },
        { status: 200 },
      );
    }

    const activeDetails = await convexClient.query<{
      plan: Doc<"mealPlans">;
      meals: Array<Record<string, unknown>>;
    } | null>(api.meals.getPlanDetails, {
      planId: activePlan._id as Id<"mealPlans">,
    });

    if (!activeDetails) {
      return NextResponse.json(
        { message: "暂无食谱计划", plan: null },
        { status: 200 },
      );
    }

    return NextResponse.json(
      mapPlanResponse(activeDetails.plan, activeDetails.meals),
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("获取食谱计划失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
