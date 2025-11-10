import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';

// 创建过敏记录的验证 schema
const createAllergySchema = z.object({
  allergenType: z.enum(['FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER']),
  allergenName: z.string().min(1, '过敏原名称不能为空'),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
  description: z.string().optional(),
});

/**
 * 验证用户是否有权限访问成员的过敏信息
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
 * GET /api/members/:memberId/allergies
 * 获取成员的过敏史列表
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
        { error: '无权限访问该成员的过敏史' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 获取过敏记录列表
    const { data: allergies, error } = await supabase
      .from('allergies')
      .select('*')
      .eq('memberId', memberId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('获取过敏史失败:', error);
      return NextResponse.json(
        { error: '获取过敏史失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ allergies: allergies || [] }, { status: 200 });
  } catch (error) {
    console.error('获取过敏史失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/members/:memberId/allergies
 * 添加过敏记录
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
    const validation = createAllergySchema.safeParse(body);
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
        { error: '无权限为该成员添加过敏记录' },
        { status: 403 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 });
    }

    const { allergenType, allergenName, severity, description } = validation.data;

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 创建过敏记录
    const { data: allergy, error: createError } = await supabase
      .from('allergies')
      .insert({
        memberId,
        allergenType,
        allergenName,
        severity,
        description,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('添加过敏记录失败:', createError);
      return NextResponse.json(
        { error: '添加过敏记录失败' },
        { status: 500 }
      );
    }

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
