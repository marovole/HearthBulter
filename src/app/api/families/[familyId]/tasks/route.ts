import { NextRequest, NextResponse } from 'next/server';
import { TaskManagementService } from '@/services/task-management';
import { withApiPermissions, PERMISSION_CONFIGS } from '@/middleware/permissions';
import { TaskStatus, TaskCategory, TaskPriority } from '@prisma/client';

// GET /api/families/[familyId]/tasks - 获取家庭任务列表
export async function GET(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = params;
      const userId = req.user!.id;
      
      // 获取查询参数
      const { searchParams } = new URL(request.url);
      const filters = {
        status: searchParams.get('status') as TaskStatus | undefined,
        category: searchParams.get('category') as TaskCategory | undefined,
        assigneeId: searchParams.get('assigneeId') || undefined,
        priority: searchParams.get('priority') as TaskPriority | undefined,
        dueDate: {
          from: searchParams.get('dueFrom') ? new Date(searchParams.get('dueFrom')!) : undefined,
          to: searchParams.get('dueTo') ? new Date(searchParams.get('dueTo')!) : undefined,
        },
      };

      const tasks = await TaskManagementService.getFamilyTasks(familyId, userId, filters);

      return NextResponse.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      console.error('Error getting tasks:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get tasks', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}

// POST /api/families/[familyId]/tasks - 创建任务
export async function POST(
  request: NextRequest,
  { params }: { params: { familyId: string } }
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = params;
      const userId = req.user!.id;
      const body = await request.json();

      const { title, description, category, assigneeId, priority, dueDate } = body;

      // 验证必需字段
      if (!title || !category) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: title, category' },
          { status: 400 }
        );
      }

      const task = await TaskManagementService.createTask(familyId, userId, {
        title,
        description,
        category,
        assigneeId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      return NextResponse.json({
        success: true,
        data: task,
      });
    } catch (error) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to create task', 
        },
        { status: 500 }
      );
    }
  }, PERMISSION_CONFIGS.CREATE_TASK)(request as any, { params });
}
