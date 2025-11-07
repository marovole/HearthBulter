import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { NotificationManager, NotificationUtils } from '@/lib/services/notification';
import { NotificationType, NotificationChannel, NotificationPriority } from '@prisma/client';

const notificationManager = new NotificationManager(prisma);

// GET /api/notifications - 获取用户通知列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type') as NotificationType;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeRead = searchParams.get('includeRead') === 'true';

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const result = await notificationManager.getUserNotifications(memberId, {
      type,
      status: status as any,
      limit,
      offset,
      includeRead,
    });

    // 格式化通知数据
    const formattedNotifications = result.notifications.map(notification => ({
      ...notification,
      formattedTime: NotificationUtils.formatTime(notification.createdAt),
      typeIcon: NotificationUtils.getTypeIcon(notification.type),
      typeName: NotificationUtils.getTypeName(notification.type),
      priorityColor: NotificationUtils.getPriorityColor(notification.priority),
      formattedContent: NotificationUtils.formatContent(notification.content),
    }));

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: result.total,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - 创建通知
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      memberId,
      type,
      title,
      content,
      priority = NotificationPriority.MEDIUM,
      channels,
      metadata,
      actionUrl,
      actionText,
      templateData,
      dedupKey,
      batchId,
    } = body;

    // 验证必需字段
    if (!memberId || !type) {
      return NextResponse.json(
        { error: 'Member ID and type are required' },
        { status: 400 }
      );
    }

    // 验证通知类型
    if (!Object.values(NotificationType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    // 验证渠道
    if (channels && !Array.isArray(channels)) {
      return NextResponse.json(
        { error: 'Channels must be an array' },
        { status: 400 }
      );
    }

    // 验证通知内容
    if (title || content) {
      const validation = NotificationUtils.validateNotificationContent(
        title || '',
        content || ''
      );
      if (!validation.isValid) {
        return NextResponse.json(
          { error: 'Invalid content', details: validation.errors },
          { status: 400 }
        );
      }
    }

    // 创建通知
    const result = await notificationManager.createNotification({
      memberId,
      type,
      title,
      content,
      priority,
      channels,
      metadata,
      actionUrl,
      actionText,
      templateData,
      dedupKey,
      batchId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
