import { NextRequest, NextResponse } from 'next/server';
import { notificationRepository } from '@/lib/repositories/notification-repository-singleton';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/inventory/notifications/batch
 * 批量操作库存通知
 *
 * 使用双写框架迁移 - 通过 NotificationRepository 访问数据
 * 与 /api/notifications/batch 保持一致的实现
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, action, notificationIds } = body;

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: '缺少操作类型' }, { status: 400 });
    }

    let success = false;
    let message = '';
    let processedCount = 0;
    const errors: Array<{ notificationId: string; error: string }> = [];

    switch (action) {
    case 'mark_all_as_read':
      // 批量标记所有通知为已读
      try {
        await notificationRepository.markAllAsRead(memberId);
        success = true;
        message = '全部标记已读成功';
      } catch (error) {
        console.error('标记全部已读失败:', error);
        success = false;
        message = '全部标记已读失败';
      }
      break;

    case 'mark_selected_as_read':
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return NextResponse.json({ error: '请选择要操作的通知' }, { status: 400 });
      }

      // 逐个标记为已读
      for (const notificationId of notificationIds) {
        try {
          await notificationRepository.markAsRead(notificationId, memberId);
          processedCount++;
        } catch (error) {
          errors.push({
            notificationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      success = processedCount > 0;
      message = `成功标记 ${processedCount} 条通知为已读`;
      break;

    case 'delete_selected':
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return NextResponse.json({ error: '请选择要删除的通知' }, { status: 400 });
      }

      // 逐个删除通知
      for (const notificationId of notificationIds) {
        try {
          await notificationRepository.deleteNotification(notificationId, memberId);
          processedCount++;
        } catch (error) {
          errors.push({
            notificationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      success = processedCount > 0;
      message = `成功删除 ${processedCount} 条通知`;
      break;

    default:
      return NextResponse.json({ error: '无效的操作类型' }, { status: 400 });
    }

    return NextResponse.json({
      success,
      message,
      processedCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('批量操作通知失败:', error);
    return NextResponse.json(
      { error: '批量操作通知失败' },
      { status: 500 }
    );
  }
}
