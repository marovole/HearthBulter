import { NextRequest, NextResponse } from 'next/server';
import { taskRepository } from '@/lib/repositories/task-repository-singleton';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';
import { hasPermission, Permission } from '@/lib/permissions';
import { SupabaseClientManager } from '@/lib/db/supabase-adapter';
import { prisma } from '@/lib/db';
import type { TaskStatus } from '@/lib/repositories/types/task';

/**
 * PUT /api/families/:familyId/tasks/:taskId/status
 * 更新任务状态
 *
 * 使用双写框架迁移
 */
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
      const validStatuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!status || !validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid or missing status field' },
          { status: 400 }
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
          { status: 403 }
        );
      }

      // 验证任务并检查权限
      const task = await taskRepository.decorateMethod('getTaskById', familyId, taskId);

      if (!task) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        );
      }

      // 检查更新权限：创建者或分配人都可以更新状态
      const canUpdate =
        hasPermission(member.role as any, Permission.UPDATE_TASK, task.creatorId, member.id) ||
        task.assigneeId === member.id;

      if (!canUpdate) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to update this task' },
          { status: 403 }
        );
      }

      // 使用 Repository 更新任务状态
      const updatedTask = await taskRepository.decorateMethod('updateTaskStatus', familyId, taskId, {
        status,
        note,
      });

      // 记录活动日志
      await prisma.activity.create({
        data: {
          familyId,
          memberId: member.id,
          activityType: 'TASK_UPDATED',
          title: '更新了任务状态',
          description: updatedTask.title,
          metadata: {
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            action: 'STATUS_CHANGED',
            newStatus: status,
            note,
          },
        },
      }).catch(err => {
        console.error('Error logging activity:', err);
      });

      // 如果任务完成，记录完成活动
      if (status === 'COMPLETED') {
        await prisma.activity.create({
          data: {
            familyId,
            memberId: member.id,
            activityType: 'TASK_COMPLETED',
            title: '完成了任务',
            description: updatedTask.title,
            metadata: {
              taskId: updatedTask.id,
              taskTitle: updatedTask.title,
            },
          },
        }).catch(err => {
          console.error('Error logging task completion activity:', err);
        });
      }

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
