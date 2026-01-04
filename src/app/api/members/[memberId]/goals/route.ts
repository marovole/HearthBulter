import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { memberRepository } from '@/lib/repositories/member-repository-singleton';
import { z } from 'zod';

// 计算 BMR (基础代谢率) - Mifflin-St Jeor 公式

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string,
): number {
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
  SEDENTARY: 1.2, // 久坐
  LIGHT: 1.375, // 轻度活动
  MODERATE: 1.55, // 中度活动
  ACTIVE: 1.725, // 高度活动
  VERY_ACTIVE: 1.9, // 非常活跃
};

// 创建健康目标的验证 schema
const createGoalSchema = z.object({
  goalType: z.enum([
    'LOSE_WEIGHT',
    'GAIN_MUSCLE',
    'MAINTAIN',
    'IMPROVE_HEALTH',
  ]),
  targetWeight: z.number().min(20).max(300).optional(),
  targetWeeks: z.number().min(1).max(52).optional(),
  activityLevel: z
    .enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'])
    .default('MODERATE'),
  carbRatio: z.number().min(0).max(1).optional().default(0.5),
  proteinRatio: z.number().min(0).max(1).optional().default(0.2),
  fatRatio: z.number().min(0).max(1).optional().default(0.3),
});

/**
 * GET /api/members/:memberId/goals
 * 获取成员的健康目标列表
 *
 * 使用双写框架迁移
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const { memberId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 使用 Repository 验证权限
    const { hasAccess } = await memberRepository.verifyMemberAccess(
      memberId,
      session.user.id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的健康目标' },
        { status: 403 },
      );
    }

    // 使用 Repository 获取健康目标列表（包含所有状态）
    const healthGoals = await memberRepository.getHealthGoals(
      memberId,
      true, // includeInactive
    );

    return NextResponse.json({ goals: healthGoals }, { status: 200 });
  } catch (error) {
    console.error('获取健康目标失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * POST /api/members/:memberId/goals
 * 创建新的健康目标
 *
 * 使用双写框架迁移 - 保留 BMR/TDEE 计算业务逻辑
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
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
        { status: 400 },
      );
    }

    // 使用 Repository 验证权限
    const { hasAccess, member } = await memberRepository.verifyMemberAccess(
      memberId,
      session.user.id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员创建健康目标' },
        { status: 403 },
      );
    }

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    const {
      goalType,
      targetWeight,
      targetWeeks,
      activityLevel,
      carbRatio,
      proteinRatio,
      fatRatio,
    } = validation.data;

    // 为了计算 BMR/TDEE，需要获取成员的详细信息
    // 注意：verifyMemberAccess 返回的 member 对象不包含这些字段
    // 这里需要单独查询（保留业务逻辑层）
    const { SupabaseClientManager } = await import('@/lib/db/supabase-adapter');
    const supabase = SupabaseClientManager.getInstance();
    const { data: memberDetails } = await supabase
      .from('family_members')
      .select('birthDate, gender, weight, height')
      .eq('id', memberId)
      .is('deletedAt', null)
      .single();

    if (!memberDetails) {
      return NextResponse.json(
        { error: '无法获取成员详细信息' },
        { status: 500 },
      );
    }

    // 计算年龄（业务逻辑）
    const birthDate = new Date(memberDetails.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // 计算 BMR 和 TDEE（业务逻辑）
    const bmr =
      memberDetails.weight && memberDetails.height
        ? calculateBMR(
            memberDetails.weight,
            memberDetails.height,
            age,
            memberDetails.gender,
          )
        : undefined;

    const activityFactor = ACTIVITY_FACTORS[activityLevel];
    const tdee = bmr ? calculateTDEE(bmr, activityFactor) : undefined;

    // 计算目标日期（业务逻辑）
    const startDate = new Date();
    const targetDate = targetWeeks
      ? new Date(startDate.getTime() + targetWeeks * 7 * 24 * 60 * 60 * 1000)
      : undefined;

    // 使用 Repository 创建健康目标
    const goal = await memberRepository.createHealthGoal(memberId, {
      goalType,
      targetWeight,
      currentWeight: memberDetails.weight,
      startWeight: memberDetails.weight,
      targetWeeks,
      startDate,
      targetDate,
      bmr,
      tdee,
      activityFactor,
      carbRatio,
      proteinRatio,
      fatRatio,
    });

    return NextResponse.json(
      {
        message: '健康目标创建成功',
        goal,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('创建健康目标失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
