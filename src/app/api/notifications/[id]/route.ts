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
const supabaseClient = SupabaseClientManager.getInstance();
const notificationRepository = createDualWriteDecorator<NotificationRepository>(
  new PrismaNotificationRepository(),
  new SupabaseNotificationRepository(supabaseClient),
  {
    featureFlagManager: createFeatureFlagManager(supabaseClient),
    verifier: createResultVerifier(supabaseClient),
    apiEndpoint: '/api/notifications/[id]',
  }
);

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
    const notification = await notificationRepository.decorateMethod(
      'getNotificationById',
      notificationId
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
    await notificationRepository.decorateMethod(
      'deleteNotification',
      notificationId,
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
