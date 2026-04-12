import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { mealPlanner } from "@/lib/services/meal-planner";
import { mealPlanRepository } from "@/lib/repositories/meal-plan-repository-singleton";
import { z } from "zod";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

// 创建食谱计划的验证 schema
const createMealPlanSchema = z.object({
  days: z.number().min(1).max(14).default(7), // 默认7天
  startDate: z.string().datetime().optional(), // ISO 8601 格式
});

/**
 * POST /api/members/:memberId/meal-plans
 * 生成新食谱计划
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess, member } = await memberRepository.verifyMemberAccess(
      memberId,
      session.user.id
    );

    if (!hasAccess || !member) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = createMealPlanSchema.parse(body);

    const startDate = validatedData.startDate ? new Date(validatedData.startDate) : undefined;

    // 生成食谱计划
    const planData = await mealPlanner.generateMealPlan(memberId, validatedData.days, startDate);

    return NextResponse.json(
      {
        message: "食谱计划生成成功",
        plan: planData,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求参数验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("生成食谱计划失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * GET /api/members/:memberId/meal-plans
 * 查询历史食谱
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess, member } = await memberRepository.verifyMemberAccess(
      memberId,
      session.user.id
    );

    if (!hasAccess || !member) {
      return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    }

    // 使用 Repository 查询膳食计划（包含所有嵌套数据）
    const result = await mealPlanRepository.listMealPlans(
      { memberId, includeDeleted: false },
      { offset: 0, limit: 100 } // 默认返回最多 100 个计划
    );

    // 转换为原有的响应格式以保持向后兼容
    const mealPlans = result.items.map((plan) => ({
      id: plan.id,
      memberId: plan.memberId,
      startDate: plan.startDate,
      endDate: plan.endDate,
      goalType: plan.goalType,
      targetCalories: plan.targetCalories,
      targetProtein: plan.targetProtein,
      targetCarbs: plan.targetCarbs,
      targetFat: plan.targetFat,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      deletedAt: plan.deletedAt,
      meals: plan.meals.map(
        (meal: {
          id: string;
          planId: string;
          date: Date;
          mealType: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          createdAt: Date;
          updatedAt: Date;
          ingredients: unknown;
        }) => ({
          id: meal.id,
          planId: meal.planId,
          date: meal.date,
          mealType: meal.mealType,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          createdAt: meal.createdAt,
          updatedAt: meal.updatedAt,
          ingredients: meal.ingredients,
        })
      ),
    }));

    return NextResponse.json({ mealPlans }, { status: 200 });
  } catch (error) {
    console.error("查询食谱计划失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
