import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/services/task-service';
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from '@/middleware/permissions';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * POST /api/families/:familyId/tasks/:taskId/complete
 * 完成任务
 */

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> },
) {
  return withApiPermissions(async (req) => {
    try {
      const { familyId, taskId } = await params;
      const userId = req.user!.id;
      const body = await request.json();
      const { note } = body;

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限并获取成员信息
      const { data: member } = await supabase
        .from('family_members')
        .select('id, role')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Not a family member' },
          { status: 403 },
        );
      }

      // 完成任务
      const task = await taskService.completeTask(taskId, member.id, note);

      return NextResponse.json({
        success: true,
        data: task,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to complete task',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request, { params } as never);
}
