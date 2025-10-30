import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NotificationManager } from '@/lib/services/notification';

const prisma = new PrismaClient();
const notificationManager = new NotificationManager(prisma);

// PUT /api/notifications/read - 标记通知为已读
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, memberId, markAll } = body;

    if (markAll) {
      // 标记所有通知为已读
      if (!memberId) {
        return NextResponse.json(
          { error: 'Member ID is required for marking all as read' },
          { status: 400 }
        );
      }

      await notificationManager.markAllAsRead(memberId);
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } else {
      // 标记单个通知为已读
      if (!notificationId || !memberId) {
        return NextResponse.json(
          { error: 'Notification ID and Member ID are required' },
          { status: 400 }
        );
      }

      await notificationManager.markAsRead(notificationId, memberId);
      
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
