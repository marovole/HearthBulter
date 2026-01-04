import { NextRequest, NextResponse } from 'next/server';
import { taskRepository } from '@/lib/repositories/task-repository-singleton';
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from '@/middleware/permissions';
import { hasPermission, Permission } from '@/lib/permissions';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { prisma } from '@/lib/db';

/**
 * POST /api/families/:familyId/tasks/:taskId/assign
 * 分配任务
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> },
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
          { status: 400 },
        );
      }

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

      // 检查分配任务权限
      if (!hasPermission(member.role as any, Permission.ASSIGN_TASK)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 },
        );
      }

      // 验证任务存在
      const task = await taskRepository.getTaskById(familyId, taskId);

      if (!task) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 },
        );
      }

      // 验证被分配人是家庭成员
      const { data: assignee } = await supabase
        .from('family_members')
        .select('id, name, role')
        .eq('id', assigneeId)
        .eq('family_id', familyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (!assignee) {
        return NextResponse.json(
          { success: false, error: 'Assignee is not a family member' },
          { status: 400 },
        );
      }

      // 使用 Repository 分配任务
      const updatedTask = await taskRepository.assignTask(
        familyId,
        taskId,
        assigneeId,
      );

      // 记录活动日志
      await prisma.activity
        .create({
          data: {
            familyId,
            memberId: member.id,
            activityType: 'TASK_UPDATED',
            title: '分配了任务',
            description: updatedTask.title,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              action: 'ASSIGNED',
              assigneeName: assignee.name,
            },
          },
        })
        .catch((err) => {
          console.error('Error logging activity:', err);
        });

      return NextResponse.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      console.error('Error assigning task:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to assign task',
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.ASSIGN_TASK)(request as any, { params });
}
