import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { memberRepository } from "@/lib/repositories/member-repository-singleton";
import { convexClient, api } from "@/lib/convex-client";
import { z } from "zod";

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";

// Convex ID type helper
type Id<TableName extends string> = string & { __tableName: TableName };

// 更新健康目标的验证 schema
const updateGoalSchema = z.object({
  currentWeight: z.number().min(20).max(300).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).optional(),
  targetWeight: z.number().min(20).max(300).optional(),
  targetWeeks: z.number().min(1).max(52).optional(),
  carbRatio: z.number().min(0).max(1).optional(),
  proteinRatio: z.number().min(0).max(1).optional(),
  fatRatio: z.number().min(0).max(1).optional(),
});

// 计算进度
function calculateProgress(
  startWeight: number | null,
  currentWeight: number | null,
  targetWeight: number | null
): number {
  if (!startWeight || !currentWeight || !targetWeight) return 0;

  const totalChange = targetWeight - startWeight;
  const currentChange = currentWeight - startWeight;

  if (totalChange === 0) return 0;

  const progress = (currentChange / totalChange) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * GET /api/members/:memberId/goals/:goalId
 * 获取单个健康目标
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康目标" }, { status: 403 });
    }

    // 获取健康目标
    const goal = await convexClient.query(api.health.getGoalById, {
      goalId: goalId as Id<"healthGoals">,
    });

    if (!goal || goal.memberId !== memberId) {
      return NextResponse.json({ error: "健康目标不存在" }, { status: 404 });
    }

    return NextResponse.json({ goal }, { status: 200 });
  } catch (error) {
    console.error("获取健康目标失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * PATCH /api/members/:memberId/goals/:goalId
 * 更新健康目标
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = updateGoalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "输入数据无效", details: validation.error.errors },
        { status: 400 }
      );
    }

    // 验证权限
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康目标" }, { status: 403 });
    }

    // 获取健康目标
    const goal = await convexClient.query(api.health.getGoalById, {
      goalId: goalId as Id<"healthGoals">,
    });

    if (!goal || goal.memberId !== memberId) {
      return NextResponse.json({ error: "健康目标不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // 处理更新字段
    if (validation.data.currentWeight !== undefined) {
      updateData.currentWeight = validation.data.currentWeight;
    }
    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.targetWeight !== undefined)
      updateData.targetWeight = validation.data.targetWeight;
    if (validation.data.targetWeeks !== undefined) {
      updateData.targetWeeks = validation.data.targetWeeks;
      // 重新计算目标日期
      const startDate = new Date(goal.startDate);
      const targetDate = new Date(
        startDate.getTime() + validation.data.targetWeeks * 7 * 24 * 60 * 60 * 1000
      );
      updateData.targetDate = targetDate.toISOString();
    }
    if (validation.data.carbRatio !== undefined) updateData.carbRatio = validation.data.carbRatio;
    if (validation.data.proteinRatio !== undefined)
      updateData.proteinRatio = validation.data.proteinRatio;
    if (validation.data.fatRatio !== undefined) updateData.fatRatio = validation.data.fatRatio;

    // 重新计算进度
    const currentWeight = (updateData.currentWeight as number) ?? goal.currentWeight;
    const targetWeight = (updateData.targetWeight as number) ?? goal.targetWeight;
    updateData.progress = calculateProgress(goal.startWeight, currentWeight, targetWeight);

    // 更新目标
    const updatedGoal = await convexClient.mutation(api.health.updateGoal, {
      goalId: goalId as Id<"healthGoals">,
      ...updateData,
    });

    return NextResponse.json(
      {
        message: "健康目标更新成功",
        goal: updatedGoal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("更新健康目标失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/members/:memberId/goals/:goalId
 * 删除健康目标（软删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await memberRepository.verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "无权限访问该成员的健康目标" }, { status: 403 });
    }

    // 获取健康目标
    const goal = await convexClient.query(api.health.getGoalById, {
      goalId: goalId as Id<"healthGoals">,
    });

    if (!goal || goal.memberId !== memberId) {
      return NextResponse.json({ error: "健康目标不存在" }, { status: 404 });
    }

    // 软删除目标
    await convexClient.mutation(api.health.deleteGoal, {
      goalId: goalId as Id<"healthGoals">,
    });

    return NextResponse.json({ message: "健康目标删除成功" }, { status: 200 });
  } catch (error) {
    console.error("删除健康目标失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
