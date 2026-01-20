import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id } from "@/../convex/_generated/dataModel";
import { nutritionCalculator } from "@/lib/services/nutrition-calculator";

// POST /api/meal-plans/meals/:mealId/ingredients/:ingredientId/replace
//
// 使用双写框架迁移（部分）

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mealId: string; ingredientId: string }> }
) {
  try {
    const { mealId, ingredientId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { newFoodId, newAmount } = body;

    if (!newFoodId || !newAmount) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
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

    const originalIngredient = await convexClient.query<{
      _id: Id<"mealIngredients">;
      mealId: Id<"meals">;
      foodId: Id<"foods">;
      amount: number;
    } | null>(api.meals.getMealIngredientById, {
      ingredientId: ingredientId as Id<"mealIngredients">,
    });

    if (!originalIngredient || originalIngredient.mealId !== meal._id) {
      return NextResponse.json({ error: "食材不存在" }, { status: 404 });
    }

    const originalFood = await convexClient.query<Record<string, unknown> | null>(
      api.budget.getFoodById,
      { foodId: originalIngredient.foodId }
    );

    const newFood = await convexClient.query<Record<string, unknown> | null>(
      api.budget.getFoodById,
      { foodId: newFoodId as Id<"foods"> }
    );

    if (!newFood) {
      return NextResponse.json({ error: "新食材不存在" }, { status: 404 });
    }

    await convexClient.mutation(api.meals.updateMealIngredient, {
      ingredientId: ingredientId as Id<"mealIngredients">,
      foodId: newFoodId as Id<"foods">,
      amount: newAmount,
    });

    const allIngredients = await convexClient.query<Array<{ foodId: Id<"foods">; amount: number }>>(
      api.meals.listMealIngredients,
      {
        mealId: mealId as Id<"meals">,
      }
    );

    const totalNutrition = await nutritionCalculator.calculateBatch(
      allIngredients.map((ingredient) => ({
        foodId: ingredient.foodId as string,
        amount: ingredient.amount,
      }))
    );

    await convexClient.mutation(api.meals.updateMeal, {
      mealId: mealId as Id<"meals">,
      calories: totalNutrition.totalCalories,
      protein: totalNutrition.totalProtein,
      carbs: totalNutrition.totalCarbs,
      fat: totalNutrition.totalFat,
    });

    return NextResponse.json(
      {
        message: "食材替换成功",
        originalIngredient: {
          id: originalIngredient._id,
          food: {
            id: originalIngredient.foodId,
            name: (originalFood?.name as string | undefined) ?? "",
          },
          amount: originalIngredient.amount,
        },
        newIngredient: {
          id: ingredientId,
          food: newFood,
          amount: newAmount,
        },
        updatedNutrition: {
          calories: totalNutrition.totalCalories,
          protein: totalNutrition.totalProtein,
          carbs: totalNutrition.totalCarbs,
          fat: totalNutrition.totalFat,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("替换食材失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
