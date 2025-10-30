import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NotificationManager } from '@/lib/services/notification';

const prisma = new PrismaClient();
const notificationManager = new NotificationManager(prisma);

// POST /api/notifications/batch - 批量操作
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
    content?: string;
    priority?: string;
    channels?: string[];
    metadata?: any;
    actionUrl?: string;
    actionText?: string;
    templateData?: any;
    dedupKey?: string;
    batchId?: string;
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

  const results = await notificationManager.createBulkNotifications(data.notifications);

  const successCount = results.filter(r => r.status !== 'FAILED').length;
  const failureCount = results.length - successCount;

  return NextResponse.json({
    success: true,
    data: {
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount,
        successRate: results.length > 0 ? (successCount / results.length) * 100 : 0,
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

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  // 逐个标记为已读
  for (const notificationId of data.notificationIds) {
    try {
      await notificationManager.markAsRead(notificationId, data.memberId);
      successCount++;
    } catch (error) {
      failureCount++;
      errors.push(`Failed to mark ${notificationId} as read: ${error}`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: data.notificationIds.length,
        success: successCount,
        failed: failureCount,
        successRate: data.notificationIds.length > 0 ? (successCount / data.notificationIds.length) * 100 : 0,
      },
      errors: errors.length > 0 ? errors : undefined,
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

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  // 逐个删除
  for (const notificationId of data.notificationIds) {
    try {
      await notificationManager.deleteNotification(notificationId, data.memberId);
      successCount++;
    } catch (error) {
      failureCount++;
      errors.push(`Failed to delete ${notificationId}: ${error}`);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        total: data.notificationIds.length,
        success: successCount,
        failed: failureCount,
        successRate: data.notificationIds.length > 0 ? (successCount / data.notificationIds.length) * 100 : 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}
