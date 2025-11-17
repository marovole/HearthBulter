import { NextRequest, NextResponse } from 'next/server';
import { inventoryNotificationService } from '@/services/inventory-notification';
import { getCurrentUser } from '@/lib/auth';

// PUT - 标记通知为已读

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { memberId, action } = body;

    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    let success = false;
    let message = '';

    switch (action) {
    case 'mark_as_read':
      success = await inventoryNotificationService.markNotificationAsRead(id, memberId);
      message = success ? '标记已读成功' : '标记已读失败';
      break;
      
    default:
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    return NextResponse.json({
      success,
      message,
    });

  } catch (error) {
    console.error('更新通知失败:', error);
    return NextResponse.json(
      { error: '更新通知失败', details: error },
      { status: 500 }
    );
  }
}

// DELETE - 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    
    if (!memberId) {
      return NextResponse.json({ error: '缺少成员ID' }, { status: 400 });
    }

    const success = await inventoryNotificationService.deleteNotification(id, memberId);

    return NextResponse.json({
      success,
      message: success ? '通知删除成功' : '通知删除失败',
    });

  } catch (error) {
    console.error('删除通知失败:', error);
    return NextResponse.json(
      { error: '删除通知失败', details: error },
      { status: 500 }
    );
  }
}
