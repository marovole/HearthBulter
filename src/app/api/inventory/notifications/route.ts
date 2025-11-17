import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { getCurrentUser } from '@/lib/auth';
import { memberRepository } from '@/lib/repositories/member-repository-singleton';
import type { NotificationType, NotificationPriority } from '@/lib/repositories/types/notification';

/**
 * GET /api/inventory/notifications
 * 获取通知列表
 *
 * Migrated from Prisma to Supabase
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type') as NotificationType | null;
    const priority = searchParams.get('priority') as NotificationPriority | null;
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    // 验证用户是否有权访问该成员的通知
    const { hasAccess } = await memberRepository.decorateMethod(
      'verifyMemberAccess',
      memberId,
      user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限访问该成员的通知' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('memberId', memberId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (isRead !== null) {
      const readValue = isRead === 'true';
      query = readValue ? query.not('readAt', 'is', null) : query.is('readAt', null);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('获取通知列表失败:', error);
      return NextResponse.json(
        { error: '获取通知列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notifications || [],
      count: count || 0,
    });

  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json(
      { error: '获取通知列表失败', details: error },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/notifications
 * 创建通知（需要权限验证）
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();

    const requiredFields = ['memberId', 'type', 'title', 'message', 'priority'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
    }

    // 验证用户是否有权为该成员创建通知
    const { hasAccess } = await memberRepository.decorateMethod(
      'verifyMemberAccess',
      body.memberId,
      user.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: '无权限为该成员创建通知' },
        { status: 403 }
      );
    }

    const supabase = SupabaseClientManager.getInstance();

    const now = new Date().toISOString();
    const notificationData = {
      memberId: body.memberId,
      type: body.type as NotificationType,
      title: body.title,
      message: body.message,
      priority: body.priority as NotificationPriority,
      data: body.data || null,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor).toISOString() : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      console.error('创建通知失败:', error);
      return NextResponse.json(
        { error: '创建通知失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '通知创建成功',
      data: notification,
    });

  } catch (error) {
    console.error('创建通知失败:', error);
    return NextResponse.json(
      { error: '创建通知失败', details: error },
      { status: 500 }
    );
  }
}
