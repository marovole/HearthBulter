import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mealPlanner } from '@/lib/services/meal-planner';
import { z } from 'zod';

// 创建食谱计划的验证 schema
const createMealPlanSchema = z.object({
  days: z.number().min(1).max(14).default(7), // 默认7天
  startDate: z.string().datetime().optional(), // ISO 8601 格式
});

// POST /api/members/:memberId/meal-plans - 生成新食谱计划
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId, deletedAt: null },
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
    });

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    const isCreator = member.family.creatorId === session.user.id;
    const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限为该成员生成食谱' },
        { status: 403 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const validatedData = createMealPlanSchema.parse(body);

    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : undefined;

    // 生成食谱计划
    const planData = await mealPlanner.generateMealPlan(
      memberId,
      validatedData.days,
      startDate
    );

    return NextResponse.json(
      {
        message: '食谱计划生成成功',
        plan: planData,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('生成食谱计划失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// GET /api/members/:memberId/meal-plans - 查询历史食谱
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId, deletedAt: null },
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
    });

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    const isCreator = member.family.creatorId === session.user.id;
    const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限查看该成员的食谱' },
        { status: 403 }
      );
    }

    // 查询数据库中的食谱计划
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        memberId,
        deletedAt: null,
      },
      include: {
        meals: {
          include: {
            ingredients: {
              include: {
                food: true,
              },
            },
          },
          orderBy: [
            { date: 'asc' },
            { mealType: 'asc' },
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ mealPlans }, { status: 200 });
  } catch (error) {
    console.error('查询食谱计划失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
