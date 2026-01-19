import { NextRequest, NextResponse } from "next/server";
import { taskRepository } from "@/lib/repositories/task-repository-singleton";
import {
  withApiPermissions,
  PERMISSION_CONFIGS,
} from "@/middleware/permissions";
import { hasPermission, Permission } from "@/lib/permissions";
import { convexClient, api } from "@/lib/convex-client";
import type { Doc, Id } from "@/../convex/_generated/dataModel";

/**
 * PUT /api/families/:familyId/tasks/:taskId
 * 更新任务详情
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, taskId } = await params;
      const userId = req.user!.id;
      const body = await request.json();

      const { title, description, category, priority, dueDate } = body;

      const member = await convexClient.query<Doc<"familyMembers"> | null>(
        api.members.getByClerkInFamily,
        {
          familyId: familyId as Id<"families">,
          clerkId: userId,
        },
      );

      if (!member) {
        return NextResponse.json(
          { success: false, error: "Not a family member" },
          { status: 403 },
        );
      }

      // 验证任务并检查权限
      const existingTask = await taskRepository.getTaskById(familyId, taskId);

      if (!existingTask) {
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 },
        );
      }

      // 检查更新权限
      if (
        !hasPermission(
          member.role as any,
          Permission.UPDATE_TASK,
          existingTask.creatorId,
          member._id,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient permissions to update this task",
          },
          { status: 403 },
        );
      }

      // 使用 Repository 更新任务
      const updatedTask = await taskRepository.updateTask(familyId, taskId, {
        title,
        description,
        category,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      // 记录活动日志
      await convexClient
        .mutation(api.activities.create, {
          familyId: familyId as Id<"families">,
          memberId: member._id,
          type: "TASK_UPDATED",
          title: "更新了任务详情",
          description: updatedTask.title,
          metadata: {
            taskId: updatedTask.id,
            taskTitle: updatedTask.title,
            action: "DETAILS_CHANGED",
            changes: { title, description, category, priority, dueDate },
          },
        })
        .catch((err: unknown) => {
          console.error("Error logging activity:", err);
        });

      return NextResponse.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      console.error("Error updating task:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update task",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.UPDATE_TASK)(request as any, { params });
}

/**
 * DELETE /api/families/:familyId/tasks/:taskId
 * 删除任务（软删除）
 *
 * 使用双写框架迁移
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; taskId: string }> },
) {
  return withApiPermissions(async (req, context) => {
    try {
      const { familyId, taskId } = await params;
      const userId = req.user!.id;

      const member = await convexClient.query<Doc<"familyMembers"> | null>(
        api.members.getByClerkInFamily,
        {
          familyId: familyId as Id<"families">,
          clerkId: userId,
        },
      );

      if (!member) {
        return NextResponse.json(
          { success: false, error: "Not a family member" },
          { status: 403 },
        );
      }

      // 验证任务并检查权限
      const task = await taskRepository.getTaskById(familyId, taskId);

      if (!task) {
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 },
        );
      }

      // 检查删除权限
      if (
        !hasPermission(
          member.role as any,
          Permission.DELETE_TASK,
          task.creatorId,
          member._id,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Insufficient permissions to delete this task",
          },
          { status: 403 },
        );
      }

      // 使用 Repository 删除任务
      await taskRepository.deleteTask(familyId, taskId);

      // 记录活动日志
      await convexClient
        .mutation(api.activities.create, {
          familyId: familyId as Id<"families">,
          memberId: member._id,
          type: "TASK_UPDATED",
          title: "删除了任务",
          description: task.title,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            action: "DELETED",
          },
        })
        .catch((err: unknown) => {
          console.error("Error logging activity:", err);
        });

      return NextResponse.json({
        success: true,
        data: { success: true },
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete task",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.DELETE_TASK)(request as any, { params });
}
