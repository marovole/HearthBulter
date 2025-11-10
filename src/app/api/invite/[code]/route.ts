import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/invite/:code
 * 获取邀请信息
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = SupabaseClientManager.getInstance();

    // 查找邀请记录
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .select(`
        *,
        family:families!inner(
          id,
          name,
          description
        )
      `)
      .eq('inviteCode', code)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: '邀请码无效' },
        { status: 404 }
      );
    }

    // 检查邀请是否过期
    if (new Date(invitation.expiresAt) < new Date()) {
      // 自动标记为过期
      await supabase
        .from('family_invitations')
        .update({ status: 'EXPIRED', updatedAt: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: '邀请已过期' },
        { status: 410 }
      );
    }

    // 检查邀请状态
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: '该邀请已被接受' },
        { status: 410 }
      );
    }

    if (invitation.status === 'REJECTED') {
      return NextResponse.json(
        { error: '该邀请已被拒绝' },
        { status: 410 }
      );
    }

    // 获取家庭成员数量
    const { count: memberCount } = await supabase
      .from('family_members')
      .select('id', { count: 'exact', head: true })
      .eq('familyId', invitation.family.id)
      .is('deletedAt', null);

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
        family: {
          id: invitation.family.id,
          name: invitation.family.name,
          description: invitation.family.description,
          memberCount: memberCount || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取邀请信息失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invite/:code
 * 接受邀请并加入家庭
 *
 * Migrated from Prisma to Supabase
 * WARNING: This endpoint performs multiple operations that should be atomic
 * Consider using RPC function for production
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录后再接受邀请' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { memberName } = body;

    if (!memberName || typeof memberName !== 'string' || memberName.trim() === '') {
      return NextResponse.json(
        { error: '请提供成员名称' },
        { status: 400 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    // 查找邀请记录
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .select(`
        *,
        family:families!inner(
          id,
          name,
          creatorId
        )
      `)
      .eq('inviteCode', code)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: '邀请码无效' },
        { status: 404 }
      );
    }

    // 检查邀请是否过期
    if (new Date(invitation.expiresAt) < new Date()) {
      // 自动标记为过期
      await supabase
        .from('family_invitations')
        .update({ status: 'EXPIRED', updatedAt: new Date().toISOString() })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: '邀请已过期' },
        { status: 410 }
      );
    }

    // 检查邀请状态
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: '该邀请不可用' },
        { status: 410 }
      );
    }

    // 验证邮箱匹配
    if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: '邀请邮箱与登录邮箱不匹配' },
        { status: 403 }
      );
    }

    // 检查用户是否已经是该家庭的成员
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('familyId', invitation.family.id)
      .eq('userId', session.user.id)
      .is('deletedAt', null)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: '您已经是该家庭的成员' },
        { status: 400 }
      );
    }

    // 检查用户是否已经属于其他家庭
    const { data: userInOtherFamily } = await supabase
      .from('family_members')
      .select('id, familyId')
      .eq('userId', session.user.id)
      .is('deletedAt', null)
      .neq('familyId', invitation.family.id)
      .maybeSingle();

    if (userInOtherFamily) {
      return NextResponse.json(
        { error: '您已经属于另一个家庭，请先退出后再加入新家庭' },
        { status: 400 }
      );
    }

    // ⚠️ 注意：以下操作应该在事务中执行，但 Supabase JS 客户端不支持事务
    // 生产环境应该使用 RPC 函数来保证原子性

    // 创建家庭成员档案
    const now = new Date().toISOString();
    const { data: newMember, error: createError } = await supabase
      .from('family_members')
      .insert({
        familyId: invitation.family.id,
        userId: session.user.id,
        name: memberName.trim(),
        gender: 'MALE', // 默认性别，用户后续可更新
        birthDate: new Date('2000-01-01').toISOString(), // 默认出生日期
        role: invitation.role,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (createError) {
      console.error('创建家庭成员失败:', createError);
      return NextResponse.json(
        { error: '加入家庭失败' },
        { status: 500 }
      );
    }

    // 更新邀请状态为已接受
    const { error: updateError } = await supabase
      .from('family_invitations')
      .update({
        status: 'ACCEPTED',
        updatedAt: now,
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('更新邀请状态失败:', updateError);
      // 注意：此时成员已创建，但邀请状态未更新，存在数据不一致风险
      // 生产环境应该使用 RPC 函数或手动回滚
    }

    return NextResponse.json(
      {
        message: '成功加入家庭',
        family: {
          id: invitation.family.id,
          name: invitation.family.name,
        },
        member: {
          id: newMember.id,
          name: newMember.name,
          role: newMember.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('加入家庭失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
