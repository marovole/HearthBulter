import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { nutritionCalculator } from "@/lib/services/nutrition-calculator";

export const dynamic = "force-dynamic";

const createMealSchema = z.object({
  recipeId: z.string().uuid(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  date: z.string().datetime(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { planId } = await params;
    const body = await request.json();
    const { recipeId, mealType, date } = createMealSchema.parse(body);

    const plan = await convexClient.query<{
      _id: Id<"mealPlans">;
      memberId: Id<"familyMembers">;
    } | null>(api.meals.getPlanById, {
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
      return NextResponse.json({ error: "无权限访问" }, { status: 403 });
    }

    const recipe = await convexClient.query<Record<string, unknown> | null>(api.recipes.getById, {
      recipeId: recipeId as Id<"recipes">,
    });

    if (!recipe) {
      return NextResponse.json({ error: "食谱不存在" }, { status: 404 });
    }

    const ingredientInputs = (
      (recipe.ingredients as Array<Record<string, unknown>> | undefined) ?? []
    )
      .map((ingredient) => ({
        foodId: ingredient.foodId as string,
        amount: ingredient.amount as number,
      }))
      .filter((ingredient) => ingredient.foodId && ingredient.amount > 0);

    const nutrition = await nutritionCalculator.calculateBatch(ingredientInputs);

    const mealId = await convexClient.mutation<Id<"meals">>(api.meals.createMeal, {
      planId: planId as Id<"mealPlans">,
      date: new Date(date).getTime(),
      mealType,
      calories: nutrition.totalCalories,
      protein: nutrition.totalProtein,
      carbs: nutrition.totalCarbs,
      fat: nutrition.totalFat,
      recipeId: recipeId as Id<"recipes">,
      ingredients: ingredientInputs.map((ingredient) => ({
        foodId: ingredient.foodId as Id<"foods">,
        amount: ingredient.amount,
      })),
    });

    return NextResponse.json({ meal: { id: mealId } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("创建餐次失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
