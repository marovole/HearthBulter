import { NextRequest, NextResponse } from 'next/server';
import { TaskManagementService } from '@/services/task-management';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';

// GET /api/families/[familyId]/tasks/stats - 获取任务统计
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = params;
      const userId = req.user!.id;

      const stats = await TaskManagementService.getTaskStats(familyId, userId);

      return NextResponse.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting task stats:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get task stats', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}
