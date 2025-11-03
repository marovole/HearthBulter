import { NextRequest, NextResponse } from 'next/server';
import { TaskManagementService } from '@/services/task-management';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';

// POST /api/families/[familyId]/tasks/[taskId]/assign - 分配任务
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, taskId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { assigneeId } = body;

      // 验证必需字段
      if (!assigneeId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: assigneeId' },
          { status: 400 }
        );
      }

      const updatedTask = await TaskManagementService.assignTask(familyId, userId, taskId, assigneeId);

      return NextResponse.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      console.error('Error assigning task:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to assign task', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.ASSIGN_TASK)(request as any, { params });
}
