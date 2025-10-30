/**
 * 调度器管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { scheduler } from '@/lib/services/scheduler';

// GET - 获取调度器状态
export async function GET() {
  try {
    const status = scheduler.getStatus();
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Failed to get scheduler status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}

// POST - 启动/停止调度器或手动执行任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskName } = body;

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
            { success: false, error: 'Task name is required for execute action' },
            { status: 400 }
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
            { success: false, error: 'Task name and enabled status are required for toggle action' },
            { status: 400 }
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
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Scheduler operation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Scheduler operation failed' },
      { status: 500 }
    );
  }
}
