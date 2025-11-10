import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * DELETE /api/notifications/[id]
 * 删除通知
 *
 * Migrated from Prisma to Supabase
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

    const supabase = SupabaseClientManager.getInstance();

    // Verify notification exists and belongs to member
    const { data: notification, error: checkError } = await supabase
      .from('notifications')
      .select('id, memberId')
      .eq('id', notificationId)
      .eq('memberId', memberId)
      .single();

    if (checkError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found or does not belong to member' },
        { status: 404 }
      );
    }

    // Delete notification
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('memberId', memberId);

    if (deleteError) {
      console.error('Error deleting notification:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

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
