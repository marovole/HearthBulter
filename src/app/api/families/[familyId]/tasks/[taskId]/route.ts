import { NextRequest, NextResponse } from 'next/server';
import { TaskManagementService } from '@/services/task-management';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';
import { TaskStatus, TaskCategory, TaskPriority } from '@prisma/client';

// PUT /api/families/[familyId]/tasks/[taskId] - 更新任务
export async function PUT(
  request: NextRequest,
  { params }: { params: { familyId: string; taskId: string } }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, taskId } = params;
      const userId = req.user!.id;
      const body = await request.json();

      const { title, description, category, priority, dueDate } = body;

      const updatedTask = await TaskManagementService.updateTask(familyId, userId, taskId, {
        title,
        description,
        category,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      return NextResponse.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to update task', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.UPDATE_TASK)(request as any, { params });
}

// DELETE /api/families/[familyId]/tasks/[taskId] - 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: { familyId: string; taskId: string } }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, taskId } = params;
      const userId = req.user!.id;

      const result = await TaskManagementService.deleteTask(familyId, userId, taskId);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to delete task', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.DELETE_TASK)(request as any, { params });
}
