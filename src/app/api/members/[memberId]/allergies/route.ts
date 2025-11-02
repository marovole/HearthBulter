import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// 创建过敏记录的验证 schema
const createAllergySchema = z.object({
  allergenType: z.enum(['FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER']),
  allergenName: z.string().min(1, '过敏原名称不能为空'),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
  description: z.string().optional(),
});

// GET /api/members/:memberId/allergies - 获取成员的过敏史列表
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

    // 获取成员信息并验证权限
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
        allergies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = member.family.creatorId === session.user.id;
    const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限访问该成员的过敏史' },
        { status: 403 }
      );
    }

    return NextResponse.json({ allergies: member.allergies }, { status: 200 });
  } catch (error) {
    console.error('获取过敏史失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST /api/members/:memberId/allergies - 添加过敏记录
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

    const body = await request.json();

    // 验证输入数据
    const validation = createAllergySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 获取成员信息
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

    // 验证权限
    const isCreator = member.family.creatorId === session.user.id;
    const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限为该成员添加过敏记录' },
        { status: 403 }
      );
    }

    const { allergenType, allergenName, severity, description } = validation.data;

    // 创建过敏记录
    const allergy = await prisma.allergy.create({
      data: {
        memberId,
        allergenType,
        allergenName,
        severity,
        description,
      },
    });

    return NextResponse.json(
      {
        message: '过敏记录添加成功',
        allergy,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('添加过敏记录失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
