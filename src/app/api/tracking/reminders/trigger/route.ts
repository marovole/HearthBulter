import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reminderService } from '@/lib/services/tracking/reminder-service';

/**
 * POST /api/tracking/reminders/trigger
 * 手动触发提醒检查（用于测试或定时任务）
 */

// Force dynamic rendering for auth()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查是否为系统调用或定时任务
    const authHeader = request.headers.get('authorization');
    const isSystemCall =
      authHeader === `Bearer ${process.env.REMINDER_SERVICE_SECRET}`;

    if (!isSystemCall) {
      // 如果不是系统调用，检查用户权限
      // 这里可以添加管理员权限检查
      return NextResponse.json({ error: '无权限执行此操作' }, { status: 403 });
    }

    // 生成待触发的提醒
    const pendingReminders = await reminderService.generatePendingReminders();

    // 发送提醒
    const result = await reminderService.sendReminders(pendingReminders);

    return NextResponse.json(
      {
        message: '提醒检查完成',
        pendingCount: pendingReminders.length,
        sentCount: result.success,
        failedCount: result.failed,
        reminders: pendingReminders.map((r) => ({
          memberId: r.memberId,
          type: r.type,
          message: r.message,
          priority: r.priority,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('触发提醒检查失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * GET /api/tracking/reminders/trigger
 * 获取待触发的提醒列表（不实际发送）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 检查权限
    const authHeader = request.headers.get('authorization');
    const isSystemCall =
      authHeader === `Bearer ${process.env.REMINDER_SERVICE_SECRET}`;

    if (!isSystemCall) {
      return NextResponse.json({ error: '无权限执行此操作' }, { status: 403 });
    }

    // 生成待触发的提醒
    const pendingReminders = await reminderService.generatePendingReminders();

    return NextResponse.json(
      {
        message: '获取待触发提醒成功',
        count: pendingReminders.length,
        reminders: pendingReminders,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('获取待触发提醒失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
