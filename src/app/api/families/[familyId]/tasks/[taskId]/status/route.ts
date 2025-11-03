import { NextRequest, NextResponse } from 'next/server';
import { TaskManagementService } from '@/services/task-management';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';
import { TaskStatus } from '@prisma/client';

// PUT /api/families/[familyId]/tasks/[taskId]/status - 更新任务状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, taskId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { status, note } = body;

      // 验证必需字段
      if (!status || !Object.values(TaskStatus).includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing status field' },
          { status: 400 }
        );
      }

      const updatedTask = await TaskManagementService.updateTaskStatus(familyId, userId, taskId, status, note);

      return NextResponse.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to update task status', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.UPDATE_TASK)(request as any, { params });
}
