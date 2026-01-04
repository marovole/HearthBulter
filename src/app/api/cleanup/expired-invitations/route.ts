import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/cleanup/expired-invitations - 清理过期邀请
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // 验证管理员权限（仅管理员可执行清理任务）
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限执行此操作' }, { status: 403 });
    }

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();

    // 清理过期邀请（使用Supabase）
    const { data: expiredInvitations, error: expiredError } = await supabase
      .from('family_invitations')
      .update({ status: 'EXPIRED' } as any)
      .eq('status', 'PENDING')
      .lt('expiresAt', now)
      .select('id');

    if (expiredError) {
      console.error('更新过期邀请失败:', expiredError);
      return NextResponse.json({ error: '清理过期邀请失败' }, { status: 500 });
    }

    // 软删除超过30天的已过期/已拒绝邀请
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: deletedInvitations, error: deleteError } = await supabase
      .from('family_invitations')
      .update({ status: 'DELETED' } as any)
      .in('status', ['EXPIRED', 'REJECTED'])
      .lt('updatedAt', thirtyDaysAgo)
      .select('id');

    if (deleteError) {
      console.error('软删除邀请失败:', deleteError);
      return NextResponse.json({ error: '软删除邀请失败' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: '清理任务完成',
        results: {
          expiredUpdated: expiredInvitations?.length || 0,
          softDeleted: deletedInvitations?.length || 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('清理过期邀请失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * GET /api/cleanup/expired-invitations - 获取过期邀请统计
 *
 * Migrated from Prisma to Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // 验证管理员权限
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限执行此操作' }, { status: 403 });
    }

    const supabase = SupabaseClientManager.getInstance();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // 获取过期邀请统计（使用Supabase）
    const [
      pendingExpiredResult,
      expiredStatusResult,
      rejectedStatusResult,
      softDeletableResult,
    ] = await Promise.all([
      // 待处理但已过期的邀请
      supabase
        .from('family_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING')
        .lt('expiresAt', now),
      // 已标记为过期的邀请
      supabase
        .from('family_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'EXPIRED'),
      // 已拒绝的邀请
      supabase
        .from('family_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED'),
      // 可软删除的过期/拒绝邀请（超过30天）
      supabase
        .from('family_invitations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['EXPIRED', 'REJECTED'])
        .lt('updatedAt', thirtyDaysAgo),
    ]);

    const pendingExpired = pendingExpiredResult.count || 0;
    const expiredStatus = expiredStatusResult.count || 0;
    const rejectedStatus = rejectedStatusResult.count || 0;
    const softDeletable = softDeletableResult.count || 0;

    return NextResponse.json(
      {
        statistics: {
          pendingExpired,
          expiredStatus,
          rejectedStatus,
          softDeletable,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('获取过期邀请统计失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
