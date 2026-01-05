import { NextRequest, NextResponse } from "next/server";
import { taskRepository } from "@/lib/repositories/task-repository-singleton";
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from "@/middleware/permissions";
import { hasPermission, Permission } from "@/lib/permissions";
import { SupabaseClientManager } from "@/lib/db/supabase-adapter";
import { prisma } from "@/lib/db";
import type {
  TaskStatus,
  TaskCategory,
  TaskPriority,
} from "@/lib/repositories/types/task";

/**
 * GET /api/families/:familyId/tasks
 * 获取家庭任务列表
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限并获取成员信息
      const { data: member } = await supabase
        .from("family_members")
        .select("id, role")
        .eq("user_id", userId)
        .eq("family_id", familyId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: "Not a family member" },
          { status: 403 },
        );
      }

      // 获取查询参数
      const { searchParams } = new URL(request.url);
      const filters = {
        familyId,
        status: searchParams.get("status") as TaskStatus | undefined,
        category: searchParams.get("category") as TaskCategory | undefined,
        assigneeId: searchParams.get("assigneeId") || undefined,
        priority: searchParams.get("priority") as TaskPriority | undefined,
        dueDate: {
          from: searchParams.get("dueFrom")
            ? new Date(searchParams.get("dueFrom")!)
            : undefined,
          to: searchParams.get("dueTo")
            ? new Date(searchParams.get("dueTo")!)
            : undefined,
        },
        includeAssignee: true,
        includeCreator: true,
        includeComments: true,
      };

      // 使用 Repository 查询任务
      const result = await taskRepository.listTasks(filters);

      // 添加权限信息到每个任务
      const tasksWithPermissions = result.items.map((task) => ({
        ...task,
        permissions: {
          canUpdate: hasPermission(
            member.role as any,
            Permission.UPDATE_TASK,
            task.creatorId,
            member.id,
          ),
          canDelete: hasPermission(
            member.role as any,
            Permission.DELETE_TASK,
            task.creatorId,
            member.id,
          ),
          canAssign: hasPermission(member.role as any, Permission.ASSIGN_TASK),
          canComment: hasPermission(
            member.role as any,
            Permission.CREATE_COMMENT,
          ),
        },
      }));

      return NextResponse.json({
        success: true,
        data: tasksWithPermissions,
      });
    } catch (error) {
      console.error("Error getting tasks:", error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get tasks",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.FAMILY_MEMBER)(request as any, { params });
}

/**
 * POST /api/families/:familyId/tasks
 * 创建任务
 *
 * 使用双写框架迁移
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { title, description, category, assigneeId, priority, dueDate } =
        body;

      // 验证必需字段
      if (!title || !category) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: title, category" },
          { status: 400 },
        );
      }

      const supabase = SupabaseClientManager.getInstance();

      // 验证用户权限并获取成员信息
      const { data: member } = await supabase
        .from("family_members")
        .select("id, role")
        .eq("user_id", userId)
        .eq("family_id", familyId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: "Not a family member" },
          { status: 403 },
        );
      }

      if (!hasPermission(member.role as any, Permission.CREATE_TASK)) {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 },
        );
      }

      // 验证被分配人（如果指定）
      if (assigneeId) {
        const { data: assignee } = await supabase
          .from("family_members")
          .select("id")
          .eq("id", assigneeId)
          .eq("family_id", familyId)
          .is("deleted_at", null)
          .maybeSingle();

        if (!assignee) {
          return NextResponse.json(
            { success: false, error: "Assignee is not a family member" },
            { status: 400 },
          );
        }
      }

      // 使用 Repository 创建任务
      const task = await taskRepository.createTask(familyId, member.id, {
        title,
        description,
        category,
        assigneeId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      // 记录活动日志
      await prisma.activity
        .create({
          data: {
            familyId,
            memberId: member.id,
            activityType: "TASK_CREATED",
            title: "创建了任务",
            description: task.title,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              category: task.category,
              assigneeId,
            },
          },
        })
        .catch((err) => {
          console.error("Error logging activity:", err);
          // 不抛出错误，避免影响主要操作
        });

      return NextResponse.json({
        success: true,
        data: task,
      });
    } catch (error) {
      console.error("Error creating task:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to create task",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.CREATE_TASK)(request as any, { params });
}
