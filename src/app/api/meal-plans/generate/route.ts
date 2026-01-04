import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mealPlanner } from "@/lib/services/meal-planner";

/**
 * POST /api/meal-plans/generate
 *
 * Note: 保留服务层调用
 * 此端点使用 AI 驱动的智能膳食计划生成，涉及复杂的业务逻辑：
 * - 基于用户偏好和营养目标的智能推荐
 * - 营养平衡算法
 * - 食材多样性控制
 * 这些复杂逻辑应保持在 mealPlanner 服务层，不适合迁移到 Repository
 */

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const days: number =
      typeof body?.days === "number" ? Math.max(1, Math.min(30, body.days)) : 7;
    const startDate: Date | undefined = body?.startDate
      ? new Date(body.startDate)
      : undefined;

    // 找到当前用户关联的成员（优先本人）
    const member = await prisma.familyMember.findFirst({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json({ error: "未找到关联的成员" }, { status: 404 });
    }

    const plan = await mealPlanner.generateMealPlan(member.id, days, startDate);

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("生成食谱计划失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
