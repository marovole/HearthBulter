import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mealPlanRepository } from "@/lib/repositories/meal-plan-repository-singleton";

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

    // 查找用户的 memberId
    const member = await prisma.familyMember.findFirst({
      where: { userId: session.user.id, deletedAt: null },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "未找到关联的成员" }, { status: 404 });
    }

    const memberId = memberIdParam || member.id;

    // 使用 Repository 查询
    if (startDateParam && endDateParam) {
      // 按日期范围查询
      const result = await mealPlanRepository.getPlansByDateRange(
        memberId,
        new Date(startDateParam),
        new Date(endDateParam),
        { page: 1, limit: 1 },
      );

      const mealPlan = result.data[0] || null;

      if (!mealPlan) {
        return NextResponse.json(
          { message: "暂无食谱计划", plan: null },
          { status: 200 },
        );
      }

      // 保持原有响应格式
      return NextResponse.json(
        {
          id: mealPlan.id,
          startDate: mealPlan.startDate,
          endDate: mealPlan.endDate,
          goalType: mealPlan.goalType,
          targetCalories: mealPlan.targetCalories,
          targetProtein: mealPlan.targetProtein,
          targetCarbs: mealPlan.targetCarbs,
          targetFat: mealPlan.targetFat,
          meals: mealPlan.meals.map((m) => ({
            id: m.id,
            date: m.date,
            mealType: m.mealType,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            ingredients: m.ingredients.map((ing) => ({
              id: ing.id,
              amount: ing.amount,
              food: { id: ing.foodId, name: "" }, // Note: DTO 不包含 food name，需要额外查询
            })),
          })),
          nutritionSummary: null,
        },
        { status: 200 },
      );
    } else {
      // 获取当前活跃计划
      const mealPlan = await mealPlanRepository.getActivePlanByMember(memberId);

      if (!mealPlan) {
        return NextResponse.json(
          { message: "暂无食谱计划", plan: null },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          id: mealPlan.id,
          startDate: mealPlan.startDate,
          endDate: mealPlan.endDate,
          goalType: mealPlan.goalType,
          targetCalories: mealPlan.targetCalories,
          targetProtein: mealPlan.targetProtein,
          targetCarbs: mealPlan.targetCarbs,
          targetFat: mealPlan.targetFat,
          meals: mealPlan.meals.map((m) => ({
            id: m.id,
            date: m.date,
            mealType: m.mealType,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            ingredients: m.ingredients.map((ing) => ({
              id: ing.id,
              amount: ing.amount,
              food: { id: ing.foodId, name: "" },
            })),
          })),
          nutritionSummary: null,
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("获取食谱计划失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
