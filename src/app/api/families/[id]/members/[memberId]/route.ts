import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// 计算 BMI
function calculateBMI(weight: number, height: number): number {
  return Number((weight / Math.pow(height / 100, 2)).toFixed(1));
}

// 计算年龄段
function calculateAgeGroup(birthDate: Date): 'CHILD' | 'TEENAGER' | 'ADULT' | 'ELDERLY' {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  if (age < 12) return 'CHILD';
  if (age < 18) return 'TEENAGER';
  if (age < 65) return 'ADULT';
  return 'ELDERLY';
}

// 更新成员的验证 schema
const updateMemberSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  birthDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: '无效的日期格式',
    })
    .optional(),
  height: z.number().min(30).max(250).optional(),
  weight: z.number().min(2).max(300).optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

// GET /api/families/:id/members/:memberId - 获取成员详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取成员详情
    const member = await prisma.familyMember.findUnique({
      where: {
        id: memberId,
        familyId: id,
        deletedAt: null,
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            creatorId: true,
          },
        },
        healthGoals: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        allergies: {
          where: { deletedAt: null },
        },
        dietaryPreference: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = member.family.creatorId === session.user.id;
    const isSelf = member.userId === session.user.id;

    // 检查是否是家庭成员
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        familyId: id,
        userId: session.user.id,
        deletedAt: null,
      },
    });

    if (!isCreator && !isSelf && !familyMember) {
      return NextResponse.json(
        { error: '无权限访问该成员信息' },
        { status: 403 }
      );
    }

    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    console.error('获取成员详情失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PATCH /api/families/:id/members/:memberId - 更新成员信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = updateMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 获取成员和家庭信息
    const member = await prisma.familyMember.findUnique({
      where: {
        id: memberId,
        familyId: id,
        deletedAt: null,
      },
      include: {
        family: {
          select: {
            creatorId: true,
            members: {
              where: {
                userId: session.user.id,
                deletedAt: null,
              },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    // 验证权限：管理员或自己
    const isCreator = member.family.creatorId === session.user.id;
    const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限修改该成员信息' },
        { status: 403 }
      );
    }

    const updateData: any = {};

    // 处理更新字段
    if (validation.data.name) updateData.name = validation.data.name;
    if (validation.data.gender) updateData.gender = validation.data.gender;
    if (validation.data.avatar !== undefined) updateData.avatar = validation.data.avatar;

    if (validation.data.birthDate) {
      const birthDateObj = new Date(validation.data.birthDate);
      updateData.birthDate = birthDateObj;
      updateData.ageGroup = calculateAgeGroup(birthDateObj);
    }

    // 处理身高体重更新，重新计算 BMI
    if (validation.data.height !== undefined) {
      updateData.height = validation.data.height;
    }

    if (validation.data.weight !== undefined) {
      updateData.weight = validation.data.weight;
    }

    // 如果身高或体重有更新，重新计算 BMI
    const currentHeight = updateData.height ?? member.height;
    const currentWeight = updateData.weight ?? member.weight;

    if (currentHeight && currentWeight) {
      updateData.bmi = calculateBMI(currentWeight, currentHeight);
    }

    // 只有管理员可以修改角色
    if (validation.data.role && isAdmin) {
      updateData.role = validation.data.role;
    }

    // 更新成员信息
    const updatedMember = await prisma.familyMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        healthGoals: {
          where: { deletedAt: null },
        },
        allergies: {
          where: { deletedAt: null },
        },
        dietaryPreference: true,
      },
    });

    return NextResponse.json(
      {
        message: '成员信息更新成功',
        member: updatedMember,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新成员信息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/families/:id/members/:memberId - 删除成员（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取成员信息
    const member = await prisma.familyMember.findUnique({
      where: {
        id: memberId,
        familyId: id,
        deletedAt: null,
      },
      include: {
        family: {
          select: {
            creatorId: true,
            members: {
              where: {
                userId: session.user.id,
                deletedAt: null,
              },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    // 只有管理员可以删除成员
    const isCreator = member.family.creatorId === session.user.id;
    const isAdmin = member.family.members[0]?.role === 'ADMIN' || isCreator;

    if (!isAdmin) {
      return NextResponse.json(
        { error: '只有管理员可以删除成员' },
        { status: 403 }
      );
    }

    // 软删除成员
    await prisma.familyMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: '成员删除成功' }, { status: 200 });
  } catch (error) {
    console.error('删除成员失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
