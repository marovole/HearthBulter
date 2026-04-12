import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { MealPlanDetailClient } from "./MealPlanDetailClient";

type Id<TableName extends string> = string & { __tableName: TableName };

interface MealPlanDetailPageProps {
  params: Promise<{
    id: string;
    memberId: string;
    planId: string;
  }>;
}

export default async function MealPlanDetailPage({ params }: MealPlanDetailPageProps) {
  const { id, memberId, planId } = await params;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const access = await memberRepository.verifyMemberAccess(memberId, session.user.id);

  if (!access.member) {
    notFound();
  }

  if (access.member.familyId !== id) {
    notFound();
  }

  if (!access.hasAccess) {
    redirect(`/dashboard/families/${id}/members/${memberId}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const mealPlanDetails = (await convexClient.query(api.meals.getPlanDetails, {
    planId: planId as Id<"mealPlans">,
  })) as any;

  if (!mealPlanDetails) {
    notFound();
  }

  // 验证成员ID和家庭ID匹配
  if (mealPlanDetails.plan.memberId !== memberId || access.member.familyId !== id) {
    notFound();
  }

  const mealTypeOrder = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
  const sortedMeals = [...mealPlanDetails.meals].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date - b.date;
    }

    return mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
  const mealPlan = {
    id: mealPlanDetails.plan._id,
    memberId: mealPlanDetails.plan.memberId,
    name: "",
    description: null,
    startDate: new Date(mealPlanDetails.plan.startDate),
    endDate: new Date(mealPlanDetails.plan.endDate),
    status: mealPlanDetails.plan.status,
    totalCalories: mealPlanDetails.plan.targetCalories ?? null,
    totalProtein: mealPlanDetails.plan.targetProtein ?? null,
    totalCarbs: mealPlanDetails.plan.targetCarbs ?? null,
    totalFat: mealPlanDetails.plan.targetFat ?? null,
    createdAt: new Date(mealPlanDetails.plan.createdAt),
    updatedAt: new Date(mealPlanDetails.plan.updatedAt),
    deletedAt: mealPlanDetails.plan.deletedAt ? new Date(mealPlanDetails.plan.deletedAt) : null,
    meals: sortedMeals.map((meal) => ({
      id: meal._id,
      planId: meal.planId,
      name: "",
      mealType: meal.mealType,
      date: new Date(meal.date),
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      createdAt: new Date(meal.createdAt),
      updatedAt: new Date(meal.updatedAt),
      ingredients: meal.ingredients
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        .filter((ingredient: any) => ingredient.food)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex 返回类型推断受限
        .map((ingredient: any) => ({
          id: ingredient._id,
          mealId: ingredient.mealId,
          foodId: ingredient.foodId,
          quantity: ingredient.amount,
          amount: ingredient.amount,
          unit: "",
          food: {
            id: ingredient.food._id,
            name: ingredient.food.name,
          },
        })),
    })),
  } as any;

  return (
    <MealPlanDetailClient
      mealPlan={mealPlan}
      memberName={access.member.name || "成员"}
      familyId={id}
      memberId={memberId}
    />
  );
}
