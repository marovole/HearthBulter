import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { z } from 'zod';

// 更新过敏记录的验证 schema

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
const updateAllergySchema = z.object({
  allergenType: z.enum(['FOOD', 'ENVIRONMENTAL', 'MEDICATION', 'OTHER']).optional(),
  allergenName: z.string().min(1).optional(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']).optional(),
  description: z.string().optional(),
});

/**
 * 验证用户是否有权限访问过敏记录
 *
 * Migrated from Prisma to Supabase
 */
async function verifyAllergyAccess(
  allergyId: string,
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean; allergy: any }> {
  const supabase = SupabaseClientManager.getInstance();

  // 获取过敏记录及其成员信息
  const { data: allergy } = await supabase
    .from('allergies')
    .select(`
      *,
      member:family_members!inner(
        id,
        userId,
        familyId,
        family:families!inner(
          id,
          creatorId
        )
      )
    `)
    .eq('id', allergyId)
    .eq('memberId', memberId)
    .is('deletedAt', null)
    .single();

  if (!allergy) {
    return { hasAccess: false, allergy: null };
  }

  // 检查是否是家庭创建者
  const isCreator = allergy.member?.family?.creatorId === userId;

  // 检查是否是管理员
  let isAdmin = false;
  if (!isCreator && allergy.member?.familyId) {
    const { data: adminMember } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('familyId', allergy.member.familyId)
      .eq('userId', userId)
      .eq('role', 'ADMIN')
      .is('deletedAt', null)
      .maybeSingle();

    isAdmin = !!adminMember;
  }

  // 检查是否是本人
  const isSelf = allergy.member?.userId === userId;

  return {
    hasAccess: isCreator || isAdmin || isSelf,
    allergy,
  };
}

/**
 * GET /api/members/:memberId/allergies/:allergyId
 * 获取单个过敏记录
 *
 * Migrated from Prisma to Supabase
 */
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

    // 验证权限并获取过敏记录
    const { hasAccess, allergy } = await verifyAllergyAccess(
      allergyId,
      memberId,
      session.user.id
    );

    if (!hasAccess || !allergy) {
      return NextResponse.json({ error: '过敏记录不存在' }, { status: 404 });
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

/**
 * PATCH /api/members/:memberId/allergies/:allergyId
 * 更新过敏记录
 *
 * Migrated from Prisma to Supabase
 */
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

    // 验证权限
    const { hasAccess, allergy } = await verifyAllergyAccess(
      allergyId,
      memberId,
      session.user.id
    );

    if (!hasAccess || !allergy) {
      return NextResponse.json({ error: '过敏记录不存在' }, { status: 404 });
    }

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 更新过敏记录
    const { data: updatedAllergy, error: updateError } = await supabase
      .from('allergies')
      .update({
        ...validation.data,
        updatedAt: now,
      })
      .eq('id', allergyId)
      .select()
      .single();

    if (updateError) {
      console.error('更新过敏记录失败:', updateError);
      return NextResponse.json(
        { error: '更新过敏记录失败' },
        { status: 500 }
      );
    }

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

/**
 * DELETE /api/members/:memberId/allergies/:allergyId
 * 删除过敏记录（软删除）
 *
 * Migrated from Prisma to Supabase
 */
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

    // 验证权限
    const { hasAccess, allergy } = await verifyAllergyAccess(
      allergyId,
      memberId,
      session.user.id
    );

    if (!hasAccess || !allergy) {
      return NextResponse.json({ error: '过敏记录不存在' }, { status: 404 });
    }

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 软删除过敏记录
    const { error: deleteError } = await supabase
      .from('allergies')
      .update({ deletedAt: now, updatedAt: now })
      .eq('id', allergyId);

    if (deleteError) {
      console.error('删除过敏记录失败:', deleteError);
      return NextResponse.json(
        { error: '删除过敏记录失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '过敏记录删除成功' }, { status: 200 });
  } catch (error) {
    console.error('删除过敏记录失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
