import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";

// POST /api/meal-plans/meals/:mealId/favorite - 切换收藏状态

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> },
) {
  try {
    const { mealId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { isFavorite } = body;

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

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: plan.memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    await convexClient.mutation(api.meals.updateMealFavorite, {
      mealId: mealId as Id<"meals">,
      isFavorite: Boolean(isFavorite),
    });

    return NextResponse.json(
      {
        message: isFavorite ? "已添加到收藏" : "已取消收藏",
        isFavorite: Boolean(isFavorite),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("更新收藏状态失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// GET /api/meal-plans/meals/:mealId/favorite - 获取收藏状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string }> },
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
      isFavorite?: boolean;
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

    const access = await convexClient.query<{ hasAccess: boolean }>(
      api.members.verifyAccess,
      {
        memberId: plan.memberId as Id<"familyMembers">,
        clerkId: session.user.id,
      },
    );

    if (!access.hasAccess) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    return NextResponse.json(
      {
        isFavorite: meal.isFavorite ?? false,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("获取收藏状态失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
