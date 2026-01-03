import { NextRequest, NextResponse } from 'next/server';
import { taskService } from '@/lib/services/task-service';
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from '@/middleware/permissions';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';

/**
 * GET /api/families/:familyId/tasks/focus?memberId=xxx
 * 获取今日焦点任务
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;
      const { searchParams } = new URL(request.url);
      const memberId = searchParams.get('memberId');

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

      // 使用请求的 memberId 或当前用户的成员ID
      const targetMemberId = memberId || member.id;

      // 获取今日焦点
      const focusTasks = await taskService.getTodayFocus(targetMemberId);

      return NextResponse.json({
        success: true,
        data: focusTasks,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to get today focus',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request, { params } as never);
}
