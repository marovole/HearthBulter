import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyFamilyAccess, verifyFamilyAdmin } from '@/lib/auth/permissions';
import { familyRepository } from '@/lib/repositories/family-repository-singleton';
import type { AgeGroup } from '@/lib/repositories/types/family';
import { z } from 'zod';

// 创建成员的验证 schema

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
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

/**
 * GET /api/families/[familyId]/members
 * 获取家庭成员列表
 *
 * 使用双写框架迁移
 */
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
    const family = await verifyFamilyAccess(familyId, session.user.id);

    if (!family) {
      return NextResponse.json({ error: '家庭不存在或无权访问' }, { status: 404 });
    }

    // 使用 FamilyRepository 获取成员列表
    const members = await familyRepository.listFamilyMembers(
      familyId,
      false // includeDeleted = false
    );

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error('获取家庭成员列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/families/[familyId]/members
 * 创建家庭成员
 *
 * 使用双写框架迁移
 */
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
    const family = await verifyFamilyAdmin(familyId, session.user.id);

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
      const isMember = await familyRepository.isUserFamilyMember(
        familyId,
        userId
      );

      if (isMember) {
        return NextResponse.json(
          { error: '该用户已经是家庭成员' },
          { status: 400 }
        );
      }
    }

    // 计算 BMI
    const bmi = height && weight
      ? Number((weight / Math.pow(height / 100, 2)).toFixed(1))
      : null;

    // 计算年龄段
    const age = new Date().getFullYear() - birthDate.getFullYear();
    let ageGroup: AgeGroup;
    if (age < 2) ageGroup = 'INFANT';
    else if (age < 13) ageGroup = 'CHILD';
    else if (age < 20) ageGroup = 'TEEN';
    else if (age < 60) ageGroup = 'ADULT';
    else ageGroup = 'SENIOR';

    // 使用 FamilyRepository 创建成员
    // 注意：userId 可以为空，允许创建不关联系统用户的成员（如儿童档案）
    const member = await familyRepository.addFamilyMember({
      familyId,
      userId: userId, // 保持原有逻辑：可选字段，允许为 undefined
      name,
      email: undefined,
      avatar,
      role: role || 'MEMBER',
      gender,
      birthDate,
      height,
      weight,
      bmi,
      ageGroup,
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
