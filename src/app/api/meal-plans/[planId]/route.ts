import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { convexClient, api } from "@/lib/convex-client";
import type { Id, Doc } from "@/../convex/_generated/dataModel";

// DELETE /api/meal-plans/:planId - 删除食谱
//
// 使用双写框架迁移

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const mealPlan = await convexClient.query<Doc<"mealPlans"> | null>(
      api.meals.getPlanById,
      { planId: planId as Id<"mealPlans"> },
    );

    if (!mealPlan) {
      return NextResponse.json({ error: "食谱计划不存在" }, { status: 404 });
    }

    const access = await convexClient.query<{
      hasAccess: boolean;
      member: { id: string } | null;
    }>(api.members.verifyAccess, {
      memberId: mealPlan.memberId as Id<"familyMembers">,
      clerkId: session.user.id,
    });

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "无权限删除该食谱计划" },
        { status: 403 },
      );
    }

    await convexClient.mutation(api.meals.deletePlan, {
      planId: planId as Id<"mealPlans">,
    });

    return NextResponse.json({ message: "食谱计划删除成功" }, { status: 200 });
  } catch (error) {
    console.error("删除食谱计划失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
