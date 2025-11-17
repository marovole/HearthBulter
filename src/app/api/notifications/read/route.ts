import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { createDualWriteDecorator } from '@/lib/db/dual-write';
import { createFeatureFlagManager } from '@/lib/db/dual-write/feature-flags';
import { createResultVerifier } from '@/lib/db/dual-write/result-verifier';
import { PrismaNotificationRepository } from '@/lib/repositories/prisma/prisma-notification-repository';
import { SupabaseNotificationRepository } from '@/lib/repositories/implementations/supabase-notification-repository';
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification-repository';

/**
 * 模块级别的单例 - 避免每次请求都重新创建
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
const supabaseClient = SupabaseClientManager.getInstance();
const notificationRepository = createDualWriteDecorator<NotificationRepository>(
  new PrismaNotificationRepository(),
  new SupabaseNotificationRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/notifications/read',
  }
);

/**
 * PUT /api/notifications/read
 * 标记通知为已读
 *
 * 使用双写框架，支持 Prisma/Supabase 双写验证
 */
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

      // 使用双写框架批量标记已读
      const count = await notificationRepository.decorateMethod(
        'markAllAsRead',
        memberId
      );

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        count,
      });
    } else {
      // 标记单个通知为已读
      if (!notificationId || !memberId) {
        return NextResponse.json(
          { error: 'Notification ID and Member ID are required' },
          { status: 400 }
        );
      }

      // 使用双写框架标记单个通知已读
      await notificationRepository.decorateMethod(
        'markAsRead',
        notificationId,
        memberId
      );

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
