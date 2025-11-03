import { NextRequest, NextResponse } from 'next/server';
import { TaskManagementService } from '@/services/task-management';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';
import { TaskStatus } from '@prisma/client';

// GET /api/families/[familyId]/tasks/my - 获取我的任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;
      
      // 获取查询参数
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') as TaskStatus | undefined;

      const tasks = await TaskManagementService.getMyTasks(familyId, userId, status);

      return NextResponse.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error('Error getting my tasks:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get my tasks', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}
