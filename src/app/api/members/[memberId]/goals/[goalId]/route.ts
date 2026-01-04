import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { z } from "zod";

// 更新健康目标的验证 schema

// Force dynamic rendering for auth()
export const dynamic = "force-dynamic";
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
  targetWeight: number | null,
): number {
  if (!startWeight || !currentWeight || !targetWeight) return 0;

  const totalChange = targetWeight - startWeight;
  const currentChange = currentWeight - startWeight;

  if (totalChange === 0) return 0;

  const progress = (currentChange / totalChange) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * 验证用户是否有权限访问健康目标
 *
 * Migrated from Prisma to Supabase
 */
async function verifyGoalAccess(
  goalId: string,
  memberId: string,
  userId: string,
): Promise<{ hasAccess: boolean; goal: any }> {
  const supabase = SupabaseClientManager.getInstance();

  // 获取健康目标及其成员信息
  const { data: goal } = await supabase
    .from("health_goals")
    .select(
      `
      *,
      member:family_members!inner(
        id,
        userId,
        familyId,
        family:families!inner(
          id,
          creatorId
        )
      )
    `,
    )
    .eq("id", goalId)
    .eq("memberId", memberId)
    .is("deletedAt", null)
    .single();

  if (!goal) {
    return { hasAccess: false, goal: null };
  }

  // 检查是否是家庭创建者
  const isCreator = goal.member?.family?.creatorId === userId;

  // 检查是否是管理员
  let isAdmin = false;
  if (!isCreator && goal.member?.familyId) {
    const { data: adminMember } = await supabase
      .from("family_members")
      .select("id, role")
      .eq("familyId", goal.member.familyId)
      .eq("userId", userId)
      .eq("role", "ADMIN")
      .is("deletedAt", null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  // 检查是否是本人
  const isSelf = goal.member?.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    goal,
  };
}

/**
 * GET /api/members/:memberId/goals/:goalId
 * 获取单个健康目标
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> },
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限并获取目标
    const { hasAccess, goal } = await verifyGoalAccess(
      goalId,
      memberId,
      session.user.id,
    );

    if (!hasAccess || !goal) {
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
 *
 * Migrated from Prisma to Supabase
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> },
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
        { status: 400 },
      );
    }

    // 验证权限
    const { hasAccess, goal } = await verifyGoalAccess(
      goalId,
      memberId,
      session.user.id,
    );

    if (!hasAccess || !goal) {
      return NextResponse.json({ error: "健康目标不存在" }, { status: 404 });
    }

    const updateData: any = {};

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
        startDate.getTime() +
          validation.data.targetWeeks * 7 * 24 * 60 * 60 * 1000,
      );
      updateData.targetDate = targetDate.toISOString();
    }
    if (validation.data.carbRatio !== undefined)
      updateData.carbRatio = validation.data.carbRatio;
    if (validation.data.proteinRatio !== undefined)
      updateData.proteinRatio = validation.data.proteinRatio;
    if (validation.data.fatRatio !== undefined)
      updateData.fatRatio = validation.data.fatRatio;

    // 重新计算进度
    const currentWeight = updateData.currentWeight ?? goal.currentWeight;
    const targetWeight = updateData.targetWeight ?? goal.targetWeight;
    updateData.progress = calculateProgress(
      goal.startWeight,
      currentWeight,
      targetWeight,
    );

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();
    updateData.updatedAt = now;

    // 更新目标
    const { data: updatedGoal, error: updateError } = await supabase
      .from("health_goals")
      .update(updateData)
      .eq("id", goalId)
      .select()
      .single();

    if (updateError) {
      console.error("更新健康目标失败:", updateError);
      return NextResponse.json({ error: "更新健康目标失败" }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "健康目标更新成功",
        goal: updatedGoal,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("更新健康目标失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/members/:memberId/goals/:goalId
 * 删除健康目标（软删除）
 *
 * Migrated from Prisma to Supabase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> },
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 验证权限
    const { hasAccess, goal } = await verifyGoalAccess(
      goalId,
      memberId,
      session.user.id,
    );

    if (!hasAccess || !goal) {
      return NextResponse.json({ error: "健康目标不存在" }, { status: 404 });
    }

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 软删除目标
    const { error: deleteError } = await supabase
      .from("health_goals")
      .update({ deletedAt: now, updatedAt: now })
      .eq("id", goalId);

    if (deleteError) {
      console.error("删除健康目标失败:", deleteError);
      return NextResponse.json({ error: "删除健康目标失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "健康目标删除成功" }, { status: 200 });
  } catch (error) {
    console.error("删除健康目标失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
