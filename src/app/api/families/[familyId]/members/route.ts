import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// 创建成员的验证 schema
const createMemberSchema = z.object({
  name: z.string().min(1, '成员名称不能为空'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().transform(str => new Date(str)),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  avatar: z.string().optional(),
  userId: z.string().optional(), // 可选：关联到系统用户
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

// GET /api/families/[familyId]/members - 获取家庭成员列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { familyId } = await params;

    // 验证用户是否有权限访问该家庭
    const family = await prisma.family.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
        OR: [
          { creatorId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                deletedAt: null,
              },
            },
          },
        ],
      },
    });

    if (!family) {
      return NextResponse.json({ error: '家庭不存在或无权访问' }, { status: 404 });
    }

    // 获取成员列表
    const members = await prisma.familyMember.findMany({
      where: {
        familyId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error('获取家庭成员列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST /api/families/[familyId]/members - 创建家庭成员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { familyId } = await params;

    // 验证用户是否有权限管理该家庭
    const family = await prisma.family.findFirst({
      where: {
        id: familyId,
        deletedAt: null,
        OR: [
          { creatorId: session.user.id },
          {
            members: {
              some: {
                userId: session.user.id,
                role: 'ADMIN',
                deletedAt: null,
              },
            },
          },
        ],
      },
    });

    if (!family) {
      return NextResponse.json({ error: '家庭不存在或无权限创建成员' }, { status: 403 });
    }

    const body = await request.json();

    // 验证输入数据
    const validation = createMemberSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, gender, birthDate, height, weight, avatar, userId, role } = validation.data;

    // 如果提供了 userId，检查是否已经存在该用户的成员
    if (userId) {
      const existingMember = await prisma.familyMember.findFirst({
        where: {
          familyId,
          userId,
          deletedAt: null,
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: '该用户已经是家庭成员' },
          { status: 400 }
        );
      }
    }

    // 计算 BMI
    const bmi = height && weight
      ? Number((weight / Math.pow(height / 100, 2)).toFixed(1))
      : undefined;

    // 计算年龄段
    const age = new Date().getFullYear() - birthDate.getFullYear();
    let ageGroup: 'INFANT' | 'CHILD' | 'TEEN' | 'ADULT' | 'SENIOR' | undefined;
    if (age < 2) ageGroup = 'INFANT';
    else if (age < 13) ageGroup = 'CHILD';
    else if (age < 20) ageGroup = 'TEEN';
    else if (age < 60) ageGroup = 'ADULT';
    else ageGroup = 'SENIOR';

    // 创建成员
    const member = await prisma.familyMember.create({
      data: {
        name,
        gender,
        birthDate,
        height,
        weight,
        avatar,
        bmi,
        ageGroup,
        familyId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: '成员创建成功',
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建家庭成员失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
