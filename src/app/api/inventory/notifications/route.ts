import { NextRequest, NextResponse } from 'next/server';
import { inventoryNotificationService } from '@/services/inventory-notification';
import { getCurrentUser } from '@/lib/auth';
import { NotificationType } from '@prisma/client';

// GET - 获取通知列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const type = searchParams.get('type') as NotificationType;
    const priority = searchParams.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW';
    const isRead = searchParams.get('isRead');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    const filters: any = { limit, offset };
    if (type) filters.type = type;
    if (priority) filters.priority = priority;
    if (isRead !== null) filters.isRead = isRead === 'true';

    const notifications = await inventoryNotificationService.getUserNotifications(memberId, filters);

    return NextResponse.json({
      success: true,
      data: notifications,
    });

  } catch (error) {
    console.error('获取通知列表失败:', error);
    return NextResponse.json(
      { error: '获取通知列表失败', details: error },
      { status: 500 }
    );
  }
}

// POST - 创建通知（管理员功能）
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    
    const requiredFields = ['memberId', 'type', 'title', 'message', 'priority'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `缺少必需字段: ${field}` }, { status: 400 });
      }
    }

    const notifications = [{
      memberId: body.memberId,
      type: body.type as NotificationType,
      title: body.title,
      message: body.message,
      priority: body.priority as 'HIGH' | 'MEDIUM' | 'LOW',
      data: body.data,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      isRead: false,
      createdAt: new Date(),
    }];

    const success = await inventoryNotificationService.createNotifications(notifications);

    return NextResponse.json({
      success,
      message: success ? '通知创建成功' : '通知创建失败',
    });

  } catch (error) {
    console.error('创建通知失败:', error);
    return NextResponse.json(
      { error: '创建通知失败', details: error },
      { status: 500 }
    );
  }
}
