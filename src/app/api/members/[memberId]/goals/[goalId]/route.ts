import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// 更新健康目标的验证 schema
const updateGoalSchema = z.object({
  currentWeight: z.number().min(20).max(300).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']).optional(),
  targetWeight: z.number().min(20).max(300).optional(),
  targetWeeks: z.number().min(1).max(52).optional(),
  carbRatio: z.number().min(0).max(1).optional(),
  proteinRatio: z.number().min(0).max(1).optional(),
  fatRatio: z.number().min(0).max(1).optional(),
});

// 计算进度
function calculateProgress(startWeight: number | null, currentWeight: number | null, targetWeight: number | null): number {
  if (!startWeight || !currentWeight || !targetWeight) return 0;

  const totalChange = targetWeight - startWeight;
  const currentChange = currentWeight - startWeight;

  if (totalChange === 0) return 0;

  const progress = (currentChange / totalChange) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

// GET /api/members/:memberId/goals/:goalId - 获取单个健康目标
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取目标信息
    const goal = await prisma.healthGoal.findUnique({
      where: {
        id: goalId,
        memberId,
        deletedAt: null,
      },
      include: {
        member: {
          include: {
            family: {
              select: {
                creatorId: true,
                members: {
                  where: { userId: session.user.id, deletedAt: null },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: '健康目标不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = goal.member.family.creatorId === session.user.id;
    const isAdmin = goal.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = goal.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限访问该健康目标' },
        { status: 403 }
      );
    }

    return NextResponse.json({ goal }, { status: 200 });
  } catch (error) {
    console.error('获取健康目标失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PATCH /api/members/:memberId/goals/:goalId - 更新健康目标
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = updateGoalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 获取目标信息
    const goal = await prisma.healthGoal.findUnique({
      where: {
        id: goalId,
        memberId,
        deletedAt: null,
      },
      include: {
        member: {
          include: {
            family: {
              select: {
                creatorId: true,
                members: {
                  where: { userId: session.user.id, deletedAt: null },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: '健康目标不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = goal.member.family.creatorId === session.user.id;
    const isAdmin = goal.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = goal.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限修改该健康目标' },
        { status: 403 }
      );
    }

    const updateData: any = {};

    // 处理更新字段
    if (validation.data.currentWeight !== undefined) {
      updateData.currentWeight = validation.data.currentWeight;
    }
    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.targetWeight !== undefined) updateData.targetWeight = validation.data.targetWeight;
    if (validation.data.targetWeeks !== undefined) {
      updateData.targetWeeks = validation.data.targetWeeks;
      // 重新计算目标日期
      updateData.targetDate = new Date(goal.startDate.getTime() + validation.data.targetWeeks * 7 * 24 * 60 * 60 * 1000);
    }
    if (validation.data.carbRatio !== undefined) updateData.carbRatio = validation.data.carbRatio;
    if (validation.data.proteinRatio !== undefined) updateData.proteinRatio = validation.data.proteinRatio;
    if (validation.data.fatRatio !== undefined) updateData.fatRatio = validation.data.fatRatio;

    // 重新计算进度
    const currentWeight = updateData.currentWeight ?? goal.currentWeight;
    const targetWeight = updateData.targetWeight ?? goal.targetWeight;
    updateData.progress = calculateProgress(goal.startWeight, currentWeight, targetWeight);

    // 更新目标
    const updatedGoal = await prisma.healthGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    return NextResponse.json(
      {
        message: '健康目标更新成功',
        goal: updatedGoal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新健康目标失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/members/:memberId/goals/:goalId - 删除健康目标（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; goalId: string }> }
) {
  try {
    const { memberId, goalId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取目标信息
    const goal = await prisma.healthGoal.findUnique({
      where: {
        id: goalId,
        memberId,
        deletedAt: null,
      },
      include: {
        member: {
          include: {
            family: {
              select: {
                creatorId: true,
                members: {
                  where: { userId: session.user.id, deletedAt: null },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: '健康目标不存在' }, { status: 404 });
    }

    // 验证权限：管理员或自己可以删除
    const isCreator = goal.member.family.creatorId === session.user.id;
    const isAdmin = goal.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = goal.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限删除该健康目标' },
        { status: 403 }
      );
    }

    // 软删除目标
    await prisma.healthGoal.update({
      where: { id: goalId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: '健康目标删除成功' }, { status: 200 });
  } catch (error) {
    console.error('删除健康目标失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
