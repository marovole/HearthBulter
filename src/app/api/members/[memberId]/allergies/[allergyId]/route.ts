import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// 更新过敏记录的验证 schema
const updateAllergySchema = z.object({
  allergenType: z.enum(['FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER']).optional(),
  allergenName: z.string().min(1).optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']).optional(),
  description: z.string().optional(),
});

// GET /api/members/:memberId/allergies/:allergyId - 获取单个过敏记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; allergyId: string }> }
) {
  try {
    const { memberId, allergyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取过敏记录
    const allergy = await prisma.allergy.findUnique({
      where: {
        id: allergyId,
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

    if (!allergy) {
      return NextResponse.json({ error: '过敏记录不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = allergy.member.family.creatorId === session.user.id;
    const isAdmin = allergy.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = allergy.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限访问该过敏记录' },
        { status: 403 }
      );
    }

    return NextResponse.json({ allergy }, { status: 200 });
  } catch (error) {
    console.error('获取过敏记录失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// PATCH /api/members/:memberId/allergies/:allergyId - 更新过敏记录
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; allergyId: string }> }
) {
  try {
    const { memberId, allergyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = updateAllergySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 获取过敏记录
    const allergy = await prisma.allergy.findUnique({
      where: {
        id: allergyId,
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

    if (!allergy) {
      return NextResponse.json({ error: '过敏记录不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = allergy.member.family.creatorId === session.user.id;
    const isAdmin = allergy.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = allergy.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限修改该过敏记录' },
        { status: 403 }
      );
    }

    // 更新过敏记录
    const updatedAllergy = await prisma.allergy.update({
      where: { id: allergyId },
      data: validation.data,
    });

    return NextResponse.json(
      {
        message: '过敏记录更新成功',
        allergy: updatedAllergy,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新过敏记录失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/members/:memberId/allergies/:allergyId - 删除过敏记录（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; allergyId: string }> }
) {
  try {
    const { memberId, allergyId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取过敏记录
    const allergy = await prisma.allergy.findUnique({
      where: {
        id: allergyId,
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

    if (!allergy) {
      return NextResponse.json({ error: '过敏记录不存在' }, { status: 404 });
    }

    // 验证权限
    const isCreator = allergy.member.family.creatorId === session.user.id;
    const isAdmin = allergy.member.family.members[0]?.role === 'ADMIN' || isCreator;
    const isSelf = allergy.member.userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: '无权限删除该过敏记录' },
        { status: 403 }
      );
    }

    // 软删除过敏记录
    await prisma.allergy.update({
      where: { id: allergyId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: '过敏记录删除成功' }, { status: 200 });
  } catch (error) {
    console.error('删除过敏记录失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
