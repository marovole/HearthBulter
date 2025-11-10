import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/notifications/batch
 * 批量操作通知
 *
 * Migrated from Prisma to Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, data } = body;

    switch (operation) {
    case 'create':
      return await handleBatchCreate(data);
    case 'markRead':
      return await handleBatchMarkRead(data);
    case 'delete':
      return await handleBatchDelete(data);
    default:
      return NextResponse.json(
        { error: 'Invalid operation' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in batch operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch operation' },
      { status: 500 }
    );
  }
}

// 批量创建通知
async function handleBatchCreate(data: {
  notifications: Array<{
    memberId: string;
    type: string;
    title?: string;
    message?: string;
    priority?: string;
    data?: any;
  }>;
}) {
  if (!data.notifications || !Array.isArray(data.notifications)) {
    return NextResponse.json(
      { error: 'Notifications array is required' },
      { status: 400 }
    );
  }

  if (data.notifications.length === 0) {
    return NextResponse.json(
      { error: 'At least one notification is required' },
      { status: 400 }
    );
  }

  if (data.notifications.length > 100) {
    return NextResponse.json(
      { error: 'Maximum 100 notifications allowed per batch' },
      { status: 400 }
    );
  }

  const supabase = SupabaseClientManager.getInstance();
  const now = new Date().toISOString();

  const notificationsData = data.notifications.map((notif) => ({
    memberId: notif.memberId,
    type: notif.type,
    title: notif.title || 'Notification',
    message: notif.message || '',
    priority: notif.priority || 'MEDIUM',
    data: notif.data || null,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const { data: created, error } = await supabase
    .from('notifications')
    .insert(notificationsData)
    .select();

  if (error) {
    console.error('Batch create failed:', error);
    return NextResponse.json({
      success: false,
      data: {
        results: [],
        summary: {
          total: data.notifications.length,
          success: 0,
          failed: data.notifications.length,
          successRate: 0,
        },
      },
    });
  }

  const successCount = created?.length || 0;
  const failureCount = data.notifications.length - successCount;

  return NextResponse.json({
    success: true,
    data: {
      results: created || [],
      summary: {
        total: data.notifications.length,
        success: successCount,
        failed: failureCount,
        successRate: data.notifications.length > 0 ? (successCount / data.notifications.length) * 100 : 0,
      },
    },
  });
}

// 批量标记为已读
async function handleBatchMarkRead(data: {
  notificationIds: string[];
  memberId: string;
}) {
  if (!data.notificationIds || !Array.isArray(data.notificationIds)) {
    return NextResponse.json(
      { error: 'Notification IDs array is required' },
      { status: 400 }
    );
  }

  if (!data.memberId) {
    return NextResponse.json(
      { error: 'Member ID is required' },
      { status: 400 }
    );
  }

  if (data.notificationIds.length === 0) {
    return NextResponse.json(
      { error: 'At least one notification ID is required' },
      { status: 400 }
    );
  }

  if (data.notificationIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 notifications allowed per batch' },
      { status: 400 }
    );
  }

  const supabase = SupabaseClientManager.getInstance();
  const now = new Date().toISOString();

  // 批量更新
  const { data: updated, error } = await supabase
    .from('notifications')
    .update({
      readAt: now,
      updatedAt: now,
    })
    .in('id', data.notificationIds)
    .eq('memberId', data.memberId)
    .is('readAt', null)
    .select('id');

  if (error) {
    console.error('Batch mark read failed:', error);
    return NextResponse.json({
      success: false,
      data: {
        summary: {
          total: data.notificationIds.length,
          success: 0,
          failed: data.notificationIds.length,
          successRate: 0,
        },
        errors: [error.message],
      },
    });
  }

  const successCount = updated?.length || 0;
  const failureCount = data.notificationIds.length - successCount;

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: data.notificationIds.length,
        success: successCount,
        failed: failureCount,
        successRate: data.notificationIds.length > 0 ? (successCount / data.notificationIds.length) * 100 : 0,
      },
      errors: failureCount > 0 ? [`${failureCount} notifications were not updated (already read or not found)`] : undefined,
    },
  });
}

// 批量删除通知
async function handleBatchDelete(data: {
  notificationIds: string[];
  memberId: string;
}) {
  if (!data.notificationIds || !Array.isArray(data.notificationIds)) {
    return NextResponse.json(
      { error: 'Notification IDs array is required' },
      { status: 400 }
    );
  }

  if (!data.memberId) {
    return NextResponse.json(
      { error: 'Member ID is required' },
      { status: 400 }
    );
  }

  if (data.notificationIds.length === 0) {
    return NextResponse.json(
      { error: 'At least one notification ID is required' },
      { status: 400 }
    );
  }

  if (data.notificationIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 notifications allowed per batch' },
      { status: 400 }
    );
  }

  const supabase = SupabaseClientManager.getInstance();

  // 批量删除
  const { data: deleted, error } = await supabase
    .from('notifications')
    .delete()
    .in('id', data.notificationIds)
    .eq('memberId', data.memberId)
    .select('id');

  if (error) {
    console.error('Batch delete failed:', error);
    return NextResponse.json({
      success: false,
      data: {
        summary: {
          total: data.notificationIds.length,
          success: 0,
          failed: data.notificationIds.length,
          successRate: 0,
        },
        errors: [error.message],
      },
    });
  }

  const successCount = deleted?.length || 0;
  const failureCount = data.notificationIds.length - successCount;

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: data.notificationIds.length,
        success: successCount,
        failed: failureCount,
        successRate: data.notificationIds.length > 0 ? (successCount / data.notificationIds.length) * 100 : 0,
      },
      errors: failureCount > 0 ? [`${failureCount} notifications were not deleted (not found or permission denied)`] : undefined,
    },
  });
}
