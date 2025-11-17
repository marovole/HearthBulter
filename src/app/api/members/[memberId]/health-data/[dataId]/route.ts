import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * 验证用户是否有权限访问成员的健康数据
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
async function verifyMemberAccess(
  memberId: string,
  userId: string
): Promise<{ hasAccess: boolean }> {
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
    return { hasAccess: false };
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
  };
}

/**
 * DELETE /api/members/:memberId/health-data/:dataId
 * 删除健康数据记录
 *
 * Migrated from Prisma to Supabase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string; dataId: string }> }
) {
  try {
    const { memberId, dataId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证权限
    const { hasAccess } = await verifyMemberAccess(memberId, session.user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限删除该成员的健康数据' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 检查记录是否存在且属于该成员
    const { data: healthData } = await supabase
      .from('health_data')
      .select('id')
      .eq('id', dataId)
      .eq('memberId', memberId)
      .maybeSingle();

    if (!healthData) {
      return NextResponse.json(
        { error: '健康数据记录不存在' },
        { status: 404 }
      );
    }

    // 删除记录
    const { error: deleteError } = await supabase
      .from('health_data')
      .delete()
      .eq('id', dataId);

    if (deleteError) {
      console.error('删除健康数据失败:', deleteError);
      return NextResponse.json(
        { error: '删除健康数据失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: '健康数据删除成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除健康数据失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
