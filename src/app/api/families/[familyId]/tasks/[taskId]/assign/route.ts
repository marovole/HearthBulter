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
 * POST /api/families/:familyId/tasks/:taskId/assign
 * 分配任务
 *
 * 使用双写框架迁移
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";
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
          { success: false, error: "Missing required field: assigneeId" },
          { status: 400 },
        );
      }

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

      // 检查分配任务权限
      if (!hasPermission(member.role as any, Permission.ASSIGN_TASK)) {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 },
        );
      }

      // 验证任务存在
      const task = await taskRepository.getTaskById(familyId, taskId);

      if (!task) {
        return NextResponse.json(
          { success: false, error: "Task not found" },
          { status: 404 },
        );
      }

      // 验证被分配人是家庭成员
      const assignee = await convexClient.query<Doc<"familyMembers"> | null>(
        api.families.getMemberById,
        {
          memberId: assigneeId as Id<"familyMembers">,
        },
      );

      if (!assignee) {
        return NextResponse.json(
          { success: false, error: "Assignee is not a family member" },
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
      await convexClient
        .mutation(api.activities.create, {
          familyId: familyId as Id<"families">,
          memberId: member._id,
          type: "TASK_UPDATED",
          title: "分配了任务",
          description: updatedTask.title,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            action: "ASSIGNED",
            assigneeName: assignee.name,
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
      console.error("Error assigning task:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to assign task",
        },
        { status: 500 },
      );
    }
  }, PERMISSION_CONFIGS.ASSIGN_TASK)(request as any, { params });
}
