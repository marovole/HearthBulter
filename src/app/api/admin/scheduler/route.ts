/**
 * 调度器管理API
 * 需要管理员权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduler } from '@/lib/services/scheduler';
import { getCurrentUser } from '@/lib/auth';
import { requireAdmin } from '@/lib/middleware/authorization';
import { logger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * 验证管理员权限
 */
async function checkAdminAccess(): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  const user = await getCurrentUser();

  if (!user?.id) {
    return { authorized: false, error: '未授权访问' };
  }

  const authResult = await requireAdmin(user.id);

  if (!authResult.authorized) {
    logger.warn('非管理员尝试访问调度器API', { userId: user.id });
    return { authorized: false, userId: user.id, error: authResult.reason };
  }

  return { authorized: true, userId: user.id };
}

// GET - 获取调度器状态
export async function GET() {
  try {
    const access = await checkAdminAccess();
    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error || '需要管理员权限' },
        { status: 403 },
      );
    }

    const status = scheduler.getStatus();

    logger.info('管理员查看调度器状态', { userId: access.userId });

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('获取调度器状态失败', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to get scheduler status' },
      { status: 500 },
    );
  }
}

// POST - 启动/停止调度器或手动执行任务
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const access = await checkAdminAccess();
    if (!access.authorized) {
      return NextResponse.json(
        { success: false, error: access.error || '需要管理员权限' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, taskName } = body;

    // 记录操作日志
    logger.info('管理员调度器操作', {
      userId: access.userId,
      action,
      taskName,
    });

    switch (action) {
      case 'start':
        await scheduler.start();
        return NextResponse.json({
          success: true,
          message: 'Scheduler started successfully',
        });

      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped successfully',
        });

      case 'execute':
        if (!taskName) {
          return NextResponse.json(
            {
              success: false,
              error: 'Task name is required for execute action',
            },
            { status: 400 },
          );
        }
        await scheduler.executeTaskManually(taskName);
        return NextResponse.json({
          success: true,
          message: `Task ${taskName} executed successfully`,
        });

      case 'toggle':
        if (!taskName || body.enabled === undefined) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Task name and enabled status are required for toggle action',
            },
            { status: 400 },
          );
        }
        await scheduler.toggleTask(taskName, body.enabled);
        return NextResponse.json({
          success: true,
          message: `Task ${taskName} ${body.enabled ? 'enabled' : 'disabled'} successfully`,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 },
        );
    }
  } catch (error) {
    logger.error('调度器操作失败', { error });
    return NextResponse.json(
      { success: false, error: 'Scheduler operation failed' },
      { status: 500 },
    );
  }
}
