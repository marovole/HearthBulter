import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// 计算年龄段
function calculateAgeGroup(birthDate: Date): 'CHILD' | 'TEENAGER' | 'ADULT' | 'ELDERLY' {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();

  if (age < 12) return 'CHILD';
  if (age < 18) return 'TEENAGER';
  if (age < 65) return 'ADULT';
  return 'ELDERLY';
}

// 计算 BMI
function calculateBMI(weight: number, height: number): number {
  return Number((weight / Math.pow(height / 100, 2)).toFixed(1));
}

// 创建成员的验证 schema
const createMemberSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: '无效的日期格式',
  }),
  height: z.number().min(30).max(250).optional(),
  weight: z.number().min(2).max(300).optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

// GET /api/families/:id/members - 获取家庭成员列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证用户是否属于该家庭
    const family = await prisma.family.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            healthGoals: {
              where: { deletedAt: null, status: 'ACTIVE' },
            },
            allergies: {
              where: { deletedAt: null },
            },
            dietaryPreference: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    // 检查权限
    const isMember = family.members.some((member) => member.userId === session.user.id);
    const isCreator = family.creatorId === session.user.id;

    if (!isMember && !isCreator) {
      return NextResponse.json(
        { error: '无权限访问该家庭成员' },
        { status: 403 }
      );
    }

    return NextResponse.json({ members: family.members }, { status: 200 });
  } catch (error) {
    console.error('获取成员列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST /api/families/:id/members - 添加家庭成员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
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

    // 验证家庭是否存在以及用户权限
    const family = await prisma.family.findUnique({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { userId: session.user.id, deletedAt: null },
          select: { role: true },
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    // 只有管理员可以添加成员
    const memberRole = family.members[0]?.role;
    const isCreator = family.creatorId === session.user.id;
    const isAdmin = memberRole === 'ADMIN' || isCreator;

    if (!isAdmin) {
      return NextResponse.json(
        { error: '只有管理员可以添加成员' },
        { status: 403 }
      );
    }

    const { name, gender, birthDate, height, weight, avatar, role } = validation.data;
    const birthDateObj = new Date(birthDate);

    // 计算 BMI 和年龄段
    const bmi = height && weight ? calculateBMI(weight, height) : undefined;
    const ageGroup = calculateAgeGroup(birthDateObj);

    // 创建成员
    const member = await prisma.familyMember.create({
      data: {
        name,
        gender,
        birthDate: birthDateObj,
        height,
        weight,
        avatar,
        bmi,
        ageGroup,
        familyId: id,
        role: role || 'MEMBER',
      },
      include: {
        healthGoals: true,
        allergies: true,
        dietaryPreference: true,
      },
    });

    return NextResponse.json(
      {
        message: '成员添加成功',
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('添加成员失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
