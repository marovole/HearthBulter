import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { NotificationManager } from '@/lib/services/notification';

const notificationManager = new NotificationManager(prisma);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const notificationId = id;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!notificationId || !memberId) {
      return NextResponse.json(
        { error: 'Notification ID and Member ID are required' },
        { status: 400 }
      );
    }

    await notificationManager.deleteNotification(notificationId, memberId);
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
