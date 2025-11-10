import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';

// 计算 BMR (基础代谢率) - Mifflin-St Jeor 公式
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'MALE') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
}

// 计算 TDEE (每日总能量消耗)
function calculateTDEE(bmr: number, activityFactor: number): number {
  return Math.round(bmr * activityFactor);
}

// 活动系数映射
const ACTIVITY_FACTORS = {
  SEDENTARY: 1.2,       // 久坐
  LIGHT: 1.375,         // 轻度活动
  MODERATE: 1.55,       // 中度活动
  ACTIVE: 1.725,        // 高度活动
  VERY_ACTIVE: 1.9,     // 非常活跃
};

// 创建健康目标的验证 schema
const createGoalSchema = z.object({
  goalType: z.enum(['LOSE_WEIGHT', 'GAIN_MUSCLE', 'MAINTAIN', 'IMPROVE_HEALTH']),
  targetWeight: z.number().min(20).max(300).optional(),
  targetWeeks: z.number().min(1).max(52).optional(),
  activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE']).default('MODERATE'),
  carbRatio: z.number().min(0).max(1).optional().default(0.5),
  proteinRatio: z.number().min(0).max(1).optional().default(0.2),
  fatRatio: z.number().min(0).max(1).optional().default(0.3),
});

/**
 * 验证用户是否有权限访问成员的健康目标
 *
 * Migrated from Prisma to Supabase
 */
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; member: any }> {
  const supabase = SupabaseClientManager.getInstance();

  const { data: member } = await supabase
    .from('family_members')
    .select(`
      id,
      userId,
      familyId,
      birthDate,
      gender,
      weight,
      height,
      family:families!inner(
        id,
        creatorId
      )
    `)
    .eq('id', memberId)
    .is('deletedAt', null)
    .single();

  if (!member) {
    return { hasAccess: false, member: null };
  }

  // 检查是否是家庭创建者
  const isCreator = member.family?.creatorId === userId;

  // 检查是否是管理员
  let isAdmin = false;
  if (!isCreator) {
    const { data: adminMember } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('familyId', member.familyId)
      .eq('userId', userId)
      .eq('role', 'ADMIN')
      .is('deletedAt', null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  // 检查是否是本人
  const isSelf = member.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    member,
  };
}

/**
 * GET /api/members/:memberId/goals
 * 获取成员的健康目标列表
 *
 * Migrated from Prisma to Supabase
 */
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
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的健康目标' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取健康目标列表
    const { data: healthGoals, error } = await supabase
      .from('health_goals')
      .select('*')
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('获取健康目标失败:', error);
      return NextResponse.json(
        { error: '获取健康目标失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goals: healthGoals || [] }, { status: 200 });
  } catch (error) {
    console.error('获取健康目标失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/:memberId/goals
 * 创建新的健康目标
 *
 * Migrated from Prisma to Supabase
 */
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
    const validation = createGoalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: '输入数据无效', details: validation.error.errors },
        { status: 400 }
      );
    }

    // 验证权限并获取成员信息
    const { hasAccess, member } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员创建健康目标' },
        { status: 403 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    const { goalType, targetWeight, targetWeeks, activityLevel, carbRatio, proteinRatio, fatRatio } = validation.data;

    // 计算年龄
    const birthDate = new Date(member.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // 计算 BMR 和 TDEE
    const bmr = member.weight && member.height
      ? calculateBMR(member.weight, member.height, age, member.gender)
      : null;

    const activityFactor = ACTIVITY_FACTORS[activityLevel];
    const tdee = bmr ? calculateTDEE(bmr, activityFactor) : null;

    // 计算目标日期
    const startDate = new Date();
    const targetDate = targetWeeks
      ? new Date(startDate.getTime() + targetWeeks * 7 * 24 * 60 * 60 * 1000)
      : null;

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 创建健康目标
    const { data: goal, error: createError } = await supabase
      .from('health_goals')
      .insert({
        memberId,
        goalType,
        targetWeight,
        currentWeight: member.weight,
        startWeight: member.weight,
        targetWeeks,
        startDate: startDate.toISOString(),
        targetDate: targetDate ? targetDate.toISOString() : null,
        bmr,
        tdee,
        activityFactor,
        carbRatio,
        proteinRatio,
        fatRatio,
        status: 'ACTIVE',
        progress: 0,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('创建健康目标失败:', createError);
      return NextResponse.json(
        { error: '创建健康目标失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: '健康目标创建成功',
        goal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建健康目标失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
