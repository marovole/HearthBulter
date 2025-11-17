import { NextRequest, NextResponse } from 'next/server';
import { taskRepository } from '@/lib/repositories/task-repository-singleton';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import type { TaskStatus } from '@/lib/repositories/types/task';

/**
 * GET /api/families/:familyId/tasks/my
 * 获取我的任务（分配给当前用户的任务）
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限并获取成员信息
      const { data: member } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Not a family member' },
          { status: 403 }
        );
      }

      // 获取查询参数
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status') as TaskStatus | undefined;

      // 使用 Repository 查询我的任务
      const tasks = await taskRepository.decorateMethod('getMyTasks', familyId, member.id, status);

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
