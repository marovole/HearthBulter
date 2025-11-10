import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * PUT /api/notifications/read
 * 标记通知为已读
 *
 * Migrated from Prisma to Supabase
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, memberId, markAll } = body;

    const supabase = SupabaseClientManager.getInstance();

    if (markAll) {
      // 标记所有通知为已读
      if (!memberId) {
        return NextResponse.json(
          { error: 'Member ID is required for marking all as read' },
          { status: 400 }
        );
      }

      // Update all unread notifications for this member
      const { data, error: updateError } = await supabase
        .from('notifications')
        .update({
          readAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('memberId', memberId)
        .is('readAt', null)
        .select('id');

      if (updateError) {
        console.error('Error marking all notifications as read:', updateError);
        return NextResponse.json(
          { error: 'Failed to mark all notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        count: data?.length || 0,
      });
    } else {
      // 标记单个通知为已读
      if (!notificationId || !memberId) {
        return NextResponse.json(
          { error: 'Notification ID and Member ID are required' },
          { status: 400 }
        );
      }

      // Verify notification exists and belongs to member
      const { data: notification, error: checkError } = await supabase
        .from('notifications')
        .select('id, memberId, readAt')
        .eq('id', notificationId)
        .eq('memberId', memberId)
        .single();

      if (checkError || !notification) {
        return NextResponse.json(
          { error: 'Notification not found or does not belong to member' },
          { status: 404 }
        );
      }

      // If already read, return success
      if (notification.readAt) {
        return NextResponse.json({
          success: true,
          message: 'Notification already marked as read',
        });
      }

      // Mark as read
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          readAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('memberId', memberId);

      if (updateError) {
        console.error('Error marking notification as read:', updateError);
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        );
      }

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
