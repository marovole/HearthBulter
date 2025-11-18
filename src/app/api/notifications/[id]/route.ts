import { NextRequest, NextResponse } from 'next/server';
import { notificationRepository } from '@/lib/repositories/notification-repository-singleton';
/**
 * 模块级别的单例 - 避免每次请求都重新创建
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
/**
 * GET /api/notifications/[id]
 * 获取单个通知详情
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = id;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // 使用双写框架获取通知
    const notification = await notificationRepository.getNotificationById(notificationId
    );

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * 删除通知
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const notificationId = id;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!notificationId || !memberId) {
      return NextResponse.json(
        { error: 'Notification ID and Member ID are required' },
        { status: 400 }
      );
    }

    // 使用双写框架删除通知（软删除）
    await notificationRepository.deleteNotification(notificationId,
      memberId
    );

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
